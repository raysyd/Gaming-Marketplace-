import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { hasTestSupabase, adminClient, createSignedInUser, deleteTestUser } from "./setup";

describe.skipIf(!hasTestSupabase)("build showcases (RLS)", () => {
  let admin: ReturnType<typeof adminClient>;
  let author: Awaited<ReturnType<typeof createSignedInUser>>;
  let stranger: Awaited<ReturnType<typeof createSignedInUser>>;

  beforeAll(async () => {
    admin = adminClient();
    author = await createSignedInUser();
    stranger = await createSignedInUser();
  });

  afterAll(async () => {
    await deleteTestUser(author.id);
    await deleteTestUser(stranger.id);
  });

  it("lets a signed-in user post a build with just a title", async () => {
    const { error } = await author.client.from("builds").insert({ user_id: author.id, title: "Test build" });
    expect(error).toBeNull();
  });

  it("is publicly readable, including by a signed-out (anon) caller", async () => {
    const { data: inserted } = await admin
      .from("builds")
      .insert({ user_id: author.id, title: "Public build" })
      .select("id")
      .single();

    const { data } = await stranger.client.from("builds").select("id").eq("id", inserted!.id).maybeSingle();
    expect(data?.id).toBe(inserted!.id);
  });

  it("blocks a stranger from deleting someone else's build", async () => {
    const { data: inserted } = await admin
      .from("builds")
      .insert({ user_id: author.id, title: "Protected build" })
      .select("id")
      .single();

    await stranger.client.from("builds").delete().eq("id", inserted!.id);
    const { data } = await admin.from("builds").select("id").eq("id", inserted!.id).maybeSingle();
    expect(data?.id).toBe(inserted!.id);
  });

  it("lets the owner delete their own build", async () => {
    const { data: inserted } = await admin
      .from("builds")
      .insert({ user_id: author.id, title: "Deletable build" })
      .select("id")
      .single();

    const { error } = await author.client.from("builds").delete().eq("id", inserted!.id);
    expect(error).toBeNull();

    const { data } = await admin.from("builds").select("id").eq("id", inserted!.id).maybeSingle();
    expect(data).toBeNull();
  });
});
