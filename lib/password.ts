// Mirror whatever minimum you set under Supabase -> Authentication ->
// Providers -> Email -> Password Requirements, so users don't hit a
// confusing server-side rejection after passing this client-side check.
const COMMON_PASSWORDS = new Set([
  "password", "password1", "12345678", "123456789", "qwerty123",
  "letmein1", "iloveyou1", "admin1234", "welcome1", "changeme1",
]);

export function passwordIssues(pw: string): string[] {
  const issues: string[] = [];
  if (pw.length < 8) issues.push("at least 8 characters");
  if (!/[a-zA-Z]/.test(pw)) issues.push("a letter");
  if (!/[0-9]/.test(pw)) issues.push("a number");
  if (COMMON_PASSWORDS.has(pw.toLowerCase())) issues.push("not a commonly used password");
  return issues;
}
