import { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ExtractedReceiptData {
  merchant: string;
  amount: string;
  date: string;
  category?: string;
  notes?: string;
  documentType?: 'receipt' | 'sales_report';
  // Sales report specific fields
  grossSales?: string;
  netSales?: string;
  cash?: string;
  tips?: string;
  tax?: string;
  discounts?: string;
  refunds?: string;
}

/**
 * Extract receipt data from base64-encoded image using Claude Vision
 * POST /api/receipts/extract
 * Body: { image: string (base64) }
 */
export const extractReceiptData = async (req: Request, res: Response) => {
  try {
    const { image, categories } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Check image size - Anthropic limit is ~5MB base64
    const imageSizeBytes = (image.length * 3) / 4;
    if (imageSizeBytes > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image is too large. Please try again.' });
    }

    // Build category suggestions for Claude
    const categoryList = Array.isArray(categories) ? categories : [];
    const categoryText = categoryList.length > 0
      ? `\nChoose the best category from: ${categoryList.join(', ')}`
      : '';

    // Call Claude Vision to extract receipt data
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: image,
              },
            },
            {
              type: 'text',
              text: `Please analyze this document and extract the following information in JSON format:
{
  "documentType": "receipt or sales_report - determine from the document (receipt=business expense, sales_report=business income)",
  "merchant": "business name or store name (for receipts only, leave empty for sales reports)",
  "amount": "total amount (numbers only, e.g., '45.99') - for receipts only",
  "date": "date in YYYY-MM-DD format if visible, otherwise current date",
  "category": "best matching category based on merchant and items"${categoryText},
  "notes": "brief 1-line description only if relevant context exists (do NOT put financial figures here)",
  "grossSales": "gross/total sales amount (numbers only, e.g., '1234.56')",
  "netSales": "net sales amount after deductions (numbers only)",
  "cash": "cash sales amount (numbers only)",
  "tips": "tips/gratuity amount (numbers only)",
  "tax": "tax collected amount (numbers only)",
  "discounts": "total discounts amount (numbers only)",
  "refunds": "total refunds amount (numbers only)"
}

IMPORTANT RULES:
1. First determine documentType: "receipt" for purchase receipts/invoices/expenses, "sales_report" for daily sales summaries/revenue reports/income documents.
2. For sales reports: Put ALL financial figures into their specific fields (grossSales, netSales, cash, tips, tax, discounts, refunds). Do NOT put dollar amounts in the notes field. Leave merchant, amount, and category as empty string.
3. For receipts: Fill merchant, amount, category, and notes. Leave all sales report fields (grossSales, netSales, cash, tips, tax, discounts, refunds) as empty string.
4. All monetary values must be numbers only (no $ signs, no commas).
5. If a field cannot be determined, use empty string.`,
            },
          ],
        },
      ],
    });

    // Parse Claude's response
    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from the response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse Claude response');
    }

    const extracted: ExtractedReceiptData = JSON.parse(jsonMatch[0]);

    // Validate and clean up data
    if (!extracted.merchant) {
      extracted.merchant = '';
    }
    if (!extracted.amount) {
      extracted.amount = '';
    } else {
      // Ensure amount is numeric only
      extracted.amount = extracted.amount.replace(/[^\d.]/g, '');
    }
    if (!extracted.date) {
      extracted.date = new Date().toISOString().split('T')[0];
    }
    if (!extracted.notes) {
      extracted.notes = '';
    }
    // Validate category is in the allowed list
    if (extracted.category && categoryList.length > 0 && !categoryList.includes(extracted.category)) {
      extracted.category = '';
    }
    // Validate documentType
    if (!extracted.documentType || !['receipt', 'sales_report'].includes(extracted.documentType)) {
      extracted.documentType = 'receipt';
    }

    // Clean up sales report numeric fields — Claude may return numbers or strings
    const numericFields = ['grossSales', 'netSales', 'cash', 'tips', 'tax', 'discounts', 'refunds'] as const;
    for (const field of numericFields) {
      const raw = extracted[field];
      if (raw !== undefined && raw !== null && raw !== '') {
        extracted[field] = String(raw).replace(/[^\d.]/g, '');
      } else {
        extracted[field] = '';
      }
    }

    res.json(extracted);
  } catch (error: any) {
    console.error('Error extracting receipt data:', error?.status, error?.message, error?.error);
    res.status(500).json({
      error: error?.error?.message || error?.message || 'Failed to extract receipt data',
    });
  }
};
