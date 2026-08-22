/**
 * Shared validation rules — kept in one place so the client form, the API
 * route, and the DB constraint (supabase/07-profiles.sql's
 * profiles_username_format check) can't drift from each other the way
 * MAX_PHOTOS/quantity bounds briefly did before being centralised.
 */

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function isValidUsername(value: string): boolean {
  return USERNAME_RE.test(value);
}

export const MAX_LISTING_QUANTITY = 500;

/** Trunc + range check — a listing's starting stock, never trusted as-is from a client. */
export function isValidQuantity(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value >= 1 && value <= MAX_LISTING_QUANTITY;
}
