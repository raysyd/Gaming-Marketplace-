import { describe, it, expect, afterEach, vi } from "vitest";
import { isAdminEmail } from "@/lib/admin";
import { escapeHtml, orderUpdateEmail } from "@/lib/email/templates";
import { deadlineLabel } from "@/lib/format";
import { BRAND, PLATFORM_FEE_BPS } from "@/lib/brand";

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => null }));

describe("isAdminEmail", () => {
  afterEach(() => {
    delete process.env.ADMIN_EMAILS;
  });

  it("nobody is an admin when ADMIN_EMAILS is unset", () => {
    expect(isAdminEmail("a@b.com")).toBe(false);
  });

  it("matches listed emails case-insensitively, ignoring spaces", () => {
    process.env.ADMIN_EMAILS = " Ops@Sidegrade.com.au , raysyd@example.com";
    expect(isAdminEmail("ops@sidegrade.com.au")).toBe(true);
    expect(isAdminEmail("RAYSYD@example.com")).toBe(true);
    expect(isAdminEmail("someone@else.com")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
  });
});

describe("order emails", () => {
  it("escapes user-written text", () => {
    expect(escapeHtml(`<img src=x onerror="a">&'`)).toBe("&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;");
    const m = orderUpdateEmail({
      to: "b@c.com",
      subject: "s",
      heading: "<b>RTX 4090</b>",
      lines: ["<script>x</script>"],
      ctaLabel: "Go",
      ctaUrl: "https://x.test/buying",
    });
    expect(m.html).not.toContain("<script>");
    expect(m.html).not.toContain("<b>RTX");
    expect(m.text).toContain("<b>RTX 4090</b>");
  });
});

describe("deadlineLabel", () => {
  it("shows days for long windows and hours for short ones", () => {
    const now = new Date().toISOString();
    expect(deadlineLabel(now, BRAND.shippedAutoReleaseDays * 24)).toBe(`${BRAND.shippedAutoReleaseDays}d left`);
    expect(deadlineLabel(now, 10)).toBe("10h left");
  });
});

describe("platform fee", () => {
  it("has one source of truth", () => {
    expect(PLATFORM_FEE_BPS).toBe(BRAND.feePercent * 100);
  });
});
