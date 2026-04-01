import { useState } from "react";

const STATUT_STYLE = {
  "Succès": { bg: "#f0fdf4", color: "#16a34a", icon: "✅" },
  "Partiel": { bg: "#fffbeb", color: "#d97706", icon: "⚠️" },
  "Erreur": { bg: "#fff1f1", color: "#dc2626", icon: "❌" },
};

export default function PageJournal({ importHistory = [] }) {
  const [searchJ, setSearchJ] = useState("");
  const [statutJ, setStatutJ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = importHistory.filter(imp => {
    if (statutJ && imp.statut !== statutJ) return false;
    if (searchJ && !Object.values(imp).some(v => String(v).toLowerCase().includes(searchJ.toLowerCase()))) return false;
    if (dateFrom && imp.datetime < dateFrom) return false;
    if (dateTo && imp.datetime > dateTo) return false;
    return true;
  });

  const counts = { "Succès": 0, "Partiel": 0, "Erreur": 0 };
  importHistory.forEach(imp => { if (counts[imp.statut] !== undefined) counts[imp.statut]++; });

  const reset = () => { setSearchJ(""); setStatutJ(""); setDateFrom(""); setDateTo(""); };

  return (
    <div style={{ padding: 24 }}>
      {importHistory.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Aucun import effectué</div>
          <div style={{ fontSize: 13 }}>Importez vos fichiers Excel ou CSV pour voir l'historique ici</div>
        </div>
      ) : (
      <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a2744", display: "flex", alignItems: "center", gap: 8 }}>
            📋 Journal des imports
            <span style={{ fontSize: 13, fontWeight: 500, color: "#64748b", background: "#f1f5f9", borderRadius: 20, padding: "2px 10px" }}>{filtered.length} résultat{filtered.length !== 1 ? "s" : ""}</span>
          </h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["Succès", "Partiel", "Erreur"].map(s => {
            const st = STATUT_STYLE[s];
            const active = statutJ === s;
            return (
              <button key={s} onClick={() => setStatutJ(active ? "" : s)} style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 20,
                border: active ? `1.5px solid ${st.color}` : "1px solid #e2e8f0", cursor: "pointer",
                background: active ? st.bg : "#fff", color: st.color, fontWeight: 600, fontSize: 13,
                transition: "all 0.2s"
              }}>
                {st.icon} {s} <span style={{ background: st.color, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{counts[s]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Fichier", "Type", "Date/Heure", "Lignes", "Colonnes", "Utilisateur", "Statut", "Journal"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Aucune correspondance</td></tr>
              ) : filtered.map((imp, i) => {
                const st = STATUT_STYLE[imp.statut] || { bg: "#f1f5f9", color: "#64748b", icon: "📝" };
                return (
                  <tr key={imp.id} style={{ background: i % 2 === 1 ? "#fafbfc" : "#fff", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 1 ? "#fafbfc" : "#fff"}>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1a2744", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{imp.fileName}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ background: "#f0f4ff", color: "#3b82f6", padding: "3px 10px", borderRadius: 6, fontWeight: 600, fontSize: 12 }}>{imp.fileType}</span>
                    </td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap", fontSize: 12 }}>{imp.datetime}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{imp.lignes}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{imp.colonnes}</td>
                    <td style={{ padding: "10px 14px" }}>{imp.uploadPar}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ background: st.bg, color: st.color, padding: "3px 12px", borderRadius: 20, fontWeight: 600, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {st.icon} {imp.statut}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", color: "#475569", fontSize: 12 }}>{imp.journal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      )}
    </div>
  );
}

