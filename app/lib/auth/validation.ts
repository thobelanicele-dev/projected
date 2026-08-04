const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;

export function isValidEmail(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  if (!EMAIL_REGEX.test(email)) return "Enter a valid email address.";
  return null;
}

export function isValidPassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 72) return "Password must be 72 characters or fewer.";
  return null;
}

export function isValidUsername(username: string): string | null {
  if (!USERNAME_REGEX.test(username)) {
    return "Username must be 3-20 characters, start with a letter, and contain only letters, numbers, and underscores.";
  }
  return null;
}
