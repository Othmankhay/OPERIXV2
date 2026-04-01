import { useState } from "react";

const SEMAINES_OTD = [
  { key: "2026-S04", date: "26/01/2026" },
  { key: "2026-S05", date: "02/02/2026" },
  { key: "2026-S06", date: "09/02/2026" },
  { key: "2026-S07", date: "16/02/2026" },
  { key: "2026-S08", date: "23/02/2026" },
  { key: "2026-S09", date: "02/03/2026" },
  { key: "2026-S10", date: "09/03/2026" },
  { key: "2026-S11", date: "16/03/2026" },
];

const HORIZONS = [
  { label: "S", statusLabel: "En cours", statusColor: "#1e8449" },
  { label: "S+1", statusLabel: "Retard", statusColor: "#e67e22" },
  { label: "S+2", statusLabel: "Manquant", statusColor: "#e84393" },
  { label: "S+3", statusLabel: "Manquant plus", statusColor: "#c0392b" },
  { label: "S+4", statusLabel: "Manquant plus", statusColor: "#c0392b" },
];

// Toutes les valeurs à 0 par défaut
function generateMockData() {
  const data = {};
  HORIZONS.forEach(h => {
    data[h.label] = SEMAINES_OTD.map(() => ({ total: 0, livre: 0, nonLivre: 0 }));
  });
  return data;
}

