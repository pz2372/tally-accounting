/**
 * Backfill onlineOrdersCents and storeSalesCents for existing SalesReports.
 *
 * For each report that has a fileUrl (S3 image) but no onlineOrdersCents/storeSalesCents,
 * this script:
 *   1. Downloads the image from S3
 *   2. Sends it to Claude Vision to extract online orders and store sales amounts
 *   3. Updates the DB record
 *
 * Usage:
 *   npx tsx scripts/backfillOnlineStoreSales.ts
 *   npx tsx scripts/backfillOnlineStoreSales.ts --dry-run   # preview without updating
 */

import dotenv from 'dotenv';
dotenv.config();

import prisma from '../src/config/database';
import { getS3Object, extractS3Key } from '../src/services/s3Service';
import Anthropic from '@anthropic-ai/sdk';

const DRY_RUN = process.argv.includes('--dry-run');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function downloadImageAsBase64(fileUrl: string): Promise<string | null> {
  const s3Key = extractS3Key(fileUrl);
  if (!s3Key) {
    console.log(`  Could not extract S3 key from: ${fileUrl}`);
    return null;
  }

  try {
    const s3Response = await getS3Object(s3Key);
    const bodyBytes = await s3Response.Body?.transformToByteArray();
    if (!bodyBytes) return null;
    return Buffer.from(bodyBytes).toString('base64');
  } catch (err) {
    console.log(`  Failed to download from S3: ${err}`);
    return null;
  }
}

async function extractOnlineAndStoreSales(
  base64Image: string
): Promise<{ onlineOrders: number | null; storeSales: number | null }> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: `Analyze this sales report image. I need to extract two values:

1. "onlineOrders": Total net sales from online/platform/delivery sources (e.g. Doordash, Uber Eats, GrubHub, online orders, platform orders). Sum all online/platform/delivery line items.
2. "storeSales": Total net sales from in-store sources (e.g. Walk In, Dine In, Kiosk, counter, register). Sum all in-store line items.

Look for sections like "Net Sales by Order Sources", "Net Sales by Service Types", or similar breakdowns.

Return ONLY valid JSON:
{"onlineOrders": "266.39", "storeSales": "992.87"}

Rules:
- Numbers only, no $ signs or commas
- If you cannot determine a value, use empty string ""
- These should sum to approximately the net sales total`,
          },
        ],
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') return { onlineOrders: null, storeSales: null };

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { onlineOrders: null, storeSales: null };

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const toIntCents = (val: string | number | undefined): number | null => {
      if (val === undefined || val === null || val === '') return null;
      const num = parseFloat(String(val).replace(/[^\d.]/g, ''));
      return isNaN(num) ? null : Math.round(num * 100);
    };

    return {
      onlineOrders: toIntCents(parsed.onlineOrders),
      storeSales: toIntCents(parsed.storeSales),
    };
  } catch {
    return { onlineOrders: null, storeSales: null };
  }
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (no DB updates) ===' : '=== BACKFILL START ===');

  // Find all sales reports with a file but no online/store data
  const reports = await prisma.salesReport.findMany({
    where: {
      fileUrl: { not: null },
      onlineOrdersCents: null,
      storeSalesCents: null,
    },
    orderBy: { businessDate: 'desc' },
  });

  console.log(`Found ${reports.length} reports to process\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const report of reports) {
    const dateStr = report.businessDate.toISOString().split('T')[0];
    console.log(`Processing: ${report.id} (${dateStr})`);

    // Download image
    const base64 = await downloadImageAsBase64(report.fileUrl!);
    if (!base64) {
      console.log('  Skipped: could not download image\n');
      skipped++;
      continue;
    }

    // Extract via Claude
    try {
      const { onlineOrders, storeSales } = await extractOnlineAndStoreSales(base64);

      if (onlineOrders === null && storeSales === null) {
        console.log('  Skipped: could not extract values\n');
        skipped++;
        continue;
      }

      console.log(`  Online Orders: ${onlineOrders ? `$${(onlineOrders / 100).toFixed(2)}` : 'N/A'}`);
      console.log(`  Store Sales:   ${storeSales ? `$${(storeSales / 100).toFixed(2)}` : 'N/A'}`);

      if (!DRY_RUN) {
        await prisma.salesReport.update({
          where: { id: report.id },
          data: {
            onlineOrdersCents: onlineOrders,
            storeSalesCents: storeSales,
          },
        });
        console.log('  Updated DB\n');
      } else {
        console.log('  (dry run, not updating)\n');
      }
      updated++;

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.log(`  Failed: ${err}\n`);
      failed++;
    }
  }

  console.log('=== SUMMARY ===');
  console.log(`Total:   ${reports.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed:  ${failed}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  prisma.$disconnect();
  process.exit(1);
});
