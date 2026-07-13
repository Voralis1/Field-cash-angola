"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { TopBar, Toast } from "@/components/UI";
import TabBar from "@/components/TabBar";
import { fmt, todayISO, CURRENCY, COUNTRY, type Delivery } from "@/lib/helpers";
import { Truck, Plus, Save, User, Package } from "lucide-react";

export default function DeliveriesPage() {
  const [date, setDate] = useState(todayISO());
  const [agent, setAgent] = useState("");
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [pending, setPending] = useState<
    { agent: string; orderId: string; amount: number; fee: number }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind?: "ok" | "err" } | null>(null);
  const [today, setToday] = useState<Delivery[]>([]);

  const loadToday = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("field_deliveries")
      .select("*")
      .eq("delivery_date", date)
      .order("created_at", { ascending: true });
    setToday((data as Delivery[]) ?? []);
  }, [date]);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  function addLine() {
    if (!/^\d+$/.test(orderId.trim())) {
      setToast({ msg: "ID de la commande invalide (chiffres uniquement)", kind: "err" });
      return;
    }
    const v = Number(amount.replace(/\s/g, ""));
    if (!v || v <= 0) {
      setToast({ msg: "Montant invalide", kind: "err" });
      return;
    }
    const fee = Number(deliveryFee.replace(/\s/g, "")) || 0;
    setPending((p) => [
      ...p,
      { agent: agent.trim() || "Livreur", orderId: orderId.trim(), amount: v, fee },
    ]);
    setOrderId("");
    setAmount("");
    setDeliveryFee("");
  }

  function removeLine(i: number) {
    setPending((p) => p.filter((_, idx) => idx !== i));
  }

  async function saveAll() {
    if (pending.length === 0) {
      setToast({ msg: "Aucune livraison à enregistrer", kind: "err" });
      return;
    }
    setSaving(true);
    const supabase = createClient();

    const rows = pending.map((p) => ({
      country: COUNTRY,
      delivery_date: date,
      agent: p.agent,
      order_id: p.orderId,
      amount_collected: p.amount,
      delivery_fee: p.fee,
    }));

    const { error } = await supabase.from("field_deliveries").insert(rows);

    setSaving(false);
    if (error) {
      setToast({ msg: "Erreur d'enregistrement", kind: "err" });
      return;
    }
    setPending([]);
    setToast({ msg: `${rows.length} livraison(s) enregistrée(s)` });
    loadToday();
  }

  const pendingTotal = pending.reduce((s, p) => s + p.amount, 0);
  const savedTotal = today.reduce((s, d) => s + Number(d.amount_collected), 0);

  return (
    <div className="shell">
      <TopBar title="Livraisons" icon={<Truck />} />
      <div className="page">
        <div className="split">
          <div className="panel-form">
            <div className="card">
              <label className="field" style={{ marginBottom: 0 }}>
                <span className="cap">Date</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
            </div>

            <div className="card">
              <div className="section-title" style={{ margin: "0 0 10px" }}>
                Ajouter une livraison encaissée
              </div>
              <label className="field">
                <span className="cap">ID de la commande</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  className="mono"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && addLine()}
                  placeholder="Ex: 00123"
                />
              </label>
              <label className="field">
                <span className="cap">Livreur</span>
                <input
                  value={agent}
                  onChange={(e) => setAgent(e.target.value)}
                  placeholder="Nom du livreur"
                />
              </label>
              <div className="row2">
                <label className="field">
                  <span className="cap">Montant encaissé ({CURRENCY})</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="mono"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addLine()}
                    placeholder="0"
                  />
                </label>
                <label className="field">
                  <span className="cap">Frais de livraison ({CURRENCY})</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="mono"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addLine()}
                    placeholder="0"
                  />
                </label>
              </div>
              <button className="btn ghost" onClick={addLine}>
                <Plus />
                <span>Ajouter à la liste</span>
              </button>

              {pending.length > 0 && (
                <div className="items" style={{ marginTop: 14 }}>
                  {pending.map((p, i) => (
                    <div className="item" key={i}>
                      <span className="n">{i + 1}</span>
                      <span className="amt mono">
                        {fmt(p.amount)} {CURRENCY}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 4 }}>
                        <User size={13} />
                        {p.agent}
                      </span>
                      <span className="mono" style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>
                        #{p.orderId}
                      </span>
                      {p.fee > 0 && (
                        <span className="mono" style={{ fontSize: "0.78rem", color: "var(--rust)" }}>
                          − {fmt(p.fee)} {CURRENCY}
                        </span>
                      )}
                      <button className="x" onClick={() => removeLine(i)} aria-label="Retirer">
                        ×
                      </button>
                    </div>
                  ))}
                  <div
                    className="mono"
                    style={{ textAlign: "right", fontWeight: 800, padding: "6px 4px" }}
                  >
                    Total : {fmt(pendingTotal)} {CURRENCY}
                  </div>
                </div>
              )}

              <button
                className="btn"
                onClick={saveAll}
                disabled={saving || pending.length === 0}
                style={{ marginTop: 10 }}
              >
                <Save />
                <span>{saving ? "Enregistrement…" : `Enregistrer ${pending.length || ""}`.trim()}</span>
              </button>
            </div>
          </div>

          <div className="panel-list">
            <div className="section-title">
              Déjà enregistré le {date} · {fmt(savedTotal)} {CURRENCY}
            </div>
            {today.length === 0 ? (
              <div className="empty">
                <div className="big">Aucune livraison ce jour</div>
                <div className="small">Ajoute les montants encaissés ci-dessus.</div>
              </div>
            ) : (
              <div className="ledger">
                {today.map((d) => (
                  <div className="lrow" key={d.id}>
                    <div className="meta" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <span className="icon-badge">
                        <Package />
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span className="t">{d.agent || "Livreur"}</span>
                        <span className="d">
                          {d.order_id ? `#${d.order_id}` : "Livraison encaissée"}
                          {Number(d.delivery_fee) > 0 &&
                            ` · frais ${fmt(Number(d.delivery_fee))} ${CURRENCY}`}
                        </span>
                      </div>
                    </div>
                    <span className="amt mono">
                      {fmt(Number(d.amount_collected))} {CURRENCY}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {toast && <Toast msg={toast.msg} kind={toast.kind} onDone={() => setToast(null)} />}
      <TabBar />
    </div>
  );
}
