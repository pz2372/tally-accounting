import { Request, Response } from 'express';
import { CountryCode, Products } from 'plaid';
import jwt from 'jsonwebtoken';
import { plaidClient } from '../config/plaid';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types/http';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<Response | void>;

// POST /api/plaid/create-link-token
export const createLinkToken: Handler = async (req, res) => {
  try {
    const userId = req.user.id;

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Tally',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: `${process.env.API_URL}/api/plaid/webhook`,
    });

    return res.json({ success: true, link_token: response.data.link_token });
  } catch (error) {
    console.error('Plaid createLinkToken error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create link token' });
  }
};

// POST /api/plaid/exchange-token
export const exchangeToken: Handler = async (req, res) => {
  try {
    const { public_token, institution_id, institution_name } = req.body;
    const orgId = req.user.orgId;

    if (!public_token) {
      return res.status(400).json({ success: false, error: 'public_token is required' });
    }
    if (!orgId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }

    // Exchange public token for access token
    const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = exchangeRes.data;

    // Fetch accounts from Plaid
    const accountsRes = await plaidClient.accountsGet({ access_token });
    const accounts = accountsRes.data.accounts;

    // Save PlaidItem and accounts to DB
    const plaidItem = await prisma.plaidItem.create({
      data: {
        orgId,
        accessToken: access_token,
        itemId: item_id,
        institutionId: institution_id || null,
        institutionName: institution_name || null,
        accounts: {
          create: accounts.map((a) => ({
            accountId: a.account_id,
            name: a.name,
            officialName: a.official_name || null,
            type: a.type,
            subtype: a.subtype || null,
            mask: a.mask || null,
            currentBalance: a.balances.current ?? null,
            availableBalance: a.balances.available ?? null,
            currency: a.balances.iso_currency_code || 'USD',
          })),
        },
      },
      include: { accounts: true },
    });

    return res.status(201).json({ success: true, plaidItem });
  } catch (error) {
    console.error('Plaid exchangeToken error:', error);
    return res.status(500).json({ success: false, error: 'Failed to exchange token' });
  }
};

// GET /api/plaid/accounts
export const getAccounts: Handler = async (req, res) => {
  try {
    const orgId = req.user.orgId;

    if (!orgId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }

    const items = await prisma.plaidItem.findMany({
      where: { orgId },
      include: { accounts: true },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({ success: true, items });
  } catch (error) {
    console.error('Plaid getAccounts error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch accounts' });
  }
};

// Verify a Plaid webhook JWT signature
async function verifyPlaidWebhook(req: Request): Promise<boolean> {
  const token = req.headers['plaid-verification'] as string | undefined;
  if (!token) return false;

  try {
    // Decode header to get key_id without verifying first
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') return false;

    const keyId = (decoded.header as { kid?: string }).kid;
    if (!keyId) return false;

    // Fetch the verification key from Plaid
    const keyResponse = await plaidClient.webhookVerificationKeyGet({ key_id: keyId });
    const plaidKey = keyResponse.data.key;

    // Build a PEM from the JWK — Plaid keys are EC P-256
    const { createPublicKey } = await import('crypto');
    const publicKey = createPublicKey({ key: plaidKey as unknown as import('crypto').JsonWebKey, format: 'jwk' });
    const pem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

    jwt.verify(token, pem, { algorithms: ['ES256'] });
    return true;
  } catch (err) {
    console.error('Plaid webhook verification failed:', err);
    return false;
  }
}

// POST /api/plaid/webhook  (called by Plaid — no auth middleware)
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const isValid = await verifyPlaidWebhook(req);
  if (!isValid) {
    res.sendStatus(400);
    return;
  }

  // Acknowledge after verification — Plaid expects a fast 200
  res.sendStatus(200);

  const { webhook_type, webhook_code, item_id } = req.body;

  if (webhook_type !== 'TRANSACTIONS') return;
  if (webhook_code !== 'SYNC_UPDATES_AVAILABLE') return;

  try {
    const plaidItem = await prisma.plaidItem.findUnique({ where: { itemId: item_id } });
    if (!plaidItem) return;
    await syncItemTransactions(plaidItem.id);
  } catch (err) {
    console.error('Plaid webhook sync error:', err);
  }
};

