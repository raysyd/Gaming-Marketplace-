import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  hasTestSupabase,
  adminClient,
  createSignedInUser,
  deleteTestUser,
  insertTestListing,
} from "./setup";

describe.skipIf(!hasTestSupabase)("reserve_listing_stock / release_listing_stock", () => {
  let sellerId: string;
  let buyer: Awaited<ReturnType<typeof createSignedInUser>>;
  // Deferred to beforeAll, not module scope — describe.skipIf still runs
  // the describe body to collect its (skipped) tests, so anything here
  // that needs real env vars must wait until vitest has actually decided
  // to run this suite.
  let admin: ReturnType<typeof adminClient>;

  beforeAll(async () => {
    admin = adminClient();
    const seller = await createSignedInUser();
    sellerId = seller.id;
    buyer = await createSignedInUser();
  });

  afterAll(async () => {
    await deleteTestUser(sellerId);
    await deleteTestUser(buyer.id);
  });

  it("decrements stock by one and keeps the listing active while stock remains", async () => {
    const listingId = await insertTestListing(admin, sellerId, { stock: 3 });

    const { data, error } = await buyer.client.rpc("reserve_listing_stock", { ids: [listingId] });
    expect(error).toBeNull();
    expect(data).toEqual([{ id: listingId, stock: 2 }]);

    const { data: row } = await admin.from("listings").select("stock, status").eq("id", listingId).single();
    expect(row?.stock).toBe(2);
    expect(row?.status).toBe("active");
  });

  it("flips the listing to 'sold' the moment stock reaches zero, and rejects the next reservation", async () => {
    const listingId = await insertTestListing(admin, sellerId, { stock: 1 });

    const first = await buyer.client.rpc("reserve_listing_stock", { ids: [listingId] });
    expect(first.data).toEqual([{ id: listingId, stock: 0 }]);

    const { data: row } = await admin.from("listings").select("status").eq("id", listingId).single();
    expect(row?.status).toBe("sold");

    // A second buyer (or a retry) reserving the same now-sold-out listing
    // gets zero rows back, not an error and not a false success — this is
    // exactly what "reject purchases exceeding stock" and "a second buyer
    // cannot reach checkout for a sold-out listing" require.
    const second = await buyer.client.rpc("reserve_listing_stock", { ids: [listingId] });
    expect(second.data).toEqual([]);
  });

  it("never lets stock go negative even directly at the SQL level (the backstop guarantee)", async () => {
    const listingId = await insertTestListing(admin, sellerId, { stock: 0, status: "sold" });
    const { error } = await admin.from("listings").update({ stock: -1 }).eq("id", listingId);
    // The listings_stock_nonneg check constraint, not application logic —
    // this must fail even against the service-role client.
    expect(error).not.toBeNull();
  });

  it("release_listing_stock restores stock and flips a sold-out listing back to active", async () => {
    const listingId = await insertTestListing(admin, sellerId, { stock: 0, status: "sold" });

    const { error } = await admin.rpc("release_listing_stock", { ids: [listingId] });
    expect(error).toBeNull();

    const { data: row } = await admin.from("listings").select("stock, status").eq("id", listingId).single();
    expect(row?.stock).toBe(1);
    expect(row?.status).toBe("active");
  });

  it("release_listing_stock leaves a seller-deactivated listing deactivated", async () => {
    const listingId = await insertTestListing(admin, sellerId, { stock: 0, status: "inactive" });
    await admin.rpc("release_listing_stock", { ids: [listingId] });
    const { data: row } = await admin.from("listings").select("status").eq("id", listingId).single();
    expect(row?.status).toBe("inactive");
  });

  it(
    "concurrent purchase safety: N buyers racing for the last units never oversell, and never go negative",
    async () => {
      const STOCK = 3;
      const RACERS = 10; // more buyers than units, on purpose
      const listingId = await insertTestListing(admin, sellerId, { stock: STOCK });

      // A fresh signed-in buyer per racer — reserving is a real,
      // auth-checked action (reserve_listing_stock requires auth.uid()),
      // not something one shared client can fire N times and call
      // representative of N different people.
      const buyers = await Promise.all(Array.from({ length: RACERS }, () => createSignedInUser()));
      try {
        const results = await Promise.all(
          buyers.map((b) => b.client.rpc("reserve_listing_stock", { ids: [listingId] }))
        );

        const succeeded = results.filter((r) => (r.data as unknown[])?.length === 1);
        const failed = results.filter((r) => (r.data as unknown[])?.length === 0);

        expect(succeeded.length).toBe(STOCK);
        expect(failed.length).toBe(RACERS - STOCK);

        const { data: row } = await admin
          .from("listings")
          .select("stock, status")
          .eq("id", listingId)
          .single();
        expect(row?.stock).toBe(0);
        expect(row?.status).toBe("sold");
      } finally {
        await Promise.all(buyers.map((b) => deleteTestUser(b.id)));
      }
    },
    20_000
  );
});

