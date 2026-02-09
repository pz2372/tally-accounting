export {};

type Args = {
  baseUrl: string;
  token?: string;
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
      case '--token':
        args.token = value;
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
  const { baseUrl, token, name } = parseArgs(process.argv.slice(2));

  if (!token || !name) {
    console.error('Usage: ts-node scripts/createOrganization.ts --token <access_token> --name <org_name> [--base-url <url>]');
    process.exit(1);
  }

  const response = await fetch(`${baseUrl}/api/organizations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ name })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('Create organization failed:', data);
    process.exit(1);
  }

  console.log('Organization created:', data);
};

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
