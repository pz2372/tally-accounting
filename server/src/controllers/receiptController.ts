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
}

/**
 * Extract receipt data from base64-encoded image using Claude Vision
 * POST /api/receipts/extract
 * Body: { image: string (base64) }
 */
export const extractReceiptData = async (req: Request, res: Response) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Call Claude Vision to extract receipt data
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
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
              text: `Please analyze this receipt image and extract the following information in JSON format:
{
  "merchant": "business name",
  "amount": "total amount (numbers only, e.g., '45.99')",
  "date": "date in YYYY-MM-DD format if visible, otherwise current date",
  "notes": "brief description of what was purchased, if visible"
}

If any field cannot be determined from the receipt, use empty string. Be concise.`,
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

    res.json(extracted);
  } catch (error: any) {
    console.error('Error extracting receipt data:', error);
    res.status(500).json({
      error: error.message || 'Failed to extract receipt data',
    });
  }
};
