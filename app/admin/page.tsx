import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { money, timeAgo } from "@/lib/format";
import { REPORT_REASONS } from "@/lib/reports";
import { AdminOrderActions, AdminReportActions, AdminUserActions } from "@/components/AdminActions";

export const metadata = { title: "Admin", robots: { index: false } };

type OrderRow = {
  id: string;
  status: string;
  amount: number;
  shipping_fee: number | null;
  dispute_reason: string | null;
  chargeback_status: string | null;
  fulfillment_method: string;
  tracking_number: string | null;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  listings: { title: string } | null;
};

type ReportRow = {
  id: string;
  reason: string;
  details: string | null;
  listing_id: string | null;
  reported_user_id: string | null;
  reporter_id: string;
  created_at: string;
  listings: { title: string; seller_id: string } | null;
};

const ORDER_COLS =
  "id, status, amount, shipping_fee, dispute_reason, chargeback_status, fulfillment_method, tracking_number, buyer_id, seller_id, created_at, listings(title)";

/**
 * Support console: disputes and chargebacks to settle, open reports, and
 * recent orders. Only accounts in ADMIN_EMAILS get past notFound() — to
 * everyone else /admin doesn't exist. Reads go through the service-role
 * client because support needs to see both sides of every order.
 */
export default async function AdminPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) notFound();
  const admin = createAdminClient();
  if (!admin) return <p className="p-10">Supabase service role key isn&apos;t configured.</p>;

  const [{ data: disputed }, { data: reports }, { data: recent }] = await Promise.all([
    admin
      .from("orders")
      .select(ORDER_COLS)
      .or("status.eq.disputed,chargeback_status.not.is.null")
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("reports")
      .select("id, reason, details, listing_id, reported_user_id, reporter_id, created_at, listings(title, seller_id)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100),
    admin.from("orders").select(ORDER_COLS).order("created_at", { ascending: false }).limit(50),
  ]);

  const orders = (disputed ?? []) as unknown as OrderRow[];
  const openReports = (reports ?? []) as unknown as ReportRow[];
  const recentOrders = (recent ?? []) as unknown as OrderRow[];

  const userIds = [
    ...new Set([
      ...[...orders, ...recentOrders].flatMap((o) => [o.buyer_id, o.seller_id]),
      ...openReports.flatMap((r) => [r.reporter_id, r.reported_user_id ?? r.listings?.seller_id]),
    ]),
  ].filter((x): x is string => !!x);
  const { data: profiles } = userIds.length
    ? await admin.from("profiles").select("id, username, suspended_at").in("id", userIds)
    : { data: [] };
  const who = new Map((profiles ?? []).map((p) => [p.id as string, p as { id: string; username: string | null; suspended_at: string | null }]));
  const name = (id: string) => who.get(id)?.username ?? id.slice(0, 8);
  const reasonLabel = (r: string) => REPORT_REASONS.find((x) => x.value === r)?.label ?? r;

  const orderRow = (o: OrderRow, withActions: boolean) => (
    <li key={o.id} className="flex flex-wrap items-start justify-between gap-3 rounded-card border border-line bg-card p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{o.listings?.title ?? "Listing"}</p>
        <p className="spec mt-1 text-muted">
          {money(Number(o.amount) + Number(o.shipping_fee ?? 0))} · {o.status}
          {o.chargeback_status ? ` · chargeback: ${o.chargeback_status}` : ""} · {o.fulfillment_method}
          {o.tracking_number ? ` · AusPost ${o.tracking_number}` : ""} · {timeAgo(o.created_at)}
        </p>
        <p className="spec mt-1 text-muted">
          Buyer <Link href={`/seller/${o.buyer_id}`} className="underline">{name(o.buyer_id)}</Link> · Seller{" "}
          <Link href={`/seller/${o.seller_id}`} className="underline">{name(o.seller_id)}</Link> · <span className="font-mono">{o.id}</span>
        </p>
        {o.dispute_reason && <p className="spec mt-1 text-deal">“{o.dispute_reason}”</p>}
      </div>
      {withActions && <AdminOrderActions id={o.id} status={o.status} chargeback={o.chargeback_status} />}
    </li>
  );

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 lg:px-6">
      <p className="eyebrow">Support</p>
      <h1 className="display mt-2 text-4xl">Admin</h1>
      <p className="spec mt-2 text-muted">Signed in as {adminUser.email}. Every action here moves real money or accounts.</p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Disputes &amp; chargebacks ({orders.length})</h2>
        <p className="spec mt-1 text-muted">
          Refund the buyer, or release to the seller once the problem is settled. Chargebacks are answered in the
          Stripe dashboard (Payments → Disputes); release stays blocked until Stripe marks them won.
        </p>
        {orders.length ? (
          <ul className="mt-4 space-y-3">{orders.map((o) => orderRow(o, true))}</ul>
        ) : (
          <p className="mt-4 text-sm text-muted">Nothing to settle.</p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">Open reports ({openReports.length})</h2>
        {openReports.length ? (
          <ul className="mt-4 space-y-3">
            {openReports.map((r) => {
              const target = r.reported_user_id ?? r.listings?.seller_id ?? null;
              const suspended = target ? !!who.get(target)?.suspended_at : false;
              return (
                <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 rounded-card border border-line bg-card p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{reasonLabel(r.reason)}</p>
                    <p className="spec mt-1 text-muted">
                      {r.listing_id ? (
                        <>
                          Listing <Link href={`/product/${r.listing_id}/x`} className="underline">{r.listings?.title ?? r.listing_id}</Link>
                        </>
                      ) : (
                        "Account"
                      )}
                      {target && (
                        <>
                          {" "}· seller <Link href={`/seller/${target}`} className="underline">{name(target)}</Link>
                          {suspended ? " (suspended)" : ""}
                        </>
                      )}{" "}
                      · reported by {name(r.reporter_id)} · {timeAgo(r.created_at)}
                    </p>
                    {r.details && <p className="mt-1 text-sm">{r.details}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <AdminReportActions id={r.id} />
                    {target && <AdminUserActions id={target} suspended={suspended} />}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">No open reports.</p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">Recent orders</h2>
        <ul className="mt-4 space-y-3">{recentOrders.map((o) => orderRow(o, o.status !== "refunded" && o.status !== "released"))}</ul>
      </section>
    </div>
  );
}
