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
  "merchant": "business name or store name",
  "amount": "total amount (numbers only, e.g., '45.99')",
  "date": "date in YYYY-MM-DD format if visible, otherwise current date",
  "category": "best matching category based on merchant and items"${categoryText},
  "notes": "brief description of what was purchased or sold, if visible"
}

For documentType:
- Use "receipt" if this is a purchase receipt, invoice, or expense document
- Use "sales_report" if this is a daily sales summary, revenue report, or income document

If any field cannot be determined, use empty string for that field. Be concise.`,
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

    res.json(extracted);
  } catch (error: any) {
    console.error('Error extracting receipt data:', error?.status, error?.message, error?.error);
    res.status(500).json({
      error: error?.error?.message || error?.message || 'Failed to extract receipt data',
    });
  }
};
