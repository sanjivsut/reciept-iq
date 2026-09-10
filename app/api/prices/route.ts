// Server-side price lookup. Serves the flattened curated catalog so the full
// dataset never ships in the client bundle. The data is a checked-in JSON file,
// so this response is static and can be prerendered + cached hard.

import { getPriceData } from "@/lib/price-data";

export const dynamic = "force-static";

export function GET() {
  const { currency, entries } = getPriceData();
  return Response.json(
    { currency, entries },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
