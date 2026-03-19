import { useState } from "react";

const IMPORTS_DATA = [
  { id: "IMP-001", type: "Excel", date: "2025-05-14", heure: "08:30", par: "M. Dupont", lignes: 142, statut: "Succès", desc: "Import pièces projet P512 SX", log: "import_001.txt" },
  { id: "IMP-002", type: "SAP", date: "2025-05-14", heure: "09:15", par: "A. Martin", lignes: 89, statut: "Succès", desc: "Synchronisation SAP série P610 VS", log: "import_002.txt" },
  { id: "IMP-003", type: "CSV", date: "2025-05-13", heure: "14:00", par: "L. Bernard", lignes: 56, statut: "Partiel", desc: "Import partiel — 3 lignes en erreur format date", log: "import_003.txt" },
  { id: "IMP-004", type: "Excel", date: "2025-05-13", heure: "10:45", par: "M. Dupont", lignes: 210, statut: "Succès", desc: "Mise à jour quantités livrées P520 MX", log: "import_004.txt" },
  { id: "IMP-005", type: "SAP", date: "2025-05-12", heure: "16:20", par: "S. Petit", lignes: 34, statut: "Erreur", desc: "Échec connexion SAP — timeout serveur", log: "import_005.txt" },
  { id: "IMP-006", type: "CSV", date: "2025-05-12", heure: "11:00", par: "A. Martin", lignes: 178, statut: "Succès", desc: "Import fournisseurs Ferrage Projet", log: "import_006.txt" },
  { id: "IMP-007", type: "Excel", date: "2025-05-11", heure: "09:00", par: "L. Bernard", lignes: 95, statut: "Partiel", desc: "Import partiel — codes fournisseurs manquants", log: "import_007.txt" },
  { id: "IMP-008", type: "SAP", date: "2025-05-10", heure: "07:45", par: "M. Dupont", lignes: 312, statut: "Succès", desc: "Synchronisation complète OV Projet", log: "import_008.txt" },
];

const STATUT_STYLE = {
  "Succès": { bg: "#f0fdf4", color: "#16a34a", icon: "✅" },
  "Partiel": { bg: "#fffbeb", color: "#d97706", icon: "⚠️" },
  "Erreur": { bg: "#fff1f1", color: "#dc2626", icon: "❌" },
};

export default function PageJournal() {
  const [searchJ, setSearchJ] = useState("");
  const [statutJ, setStatutJ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = IMPORTS_DATA.filter(imp => {
    if (statutJ && imp.statut !== statutJ) return false;
    if (searchJ && !Object.values(imp).some(v => String(v).toLowerCase().includes(searchJ.toLowerCase()))) return false;
    if (dateFrom && imp.date < dateFrom) return false;
    if (dateTo && imp.date > dateTo) return false;
    return true;
  });

  const counts = { "Succès": 0, "Partiel": 0, "Erreur": 0 };
  IMPORTS_DATA.forEach(imp => { if (counts[imp.statut] !== undefined) counts[imp.statut]++; });

  const reset = () => { setSearchJ(""); setStatutJ(""); setDateFrom(""); setDateTo(""); };

  return (
    <div style={{ padding: 24 }}>
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

      {/* Filters bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
          <input value={searchJ} onChange={e => setSearchJ(e.target.value)} placeholder="Rechercher un import..."
            style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "#f8fafc", outline: "none" }} />
        </div>
        <select value={statutJ} onChange={e => setStatutJ(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "#f8fafc", cursor: "pointer" }}>
          <option value="">Tous les statuts</option>
          <option value="Succès">Succès</option>
          <option value="Partiel">Partiel</option>
          <option value="Erreur">Erreur</option>
        </select>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>Du</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "#f8fafc" }} />
        <span style={{ fontSize: 12, color: "#94a3b8" }}>au</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "#f8fafc" }} />
        <button onClick={reset} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f1f5f9", cursor: "pointer", fontSize: 13, color: "#64748b", fontWeight: 500 }}>✕ Reset</button>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["ID", "Type", "Date", "Heure", "Par", "Lignes", "Statut", "Description", "Log"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Aucun import trouvé</td></tr>
              ) : filtered.map((imp, i) => {
                const st = STATUT_STYLE[imp.statut];
                return (
                  <tr key={imp.id} style={{ background: i % 2 === 1 ? "#fafbfc" : "#fff", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 1 ? "#fafbfc" : "#fff"}>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1a2744" }}>{imp.id}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ background: "#f0f4ff", color: "#3b82f6", padding: "3px 10px", borderRadius: 6, fontWeight: 600, fontSize: 12 }}>{imp.type}</span>
                    </td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>{imp.date}</td>
                    <td style={{ padding: "10px 14px" }}>{imp.heure}</td>
                    <td style={{ padding: "10px 14px" }}>{imp.par}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{imp.lignes}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ background: st.bg, color: st.color, padding: "3px 12px", borderRadius: 20, fontWeight: 600, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {st.icon} {imp.statut}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#475569" }}>{imp.desc}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <button style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 12, color: "#3b82f6", fontWeight: 600 }}>⬇ TXT</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
