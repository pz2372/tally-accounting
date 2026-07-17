import { z } from 'zod';

const emptyToUndefined = (value: unknown) => value === '' ? undefined : value;

export const idParam = z.object({
  id: z.string().min(1).max(128),
});

export const memberIdParam = z.object({
  memberId: z.string().min(1).max(128),
});

export const tokenParam = z.object({
  token: z.string().min(1).max(512),
});

export const itemIdParam = z.object({
  itemId: z.string().min(1).max(256),
});

export const statementIdParam = z.object({
  statementId: z.string().min(1).max(128),
});

export const uploadKeyParam = z.object({
  key: z.string().min(1).max(1024),
});

export const optionalDateString = z.preprocess(
  emptyToUndefined,
  z.string().refine(value => !Number.isNaN(new Date(value).getTime()), 'Invalid date').optional()
);

export const optionalMonthString = z.preprocess(
  emptyToUndefined,
  z.string().regex(/^\d{4}-\d{2}$/).optional()
);

export const optionalNumericString = z.preprocess(
  emptyToUndefined,
  z.coerce.number().finite().optional()
);

export const optionalBooleanString = z.preprocess(value => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === '') return undefined;
  return value;
}, z.boolean().optional());

const email = z.string().trim().email().max(254);
const nonEmptyString = z.string().trim().min(1);
const optionalText = z.preprocess(emptyToUndefined, z.string().trim().max(5000).optional());
const optionalShortText = z.preprocess(emptyToUndefined, z.string().trim().max(512).optional());
const moneyCents = z.coerce.number().int().min(0).max(999999999);
const dateString = z.string().refine(value => !Number.isNaN(new Date(value).getTime()), 'Invalid date');

export const authSchemas = {
  register: z.object({
    email,
    password: z.string().min(8).max(256),
    name: nonEmptyString.max(120),
  }).passthrough(),
  firebaseLogin: z.object({
    firebaseToken: z.string().min(10).max(10000),
  }).passthrough(),
  directLogin: z.object({
    email,
    password: z.string().min(1).max(256),
  }).passthrough(),
  registerCheckout: z.object({
    name: nonEmptyString.max(120),
    email,
    orgName: nonEmptyString.max(160),
  }).passthrough(),
  completeRegistration: z.object({
    sessionId: z.string().min(1).max(512),
    password: z.string().min(8).max(256),
  }).passthrough(),
  acceptInvite: z.object({
    token: z.string().min(1).max(512),
    name: nonEmptyString.max(120),
    password: z.string().min(8).max(256),
  }).passthrough(),
  registerFree: z.object({
    name: nonEmptyString.max(120),
    email,
    password: z.string().min(8).max(256),
    orgName: nonEmptyString.max(160),
  }).passthrough(),
  verifyUid: z.object({
    uid: z.string().min(1).max(256),
  }).passthrough(),
  profile: z.object({
    displayName: nonEmptyString.max(120),
  }).passthrough(),
  emailOnly: z.object({
    email,
  }).passthrough(),
  setUserRole: z.object({
    uid: z.string().min(1).max(256),
    role: z.enum(['ADMIN', 'EMPLOYEE']),
  }).passthrough(),
  employee: z.object({
    email,
    password: z.string().min(8).max(256),
    displayName: nonEmptyString.max(120),
    businessId: z.string().min(1).max(128).optional(),
  }).passthrough(),
  verificationCode: z.object({
    code: z.string().trim().regex(/^\d{6}$/),
  }).passthrough(),
};

