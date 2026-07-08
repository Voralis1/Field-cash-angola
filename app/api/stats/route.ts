import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";
import { COUNTRY } from "@/lib/helpers";

// Read-only stats feed for the CEO dashboard (n8n / BI tool). Server-to-server
// only: authenticated with a shared bearer key, not a Supabase user session —
// see the /api/stats bypass in middleware.ts.
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const expected = process.env.STATS_API_KEY;
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return false;

  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const country = url.searchParams.get("country") || COUNTRY;
  const from = url.searchParams.get("from") || "1970-01-01";
  const to = url.searchParams.get("to");

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  let recapQ = admin
    .from("field_daily_recap")
    .select("*")
    .eq("country", country)
    .gte("day", from)
    .order("day", { ascending: true });
  if (to) recapQ = recapQ.lte("day", to);

  const [{ data: recap, error: recapError }, { data: params, error: paramsError }] =
    await Promise.all([
      recapQ,
      admin.from("field_delivery_params").select("*").eq("country", country).maybeSingle(),
    ]);

  if (recapError || paramsError) {
    return NextResponse.json(
      { error: (recapError ?? paramsError)?.message ?? "Query failed" },
      { status: 500 }
    );
  }

  const daily = (recap ?? []).map((r: any) => ({
    day: r.day,
    collected: Number(r.collected),
    nb_deliveries: Number(r.nb_deliveries),
    agents_count: Number(r.agents_count),
    internal_delivery_cost: Number(r.internal_delivery_cost),
    external_charges: Number(r.external_charges),
    remitted: Number(r.remitted),
    held:
      Number(r.collected) -
      Number(r.internal_delivery_cost) -
      Number(r.external_charges) -
      Number(r.remitted),
  }));

  const totals = daily.reduce(
    (acc, d) => ({
      collected: acc.collected + d.collected,
      nb_deliveries: acc.nb_deliveries + d.nb_deliveries,
      agents_count: acc.agents_count + d.agents_count,
      internal_delivery_cost: acc.internal_delivery_cost + d.internal_delivery_cost,
      external_charges: acc.external_charges + d.external_charges,
      remitted: acc.remitted + d.remitted,
      held: acc.held + d.held,
    }),
    {
      collected: 0,
      nb_deliveries: 0,
      agents_count: 0,
      internal_delivery_cost: 0,
      external_charges: 0,
      remitted: 0,
      held: 0,
    }
  );

  return NextResponse.json({
    country,
    currency: params?.currency ?? "AOA",
    range: { from, to: to ?? null },
    params: params
      ? {
          commission_agent: Number(params.commission_agent),
          commission_manager: Number(params.commission_manager),
          fuel_per_agent: Number(params.fuel_per_agent),
        }
      : null,
    totals,
    daily,
  });
}
