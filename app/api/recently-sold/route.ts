import { NextResponse } from "next/server";
import { getRecentlySold } from "@/lib/market-data";

/** What the homepage's SoldTicker polls — served from the same cached
 * query the server render uses, so the ticker never ships the Supabase
 * client to the browser or hits the database on every poll. */
export async function GET() {
  return NextResponse.json(await getRecentlySold({ limit: 8 }));
}