export const organizationSchemas = {
  checkout: z.object({
    name: nonEmptyString.max(160),
    dba: optionalShortText,
    ein: optionalShortText,
  }).passthrough(),
  completeCheckout: z.object({
    sessionId: z.string().min(1).max(512),
  }).passthrough(),
  update: z.object({
    name: nonEmptyString.max(160).optional(),
    dba: optionalShortText,
    ein: optionalShortText,
    inventoryItemizedTrackerEnabled: z.boolean().optional(),
  }).passthrough(),
  invite: z.object({
    email,
    name: z.string().trim().max(120).optional(),
    role: z.enum(['ADMIN', 'EMPLOYEE']).optional(),
    permissions: z.array(z.string().max(80)).max(50).optional(),
  }).passthrough(),
  memberUpdate: z.object({
    role: z.enum(['ADMIN', 'EMPLOYEE']).optional(),
    permissions: z.array(z.string().max(80)).max(50).optional(),
  }).passthrough(),
};

export const accountSchemas = {
  batchUpdate: z.object({
    accounts: z.array(z.object({
      key: nonEmptyString.max(120),
      enabled: z.boolean().optional(),
      hiddenFromEmployees: z.boolean().optional(),
      displayName: z.string().trim().max(160).optional(),
    }).passthrough()).max(200),
  }).passthrough(),
};

export const categorySchemas = {
  batchUpdate: z.object({
    categories: z.array(z.object({
      key: nonEmptyString.max(120),
      enabled: z.boolean().optional(),
      hiddenFromEmployees: z.boolean().optional(),
    }).passthrough()).max(200),
  }).passthrough(),
};

export const expenseSchemas = {
  filters: z.object({
    startDate: optionalDateString,
    endDate: optionalDateString,
    categoryKey: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
    minAmount: optionalNumericString,
    maxAmount: optionalNumericString,
  }).passthrough(),
  create: z.object({
    merchant: z.string().trim().max(255).optional(),
    amountCents: moneyCents,
    paymentMethod: z.string().trim().max(80).optional(),
    categoryName: nonEmptyString.max(160),
    expenseDate: dateString,
    notes: optionalText,
  }).passthrough(),
  update: z.object({
    merchant: z.string().trim().max(255).optional(),
    amountCents: moneyCents.optional(),
    paymentMethod: z.string().trim().max(80).optional(),
    categoryName: nonEmptyString.max(160).optional(),
    expenseDate: dateString.optional(),
    notes: optionalText,
  }).passthrough(),
  withReceipt: z.object({
    merchant: z.string().trim().max(255).optional(),
    amountCents: moneyCents,
    paymentMethod: z.string().trim().max(80).optional(),
    categoryName: nonEmptyString.max(160),
    expenseDate: dateString,
    notes: optionalText,
    ocrText: optionalText,
    confidence: z.coerce.number().min(0).max(1).optional(),
    inventoryItems: z.union([z.string().max(25000), z.array(z.unknown()).max(300)]).optional(),
  }).passthrough(),
};

const salesReportBase = z.object({
  businessDate: dateString,
  merchant: z.string().trim().max(255).optional(),
  grossSalesCents: moneyCents.optional(),
  netSalesCents: moneyCents.optional(),
  cashCents: moneyCents.optional(),
  creditCardCents: moneyCents.optional(),
  takeoutCents: moneyCents.optional(),
  tipsCents: moneyCents.optional(),
  taxCents: moneyCents.optional(),
  discountsCents: moneyCents.optional(),
  refundsCents: moneyCents.optional(),
  orderCount: z.coerce.number().int().min(0).max(1000000).optional(),
  source: z.string().trim().max(80).optional(),
  notes: optionalText,
}).passthrough();

export const salesReportSchemas = {
  create: salesReportBase,
  update: salesReportBase.partial().passthrough(),
  reject: z.object({
    notes: z.string().trim().max(2000).optional(),
  }).passthrough(),
  filters: z.object({
    startDate: optionalDateString,
    endDate: optionalDateString,
    status: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
    source: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
  }).passthrough(),
  month: z.object({
    month: optionalMonthString,
  }).passthrough(),
  analytics: z.object({
    startDate: optionalDateString,
    endDate: optionalDateString,
  }).passthrough(),
};

