"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { TopBar } from "@/components/UI";
import TabBar from "@/components/TabBar";
import { fmt, CURRENCY, COUNTRY, type DeliveryParams } from "@/lib/helpers";

type Range = "7" | "30" | "all" | "custom";

export default function HomePage() {
  const [range, setRange] = useState<Range>("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    collected: 0,
    nbDeliveries: 0,
    charges: 0,
    remitted: 0,
    agentDays: 0,
  });
  const [params, setParams] = useState<DeliveryParams>({
    commission_agent: 500,
    commission_manager: 2000,
    fuel_per_agent: 2000,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let since = "1970-01-01";
    let until = "";
    if (range === "custom") {
      since = customFrom || "1970-01-01";
      until = customTo || "";
    } else if (range !== "all") {
      since = new Date(Date.now() - Number(range) * 86400000).toISOString().slice(0, 10);
    }

    let delsQ = supabase.from("field_deliveries").select("amount_collected, delivery_date").gte("delivery_date", since);
    let chgsQ = supabase.from("field_charges").select("amount, charge_date").gte("charge_date", since);
    let remsQ = supabase.from("field_remittances").select("amount, remit_date").gte("remit_date", since);
    let agentsQ = supabase.from("field_agent_days").select("agents_count, work_date").gte("work_date", since);
    if (until) {
      delsQ = delsQ.lte("delivery_date", until);
      chgsQ = chgsQ.lte("charge_date", until);
      remsQ = remsQ.lte("remit_date", until);
      agentsQ = agentsQ.lte("work_date", until);
    }

    const [{ data: dels }, { data: chgs }, { data: rems }, { data: agents }, { data: p }] =
      await Promise.all([
        delsQ,
        chgsQ,
        remsQ,
        agentsQ,
        supabase.from("field_delivery_params").select("*").eq("country", COUNTRY).single(),
      ]);

    if (p) setParams(p as DeliveryParams);

    const collected = (dels ?? []).reduce((s, r: any) => s + Number(r.amount_collected), 0);
    const nbDeliveries = (dels ?? []).length;
    const charges = (chgs ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
    const remitted = (rems ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
    const agentDays = (agents ?? []).reduce((s, r: any) => s + Number(r.agents_count), 0);

    setTotals({ collected, nbDeliveries, charges, remitted, agentDays });
    setLoading(false);
  }, [range, customFrom, customTo]);

  useEffect(() => {
    load();
  }, [load]);

  // Internal delivery cost = (agent + manager commission) * nb deliveries + fuel * agent-days
  const internalDeliveryCost =
    (params.commission_agent + params.commission_manager) * totals.nbDeliveries +
    params.fuel_per_agent * totals.agentDays;

  // Cash held by the manager = collected − internal delivery cost − external charges − remitted
  const held = totals.collected - internalDeliveryCost - totals.charges - totals.remitted;

  return (
    <div className="shell">
      <TopBar title="Résumé" />
      <div className="page">
        <div style={{ display: "flex", gap: 8, marginBottom: range === "custom" ? 10 : 16, flexWrap: "wrap" }}>
          {(["7", "30", "all", "custom"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`btn small ${range === r ? "" : "ghost"}`}
              style={{ flex: 1 }}
            >
              {r === "all" ? "Tout" : r === "custom" ? "📅 Calendrier" : `${r} j`}
            </button>
          ))}
        </div>

        {range === "custom" && (
          <div className="card tight row2" style={{ marginBottom: 16 }}>
            <label className="field" style={{ marginBottom: 0 }}>
              <span className="cap">Du</span>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span className="cap">Au</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </label>
          </div>
        )}

        {loading ? (
          <div className="empty">
            <div className="small">Chargement…</div>
          </div>
        ) : (
          <>
            <div className="stat-row">
              <div className="stat green">
                <div className="label">Total encaissé</div>
                <div className="value mono">
                  {fmt(totals.collected)}
                  <span className="unit">{CURRENCY}</span>
                </div>
              </div>
              <div className="stat">
                <div className="label">Livraisons</div>
                <div className="value mono">{totals.nbDeliveries}</div>
              </div>
              <div className="stat rust">
                <div className="label">Frais livraison</div>
                <div className="value mono">
                  {fmt(internalDeliveryCost)}
                  <span className="unit">{CURRENCY}</span>
                </div>
              </div>
              <div className="stat rust">
                <div className="label">Charges externes</div>
                <div className="value mono">
                  {fmt(totals.charges)}
                  <span className="unit">{CURRENCY}</span>
                </div>
              </div>
              <div className="stat">
                <div className="label">Remis / rapatrié</div>
                <div className="value mono">
                  {fmt(totals.remitted)}
                  <span className="unit">{CURRENCY}</span>
                </div>
              </div>
              <div className={`stat ${held >= 0 ? "amber" : "rust"}`}>
                <div className="label">Montant restant</div>
                <div className="value mono">
                  {fmt(held)}
                  <span className="unit">{CURRENCY}</span>
                </div>
              </div>
            </div>

            <div className="card tight" style={{ marginTop: 4 }}>
              <div className="section-title" style={{ margin: "2px 0 8px" }}>
                Comment le montant restant est calculé
              </div>
              <div className="mono" style={{ fontSize: "0.82rem", lineHeight: 1.7, color: "var(--ink-soft)" }}>
                Total encaissé {fmt(totals.collected)}<br />
                − Frais livraison {fmt(internalDeliveryCost)}<br />
                − Charges externes {fmt(totals.charges)}<br />
                − Remis {fmt(totals.remitted)}<br />
                <strong style={{ color: "var(--ink)" }}>= Restant {fmt(held)} {CURRENCY}</strong>
              </div>
            </div>
          </>
        )}
      </div>
      <TabBar />
    </div>
  );
}
