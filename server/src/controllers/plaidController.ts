import { Request, Response } from 'express';
import { CountryCode, Products } from 'plaid';
import jwt from 'jsonwebtoken';
import { plaidClient } from '../config/plaid';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types/http';
import { executeMatching } from './matchController';

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
// Stores transactions as Statement + StatementTransaction (grouped by month)
async function syncItemTransactions(plaidItemInternalId: string): Promise<void> {
  const plaidItem = await prisma.plaidItem.findUnique({
    where: { id: plaidItemInternalId },
    include: { accounts: true },
  });
  if (!plaidItem) return;

  // Build a lookup: Plaid accountId -> last4 mask
  const accountMaskMap = new Map(
    plaidItem.accounts.map(a => [a.accountId, a.mask])
  );

  let cursor = plaidItem.syncCursor ?? undefined;
  let hasMore = true;
  const affectedStatementIds = new Set<string>();

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: plaidItem.accessToken,
      cursor,
      options: { include_personal_finance_category: true },
    });

    const { added, modified, removed, next_cursor, has_more } = response.data;

    // Process added + modified: group by month, upsert Statement + StatementTransaction
    for (const txn of [...added, ...modified]) {
      // Skip pending transactions - only store posted
      if (txn.pending) continue;

      const txnDate = new Date(txn.date);
      const statementMonth = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}`;
      const provider = plaidItem.institutionName || 'Unknown Bank';

      // Find or create the Statement for this month + institution
      const statement = await prisma.statement.upsert({
        where: {
          orgId_statementMonth_provider: {
            orgId: plaidItem.orgId,
            statementMonth,
            provider,
          },
        },
        update: { updatedAt: new Date() },
        create: {
          orgId: plaidItem.orgId,
          provider,
          statementMonth,
          sourceType: 'plaid',
        },
      });

      affectedStatementIds.add(statement.id);

      // Upsert the StatementTransaction keyed on plaidTransactionId
      await prisma.statementTransaction.upsert({
        where: { plaidTransactionId: txn.transaction_id },
        update: {
          postedDate: txnDate,
          transactionDate: txn.authorized_date ? new Date(txn.authorized_date) : null,
          merchantRaw: txn.name,
          merchantNorm: txn.merchant_name ?? null,
          amountCents: Math.round(txn.amount * 100),
          currency: txn.iso_currency_code || 'USD',
          last4: accountMaskMap.get(txn.account_id) || null,
        },
        create: {
          statementId: statement.id,
          plaidTransactionId: txn.transaction_id,
          postedDate: txnDate,
          transactionDate: txn.authorized_date ? new Date(txn.authorized_date) : null,
          merchantRaw: txn.name,
          merchantNorm: txn.merchant_name ?? null,
          amountCents: Math.round(txn.amount * 100),
          currency: txn.iso_currency_code || 'USD',
          last4: accountMaskMap.get(txn.account_id) || null,
        },
      });
    }

    // Handle removed transactions: delete matches first, then statement transactions
    if (removed.length > 0) {
      const removedPlaidIds = removed.map(r => r.transaction_id);

      // Delete any matches referencing these transactions
      await prisma.receiptMatch.deleteMany({
        where: {
          cardTxn: { plaidTransactionId: { in: removedPlaidIds } },
        },
      });

      // Delete the statement transactions
      await prisma.statementTransaction.deleteMany({
        where: { plaidTransactionId: { in: removedPlaidIds } },
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

  // Auto-run matching for each affected statement
  for (const statementId of affectedStatementIds) {
    try {
      const result = await executeMatching(plaidItem.orgId, statementId);
      console.log(`Auto-matching for statement ${statementId}: ${result.matchCount} matches`);
    } catch (err) {
      console.error(`Auto-matching error for statement ${statementId}:`, err);
      // Don't throw - matching failure shouldn't break the sync
    }
  }
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