// Pulls all pending updates for one PlaidItem via /transactions/sync
async function syncItemTransactions(plaidItemInternalId: string): Promise<void> {
  const plaidItem = await prisma.plaidItem.findUnique({
    where: { id: plaidItemInternalId },
  });
  if (!plaidItem) return;

  let cursor = plaidItem.syncCursor ?? undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: plaidItem.accessToken,
      cursor,
      options: { include_personal_finance_category: true },
    });

    const { added, modified, removed, next_cursor, has_more } = response.data;

    // Upsert added + modified
    for (const txn of [...added, ...modified]) {
      await prisma.cardTransaction.upsert({
        where: { plaidTransactionId: txn.transaction_id },
        update: {
          amount: txn.amount,
          isoCurrencyCode: txn.iso_currency_code ?? null,
          unofficialCurrencyCode: txn.unofficial_currency_code ?? null,
          date: new Date(txn.date),
          authorizedDate: txn.authorized_date ? new Date(txn.authorized_date) : null,
          authorizedDatetime: txn.authorized_datetime ? new Date(txn.authorized_datetime) : null,
          datetime: txn.datetime ? new Date(txn.datetime) : null,
          name: txn.name,
          merchantName: txn.merchant_name ?? null,
          merchantEntityId: txn.merchant_entity_id ?? null,
          logoUrl: txn.logo_url ?? null,
          website: txn.website ?? null,
          paymentChannel: txn.payment_channel ?? null,
          transactionCode: txn.transaction_code ?? null,
          pending: txn.pending,
          pendingTransactionId: txn.pending_transaction_id ?? null,
          categoryId: txn.category_id ?? null,
          category: txn.category ?? undefined,
          personalFinanceCategory: txn.personal_finance_category?.primary ?? null,
          personalFinanceCategoryDetail: txn.personal_finance_category?.detailed ?? null,
          personalFinanceCategoryIconUrl: txn.personal_finance_category_icon_url ?? null,
          address: txn.location?.address ?? null,
          city: txn.location?.city ?? null,
          region: txn.location?.region ?? null,
          postalCode: txn.location?.postal_code ?? null,
          country: txn.location?.country ?? null,
          lat: txn.location?.lat ?? null,
          lon: txn.location?.lon ?? null,
        },
        create: {
          orgId: plaidItem.orgId,
          plaidTransactionId: txn.transaction_id,
          plaidAccountId: txn.account_id,
          pendingTransactionId: txn.pending_transaction_id ?? null,
          amount: txn.amount,
          isoCurrencyCode: txn.iso_currency_code ?? null,
          unofficialCurrencyCode: txn.unofficial_currency_code ?? null,
          date: new Date(txn.date),
          authorizedDate: txn.authorized_date ? new Date(txn.authorized_date) : null,
          authorizedDatetime: txn.authorized_datetime ? new Date(txn.authorized_datetime) : null,
          datetime: txn.datetime ? new Date(txn.datetime) : null,
          name: txn.name,
          merchantName: txn.merchant_name ?? null,
          merchantEntityId: txn.merchant_entity_id ?? null,
          logoUrl: txn.logo_url ?? null,
          website: txn.website ?? null,
          paymentChannel: txn.payment_channel ?? null,
          transactionCode: txn.transaction_code ?? null,
          pending: txn.pending,
          categoryId: txn.category_id ?? null,
          category: txn.category ?? undefined,
          personalFinanceCategory: txn.personal_finance_category?.primary ?? null,
          personalFinanceCategoryDetail: txn.personal_finance_category?.detailed ?? null,
          personalFinanceCategoryIconUrl: txn.personal_finance_category_icon_url ?? null,
          address: txn.location?.address ?? null,
          city: txn.location?.city ?? null,
          region: txn.location?.region ?? null,
          postalCode: txn.location?.postal_code ?? null,
          country: txn.location?.country ?? null,
          lat: txn.location?.lat ?? null,
          lon: txn.location?.lon ?? null,
        },
      });
    }

    // Delete removed transactions
    if (removed.length > 0) {
      await prisma.cardTransaction.deleteMany({
        where: {
          plaidTransactionId: { in: removed.map((r) => r.transaction_id) },
        },
      });
    }

    cursor = next_cursor;
    hasMore = has_more;
  }

  // Persist the latest cursor so the next sync starts from here
  await prisma.plaidItem.update({
    where: { id: plaidItemInternalId },
    data: { syncCursor: cursor },
  });
}

// DELETE /api/plaid/items/:itemId
export const removeItem: Handler = async (req, res) => {
  try {
    const { itemId } = req.params;
    const orgId = req.user.orgId;

    const item = await prisma.plaidItem.findUnique({ where: { id: itemId } });

    if (!item || item.orgId !== orgId) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    // Remove from Plaid
    await plaidClient.itemRemove({ access_token: item.accessToken });

    // Remove from DB (accounts cascade)
    await prisma.plaidItem.delete({ where: { id: itemId } });

    return res.json({ success: true, message: 'Account disconnected' });
  } catch (error) {
    console.error('Plaid removeItem error:', error);
    return res.status(500).json({ success: false, error: 'Failed to disconnect account' });
  }
};
