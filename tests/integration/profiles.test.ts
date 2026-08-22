import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { hasTestSupabase, createSignedInUser, deleteTestUser, testTag } from "./setup";

describe.skipIf(!hasTestSupabase)("profile creation and its guardrails", () => {
  let user: Awaited<ReturnType<typeof createSignedInUser>>;

  beforeAll(async () => {
    user = await createSignedInUser();
  });

  afterAll(async () => {
    await deleteTestUser(user.id);
  });

  it("lets a signed-in user create their own profile with a valid username", async () => {
    const username = `t${testTag().replace(/[^a-z0-9]/gi, "").slice(0, 15).toLowerCase()}`;
    const { error } = await user.client
      .from("profiles")
      .upsert({ id: user.id, username, bio: "Testing.", suburb: "Newtown", state: "NSW" });
    expect(error).toBeNull();

    const { data } = await user.client.from("profiles").select("username").eq("id", user.id).single();
    expect(data?.username).toBe(username);
  });

  it("rejects changing an already-set username (the permanence trigger)", async () => {
    const { error } = await user.client
      .from("profiles")
      .update({ username: "a_completely_different_name" })
      .eq("id", user.id);
    expect(error).not.toBeNull();
  });

  it(
    "cannot self-grant verified or premium_status — column grants, not just the API route, block it",
    async () => {
      const { error } = await user.client
        .from("profiles")
        .update({ verified: true, premium_status: "active" })
        .eq("id", user.id);
      // Postgres refuses the whole statement when the role lacks UPDATE
      // privilege on any targeted column — this is the exact scenario the
      // Premium Seller work called out: a user forging a raw client call
      // straight past the API route and the UI.
      expect(error).not.toBeNull();
    }
  );

  it("still allows editing the columns that are meant to be user-editable", async () => {
    const { error } = await user.client
      .from("profiles")
      .update({ bio: "Updated bio.", suburb: "Glebe" })
      .eq("id", user.id);
    expect(error).toBeNull();
  });
});
