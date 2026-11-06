const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;

export function isValidEmail(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  if (!EMAIL_REGEX.test(email)) return "Enter a valid email address.";
  return null;
}

// The passwords people pick most often. Length alone lets these through, and
// they're the first thing anyone guessing would try.
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password12", "password123", "passw0rd", "p@ssw0rd", "p@ssword",
  "12345678", "123456789", "1234567890", "11111111", "00000000", "87654321", "12341234",
  "qwertyui", "qwerty123", "qwertyuiop", "1q2w3e4r", "1qaz2wsx", "q1w2e3r4", "asdfghjk", "zxcvbnm1",
  "iloveyou", "letmein1", "welcome1", "welcome123", "admin123", "abc12345", "abcd1234", "monkey123",
  "football", "baseball", "superman", "trustno1", "dragon123", "sunshine", "princess", "whatever",
  "fxinsites", "forex123", "trading123", "tradingview",
]);

export function isValidPassword(password: string, context?: { email?: string; username?: string }): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 72) return "Password must be 72 characters or fewer.";

  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return "That password is too common. Choose something harder to guess.";
  // Just the same character repeated, e.g. "aaaaaaaa".
  if (new Set(lower).size === 1) return "That password is too easy to guess. Choose something harder.";
  if (context?.username && lower === context.username.toLowerCase()) return "Your password can't be the same as your username.";
  if (context?.email && lower === context.email.trim().toLowerCase()) return "Your password can't be the same as your email.";
  return null;
}

export function isValidUsername(username: string): string | null {
  if (!USERNAME_REGEX.test(username)) {
    return "Username must be 3-20 characters, start with a letter, and contain only letters, numbers, and underscores.";
  }
  return null;
}