export const statementSchemas = {
  create: z.object({
    provider: nonEmptyString.max(120),
    statementMonth: z.string().regex(/^\d{4}-\d{2}$/),
    sourceType: z.string().trim().max(80).optional(),
    transactions: z.array(z.unknown()).max(2000).optional(),
  }).passthrough(),
  filters: z.object({
    provider: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
    statementMonth: optionalMonthString,
  }).passthrough(),
  transactions: z.object({
    hasMatch: optionalBooleanString,
    merchant: z.preprocess(emptyToUndefined, z.string().max(255).optional()),
  }).passthrough(),
  unmatched: z.object({
    statementMonth: optionalMonthString,
  }).passthrough(),
};

export const businessReportSchemas = {
  createPdf: z.object({
    reports: z.array(z.string().max(80)).min(1).max(10),
    startDate: dateString,
    endDate: dateString,
  }).passthrough(),
  automation: z.object({
    action: z.string().trim().max(40).optional(),
    reports: z.array(z.string().max(80)).max(10).optional(),
    deliveryChannels: z.array(z.string().max(40)).max(4).optional(),
    cadence: z.string().trim().max(40).optional(),
    messageRecipient: z.string().trim().max(40).optional().nullable(),
    emailRecipient: z.string().trim().email().max(254).optional().nullable(),
    removeAutomation: z.boolean().optional(),
    deleteAutomation: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }).passthrough(),
  testSms: z.object({
    messageRecipient: z.string().trim().min(7).max(40),
  }).passthrough(),
};

export const receiptSchemas = {
  extract: z.object({
    image: z.string().min(20).max(15_000_000),
    categories: z.array(z.string().max(120)).max(300).optional(),
  }).passthrough(),
};

export const plaidSchemas = {
  exchangeToken: z.object({
    public_token: z.string().min(1).max(512),
    institution_id: z.string().max(256).optional(),
    institution_name: z.string().max(256).optional(),
  }).passthrough(),
};

export const matchSchemas = {
  run: z.object({
    minConfidence: z.coerce.number().min(0).max(1).optional(),
    dateRangeDays: z.coerce.number().int().min(0).max(365).optional(),
  }).passthrough(),
  filters: z.object({
    status: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
    statementId: z.preprocess(emptyToUndefined, z.string().max(128).optional()),
  }).passthrough(),
};

const recurringChargeBase = z.object({
  name: nonEmptyString.max(255),
  merchant: z.string().trim().max(255).optional(),
  amountCents: moneyCents,
  currency: z.string().trim().max(12).optional(),
  categoryName: z.string().trim().max(160).optional(),
  dayOfMonth: z.coerce.number().int().min(1).max(31),
  useLastDay: z.boolean().optional(),
  startDate: dateString,
  endDate: optionalDateString,
  notes: optionalText,
}).passthrough();

export const recurringChargeSchemas = {
  create: recurringChargeBase,
  update: recurringChargeBase.partial().passthrough(),
  filters: z.object({
    status: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
    includeDeleted: optionalBooleanString,
  }).passthrough(),
};

export const uploadSchemas = {
  folderQuery: z.object({
    folder: z.preprocess(emptyToUndefined, z.string().regex(/^[a-zA-Z0-9/_-]{1,120}$/).optional()),
  }).passthrough(),
  deleteByUrl: z.object({
    url: z.string().url().max(2048),
  }).passthrough(),
};

export const supportSchemas = {
  create: z.object({
    subject: nonEmptyString.max(200),
    message: nonEmptyString.max(5000),
  }).passthrough(),
};

export const auditLogSchemas = {
  filters: z.object({
    entityType: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
    entityId: z.preprocess(emptyToUndefined, z.string().max(128).optional()),
    userId: z.preprocess(emptyToUndefined, z.string().max(128).optional()),
    startDate: optionalDateString,
    endDate: optionalDateString,
    limit: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(200).optional()),
    offset: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(100000).optional()),
  }).passthrough(),
};
