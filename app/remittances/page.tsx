"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { TopBar, Toast } from "@/components/UI";
import TabBar from "@/components/TabBar";
import { fmt, todayISO, CURRENCY, COUNTRY, type Remittance } from "@/lib/helpers";
import { Send, ArrowUpRight } from "lucide-react";

const METHODS = ["USDT", "Virement bancaire", "Autre"];

export default function RemittancesPage() {
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(METHODS[0]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind?: "ok" | "err" } | null>(null);
  const [recent, setRecent] = useState<Remittance[]>([]);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("field_remittances")
      .select("*")
      .order("remit_date", { ascending: false })
      .limit(15);
    setRecent((data as Remittance[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    const v = Number(amount.replace(/\s/g, ""));
    if (!v || v <= 0) {
      setToast({ msg: "Montant invalide", kind: "err" });
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("field_remittances").insert({
      country: COUNTRY,
      remit_date: date,
      amount: v,
      method,
      status: "sent",
    });
    setSaving(false);
    if (error) {
      setToast({ msg: "Erreur d'enregistrement", kind: "err" });
      return;
    }
    setAmount("");
    setToast({ msg: "Remise enregistrée" });
    load();
  }

  return (
    <div className="shell">
      <TopBar title="Remises / rapatriement" icon={<Send />} />
      <div className="page">
        <div className="split">
          <div className="panel-form">
            <div className="card">
              <label className="field">
                <span className="cap">Date de remise</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className="field">
                <span className="cap">Moyen</span>
                <select value={method} onChange={(e) => setMethod(e.target.value)}>
                  {METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="cap">Montant remis ({CURRENCY})</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className="mono"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </label>
              <button className="btn" onClick={save} disabled={saving}>
                <Send />
                <span>{saving ? "Enregistrement…" : "Enregistrer la remise"}</span>
              </button>
            </div>
          </div>

          <div className="panel-list">
            <div className="section-title">Remises récentes</div>
            {recent.length === 0 ? (
              <div className="empty">
                <div className="big">Aucune remise</div>
                <div className="small">Enregistre le premier rapatriement ci-dessus.</div>
              </div>
            ) : (
              <div className="ledger">
                {recent.map((r) => (
                  <div className="lrow" key={r.id}>
                    <div className="meta" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <span className="icon-badge green">
                        <ArrowUpRight />
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span className="t">{r.method}</span>
                        <span className="d">{r.remit_date}</span>
                      </div>
                    </div>
                    <span className="amt mono" style={{ color: "var(--green)" }}>
                      {fmt(Number(r.amount))} {CURRENCY}
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
