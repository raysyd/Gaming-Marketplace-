import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { hasTestSupabase, adminClient, createSignedInUser, deleteTestUser, insertTestListing } from "./setup";

describe.skipIf(!hasTestSupabase)("draft listings (RLS + the nullable-price constraint)", () => {
  let admin: ReturnType<typeof adminClient>;
  let seller: Awaited<ReturnType<typeof createSignedInUser>>;
  let stranger: Awaited<ReturnType<typeof createSignedInUser>>;

  beforeAll(async () => {
    admin = adminClient();
    seller = await createSignedInUser();
    stranger = await createSignedInUser();
  });

  afterAll(async () => {
    await deleteTestUser(seller.id);
    await deleteTestUser(stranger.id);
  });

  it("lets a seller save a draft with no price at all", async () => {
    const { error } = await seller.client.from("listings").insert({
      seller_id: seller.id,
      title: "Half-finished build",
      category: "Graphics Cards",
      category_slug: "pc-parts-and-components",
      subcategory_slug: "graphics-cards",
      condition: "Used",
      price: null,
      status: "draft",
    });
    expect(error).toBeNull();
  });

  it("still rejects a real (non-null) price of zero or less — supabase/14-draft-listings.sql's constraint", async () => {
    const { error } = await seller.client.from("listings").insert({
      seller_id: seller.id,
      title: "Bad price draft",
      category: "Graphics Cards",
      category_slug: "pc-parts-and-components",
      subcategory_slug: "graphics-cards",
      condition: "Used",
      price: 0,
      status: "draft",
    });
    expect(error).not.toBeNull();
  });

  it("is invisible to everyone but its owner — a draft is never status = 'active'", async () => {
    const listingId = await insertTestListing(admin, seller.id, { status: "draft", price: null });

    const { data: strangerSees } = await stranger.client.from("listings").select("id").eq("id", listingId).maybeSingle();
    expect(strangerSees).toBeNull();

    const { data: ownerSees } = await seller.client.from("listings").select("id").eq("id", listingId).maybeSingle();
    expect(ownerSees?.id).toBe(listingId);
  });

  it("lets the owner delete their own draft outright", async () => {
    const listingId = await insertTestListing(admin, seller.id, { status: "draft", price: null });
    const { error } = await seller.client.from("listings").delete().eq("id", listingId);
    expect(error).toBeNull();

    const { data } = await admin.from("listings").select("id").eq("id", listingId).maybeSingle();
    expect(data).toBeNull();
  });

  it("blocks a stranger from deleting someone else's draft", async () => {
    const listingId = await insertTestListing(admin, seller.id, { status: "draft", price: null });
    await stranger.client.from("listings").delete().eq("id", listingId);
    // RLS silently matches zero rows rather than erroring — the row must
    // still be there afterwards, which is the real assertion.
    const { data } = await admin.from("listings").select("id").eq("id", listingId).maybeSingle();
    expect(data?.id).toBe(listingId);
  });
});