describe.skipIf(!hasTestSupabase)("reserve_listing_stock_qty / release_listing_stock_qty", () => {
  let sellerId: string;
  let buyer: Awaited<ReturnType<typeof createSignedInUser>>;
  let admin: ReturnType<typeof adminClient>;

  beforeAll(async () => {
    admin = adminClient();
    const seller = await createSignedInUser();
    sellerId = seller.id;
    buyer = await createSignedInUser();
  });

  afterAll(async () => {
    await deleteTestUser(sellerId);
    await deleteTestUser(buyer.id);
  });

  it("reserves N units in one call and keeps the listing active while stock remains", async () => {
    const listingId = await insertTestListing(admin, sellerId, { stock: 5 });

    const { data, error } = await buyer.client.rpc("reserve_listing_stock_qty", {
      ids: [listingId],
      qtys: [3],
    });
    expect(error).toBeNull();
    expect(data).toEqual([{ id: listingId, stock: 2 }]);

    const { data: row } = await admin.from("listings").select("stock, status").eq("id", listingId).single();
    expect(row?.stock).toBe(2);
    expect(row?.status).toBe("active");
  });

  it("rejects a quantity that exceeds remaining stock — never goes negative", async () => {
    const listingId = await insertTestListing(admin, sellerId, { stock: 2 });

    const { data, error } = await buyer.client.rpc("reserve_listing_stock_qty", {
      ids: [listingId],
      qtys: [3],
    });
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: row } = await admin.from("listings").select("stock, status").eq("id", listingId).single();
    expect(row?.stock).toBe(2);
    expect(row?.status).toBe("active");
  });

  it("flips to 'sold' when a multi-unit purchase takes the last units", async () => {
    const listingId = await insertTestListing(admin, sellerId, { stock: 4 });

    const { data } = await buyer.client.rpc("reserve_listing_stock_qty", {
      ids: [listingId],
      qtys: [4],
    });
    expect(data).toEqual([{ id: listingId, stock: 0 }]);

    const { data: row } = await admin.from("listings").select("status").eq("id", listingId).single();
    expect(row?.status).toBe("sold");
  });

  it("release_listing_stock_qty restores the exact quantity taken", async () => {
    const listingId = await insertTestListing(admin, sellerId, { stock: 0, status: "sold" });

    const { error } = await admin.rpc("release_listing_stock_qty", { ids: [listingId], qtys: [3] });
    expect(error).toBeNull();

    const { data: row } = await admin.from("listings").select("stock, status").eq("id", listingId).single();
    expect(row?.stock).toBe(3);
    expect(row?.status).toBe("active");
  });

  it(
    "concurrent multi-unit purchase safety: racing buyers never oversell a shared pool of stock",
    async () => {
      const STOCK = 6;
      const listingId = await insertTestListing(admin, sellerId, { stock: STOCK });

      // Four buyers each asking for 2 units against 6 in stock — only
      // three of the four requests can possibly succeed.
      const buyers = await Promise.all(Array.from({ length: 4 }, () => createSignedInUser()));
      try {
        const results = await Promise.all(
          buyers.map((b) =>
            b.client.rpc("reserve_listing_stock_qty", { ids: [listingId], qtys: [2] })
          )
        );

        const succeeded = results.filter((r) => (r.data as unknown[])?.length === 1);
        const failed = results.filter((r) => (r.data as unknown[])?.length === 0);

        expect(succeeded.length).toBe(3);
        expect(failed.length).toBe(1);

        const { data: row } = await admin
          .from("listings")
          .select("stock, status")
          .eq("id", listingId)
          .single();
        expect(row?.stock).toBe(0);
        expect(row?.status).toBe("sold");
      } finally {
        await Promise.all(buyers.map((b) => deleteTestUser(b.id)));
      }
    },
    20_000
  );
});
