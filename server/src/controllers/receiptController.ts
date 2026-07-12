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
  items?: Array<{
    name?: string;
    normalizedName?: string;
    quantity?: string;
    unit?: string;
    unitPrice?: string;
    total?: string;
  }>;
}

const receiptExtractionTool = {
  name: 'record_receipt_data',
  description: 'Record structured data extracted from a receipt, invoice, or sales report image.',
  input_schema: {
    type: 'object',
    properties: {
      documentType: { type: 'string', enum: ['receipt', 'sales_report'] },
      merchant: { type: 'string' },
      amount: { type: 'string' },
      date: { type: 'string', description: 'Date in YYYY-MM-DD format.' },
      category: { type: 'string' },
      notes: { type: 'string' },
      grossSales: { type: 'string' },
      netSales: { type: 'string' },
      cash: { type: 'string' },
      tips: { type: 'string' },
      tax: { type: 'string' },
      discounts: { type: 'string' },
      refunds: { type: 'string' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            normalizedName: { type: 'string' },
            quantity: { type: 'string' },
            unit: { type: 'string' },
            unitPrice: { type: 'string' },
            total: { type: 'string' },
          },
          required: ['name', 'normalizedName', 'quantity', 'unit', 'unitPrice', 'total'],
        },
      },
    },
    required: [
      'documentType',
      'merchant',
      'amount',
      'date',
      'category',
      'notes',
      'grossSales',
      'netSales',
      'cash',
      'tips',
      'tax',
      'discounts',
      'refunds',
      'items',
    ],
  },
};

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
      tools: [receiptExtractionTool as any],
      tool_choice: { type: 'tool', name: 'record_receipt_data' },
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
              text: `Please analyze this document and call the record_receipt_data tool with the extracted fields.${categoryText}

IMPORTANT RULES:
1. First determine documentType: "receipt" for purchase receipts/invoices/expenses, "sales_report" for daily sales summaries/revenue reports/income documents.
2. For sales reports: Put ALL financial figures into their specific fields (grossSales, netSales, cash, tips, tax, discounts, refunds). Do NOT put dollar amounts in the notes field. Leave merchant, amount, and category as empty string.
3. For receipts: Fill merchant, amount, category, and notes. Leave all sales report fields (grossSales, netSales, cash, tips, tax, discounts, refunds) as empty string.
4. For receipts: Extract itemized line items when visible. normalizedName should group variants into one inventory item name. Examples: "HASS AVOCADO", "SMALL AVOCADO", and "ORGANIC AVOCADOS" all normalize to "Avocados"; "Roma Tomato" and "Tomatoes 5lb" normalize to "Tomatoes". Do not collapse different meat cuts into a generic meat name: "Chicken Thigh" normalizes to "Chicken Thighs", while "Chicken Leg" or "Chicken Drumstick" normalizes to "Chicken Legs".
5. All monetary values must be numbers only (no $ signs, no commas).
6. If a field cannot be determined, use empty string.`,
            },
          ],
        },
      ],
    });

    const toolUse = message.content.find((content: any) => (
      content.type === 'tool_use' && content.name === 'record_receipt_data'
    )) as any;

    let extracted: ExtractedReceiptData;
    if (toolUse?.input && typeof toolUse.input === 'object') {
      extracted = toolUse.input as ExtractedReceiptData;
    } else {
      const textContent = message.content.find((content: any) => content.type === 'text') as any;
      const jsonMatch = textContent?.text?.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse Claude response');
      }
      try {
        extracted = JSON.parse(jsonMatch[0]);
      } catch (parseError: any) {
        console.error('Claude returned invalid extraction JSON:', parseError?.message);
        throw new Error('AI returned invalid extraction data. Please try again.');
      }
    }

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

    if (!Array.isArray(extracted.items)) {
      extracted.items = [];
    } else {
      extracted.items = extracted.items.map(item => ({
        name: String(item.name || '').trim(),
        normalizedName: String(item.normalizedName || item.name || '').trim(),
        quantity: item.quantity !== undefined && item.quantity !== null && item.quantity !== ''
          ? String(item.quantity).replace(/[^\d.]/g, '')
          : '',
        unit: String(item.unit || '').trim(),
        unitPrice: item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice !== ''
          ? String(item.unitPrice).replace(/[^\d.]/g, '')
          : '',
        total: item.total !== undefined && item.total !== null && item.total !== ''
          ? String(item.total).replace(/[^\d.]/g, '')
          : '',
      })).filter(item => item.name || item.normalizedName);
    }

    res.json(extracted);
  } catch (error: any) {
    console.error('Error extracting receipt data:', error?.status, error?.message, error?.error);
    res.status(500).json({
      error: error?.error?.message || error?.message || 'Failed to extract receipt data',
    });
  }
};
