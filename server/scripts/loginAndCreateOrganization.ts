export {};

type Args = {
  baseUrl: string;
  apiKey?: string;
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
      case '--api-key':
        args.apiKey = value;
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

const signInWithPassword = async (apiKey: string, email: string, password: string) => {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Firebase sign-in failed');
  }

  return data.idToken as string;
};

const exchangeFirebaseToken = async (baseUrl: string, firebaseToken: string) => {
  const response = await fetch(`${baseUrl}/api/auth/firebase-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firebaseToken })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.accessToken) {
    throw new Error(data?.error || 'Server token exchange failed');
  }

  return data.accessToken as string;
};

const createOrganization = async (baseUrl: string, accessToken: string, name: string) => {
  const response = await fetch(`${baseUrl}/api/organizations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ name })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || 'Create organization failed');
  }

  return data;
};

const main = async () => {
  const { baseUrl, apiKey, email, password, name } = parseArgs(process.argv.slice(2));

  if (!apiKey || !email || !password || !name) {
    console.error('Usage: ts-node scripts/loginAndCreateOrganization.ts --api-key <firebase_api_key> --email <email> --password <password> --name <org_name> [--base-url <url>]');
    process.exit(1);
  }

  const firebaseToken = await signInWithPassword(apiKey, email, password);
  const accessToken = await exchangeFirebaseToken(baseUrl, firebaseToken);
  const result = await createOrganization(baseUrl, accessToken, name);

  console.log('Organization created:', result);
};

main().catch((error) => {
  console.error('Unexpected error:', error.message || error);
  process.exit(1);
});
