/**
 * Guards the `?next=` redirect target used across the auth flow. Without
 * this, `/login?next=https://evil.example/phish` would carry an attacker's
 * URL all the way through a completely real sign-in (including a real
 * Google consent screen) and land the now-authenticated user on it right
 * after the moment they're most likely to trust the page — a classic
 * open-redirect phishing amplifier (CWE-601).
 *
 * Only a same-origin relative path is accepted. `//evil.example` is a
 * protocol-relative URL (still off-site despite starting with "/"), so
 * that's rejected too.
 */
export function safeNext(value: string | null | undefined): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/buying";
}
