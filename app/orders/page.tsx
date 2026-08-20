import { redirect } from "next/navigation";

// Superseded by /buying — see app/dashboard/page.tsx for the same move on
// the seller side. Kept as a redirect so old links/bookmarks still work.
export default function OrdersPage() {
  redirect("/buying");
}
