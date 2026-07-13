"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { TopBar } from "@/components/UI";
import TabBar from "@/components/TabBar";
import { fmt, CURRENCY } from "@/lib/helpers";
import {
  LayoutDashboard,
  Wallet,
  Package,
  Fuel,
  Receipt,
  Send,
  PiggyBank,
  Trophy,
  Users,
} from "lucide-react";

type Range = "7" | "30" | "all" | "custom";
type DriverStat = { agent: string; count: number };

export default function HomePage() {
  const [range, setRange] = useState<Range>("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    collected: 0,
    nbDeliveries: 0,
    deliveryFees: 0,
    charges: 0,
    remitted: 0,
  });
  const [driverStats, setDriverStats] = useState<DriverStat[]>([]);

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

    let delsQ = supabase
      .from("field_deliveries")
      .select("amount_collected, delivery_date, agent, delivery_fee")
      .gte("delivery_date", since);
    let chgsQ = supabase.from("field_charges").select("amount, charge_date").gte("charge_date", since);
    let remsQ = supabase.from("field_remittances").select("amount, remit_date").gte("remit_date", since);
    if (until) {
      delsQ = delsQ.lte("delivery_date", until);
      chgsQ = chgsQ.lte("charge_date", until);
      remsQ = remsQ.lte("remit_date", until);
    }

    const [{ data: dels }, { data: chgs }, { data: rems }] = await Promise.all([delsQ, chgsQ, remsQ]);

    const collected = (dels ?? []).reduce((s, r: any) => s + Number(r.amount_collected), 0);
    const nbDeliveries = (dels ?? []).length;
    const deliveryFees = (dels ?? []).reduce((s, r: any) => s + Number(r.delivery_fee), 0);
    const charges = (chgs ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
    const remitted = (rems ?? []).reduce((s, r: any) => s + Number(r.amount), 0);

    const counts = new Map<string, number>();
    for (const r of dels ?? []) {
      const name = (r as any).agent?.trim() || "Agent";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const drivers = Array.from(counts, ([agent, count]) => ({ agent, count })).sort(
      (a, b) => b.count - a.count
    );

    setTotals({ collected, nbDeliveries, deliveryFees, charges, remitted });
    setDriverStats(drivers);
    setLoading(false);
  }, [range, customFrom, customTo]);

  useEffect(() => {
    load();
  }, [load]);

  // Internal delivery cost = sum of the actual delivery fees entered per delivery (not fixed)
  const internalDeliveryCost = totals.deliveryFees;

  // Commission agent = 2000 par commande livrée
  const agentCommission = totals.nbDeliveries * 2000;

  // Cash held by the manager = collected − internal delivery cost − external charges − remitted − commission agent
  const held =
    totals.collected - internalDeliveryCost - totals.charges - totals.remitted - agentCommission;

  const podium = driverStats.slice(0, 3);
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean) as DriverStat[];

  return (
    <div className="shell">
      <TopBar title="Résumé" icon={<LayoutDashboard />} />
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
                <div className="top-row">
                  <div className="label">Total encaissé</div>
                  <span className="icon-badge green"><Wallet /></span>
                </div>
                <div className="value mono">
                  {fmt(totals.collected)}
                  <span className="unit">{CURRENCY}</span>
                </div>
              </div>
              <div className="stat">
                <div className="top-row">
                  <div className="label">Livraisons</div>
                  <span className="icon-badge"><Package /></span>
                </div>
                <div className="value mono">{totals.nbDeliveries}</div>
              </div>
              <div className="stat rust">
                <div className="top-row">
                  <div className="label">Frais livraison</div>
                  <span className="icon-badge rust"><Fuel /></span>
                </div>
                <div className="value mono">
                  {fmt(internalDeliveryCost)}
                  <span className="unit">{CURRENCY}</span>
                </div>
              </div>
              <div className="stat rust">
                <div className="top-row">
                  <div className="label">Charges externes</div>
                  <span className="icon-badge rust"><Receipt /></span>
                </div>
                <div className="value mono">
                  {fmt(totals.charges)}
                  <span className="unit">{CURRENCY}</span>
                </div>
              </div>
              <div className="stat">
                <div className="top-row">
                  <div className="label">Remis / rapatrié</div>
                  <span className="icon-badge"><Send /></span>
                </div>
                <div className="value mono">
                  {fmt(totals.remitted)}
                  <span className="unit">{CURRENCY}</span>
                </div>
              </div>
              <div className="stat rust">
                <div className="top-row">
                  <div className="label">Commission agent</div>
                  <span className="icon-badge rust"><Users /></span>
                </div>
                <div className="value mono">
                  {fmt(agentCommission)}
                  <span className="unit">{CURRENCY}</span>
                </div>
              </div>
              <div className={`stat ${held >= 0 ? "amber" : "rust"}`}>
                <div className="top-row">
                  <div className="label">Montant restant</div>
                  <span className={`icon-badge ${held >= 0 ? "amber" : "rust"}`}><PiggyBank /></span>
                </div>
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
                − Commission agent {fmt(agentCommission)}<br />
                <strong style={{ color: "var(--ink)" }}>= Restant {fmt(held)} {CURRENCY}</strong>
              </div>
            </div>

            <div className="card tight" style={{ marginTop: 4 }}>
              <div
                className="section-title"
                style={{ margin: "2px 0 12px", display: "flex", alignItems: "center", gap: 6 }}
              >
                <Trophy size={14} /> Top livreurs
              </div>
              {driverStats.length === 0 ? (
                <div className="empty">
                  <div className="small">Aucune livraison sur la période.</div>
                </div>
              ) : (
                <>
                  <div className="podium">
                    {podiumOrder.map((d) => {
                      const rank = podium.indexOf(d);
                      const medal = rank === 0 ? "gold" : rank === 1 ? "silver" : "bronze";
                      const emoji = rank === 0 ? "🥇" : rank === 1 ? "🥈" : "🥉";
                      return (
                        <div className={`podium-spot ${medal}`} key={d.agent}>
                          <span className="podium-medal">{emoji}</span>
                          <span className="podium-name">{d.agent}</span>
                          <span className="podium-count">
                            {d.count} livraison{d.count > 1 ? "s" : ""}
                          </span>
                          <div className="podium-bar">{d.count}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="ledger">
                    {driverStats.map((d, i) => (
                      <div className="lrow" key={d.agent}>
                        <div className="meta" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <span className="icon-badge" style={{ fontSize: "0.78rem", fontWeight: 800 }}>
                            {i + 1}
                          </span>
                          <span className="t">{d.agent}</span>
                        </div>
                        <span className="amt mono">
                          {d.count} livraison{d.count > 1 ? "s" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
      <TabBar />
    </div>
  );
}
