import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * These tests exercise the real database — RLS policies, column grants,
 * and the reserve_listing_stock/release_listing_stock functions'
 * row-locking. A mock can't prove any of those actually hold under a
 * concurrent race; only a real Postgres connection can. They run against
 * whatever project NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY
 * point at (see tests/load-env.ts) — point that at a disposable/local
 * Supabase project, never production, since this creates and deletes
 * real auth users, listings and orders.
 *
 * `npm test` (unit only) always runs. `npm run test:integration` skips
 * itself cleanly via `hasTestSupabase` when those env vars aren't set,
 * rather than failing — see the report for why these aren't wired into
 * a default CI run.
 */
export const hasTestSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

export function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

let counter = 0;
/** A stable-per-process, collision-resistant tag for throwaway test data. */
export function testTag(): string {
  counter += 1;
  return `test-${Date.now()}-${process.pid}-${counter}`;
}

/**
 * Creates a real confirmed user and returns a client signed in as them —
 * a genuine JWT session, not a service-role client pretending, so RLS and
 * auth.uid() inside SECURITY DEFINER functions behave exactly as they do
 * for a real request.
 */
export async function createSignedInUser(): Promise<{
  id: string;
  email: string;
  client: SupabaseClient;
}> {
  const admin = adminClient();
  const email = `${testTag()}@example.test`;
  const password = `Test-${testTag()}!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`Couldn't create test user: ${error?.message}`);

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`Couldn't sign in test user: ${signInError.message}`);

  return { id: data.user.id, email, client };
}

export async function deleteTestUser(id: string) {
  const admin = adminClient();
  await admin.auth.admin.deleteUser(id); // cascades to profiles/listings/orders/etc.
}

/** Minimal valid listing row, service-role inserted so tests don't depend on POST /api/listings. */
export async function insertTestListing(
  admin: SupabaseClient,
  sellerId: string,
  overrides: Record<string, unknown> = {}
) {
  const { data, error } = await admin
    .from("listings")
    .insert({
      seller_id: sellerId,
      title: `Test listing ${testTag()}`,
      category: "Graphics Cards",
      category_slug: "pc-parts-and-components",
      subcategory_slug: "graphics-cards",
      condition: "Used",
      price: 100,
      status: "active",
      stock: 1,
      ...overrides,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Couldn't insert test listing: ${error?.message}`);
  return data.id as string;
}
