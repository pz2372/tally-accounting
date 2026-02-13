import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = [
  { key: 'food', name: 'Food & Ingredients', color: '#FF6B6B' },
  { key: 'supplies', name: 'Supplies', color: '#4ECDC4' },
  { key: 'labor', name: 'Labor', color: '#45B7D1' },
  { key: 'utilities', name: 'Utilities', color: '#FFA07A' },
  { key: 'rent', name: 'Rent', color: '#98D8C8' },
  { key: 'marketing', name: 'Marketing', color: '#F7DC6F' },
  { key: 'equipment', name: 'Equipment', color: '#BB8FCE' },
  { key: 'other', name: 'Other', color: '#95A5A6' }
];

const MERCHANTS = [
  'Sysco Food Services',
  'US Foods',
  'Restaurant Depot',
  'Amazon Business',
  'Costco Wholesale',
  'Home Depot',
  'Office Depot',
  'Staples',
  'Local Produce Market',
  'City Utilities',
  'Gas Company',
  'Internet Provider',
  'Cleaning Supply Co',
  'Packaging Supply Inc'
];

const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const getRandomAmount = (min: number, max: number): number => 
  Math.floor(Math.random() * (max - min) + min);

const getRandomDate = (year: number, month: number): Date => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = Math.floor(Math.random() * daysInMonth) + 1;
  const hour = Math.floor(Math.random() * 24);
  const minute = Math.floor(Math.random() * 60);
  return new Date(year, month - 1, day, hour, minute);
};

const main = async () => {
  const args = process.argv.slice(2);
  const orgIdArg = args.find(arg => arg.startsWith('--org-id='));
  
  if (!orgIdArg) {
    console.error('Usage: ts-node scripts/seedExpenses.ts --org-id=<organization_id>');
    process.exit(1);
  }

  const orgId = orgIdArg.split('=')[1];

  // Verify org exists
  const org = await prisma.organization.findUnique({
    where: { id: orgId }
  });

  if (!org) {
    console.error(`Organization with id ${orgId} not found`);
    process.exit(1);
  }

  console.log(`Seeding expenses for organization: ${org.name}`);

  // Create preset categories if they don't exist
  console.log('Creating preset categories...');
  for (const cat of CATEGORIES) {
    await prisma.presetCategory.upsert({
      where: { key: cat.key },
      update: {},
      create: { ...cat, sortOrder: CATEGORIES.indexOf(cat) }
    });
  }

  // Get all preset categories
  const presetCategories = await prisma.presetCategory.findMany();

  // Create org categories (enable all presets for this org)
  console.log('Enabling categories for organization...');
  for (const preset of presetCategories) {
    await prisma.orgCategory.upsert({
      where: {
        orgId_presetCategoryId: {
          orgId,
          presetCategoryId: preset.id
        }
      },
      update: {},
      create: {
        orgId,
        presetCategoryId: preset.id,
        isEnabled: true,
        sortOrder: preset.sortOrder
      }
    });
  }

  // Get org categories
  const orgCategories = await prisma.orgCategory.findMany({
    where: { orgId, isEnabled: true },
    include: { preset: true }
  });

  console.log(`Found ${orgCategories.length} enabled categories`);

  // Generate expenses for January 2026
  console.log('Generating January 2026 expenses...');
  const januaryExpenses = [];
  for (let i = 0; i < 25; i++) {
    const orgCategory = getRandomElement(orgCategories);
    januaryExpenses.push({
      orgId,
      merchant: getRandomElement(MERCHANTS),
      amountCents: getRandomAmount(1000, 50000), // $10 to $500
      currency: 'USD',
      orgCategoryId: orgCategory.id,
      categoryNameSnapshot: orgCategory.preset.name,
      expenseDate: getRandomDate(2026, 1),
      notes: Math.random() > 0.7 ? 'Regular monthly expense' : null
    });
  }

  await prisma.expense.createMany({ data: januaryExpenses });
  console.log(`✓ Created ${januaryExpenses.length} expenses for January 2026`);

  // Generate expenses for February 2026
  console.log('Generating February 2026 expenses...');
  const februaryExpenses = [];
  for (let i = 0; i < 15; i++) {
    const orgCategory = getRandomElement(orgCategories);
    februaryExpenses.push({
      orgId,
      merchant: getRandomElement(MERCHANTS),
      amountCents: getRandomAmount(1000, 50000),
      currency: 'USD',
      orgCategoryId: orgCategory.id,
      categoryNameSnapshot: orgCategory.preset.name,
      expenseDate: getRandomDate(2026, 2),
      notes: Math.random() > 0.7 ? 'February expense' : null
    });
  }

  await prisma.expense.createMany({ data: februaryExpenses });
  console.log(`✓ Created ${februaryExpenses.length} expenses for February 2026`);

  // Summary
  const totalExpenses = await prisma.expense.count({ where: { orgId } });
  const totalAmountResult = await prisma.expense.aggregate({
    where: { orgId },
    _sum: { amountCents: true }
  });

  console.log('\n📊 Summary:');
  console.log(`Total expenses: ${totalExpenses}`);
  console.log(`Total amount: $${((totalAmountResult._sum.amountCents || 0) / 100).toFixed(2)}`);
  console.log('\n✅ Seeding complete!');
};

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
