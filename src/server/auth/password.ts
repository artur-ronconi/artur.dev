import bcrypt from "bcryptjs";

const ROUNDS = 12;

export const PASSWORD_MIN_LENGTH = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Minimal strength policy applied on the server when creating/changing passwords. */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `A senha precisa ter ao menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return "A senha precisa conter letras maiúsculas e minúsculas.";
  }
  if (!/[0-9]/.test(password)) {
    return "A senha precisa conter ao menos um número.";
  }
  return null;
}
