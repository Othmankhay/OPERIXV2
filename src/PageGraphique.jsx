import { useState } from "react";
import { STATUT_CONFIG as GLOBAL_CONFIG, PROJETS } from "./config";

const STATUT_CONFIG = {
  ...GLOBAL_CONFIG,
  "Archivé": { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" }
};

const WEEKS = ["S18", "S19", "S20", "S21", "S22", "S23"];

const STATUTS = [
  "Reçu", 
  "Point dur", 
  "Manquants Plus", 
  "Manquant", 
  "En cours", 
  "À venir", 
  "Faux manquant", 
  "Retard", 
  "Confirmé", 
  "Archivé"
];

const WEEKLY_DATA = {
  "Reçu":           [12, 15, 14, 18, 16, 20],
  "Point dur":      [2, 1, 3, 2, 1, 2],
  "Manquants Plus": [3, 4, 2, 3, 4, 1],
  "Manquant":       [5, 3, 4, 6, 5, 4],
  "En cours":       [8, 10, 12, 9, 11, 14],
  "À venir":        [15, 12, 10, 14, 16, 12],
  "Faux manquant":  [1, 2, 0, 1, 1, 0],
  "Retard":         [4, 5, 6, 3, 4, 5],
  "Confirmé":       [6, 7, 5, 8, 7, 9],
  "Archivé":        [0, 1, 2, 1, 3, 2],
};

export default function PageGraphique() {
  const [selectedPeriod, setSelectedPeriod] = useState("Par semaine");
  const [visibleStatuts, setVisibleStatuts] = useState(STATUTS);
  const [showFilters, setShowFilters] = useState(false);
  const periods = ["Par semaine", "Par 15 jours", "Par mois"];

  const toggleStatut = (st) => {
    if (visibleStatuts.includes(st)) {
      setVisibleStatuts(visibleStatuts.filter(s => s !== st));
    } else {
      setVisibleStatuts([...visibleStatuts, st]);
    }
  };

  const chartH = 280;

  // Calcul du total des statuts visibles pour générer la courbe rose et le Maximum de l'axe Y
  const curvePointsData = WEEKS.map((_, i) => visibleStatuts.reduce((s, st) => s + WEEKLY_DATA[st][i], 0));
  const maxVal = Math.max(...curvePointsData, 10) * 1.15; // 15% marge au dessus

  // Génération du SVG Path pour la courbe rose lissée (Bezier)
  const curvePath = WEEKS.map((w, wi) => {
    const x = ((wi + 0.5) / WEEKS.length) * 100;
    const val = curvePointsData[wi];
    const y = 100 - (val / (maxVal || 1)) * 100;
    
    if (wi === 0) return `M ${x} ${y}`;
    const prevX = ((wi - 0.5) / WEEKS.length) * 100;
    const prevVal = curvePointsData[wi - 1];
    const prevY = 100 - (prevVal / (maxVal || 1)) * 100;
    const cpX = prevX + (x - prevX) / 2;
    return `C ${cpX} ${prevY}, ${cpX} ${y}, ${x} ${y}`;
  }).join(" ");

  const yLabels = [1, 0.75, 0.5, 0.25, 0].map(r => Math.round(maxVal * r));

  return (
    <div style={{ display: "flex", width: "100%", overflow: "hidden" }}>
      <div style={{ flex: 1, padding: 24, minWidth: 0, transition: "width 0.25s ease", width: showFilters ? "calc(100% - 260px)" : "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a2744", margin: 0 }}>📈 Graphique de suivi par statut</h2>
          <div style={{ display: "flex", gap: 6 }}>
            {periods.map(p => (
              <button key={p} onClick={() => setSelectedPeriod(p)} style={{
                padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "pointer",
                background: selectedPeriod === p ? "#1a2744" : "#f8fafc",
                color: selectedPeriod === p ? "#fff" : "#475569", fontWeight: 500, fontSize: 13,
                transition: "all 0.2s"
              }}>{p}</button>
            ))}
            <div style={{ width: 1, background: "#e2e8f0", margin: "0 4px" }} />
            <button onClick={() => setShowFilters(!showFilters)} style={{
              padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "pointer",
              background: showFilters ? "#eff6ff" : "#fff", color: showFilters ? "#3b82f6" : "#475569",
              fontWeight: 600, fontSize: 13, transition: "all 0.2s"
            }}>⚙ Filtres</button>
          </div>
        </div>

      {/* Stacked bar chart avec la courbe rose en surimpression */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "24px 24px 16px", border: "1px solid #e2e8f0", marginBottom: 20 }}>
        <div style={{ display: "flex", height: chartH, position: "relative" }}>
          
          {/* Axe Y */}
          <div style={{ width: 32, display: "flex", flexDirection: "column", justifyContent: "space-between", paddingBottom: 24 }}>
            {yLabels.map((v, idx) => (
              <span key={idx} style={{ fontSize: 11, color: "#94a3b8", textAlign: "right" }}>{v}</span>
            ))}
          </div>
          
          {/* Zone Graphique */}
          <div style={{ flex: 1, borderBottom: "2px solid #f1f5f9", borderLeft: "2px solid #f1f5f9", position: "relative", display: "flex", alignItems: "flex-end" }}>
            
            {/* Colonnes (Bars) */}
            {WEEKS.map((w, wi) => {
              return (
                <div key={w} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 5 }}>
                  <div style={{ width: "65%", display: "flex", flexDirection: "column-reverse", height: chartH - 30 }}>
                    {STATUTS.map((st, si) => {
                      if (!visibleStatuts.includes(st)) return null; // Filtrage direct
                      const val = WEEKLY_DATA[st][wi];
                      if (val === 0) return null;
                      const h = (val / (maxVal || 1)) * (chartH - 30);
                      const isLast = si === STATUTS.length - 1 || STATUTS.slice(si + 1).every(s2 => WEEKLY_DATA[s2][wi] === 0 || !visibleStatuts.includes(s2));
                      return (
                        <div key={st} title={`${st}: ${val}`} style={{
                          height: h, background: STATUT_CONFIG[st].bg, border: `1px solid ${STATUT_CONFIG[st].dot}`, width: "100%",
                          borderRadius: isLast ? "4px 4px 0 0" : 0,
                          opacity: 1, transition: "height 0.3s ease"
                        }}
                        />
                      );
                    })}
                  </div>
                  <span style={{ fontSize: 12, color: "#475569", marginTop: 6, fontWeight: 600 }}>{w}</span>
                  
                  {/* Point de la courbe rose */}
                  {curvePointsData[wi] > 0 && (
                     <div style={{
                       position: "absolute", bottom: ((curvePointsData[wi] / maxVal) * (chartH - 30)) + 30, right: "50%",
                       transform: "translate(50%, 50%)", width: 14, height: 14, borderRadius: "50%",
                       background: "#fff", border: "3px solid #ec4899", zIndex: 12,
                       boxShadow: "0 2px 4px rgba(236, 72, 153, 0.3)"
                     }} title={`Total: ${curvePointsData[wi]}`} />
                  )}
                </div>
              );
            })}
            
            {/* Courbe Rose (SVG) */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", left: 0, bottom: 30, width: "100%", height: chartH - 30, zIndex: 10, pointerEvents: "none" }}>
               <path d={curvePath} fill="none" stroke="#ec4899" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Checkbox Legend */}
        <div style={{ display: "flex", gap: "12px 18px", marginTop: 24, justifyContent: "center", flexWrap: "wrap", borderTop: "1px dashed #e2e8f0", paddingTop: 16 }}>
          {STATUTS.map(st => {
            const isVisible = visibleStatuts.includes(st);
            return (
              <label key={st} style={{
                display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                opacity: isVisible ? 1 : 0.4, transition: "opacity 0.2s"
              }}>
                <input type="checkbox" checked={isVisible} onChange={() => toggleStatut(st)} style={{ cursor: "pointer" }} />
                <div style={{ width: 12, height: 12, borderRadius: 3, background: STATUT_CONFIG[st].dot }} />
                <span style={{ fontSize: 13, color: "#1a2744", fontWeight: 600 }}>{st}</span>
              </label>
            );
          })}
          <div style={{ width: 1, height: 20, background: "#cbd5e1", margin: "0 4px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
             <div style={{ width: 18, height: 4, borderRadius: 2, background: "#ec4899" }} />
             <span style={{ fontSize: 13, color: "#ec4899", fontWeight: 700 }}>Courbe Total</span>
          </div>
        </div>
      </div>

      {/* Tableau détaillé (Tableau récapitulatif spécifique) */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569", fontWeight: 700, fontSize: 12, textTransform: "uppercase", borderBottom: "2px solid #e2e8f0" }}>Statut</th>
              {WEEKS.map(w => <th key={w} style={{ padding: "12px 10px", textAlign: "center", color: "#475569", fontWeight: 700, fontSize: 12, borderBottom: "2px solid #e2e8f0" }}>{w}</th>)}
              <th style={{ padding: "12px 16px", textAlign: "center", color: "#475569", fontWeight: 700, fontSize: 12, textTransform: "uppercase", borderBottom: "2px solid #e2e8f0" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {STATUTS.map((st, i) => {
              const isVisible = visibleStatuts.includes(st);
              const total = WEEKLY_DATA[st].reduce((a, b) => a + b, 0);
              const sc = STATUT_CONFIG[st];
              return (
                <tr key={st} style={{ background: i % 2 === 1 ? "#fafbfc" : "#fff", opacity: isVisible ? 1 : 0.35, transition: "opacity 0.2s" }}>
                  <td style={{ padding: "10px 16px", fontWeight: 600, fontSize: 13 }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <input type="checkbox" checked={isVisible} onChange={() => toggleStatut(st)} style={{ cursor: "pointer", accentColor: sc.dot }} />
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: sc.dot }} />
                      <span style={{ color: "#1a2744" }}>{st}</span>
                    </label>
                  </td>
                  {WEEKLY_DATA[st].map((v, j) => (
                    <td key={j} style={{ padding: "10px", textAlign: "center", fontSize: 13, fontWeight: v > 0 ? 600 : 400, color: v > 0 ? "#1a202c" : "#94a3b8" }}>{v}</td>
                  ))}
                  <td style={{ padding: "10px 16px", textAlign: "center", fontSize: 14, fontWeight: 800, color: "#1a2744" }}>{total}</td>
                </tr>
              );
            })}
            
            {/* Ligne Totale Rosée */}
            <tr style={{ background: "#fdf2f8", borderTop: "2px solid #fbcfe8" }}>
              <td style={{ padding: "12px 16px", fontWeight: 800, fontSize: 14 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 18, height: 4, borderRadius: 2, background: "#ec4899" }} />
                  <span style={{ color: "#be185d" }}>Total</span>
                </span>
              </td>
              {WEEKS.map((w, wi) => (
                <td key={w} style={{ padding: "10px", textAlign: "center", fontSize: 14, fontWeight: 800, color: "#be185d" }}>
                  {STATUTS.reduce((s, st) => s + WEEKLY_DATA[st][wi], 0)}
                </td>
              ))}
              <td style={{ padding: "12px 16px", textAlign: "center", fontSize: 16, fontWeight: 900, color: "#9d174d", background: "#fce7f3" }}>
                {STATUTS.reduce((sum, st) => sum + WEEKLY_DATA[st].reduce((a, b) => a + b, 0), 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>

      {/* Panel Filtres graphique */}
      <div style={{ 
        width: showFilters ? 260 : 0, 
        background: "#fff", 
        transition: "width 0.25s ease", 
        overflow: "hidden", 
        flexShrink: 0,
        display: "flex", flexDirection: "column",
        borderLeft: showFilters ? "1px solid #e2e8f0" : "none"
      }}>
        <div style={{ width: 260, display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ padding: "12px 16px", background: "#1a2744", borderRadius: "10px 10px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 16px 0 16px" }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>🔽 Filtres du graphique</span>
            <button onClick={() => setShowFilters(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
          <div style={{ padding: 16, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 6 }}>Name</label>
              <input type="text" style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", boxSizing: "border-box", outline: "none" }} onFocus={e=>e.target.style.border="1px solid #3b82f6"} onBlur={e=>e.target.style.border="1px solid #e2e8f0"} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 6 }}>Warehouse</label>
              <input type="text" style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", boxSizing: "border-box", outline: "none" }} onFocus={e=>e.target.style.border="1px solid #3b82f6"} onBlur={e=>e.target.style.border="1px solid #e2e8f0"} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 6 }}>Sub Project</label>
              <select style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", boxSizing: "border-box", outline: "none", cursor: "pointer" }} onFocus={e=>e.target.style.border="1px solid #3b82f6"} onBlur={e=>e.target.style.border="1px solid #e2e8f0"}>
                <option value="">Tous les sous-projets</option>
                {Object.values(PROJETS).flat().map(sp => <option key={sp} value={sp}>{sp}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 6 }}>Import Type</label>
              <select style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", boxSizing: "border-box", outline: "none", cursor: "pointer" }} onFocus={e=>e.target.style.border="1px solid #3b82f6"} onBlur={e=>e.target.style.border="1px solid #e2e8f0"}>
                <option value="Standard">Standard</option>
                <option value="Express">Express</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 6 }}>Site</label>
              <input type="text" style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", boxSizing: "border-box", outline: "none" }} onFocus={e=>e.target.style.border="1px solid #3b82f6"} onBlur={e=>e.target.style.border="1px solid #e2e8f0"} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 6 }}>Life Series</label>
              <input type="text" style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", boxSizing: "border-box", outline: "none" }} onFocus={e=>e.target.style.border="1px solid #3b82f6"} onBlur={e=>e.target.style.border="1px solid #e2e8f0"} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 6 }}>Nb of Weeks</label>
              <input type="number" min="1" max="52" defaultValue="10" style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", boxSizing: "border-box", outline: "none" }} onFocus={e=>e.target.style.border="1px solid #3b82f6"} onBlur={e=>e.target.style.border="1px solid #e2e8f0"} />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "#1a2744", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>✅ Appliquer</button>
              <button style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "#f1f5f9", color: "#475569", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>✕ Reset</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