export default function PageOTD() {
  const [otdData] = useState(generateMockData);

  const pctColor = (pct, hasTotal) => {
    if (!hasTotal) return { bg: "#f1f5f9", color: "#94a3b8" }; // Gris si pas de volume
    if (pct >= 80) return { bg: "#dcfce7", color: "#166534" };
    if (pct >= 50) return { bg: "#fef3c7", color: "#92400e" };
    return { bg: "#fee2e2", color: "#991b1b" };
  };

  const tdShared = { borderBottom: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0", padding: "10px 8px", textAlign: "center", fontSize: 13 };

  return (
    <div style={{ padding: 24, overflowX: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a2744" }}>📊 OTD — On Time Delivery</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #16a34a", background: "#f0fdf4", cursor: "pointer", fontWeight: 600, fontSize: 13, color: "#16a34a", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#dcfce7"}
            onMouseLeave={e => e.currentTarget.style.background = "#f0fdf4"}>
            📗 Rapport OTD Excel
          </button>
          <button style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #16a34a", background: "#f0fdf4", cursor: "pointer", fontWeight: 600, fontSize: 13, color: "#16a34a", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#dcfce7"}
            onMouseLeave={e => e.currentTarget.style.background = "#f0fdf4"}>
            📗 Résumé OTD Excel
          </button>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflowX: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ padding: "14px 16px", background: "#1a2744", color: "#fff", left: 0, textAlign: "left", fontSize: 12, fontWeight: 700, textTransform: "uppercase", borderRight: "1px solid #334155" }}>
                Semaine
              </th>
              {SEMAINES_OTD.map(s => (
                <th key={s.key} style={{ padding: "10px 8px", background: "#1a2744", color: "#fff", textAlign: "center", fontSize: 12, fontWeight: 700, minWidth: 90, borderRight: "1px solid #334155" }}>
                  <div>{s.key}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400, marginTop: 2 }}>{s.date}</div>
                </th>
              ))}
              <th style={{ padding: "10px 8px", background: "#fef9ec", color: "#92400e", textAlign: "center", fontSize: 12, fontWeight: 800, borderLeft: "2px solid #f59e0b" }}>
                Live
              </th>
            </tr>
          </thead>
          {HORIZONS.map((horizon, hi) => {
            const rows = otdData[horizon.label] || [];
            return (
              <tbody key={horizon.label}>
                {/* Horizon group header */}
                <tr>
                  <td colSpan={SEMAINES_OTD.length + 2} style={{ padding: "10px 16px", background: "#f0f4ff", fontWeight: 800, fontSize: 14, color: "#1e40af", borderBottom: "2px solid #bfdbfe", borderTop: hi > 0 ? "3px solid #cbd5e1" : "none" }}>
                    📌 Horizon {horizon.label}
                  </td>
                </tr>
                
                {/* Total row */}
                <tr style={{ background: "#f8fafc" }}>
                  <td style={{ ...tdShared, padding: "10px 16px", fontWeight: 700, color: "#1a2744", textAlign: "left" }}>Total</td>
                  {rows.map((r, ri) => (
                    <td key={ri} style={{ ...tdShared, fontWeight: 700, color: "#1a2744" }}>{r.total}</td>
                  ))}
                  <td style={{ ...tdShared, fontWeight: 700, color: "#92400e", background: "#fef9ec", borderLeft: "2px solid #f59e0b", borderRight: "none" }}>
                    {horizon.label === "S" ? "–" : rows.reduce((s, r) => s + r.total, 0)}
                  </td>
                </tr>

                {/* Livré row */}
                <tr style={{ background: "#fff" }}>
                  <td style={{ ...tdShared, padding: "10px 16px", fontWeight: 600, color: "#16a34a", textAlign: "left" }}>Livré</td>
                  {rows.map((r, ri) => (
                    <td key={ri} style={{ ...tdShared, fontWeight: 600, color: "#16a34a" }}>{r.livre}</td>
                  ))}
                  <td style={{ ...tdShared, fontWeight: 600, color: "#16a34a", background: "#fef9ec", borderLeft: "2px solid #f59e0b", borderRight: "none" }}>
                    {horizon.label === "S" ? "–" : rows.reduce((s, r) => s + r.livre, 0)}
                  </td>
                </tr>

                {/* Status row (En cours / Retard / Manquant / Manquant plus) */}
                <tr style={{ background: "#fafbfc" }}>
                  <td style={{ ...tdShared, padding: "10px 16px", fontWeight: 600, color: horizon.statusColor, textAlign: "left" }}>{horizon.statusLabel}</td>
                  {rows.map((r, ri) => (
                    <td key={ri} style={{ ...tdShared, fontWeight: 600, color: horizon.statusColor }}>{r.nonLivre}</td>
                  ))}
                  <td style={{ ...tdShared, fontWeight: 600, color: horizon.statusColor, background: "#fef9ec", borderLeft: "2px solid #f59e0b", borderRight: "none" }}>
                    {horizon.label === "S" ? "–" : rows.reduce((s, r) => s + r.nonLivre, 0)}
                  </td>
                </tr>

                {/* % row */}
                <tr style={{ background: "#fff" }}>
                  <td style={{ ...tdShared, padding: "10px 16px", fontWeight: 700, color: "#475569", textAlign: "left" }}>%</td>
                  {rows.map((r, ri) => {
                    const hasTotal = r.total > 0;
                    const pct = hasTotal ? Math.round((r.livre / r.total) * 100) : 0;
                    const pc = pctColor(pct, hasTotal);
                    return (
                      <td key={ri} style={{ ...tdShared, fontWeight: 800, color: pc.color, background: pc.bg }}>
                        {hasTotal ? `${pct}%` : "–"}
                      </td>
                    );
                  })}
                  {(() => {
                    const tTotal = rows.reduce((s, r) => s + r.total, 0);
                    const tLivre = rows.reduce((s, r) => s + r.livre, 0);
                    const hasTotal = tTotal > 0;
                    const pct = hasTotal ? Math.round((tLivre / tTotal) * 100) : 0;
                    const pc = pctColor(pct, hasTotal);
                    
                    return (
                      <td style={{ ...tdShared, fontWeight: 800, borderLeft: "2px solid #f59e0b", borderRight: "none", color: pc.color, background: horizon.label === "S" ? "#fef9ec" : pc.bg }}>
                        {horizon.label === "S" ? "–" : (hasTotal ? `${pct}%` : "–")}
                      </td>
                    );
                  })()}
                </tr>
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}

