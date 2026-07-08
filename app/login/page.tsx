"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (!res.ok) {
      setErr("Email ou mot de passe incorrect.");
      return;
    }
    window.location.href = "/";
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand">
          <div className="mark">Field Cash</div>
          <div className="tag">Suivi quotidien · Angola</div>
        </div>
        <form className="card" onSubmit={signIn}>
          <label className="field">
            <span className="cap">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="cap">Mot de passe</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {err && <div className="err-text">{err}</div>}
          <button className="btn" disabled={busy} style={{ marginTop: 8 }}>
            {busy ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
