"use client";

import { useEffect, type ReactNode } from "react";
import { LogOut, X } from "lucide-react";

export function TopBar({ title, icon }: { title: string; icon?: ReactNode }) {
  async function signOut() {
    const { createClient } = await import("@/lib/supabase-browser");
    await createClient().auth.signOut();
    window.location.href = "/login";
  }
  return (
    <header className="topbar">
      <div className="titlewrap">
        {icon && <span className="ticon">{icon}</span>}
        <div>
          <h1>{title}</h1>
          <div className="sub">Field Cash · Angola</div>
        </div>
      </div>
      <button className="signout" onClick={signOut}>
        <LogOut />
        <span>Sortir</span>
      </button>
    </header>
  );
}

export function Toast({
  msg,
  kind,
  onDone,
}: {
  msg: string;
  kind?: "ok" | "err";
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className={`toast ${kind === "err" ? "err" : ""}`}>{msg}</div>;
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
