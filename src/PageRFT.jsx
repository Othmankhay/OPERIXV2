import { useState } from "react";

export default function PageRFT() {
  const [dateDebut, setDateDebut] = useState("2026-01-01");
  const [dateFin, setDateFin] = useState("2026-03-07");
  const [vue, setVue] = useState("Jours de travail");

  const dates = ["01-01-26", "02-01-26", "05-01-26", "06-01-26", "07-01-26", "08-01-26", "09-01-26"];

  const tdShared = { padding: "12px 16px", borderBottom: "1px solid #f1f5f9", textAlign: "left", fontSize: 13, color: "#1a2744" };
  const thShared = { padding: "14px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#475569", borderBottom: "2px solid #e2e8f0", textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <div style={{ padding: 24, overflowX: "auto" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a2744", marginBottom: 20 }}>✅ Rapport RFT — Right First Time</h2>

      {/* Container for Filters */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 16, marginBottom: 24, border: "1px solid #e2e8f0" }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Date de début</label>
          <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 13, width: 140, outline: "none", color: "#1a2744", cursor: "pointer" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Date finale</label>
          <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 13, width: 140, outline: "none", color: "#1a2744", cursor: "pointer" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Vue</label>
          <select value={vue} onChange={e => setVue(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 13, width: 160, outline: "none", cursor: "pointer", color: "#1a2744" }}>
            <option value="Jours de travail">Jours de travail</option>
            <option value="Semaines">Semaines</option>
            <option value="Mois">Mois</option>
          </select>
        </div>
        <button style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#1a2744", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "background 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.background = "#2d3748"}
          onMouseLeave={e => e.currentTarget.style.background = "#1a2744"}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
          Appliquer
        </button>
      </div>

      {/* Actions and Table */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 16 }}>
        <button style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f0f4ff", cursor: "pointer", fontWeight: 600, fontSize: 13, color: "#1a2744", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.background = "#e0e7ff"}
          onMouseLeave={e => e.currentTarget.style.background = "#f0f4ff"}>
          📄 Exporter CSV
        </button>
        <button style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #16a34a", background: "#f0fdf4", cursor: "pointer", fontWeight: 600, fontSize: 13, color: "#16a34a", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.background = "#dcfce7"}
          onMouseLeave={e => e.currentTarget.style.background = "#f0fdf4"}>
          📗 Exporter Excel
        </button>
      </div>

      {/* RFT Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflowX: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={thShared}>Jour</th>
              {dates.map(d => <th key={d} style={thShared}>{d}</th>)}
              <th style={{ ...thShared, textAlign: "center", borderLeft: "2px solid #e2e8f0" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: "#fff", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              <td style={{ ...tdShared, fontWeight: 600 }}>Tâches totales</td>
              {dates.map(d => <td key={d} style={tdShared}>-</td>)}
              <td style={{ ...tdShared, fontWeight: 700, textAlign: "center", borderLeft: "2px solid #e2e8f0" }}>0</td>
            </tr>
            <tr style={{ background: "#fafbfc", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = "#fafbfc"}>
              <td style={{ ...tdShared, fontWeight: 600 }}>RFT</td>
              {dates.map(d => <td key={d} style={tdShared}>-</td>)}
              <td style={{ ...tdShared, fontWeight: 700, textAlign: "center", borderLeft: "2px solid #e2e8f0" }}>0</td>
            </tr>
            <tr style={{ background: "#fff", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              <td style={{ ...tdShared, fontWeight: 600 }}>Non RFT</td>
              {dates.map(d => <td key={d} style={tdShared}>-</td>)}
              <td style={{ ...tdShared, fontWeight: 700, textAlign: "center", borderLeft: "2px solid #e2e8f0" }}>0</td>
            </tr>
            <tr style={{ background: "#fafbfc", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = "#fafbfc"}>
              <td style={{ ...tdShared, fontWeight: 700, color: "#3b82f6" }}>RFT Réel (%)</td>
              {dates.map(d => <td key={d} style={{ ...tdShared, fontWeight: 600, color: "#3b82f6" }}>-</td>)}
              <td style={{ ...tdShared, borderLeft: "2px solid #e2e8f0" }}></td>
            </tr>
            <tr style={{ background: "#fff", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              <td style={{ ...tdShared, fontWeight: 700, color: "#16a34a", borderBottom: "none" }}>RFT ciblé (%)</td>
              {dates.map(d => <td key={d} style={{ ...tdShared, fontWeight: 600, color: "#16a34a", borderBottom: "none" }}>97.0%</td>)}
              <td style={{ ...tdShared, borderBottom: "none", borderLeft: "2px solid #e2e8f0" }}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
