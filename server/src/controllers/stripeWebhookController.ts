import { Request, Response } from 'express';
import { stripe } from '../config/stripe';
import prisma from '../config/database';

export const handleStripeWebhook = async (req: Request, res: Response) => {
  if (!stripe) return res.status(503).send();

  const sig = req.headers['stripe-signature'] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send('Webhook Error');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const stripeSubId = (session.subscription as string) || null;

    if (session.payment_status === 'paid' && session.metadata?.userId && stripeSubId) {
      // Idempotency check
      const existing = await prisma.organizationSubscription.findFirst({
        where: { stripeSubscriptionId: stripeSubId },
      });

      if (!existing && session.metadata.orgName) {
        try {
          await prisma.organization.create({
            data: {
              name: session.metadata.orgName,
              dba: session.metadata.orgDba || null,
              ein: session.metadata.orgEin || null,
              billingOwnerId: session.metadata.userId,
              members: {
                create: {
                  userId: session.metadata.userId,
                  role: 'ADMIN',
                  permissions: [],
                },
              },
              subscription: {
                create: {
                  status: 'ACTIVE',
                  plan: 'basic',
                  stripeCustomerId: (session.customer as string) || null,
                  stripeSubscriptionId: stripeSubId,
                },
              },
            },
          });
        } catch (err) {
          console.error('Webhook org creation error:', err);
        }
      }
    }
  }

  res.json({ received: true });
};
