import { queryListings } from "@/lib/data";
import { WishlistGrid } from "@/components/WishlistGrid";

export default async function WishlistPage() {
  // The catalogue page is small and cached; the client filters it by saved ids.
  const { items } = await queryListings({ perPage: 200 });
  return <WishlistGrid listings={items} />;
}
