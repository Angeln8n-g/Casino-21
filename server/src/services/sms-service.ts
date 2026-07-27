import crypto from 'crypto';

interface CodeEntry {
  hash: string;
  expiresAt: number;
}

const activeCodes = new Map<string, CodeEntry>();

export function generateSmsOtp(phoneNumber: string): string {
  // Generar código aleatorio de 6 dígitos
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutos

  activeCodes.set(phoneNumber, { hash, expiresAt });

  console.log(`[SMS Service] Código OTP para ${phoneNumber}: ${code}`);
  return code;
}

export function verifySmsOtp(phoneNumber: string, code: string): boolean {
  const entry = activeCodes.get(phoneNumber);
  if (!entry) return false;

  if (Date.now() > entry.expiresAt) {
    activeCodes.delete(phoneNumber);
    return false;
  }

  const hash = crypto.createHash('sha256').update(code).digest('hex');
  if (hash === entry.hash) {
    activeCodes.delete(phoneNumber);
    return true;
  }

  return false;
}
