"use client";

import { useState } from "react";
import { Mail, Lock, LogIn, AlertCircle } from "lucide-react";
import CourierIllustration from "@/components/CourierIllustration";

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
    <div className="login-page">
      <div className="login-hero">
        <div className="blob b1" />
        <div className="blob b2" />
        <CourierIllustration />
        <div className="brand">
          <div className="mark">Field Cash</div>
          <div className="tag">Suivi quotidien · Angola</div>
        </div>
      </div>

      <div className="login-form-side">
        <div className="login-card">
          <form className="card" onSubmit={signIn}>
            <div className="form-title">Bon retour</div>
            <div className="form-sub">Connecte-toi pour gérer la caisse du jour.</div>

            <label className="field">
              <span className="cap">Email</span>
              <div className="field-icon">
                <Mail />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </label>
            <label className="field">
              <span className="cap">Mot de passe</span>
              <div className="field-icon">
                <Lock />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </label>
            {err && (
              <div className="err-text">
                <AlertCircle />
                {err}
              </div>
            )}
            <button className="btn" disabled={busy} style={{ marginTop: 8 }}>
              <LogIn />
              <span>{busy ? "Connexion…" : "Se connecter"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
