import { redirect } from "next/navigation";

// Superseded by /selling — buying and selling used to share one dashboard,
// which is exactly the "conflates both roles" problem the split fixes.
// Kept as a redirect rather than deleted so old links/bookmarks still land
// somewhere real instead of 404ing.
export default function DashboardPage() {
  redirect("/selling");
}
