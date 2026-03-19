import { useState, useEffect } from "react";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focusField, setFocusField] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes loginFadeIn {
        from { opacity: 0; transform: translateY(16px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes loginPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.3); }
        50% { box-shadow: 0 0 0 6px rgba(124,58,237,0); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setTimeout(() => onLogin(), 800);
  };

  const inputStyle = (field) => ({
    width: "100%", padding: "14px 16px", borderRadius: 10, fontSize: 14,
    border: focusField === field ? "1.5px solid #7c3aed" : "1.5px solid #2a2940",
    background: "#1a1930", color: "#e2e0f0", outline: "none",
    transition: "border 0.2s, box-shadow 0.2s",
    boxShadow: focusField === field ? "0 0 0 3px rgba(124,58,237,0.15)" : "none",
    fontFamily: "'DM Sans','Segoe UI',sans-serif",
    boxSizing: "border-box",
  });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9998, background: "#0f0e1a",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
    }}>
      <div style={{
        width: 380, animation: "loginFadeIn 0.6s ease forwards",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        {/* Logo */}
        <svg width="56" height="64" viewBox="0 0 80 90" fill="none" style={{ marginBottom: 12 }}>
          <polygon
            points="40,2 76,22 76,68 40,88 4,68 4,22"
            fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinejoin="round"
          />
          <line x1="26" y1="30" x2="54" y2="60" stroke="#7c3aed" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="54" y1="30" x2="26" y2="60" stroke="#7c3aed" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 6, color: "#7c3aed", marginBottom: 4 }}>OPERIX</div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 3.5, color: "#a78bfa", textTransform: "uppercase", marginBottom: 36 }}>
          Operational Xchange
        </div>

        {/* Form card */}
        <form onSubmit={handleSubmit} style={{
          width: "100%", background: "#16152a", borderRadius: 16,
          padding: "32px 28px", border: "1px solid #2a2940",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e0f0", marginBottom: 4 }}>Bienvenue</div>
          <div style={{ fontSize: 13, color: "#6b6b8d", marginBottom: 24 }}>Connectez-vous à votre espace de travail</div>

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#8b8ba8", marginBottom: 6 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocusField("email")} onBlur={() => setFocusField("")}
              placeholder="vous@entreprise.com"
              style={inputStyle("email")}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#8b8ba8", marginBottom: 6 }}>Mot de passe</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusField("password")} onBlur={() => setFocusField("")}
                placeholder="••••••••"
                style={inputStyle("password")}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#6b6b8d",
                  padding: 4,
                }}>
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          <div style={{ textAlign: "right", marginBottom: 24 }}>
            <span style={{ fontSize: 12, color: "#7c3aed", cursor: "pointer", fontWeight: 500, transition: "color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.color = "#a78bfa"}
              onMouseLeave={e => e.currentTarget.style.color = "#7c3aed"}>
              Mot de passe oublié ?
            </span>
          </div>

          {/* Submit button */}
          <button type="submit" disabled={loading}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 10, border: "none",
              background: loading ? "#5b21b6" : "linear-gradient(135deg, #7c3aed, #6d28d9)",
              color: "#fff", fontWeight: 700, fontSize: 15, cursor: loading ? "wait" : "pointer",
              transition: "all 0.2s", letterSpacing: 1,
              boxShadow: "0 4px 16px rgba(124,58,237,0.3)",
              fontFamily: "'DM Sans','Segoe UI',sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = "0 6px 24px rgba(124,58,237,0.45)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(124,58,237,0.3)"; }}>
            {loading ? (
              <>
                <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid #fff4", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                Connexion...
              </>
            ) : "Se connecter"}
          </button>
        </form>

        {/* Footer */}
        <div style={{ marginTop: 28, fontSize: 11, color: "#4a4a6a", textAlign: "center" }}>
          © 2026 OPERIX — Operational Xchange Platform
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
