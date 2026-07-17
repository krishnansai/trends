import { NextResponse } from "next/server";
import { getQueryCacheStats } from "@/lib/query-cache";

export function GET() {
  return NextResponse.json({
    cache: getQueryCacheStats(),
    ok: true,
    service: "personal-stylist",
    timestamp: new Date().toISOString()
  });
}
