import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { hasTestSupabase, adminClient, createSignedInUser, deleteTestUser, insertTestListing } from "./setup";

describe.skipIf(!hasTestSupabase)("review eligibility (RLS, not just UI)", () => {
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

  async function makeOrder(status: string) {
    const listingId = await insertTestListing(admin, seller.id);
    const { data, error } = await admin
      .from("orders")
      .insert({
        listing_id: listingId,
        buyer_id: buyer.id,
        seller_id: seller.id,
        amount: 100,
        platform_fee: 8,
        status,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "order insert failed");
    return data.id as string;
  }

  it("lets the buyer review an order once it's released", async () => {
    const orderId = await makeOrder("released");
    const { error } = await buyer.client
      .from("reviews")
      .insert({ order_id: orderId, seller_id: seller.id, rating: 5, body: "Great." });
    expect(error).toBeNull();
  });

  it("blocks the buyer from reviewing an order that hasn't been released yet", async () => {
    const orderId = await makeOrder("paid");
    const { error } = await buyer.client
      .from("reviews")
      .insert({ order_id: orderId, seller_id: seller.id, rating: 5, body: "Too soon." });
    expect(error).not.toBeNull();
  });

  it("blocks a shipped-but-not-yet-confirmed order from being reviewed", async () => {
    const orderId = await makeOrder("shipped");
    const { error } = await buyer.client
      .from("reviews")
      .insert({ order_id: orderId, seller_id: seller.id, rating: 1, body: "Hasn't arrived." });
    expect(error).not.toBeNull();
  });

  it("makes reviewing an order you didn't buy impossible, even a released one", async () => {
    const orderId = await makeOrder("released");
    const { error } = await stranger.client
      .from("reviews")
      .insert({ order_id: orderId, seller_id: seller.id, rating: 1, body: "I wasn't even involved." });
    expect(error).not.toBeNull();
  });

  it("allows exactly one review per order", async () => {
    const orderId = await makeOrder("released");
    const first = await buyer.client
      .from("reviews")
      .insert({ order_id: orderId, seller_id: seller.id, rating: 4, body: "First." });
    expect(first.error).toBeNull();

    const second = await buyer.client
      .from("reviews")
      .insert({ order_id: orderId, seller_id: seller.id, rating: 1, body: "Trying again." });
    expect(second.error).not.toBeNull(); // unique(order_id)
  });
});
