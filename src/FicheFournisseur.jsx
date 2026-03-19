import { STATUT_CONFIG } from "./config";

export default function FicheFournisseur({ fournisseur, data, onClose, onFilter }) {
  if (!fournisseur) return null;
  const pieces = data.filter(d => d.nomFournisseur === fournisseur);
  const totalEch = pieces.reduce((s, p) => s + (p.quantiteEcheancee || 0), 0);
  const totalLiv = pieces.reduce((s, p) => s + (p.quantiteLivree || 0), 0);
  const taux = totalEch > 0 ? Math.round((totalLiv / totalEch) * 100) : 0;
  const tauxColor = taux >= 80 ? "#27ae60" : taux >= 50 ? "#e67e22" : "#dc2626";

  const statutCounts = {};
  pieces.forEach(p => { statutCounts[p.statut] = (statutCounts[p.statut] || 0) + 1; });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1001, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(2px)" }} />
      <div style={{ position: "relative", width: "min(720px, 94vw)", borderRadius: 16, maxHeight: "85vh", overflowY: "auto", background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        {/* Header */}
        <div style={{ background: "#1a2744", padding: "20px 24px", borderRadius: "16px 16px 0 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 12, color: "#60a5fa", fontWeight: 600, letterSpacing: 0.5 }}>Fiche Fournisseur</span>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "4px 0" }}>{fournisseur}</h3>
              <span style={{ fontSize: 13, color: "#94a3b8" }}>Code: {pieces[0]?.codeFournisseur} · {pieces.length} pièce{pieces.length > 1 ? "s" : ""}</span>
            </div>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", padding: 4 }}>✕</button>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Pièces totales", value: pieces.length, color: "#1a2744" },
              { label: "Qté échéancée", value: totalEch, color: "#3b82f6" },
              { label: "Qté livrée", value: totalLiv, color: "#27ae60" },
              { label: "Taux livraison", value: `${taux}%`, color: tauxColor },
            ].map((kpi, i) => (
              <div key={i} style={{ background: "#f8fafc", borderRadius: 10, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500, marginBottom: 4 }}>{kpi.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

        

          {/* Status badges */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {Object.entries(statutCounts).map(([st, count]) => {
              const sc = STATUT_CONFIG[st] || { bg: "#f1f5f9", color: "#475569", dot: "#475569" };
              return (
                <span key={st} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, background: sc.bg, color: sc.color, fontSize: 12, fontWeight: 600 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: sc.dot }} />
                  {st}: {count}
                </span>
              );
            })}
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["ID", "Projet", "Article", "Désignation", "Qté éch.", "Qté livrée", "Date éch.", "Statut"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pieces.map((p, i) => {
                  const sc = STATUT_CONFIG[p.statut] || { bg: "#f1f5f9", color: "#475569", dot: "#475569" };
                  return (
                    <tr key={p.id} style={{ background: i % 2 === 1 ? "#fafbfc" : "#fff" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600, color: "#1a2744" }}>{p.id}</td>
                      <td style={{ padding: "8px 12px" }}>{p.nomProjet}</td>
                      <td style={{ padding: "8px 12px" }}>{p.article}</td>
                      <td style={{ padding: "8px 12px", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.designation}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>{p.quantiteEcheancee}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>{p.quantiteLivree}</td>
                      <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{p.dateEcheance}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 20, background: sc.bg, color: sc.color, fontWeight: 600, fontSize: 11 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot }} />{p.statut}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => { onFilter(fournisseur); onClose(); }} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#f0f4ff", color: "#3b82f6", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>🔍 Filtrer le tableau</button>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#1a2744", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
