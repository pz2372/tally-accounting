import twilio from 'twilio';
import type { MessageInstance } from 'twilio/lib/rest/api/v2010/account/message';

let twilioClient: ReturnType<typeof twilio> | null = null;

export const normalizePhoneNumberToE164 = (value: string | null | undefined, defaultCountryCode = '1') => {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('+')) {
    const normalized = `+${trimmed.slice(1).replace(/\D/g, '')}`;
    return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10 && defaultCountryCode === '1') {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  const withCountryCode = `+${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(withCountryCode) ? withCountryCode : null;
};

const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials are not configured');
  }

  if (!twilioClient) {
    twilioClient = twilio(accountSid, authToken);
  }

  return twilioClient;
};

export const sendSms = async (to: string, body: string) => {
  const from = process.env.TWILIO_FROM_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const normalizedTo = normalizePhoneNumberToE164(to);

  if (!normalizedTo) {
    throw new Error('SMS recipient must be a valid E.164 phone number');
  }

  if (!from && !messagingServiceSid) {
    throw new Error('TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID is not configured');
  }

  const message = await getTwilioClient().messages.create({
    ...(messagingServiceSid ? { messagingServiceSid } : { from }),
    to: normalizedTo,
    body,
  }) as MessageInstance;

  console.log('[sms] Twilio message queued', {
    sid: message.sid,
    status: message.status,
    to: normalizedTo,
  });

  return message;
};
