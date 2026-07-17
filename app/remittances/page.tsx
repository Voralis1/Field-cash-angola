"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { TopBar, Toast, Modal } from "@/components/UI";
import TabBar from "@/components/TabBar";
import { fmt, todayISO, CURRENCY, COUNTRY, type Remittance } from "@/lib/helpers";
import { Send, ArrowUpRight, Pencil, Save, Trash2 } from "lucide-react";

const METHODS = ["USDT", "Virement bancaire", "Autre"];

export default function RemittancesPage() {
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(METHODS[0]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind?: "ok" | "err" } | null>(null);
  const [recent, setRecent] = useState<Remittance[]>([]);

  const [editing, setEditing] = useState<Remittance | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editMethod, setEditMethod] = useState(METHODS[0]);
  const [editDate, setEditDate] = useState("");
  const [editSaving, setEditSaving] = useState(false);

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

  function openEdit(r: Remittance) {
    setEditing(r);
    setEditAmount(String(r.amount));
    setEditMethod(r.method || METHODS[0]);
    setEditDate(r.remit_date);
  }

  async function saveEdit() {
    if (!editing) return;
    const v = Number(editAmount.replace(/\s/g, ""));
    if (!v || v <= 0) {
      setToast({ msg: "Montant invalide", kind: "err" });
      return;
    }
    setEditSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("field_remittances")
      .update({ remit_date: editDate, amount: v, method: editMethod })
      .eq("id", editing.id);
    setEditSaving(false);
    if (error) {
      setToast({ msg: "Erreur de modification", kind: "err" });
      return;
    }
    setEditing(null);
    setToast({ msg: "Remise modifiée" });
    load();
  }

  async function remove(r: Remittance) {
    if (!window.confirm("Supprimer cette remise ?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("field_remittances").delete().eq("id", r.id);
    if (error) {
      setToast({ msg: "Erreur de suppression", kind: "err" });
      return;
    }
    setToast({ msg: "Remise supprimée" });
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
                    <div className="lrow-actions">
                      <span className="amt mono" style={{ color: "var(--green)" }}>
                        {fmt(Number(r.amount))} {CURRENCY}
                      </span>
                      <button className="edit-btn" onClick={() => openEdit(r)} aria-label="Modifier">
                        <Pencil />
                      </button>
                      <button className="delete-btn" onClick={() => remove(r)} aria-label="Supprimer">
                        <Trash2 />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {toast && <Toast msg={toast.msg} kind={toast.kind} onDone={() => setToast(null)} />}

      {editing && (
        <Modal title="Modifier la remise" onClose={() => setEditing(null)}>
          <label className="field">
            <span className="cap">Date de remise</span>
            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
          </label>
          <label className="field">
            <span className="cap">Moyen</span>
            <select value={editMethod} onChange={(e) => setEditMethod(e.target.value)}>
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
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              placeholder="0"
            />
          </label>
          <button className="btn" onClick={saveEdit} disabled={editSaving}>
            <Save />
            <span>{editSaving ? "Enregistrement…" : "Enregistrer les modifications"}</span>
          </button>
        </Modal>
      )}

      <TabBar />
    </div>
  );
}
