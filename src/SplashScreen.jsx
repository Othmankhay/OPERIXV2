import { useState, useEffect } from "react";

export default function SplashScreen({ onFinish }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 2000);
    const finish = setTimeout(() => onFinish(), 2500);
    return () => { clearTimeout(timer); clearTimeout(finish); };
  }, [onFinish]);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes splashLogoIn {
        from { opacity: 0; transform: scale(0.85); }
        to   { opacity: 1; transform: scale(1); }
      }
      @keyframes splashTaglineIn {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes splashBarGlow {
        0%   { width: 0; opacity: 0; }
        60%  { opacity: 1; }
        100% { width: 60px; opacity: 1; }
      }
      @keyframes splashFadeOut {
        from { opacity: 1; }
        to   { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, background: "#0f0e1a",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      animation: fadeOut ? "splashFadeOut 0.5s ease forwards" : "none",
    }}>
      {/* Logo container */}
      <div style={{
        animation: "splashLogoIn 0.8s cubic-bezier(0.16,1,0.3,1) forwards",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
      }}>
        {/* Hexagon with X */}
        <svg width="80" height="90" viewBox="0 0 80 90" fill="none" style={{ marginBottom: 16 }}>
          <polygon
            points="40,2 76,22 76,68 40,88 4,68 4,22"
            fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinejoin="round"
          />
          <line x1="26" y1="30" x2="54" y2="60" stroke="#7c3aed" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="54" y1="30" x2="26" y2="60" stroke="#7c3aed" strokeWidth="3.5" strokeLinecap="round" />
        </svg>

        {/* Wordmark */}
        <div style={{
          fontSize: 38, fontWeight: 800, letterSpacing: 8, color: "#7c3aed",
          fontFamily: "'DM Sans','Segoe UI',sans-serif",
        }}>OPERIX</div>

        {/* Accent bar */}
        <div style={{
          height: 3, borderRadius: 2, background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
          marginTop: 12, animation: "splashBarGlow 0.8s 0.4s ease forwards",
          width: 0, opacity: 0,
        }} />

        {/* Tagline */}
        <div style={{
          fontSize: 12, fontWeight: 600, letterSpacing: 4, color: "#a78bfa",
          marginTop: 14, textTransform: "uppercase",
          opacity: 0, animation: "splashTaglineIn 0.6s 0.6s ease forwards",
          fontFamily: "'DM Sans','Segoe UI',sans-serif",
        }}>Operational Xchange</div>
      </div>
    </div>
  );
}
