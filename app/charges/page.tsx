"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { TopBar, Toast, Modal } from "@/components/UI";
import TabBar from "@/components/TabBar";
import { fmt, todayISO, CURRENCY, COUNTRY, type Charge } from "@/lib/helpers";
import { Receipt, Save, ReceiptText, Pencil } from "lucide-react";

const CATEGORIES = ["Gasoil", "Agent", "Import", "Autre"];

export default function ChargesPage() {
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [otherCategory, setOtherCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind?: "ok" | "err" } | null>(null);
  const [recent, setRecent] = useState<Charge[]>([]);

  const [editing, setEditing] = useState<Charge | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState(CATEGORIES[0]);
  const [editOtherCategory, setEditOtherCategory] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editSaving, setEditSaving] = useState(false);

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
    if (category === "Autre" && !otherCategory.trim()) {
      setToast({ msg: "Précise la catégorie", kind: "err" });
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("field_charges").insert({
      country: COUNTRY,
      charge_date: date,
      description: description.trim() || null,
      category: category === "Autre" ? otherCategory.trim() : category,
      amount: v,
    });
    setSaving(false);
    if (error) {
      setToast({ msg: "Erreur d'enregistrement", kind: "err" });
      return;
    }
    setAmount("");
    setDescription("");
    setOtherCategory("");
    setToast({ msg: "Charge enregistrée" });
    load();
  }

  function openEdit(c: Charge) {
    setEditing(c);
    setEditDescription(c.description || "");
    const known = CATEGORIES.includes(c.category || "") ? c.category || CATEGORIES[0] : "Autre";
    setEditCategory(known);
    setEditOtherCategory(known === "Autre" ? c.category || "" : "");
    setEditAmount(String(c.amount));
    setEditDate(c.charge_date);
  }

  async function saveEdit() {
    if (!editing) return;
    const v = Number(editAmount.replace(/\s/g, ""));
    if (!v || v <= 0) {
      setToast({ msg: "Montant invalide", kind: "err" });
      return;
    }
    if (editCategory === "Autre" && !editOtherCategory.trim()) {
      setToast({ msg: "Précise la catégorie", kind: "err" });
      return;
    }
    setEditSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("field_charges")
      .update({
        charge_date: editDate,
        description: editDescription.trim() || null,
        category: editCategory === "Autre" ? editOtherCategory.trim() : editCategory,
        amount: v,
      })
      .eq("id", editing.id);
    setEditSaving(false);
    if (error) {
      setToast({ msg: "Erreur de modification", kind: "err" });
      return;
    }
    setEditing(null);
    setToast({ msg: "Charge modifiée" });
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
              {category === "Autre" && (
                <label className="field">
                  <span className="cap">Précise la catégorie</span>
                  <input
                    value={otherCategory}
                    onChange={(e) => setOtherCategory(e.target.value)}
                    placeholder="Ex. réparation véhicule"
                  />
                </label>
              )}
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
                    <div className="lrow-actions">
                      <span className="amt mono" style={{ color: "var(--rust)" }}>
                        −{fmt(Number(c.amount))} {CURRENCY}
                      </span>
                      <button className="edit-btn" onClick={() => openEdit(c)} aria-label="Modifier">
                        <Pencil />
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
        <Modal title="Modifier la charge" onClose={() => setEditing(null)}>
          <label className="field">
            <span className="cap">Date</span>
            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
          </label>
          <label className="field">
            <span className="cap">Catégorie</span>
            <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          {editCategory === "Autre" && (
            <label className="field">
              <span className="cap">Précise la catégorie</span>
              <input
                value={editOtherCategory}
                onChange={(e) => setEditOtherCategory(e.target.value)}
                placeholder="Ex. réparation véhicule"
              />
            </label>
          )}
          <label className="field">
            <span className="cap">Description</span>
            <input
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Ex. gasoil + agent"
            />
          </label>
          <label className="field">
            <span className="cap">Montant ({CURRENCY})</span>
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
