type Args = {
  baseUrl: string;
  email?: string;
  password?: string;
  name?: string;
};

const parseArgs = (argv: string[]): Args => {
  const args: Args = { baseUrl: 'http://localhost:3000' };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];

    if (!key || !value) continue;

    switch (key) {
      case '--base-url':
        args.baseUrl = value;
        i += 1;
        break;
      case '--email':
        args.email = value;
        i += 1;
        break;
      case '--password':
        args.password = value;
        i += 1;
        break;
      case '--name':
        args.name = value;
        i += 1;
        break;
      default:
        break;
    }
  }

  return args;
};

const main = async () => {
  const { baseUrl, email, password, name } = parseArgs(process.argv.slice(2));

  if (!email || !password) {
    console.error('Usage: ts-node scripts/register.ts --email <email> --password <password> [--name <name>] [--base-url <url>]');
    process.exit(1);
  }

  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('Registration failed:', data);
    process.exit(1);
  }

  console.log('Registration succeeded:', data);
};

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
