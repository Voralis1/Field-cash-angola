"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { TopBar, Toast } from "@/components/UI";
import TabBar from "@/components/TabBar";
import { fmt, todayISO, CURRENCY, COUNTRY, type Charge } from "@/lib/helpers";
import { Receipt, Save, ReceiptText } from "lucide-react";

const CATEGORIES = ["Gasoil", "Agent", "Import", "Autre"];

export default function ChargesPage() {
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind?: "ok" | "err" } | null>(null);
  const [recent, setRecent] = useState<Charge[]>([]);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("field_charges")
      .select("*")
      .order("charge_date", { ascending: false })
      .limit(15);
    setRecent((data as Charge[]) ?? []);
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
    const { error } = await supabase.from("field_charges").insert({
      country: COUNTRY,
      charge_date: date,
      description: description.trim() || null,
      category,
      amount: v,
    });
    setSaving(false);
    if (error) {
      setToast({ msg: "Erreur d'enregistrement", kind: "err" });
      return;
    }
    setAmount("");
    setDescription("");
    setToast({ msg: "Charge enregistrée" });
    load();
  }

  return (
    <div className="shell">
      <TopBar title="Charges externes" icon={<Receipt />} />
      <div className="page">
        <div className="split">
          <div className="panel-form">
            <div className="card">
              <label className="field">
                <span className="cap">Date</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className="field">
                <span className="cap">Catégorie</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="cap">Description</span>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex. gasoil + agent"
                />
              </label>
              <label className="field">
                <span className="cap">Montant ({CURRENCY})</span>
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
                <Save />
                <span>{saving ? "Enregistrement…" : "Enregistrer la charge"}</span>
              </button>
            </div>
          </div>

          <div className="panel-list">
            <div className="section-title">Charges récentes</div>
            {recent.length === 0 ? (
              <div className="empty">
                <div className="big">Aucune charge</div>
                <div className="small">Enregistre la première ci-dessus.</div>
              </div>
            ) : (
              <div className="ledger">
                {recent.map((c) => (
                  <div className="lrow" key={c.id}>
                    <div className="meta" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <span className="icon-badge rust">
                        <ReceiptText />
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span className="t">{c.description || c.category}</span>
                        <span className="d">
                          {c.charge_date} · {c.category}
                        </span>
                      </div>
                    </div>
                    <span className="amt mono" style={{ color: "var(--rust)" }}>
                      −{fmt(Number(c.amount))} {CURRENCY}
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
