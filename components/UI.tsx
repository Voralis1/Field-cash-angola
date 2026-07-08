"use client";

import { useEffect } from "react";

export function TopBar({ title }: { title: string }) {
  async function signOut() {
    const { createClient } = await import("@/lib/supabase-browser");
    await createClient().auth.signOut();
    window.location.href = "/login";
  }
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        <div className="sub">Field Cash · Angola</div>
      </div>
      <button
        onClick={signOut}
        style={{
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.3)",
          color: "var(--paper)",
          borderRadius: 8,
          padding: "5px 10px",
          fontSize: "0.72rem",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Sortir
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
