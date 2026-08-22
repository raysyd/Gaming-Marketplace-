import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { hasTestSupabase, adminClient, createSignedInUser, deleteTestUser, insertTestListing } from "./setup";

describe.skipIf(!hasTestSupabase)("offer responses (RLS, not just UI)", () => {
  let admin: ReturnType<typeof adminClient>;
  let seller: Awaited<ReturnType<typeof createSignedInUser>>;
  let buyer: Awaited<ReturnType<typeof createSignedInUser>>;
  let stranger: Awaited<ReturnType<typeof createSignedInUser>>;

  beforeAll(async () => {
    admin = adminClient();
    seller = await createSignedInUser();
    buyer = await createSignedInUser();
    stranger = await createSignedInUser();
  });

  afterAll(async () => {
    await deleteTestUser(seller.id);
    await deleteTestUser(buyer.id);
    await deleteTestUser(stranger.id);
  });

  async function makeOffer(status: string, extra: Record<string, unknown> = {}) {
    const listingId = await insertTestListing(admin, seller.id);
    const { data, error } = await admin
      .from("offers")
      .insert({ listing_id: listingId, buyer_id: buyer.id, seller_id: seller.id, amount: 80, status, ...extra })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "offer insert failed");
    return data.id as string;
  }

  it("lets the seller accept a pending offer", async () => {
    const offerId = await makeOffer("pending");
    const { error } = await seller.client
      .from("offers")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", offerId);
    expect(error).toBeNull();
  });

  it("lets the seller decline a pending offer", async () => {
    const offerId = await makeOffer("pending");
    const { error } = await seller.client.from("offers").update({ status: "declined" }).eq("id", offerId);
    expect(error).toBeNull();
  });

  it("lets the seller counter a pending offer", async () => {
    const offerId = await makeOffer("pending");
    const { error } = await seller.client
      .from("offers")
      .update({ status: "countered", counter_amount: 90 })
      .eq("id", offerId);
    expect(error).toBeNull();
  });

  it("blocks the buyer from accepting their own still-pending offer", async () => {
    const offerId = await makeOffer("pending");
    const { error } = await buyer.client.from("offers").update({ status: "accepted" }).eq("id", offerId);
    expect(error).not.toBeNull();
  });

  it("blocks a stranger from responding to someone else's offer", async () => {
    const offerId = await makeOffer("pending");
    const { error } = await stranger.client.from("offers").update({ status: "accepted" }).eq("id", offerId);
    expect(error).not.toBeNull();
  });

  it("lets the buyer accept a countered offer", async () => {
    const offerId = await makeOffer("countered", { counter_amount: 90 });
    const { error } = await buyer.client.from("offers").update({ status: "accepted" }).eq("id", offerId);
    expect(error).toBeNull();
  });

  it("blocks the seller from re-countering an offer they already countered", async () => {
    const offerId = await makeOffer("countered", { counter_amount: 90 });
    const { error } = await seller.client
      .from("offers")
      .update({ status: "countered", counter_amount: 95 })
      .eq("id", offerId);
    expect(error).not.toBeNull(); // policy only allows seller updates while status = 'pending'
  });

  it("blocks writing any column outside the response set (e.g. amount)", async () => {
    const offerId = await makeOffer("pending");
    const { error } = await seller.client
      .from("offers")
      .update({ status: "accepted", amount: 1 })
      .eq("id", offerId);
    expect(error).not.toBeNull(); // column grant only covers status/counter_amount/responded_at
  });
});
