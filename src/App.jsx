import { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import * as XLSX from "xlsx";
import { STATUT_CONFIG, ALL_COLUMNS, DEFAULT_VISIBLE, TOAST_CONFIGS, TOAST_STYLES, SIDEBAR_ITEMS } from "./config";
import { getStatusColor, getAllStatusColors } from "./statusColorManager";
import ColumnSelectionModal from "./ColumnManager";
import FicheFournisseur from "./FicheFournisseur";
import SupplierSidebar from "./SupplierSidebar";
import SplashScreen from "./SplashScreen";
import LoginPage from "./LoginPage";
import WorkflowPage from "./WorkflowPage";
import TopProjectNav from "./components/layout/TopProjectNav";
import useProjectNavModel, { getProjectFamily } from "./hooks/useProjectNavModel";
import useCompactNav from "./hooks/useCompactNav";
import useRelanceEmail from "./hooks/useRelanceEmail";
import ErrorBoundary from "./ErrorBoundary";

const PageGraphique = lazy(() => import("./PageGraphique"));
const PageJournal = lazy(() => import("./PageJournal"));
const PageImports = lazy(() => import("./PageImports"));
const PageOTD = lazy(() => import("./PageOTD"));
const PageRFT = lazy(() => import("./PageRFT"));

/* ─── Toast component ───────────────────────────────── */
function Toast({ t, index, onClose, onApply }) {
  const [progress, setProgress] = useState(100);
  const ts = TOAST_STYLES[t.type];
  useEffect(() => {
    const start = Date.now();
    const iv = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.max(0, 100 - (elapsed / 10000) * 100));
      if (elapsed >= 10000) { clearInterval(iv); onClose(); }
    }, 50);
    return () => clearInterval(iv);
  }, [onClose]);
  return (
    <div onClick={() => { onApply(t.filterStatut); onClose(); }} style={{
      position: "relative", padding: "12px 40px 12px 16px", borderRadius: 10, border: `1px solid ${ts.border}`,
      background: ts.bg, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", cursor: "pointer", minWidth: 260,
      animation: `slideIn 0.35s ease ${index * 300}ms both`, overflow: "hidden"
    }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: ts.accent }}>{t.message}</div>
      <button onClick={e => { e.stopPropagation(); onClose(); }} style={{
        position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", fontSize: 16, color: ts.accent
      }}>✕</button>
      <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, background: ts.accent, width: `${progress}%`, transition: "width 0.05s linear" }} />
    </div>
  );
}

/* ─── Diff computation ─────────────────────────────── */
const KEY_DIFF_FIELDS = ['statut','quantiteEcheancee','dateLivraisonConfirmee','nomFournisseur','dateEcheance'];
function computeDiff(prevData, newData) {
  const prevById = {};
  prevData.forEach(d => { prevById[d.id] = d; });
  const added = [], modified = [], newRetards = [];
  newData.forEach(d => {
    const prev = prevById[d.id];
    if (!prev) {
      added.push(d);
    } else {
      const changes = KEY_DIFF_FIELDS.filter(f => String(prev[f] || '') !== String(d[f] || ''));
      if (changes.length > 0) {
        modified.push({ id: d.id, changes, prev: { statut: prev.statut, article: prev.article, nomFournisseur: prev.nomFournisseur }, curr: { statut: d.statut, article: d.article, nomFournisseur: d.nomFournisseur } });
        const wasOk = !['Retard','Manquants Plus'].includes(prev.statut);
        if (wasOk && ['Retard','Manquants Plus'].includes(d.statut)) newRetards.push(d);
      }
    }
  });
  return { added, modified, newRetards };
}

/* ─── Dynamic monthly chart ────────────────────────── */
const MOIS_LABELS = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
const CHART_SERIES_CFG = [
  { label: 'Reçu',           color: '#16a34a' },
  { label: 'En cours',       color: '#3b82f6' },
  { label: 'Retard',         color: '#e67e22' },
  { label: 'Manquants Plus', color: '#c0392b' },
];
function buildMonthlyData(data) {
  const byMonth = {};
  data.forEach(d => {
    const dt = d.dateEcheance || d.dateTransfertPegase;
    if (!dt) return;
    let month;
    if (dt.includes('-')) month = new Date(dt).getMonth();
    else if (dt.includes('/')) { const p = dt.split('/'); month = parseInt(p[1]) - 1; }
    if (month === undefined || isNaN(month)) return;
    if (!byMonth[month]) byMonth[month] = {};
    byMonth[month][d.statut] = (byMonth[month][d.statut] || 0) + 1;
  });
  // Only return data from real imported data
  return {
    mois: MOIS_LABELS,
    series: CHART_SERIES_CFG.map(s => ({
      label: s.label, color: s.color,
      data: Array.from({ length: 12 }, (_, m) => byMonth[m]?.[s.label] || 0)
    }))
  };
}

/* ─── Dashboard page ────────────────────────────────── */
function PageDashboard({ data, previousData, importDiff, cumulativeStats, onFilter, onSetFournisseur, onSearch, onCreateWorkflowTask }) {
  const [graphProject, setGraphProject] = useState("Tous");
  const [hiddenSeries, setHiddenSeries] = useState([]);
  const [showComparison, setShowComparison] = useState(true);
  const availableProjects = useMemo(
    () => [...new Set(data.map(d => String(d.nomProjet || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr")),
    [data]
  );

  const filteredData = graphProject === "Tous" ? data : data.filter(d => d.nomProjet === graphProject);
  const filteredPrev = previousData
    ? (graphProject === "Tous" ? previousData : previousData.filter(d => d.nomProjet === graphProject))
    : null;
  
  const counts = { total: filteredData.length, critiques: 0, retards: 0, enCours: 0, recus: 0 };
  filteredData.forEach(d => {
    if (d.statut === "Manquants Plus") counts.critiques++;
    if (d.statut === "Retard") counts.retards++;
    if (d.statut === "En cours") counts.enCours++;
    if (d.statut === "Reçu") counts.recus++;
  });
  // Previous counts for delta
  const prevCounts = filteredPrev ? (() => {
    const c = { total: filteredPrev.length, critiques: 0, retards: 0, enCours: 0, recus: 0, pointDur: 0 };
    filteredPrev.forEach(d => {
      if (d.statut === "Manquants Plus") c.critiques++;
      if (d.statut === "Retard") c.retards++;
      if (d.statut === "En cours") c.enCours++;
      if (d.statut === "Reçu") c.recus++;
      if (d.statut === "Point dur") c.pointDur++;
    });
    return c;
  })() : null;

  const makeDelta = (current, previous, lowerIsBetter = false) => {
    if (!previous && previous !== 0) return null;
    const diff = current - previous;
    if (diff === 0) return null;
    const positive = lowerIsBetter ? diff < 0 : diff > 0;
    return { diff, positive, label: diff > 0 ? `+${diff}` : `${diff}` };
  };

  const kpis = [
    { label: "Total", value: counts.total, icon: "📦", bg: "#f0f4ff", color: "#1a2744", filter: "", delta: makeDelta(counts.total, prevCounts?.total) },
    { label: "Manquants Plus", value: counts.critiques, icon: "🔴", bg: "#fff1f1", color: "#dc2626", filter: "Manquants Plus", delta: makeDelta(counts.critiques, prevCounts?.critiques, true) },
    { label: "Points durs", value: filteredData.filter(d => d.statut === "Point dur").length, icon: "🟣", bg: "#f3e8fd", color: "#7d3c98", filter: "Point dur", delta: makeDelta(filteredData.filter(d => d.statut === "Point dur").length, prevCounts?.pointDur, true) },
    { label: "Retards", value: counts.retards, icon: "🟠", bg: "#fffbeb", color: "#d97706", filter: "Retard", delta: makeDelta(counts.retards, prevCounts?.retards, true) },
    { label: "En cours", value: counts.enCours, icon: "🟢", bg: "#f0fdf4", color: "#1e8449", filter: "En cours", delta: makeDelta(counts.enCours, prevCounts?.enCours) },
    { label: "Reçus", value: counts.recus, icon: "✅", bg: "#eff6ff", color: "#2e86c1", filter: "Reçu", delta: makeDelta(counts.recus, prevCounts?.recus) },
  ];

  const otdPercent = counts.total ? Math.round((counts.recus / counts.total) * 100) : 0;
  const prevOtdPercent = prevCounts && prevCounts.total ? Math.round((prevCounts.recus / prevCounts.total) * 100) : null;
  const otdDelta = prevOtdPercent !== null ? otdPercent - prevOtdPercent : null;
  let otdColor = "#dc2626", otdBg = "#fef2f2";
  if (otdPercent >= 80) { otdColor = "#16a34a"; otdBg = "#f0fdf4"; }
  else if (otdPercent >= 50) { otdColor = "#d97706"; otdBg = "#fffbeb"; }

  const now = new Date();
  const toLocalDateKey = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const todayKey = toLocalDateKey(now);
  const getWeekStart = (d) => { const date = new Date(d); const day = date.getDay() || 7; date.setDate(date.getDate() - day + 1); date.setHours(0,0,0,0); return date.getTime(); };
  const getWeekEnd = (d) => getWeekStart(d) + 6 * 86400000 + 86399999;
  const currentWeekStart = getWeekStart(now);
  const currentWeekEnd = getWeekEnd(now);
  const parseDateToTime = (dstr) => {
    if (!dstr) return 0;
    if (dstr instanceof Date) return dstr.getTime();

    const raw = String(dstr).trim();
    if (!raw) return 0;

    // Accept many formats: yyyy-MM-dd, yyyy-MM-ddTHH:mm:ss, dd/MM/yyyy, dd/MM/yyyy HH:mm:ss, dd-MM-yyyy etc.
    // Normalisation fr -> ISO
    const value = raw.replace(/\./g, "/").replace(/\s+/g, " ");

    // Date with slash format DD/MM/YYYY[ hh:mm:ss]
    const slashDate = value.split(" ")[0];
    const slashParts = slashDate.split("/");
    if (slashParts.length === 3) {
      let [day, month, year] = slashParts;
      if (year.length === 2) year = `20${year}`;
      const timePart = (value.split(" ")[1] || "").split(":");
      const hours = Number(timePart[0] || 0);
      const minutes = Number(timePart[1] || 0);
      const seconds = Number(timePart[2] || 0);
      const dt = new Date(Number(year), Number(month) - 1, Number(day), hours, minutes, seconds);
      if (!isNaN(dt.getTime())) return dt.getTime();
    }

    // Fallback for ISO-ish formats (including yyyy-MM-dd and yyyy-MM-ddTHH:mm:ss)
    // For plain yyyy-MM-dd, force local date to avoid timezone day shifts.
    const localIsoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (localIsoMatch) {
      const [, y, m, d] = localIsoMatch;
      const localDate = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
      if (!isNaN(localDate.getTime())) return localDate.getTime();
    }

    const iso = new Date(raw);
    if (!isNaN(iso.getTime())) return iso.getTime();

    return 0;
  };

  let sTotal = 0, sConf = 0, sNonConf = 0, sRisk = 0;
  filteredData.forEach(d => {
    const t = parseDateToTime(d.dateEcheance);
    if (t >= currentWeekStart && t <= currentWeekEnd) {
      sTotal++;
      if (d.dateLivraisonConfirmee) sConf++; else sNonConf++;
      if (d.statut === "Retard" || d.statut === "Manquants Plus") sRisk++;
    }
  });

  const supplierRisk = {}, supplierTotal = {}, supplierRecu = {};
  filteredData.forEach(d => {
    const f = d.nomFournisseur;
    supplierTotal[f] = (supplierTotal[f] || 0) + 1;
    if (["Retard", "Manquant", "Manquants Plus", "Point dur"].includes(d.statut)) supplierRisk[f] = (supplierRisk[f] || 0) + 1;
    if (d.statut === "Reçu") supplierRecu[f] = (supplierRecu[f] || 0) + 1;
  });
  const topRiskSuppliers = Object.entries(supplierRisk).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, riskCount]) => {
    const otd = Math.round(((supplierRecu[name] || 0) / supplierTotal[name]) * 100);
    let col = "#dc2626", ic = "🔴";
    if (otd >= 80) { col = "#16a34a"; ic = "🟢"; } else if (otd >= 50) { col = "#d97706"; ic = "🟠"; }
    return { name, riskCount, otd, col, ic };
  });

  const GRAPH_DATA = buildMonthlyData(filteredData);
  const activeSeries = GRAPH_DATA.series.filter(s => !hiddenSeries.includes(s.label));
  let chartMaxVal = 1;
  activeSeries.forEach(s => { const max = Math.max(...s.data); if (max > chartMaxVal) chartMaxVal = max; });
  chartMaxVal *= 1.2;
  const chartW = 800, chartH = 200;
  const toSVGPoints = (data) => data.map((v, i) => `${(i / (data.length - 1)) * chartW},${chartH - (v / chartMaxVal) * chartH}`).join(' ');

  const ACTIONS = [];
  const todayTime = now.getTime();
  const retardSuppliers = {};
  data.forEach(d => {
    if (d.statut === "Retard" && !d.dateLivraisonConfirmee && d.dateEcheance) {
      const e = parseDateToTime(d.dateEcheance);
      const diff = Math.floor((todayTime - e) / 86400000);
      if (diff > 7) {
        if (!retardSuppliers[d.nomFournisseur]) retardSuppliers[d.nomFournisseur] = { count: 0, maxDelay: 0 };
        retardSuppliers[d.nomFournisseur].count++;
        retardSuppliers[d.nomFournisseur].maxDelay = Math.max(retardSuppliers[d.nomFournisseur].maxDelay, diff);
      }
    }
  });
  Object.entries(retardSuppliers).forEach(([fourn, info]) => ACTIONS.push({
    priorite: 'critique', icon: '🔴', action: `Relancer ${fourn}`, detail: `${info.count} pièces en retard > 7j`, cible: 'fournisseur', valeur: fourn, bg: "#fff1f1", color: "#c0392b"
  }));
  const nextWeekStart = currentWeekStart + 7 * 86400000, nextWeekEnd = currentWeekEnd + 7 * 86400000;
  const sPlus1Suppliers = {};
  data.forEach(d => {
    if (!d.dateLivraisonConfirmee && d.dateEcheance) {
      const e = parseDateToTime(d.dateEcheance);
      if (e >= nextWeekStart && e <= nextWeekEnd) sPlus1Suppliers[d.nomFournisseur] = (sPlus1Suppliers[d.nomFournisseur] || 0) + 1;
    }
  });
  Object.entries(sPlus1Suppliers).forEach(([fourn, count]) => ACTIONS.push({
    priorite: 'warning', icon: '🟠', action: `Confirmer livraison ${fourn}`, detail: `${count} pièces sans confirmation S+1`, cible: 'fournisseur', valeur: fourn, bg: "#fffbeb", color: "#d97706"
  }));
  const in3DaysEnd = todayTime + 3 * 86400000;
  data.forEach(d => {
    if (d.statut === "À venir" && d.dateEcheance) {
      const e = parseDateToTime(d.dateEcheance);
      if (e >= todayTime && e <= in3DaysEnd) {
        ACTIONS.push({
          priorite: 'info', icon: '🟡', action: `Vérifier arrivée ${d.article}`, detail: `Échéance dans ${Math.floor((e - todayTime) / 86400000)}j`, cible: 'article', valeur: d.article, bg: "#fefce8", border: "#fefce8"
        });
      }
    }
  });

  return (
    <div style={{ padding: 24, fontSize: "1.05em", overflowY: "auto", flex: 1, background: "#f8fafc" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a2744", margin: 0 }}>📊 Dashboard</h2>
        <select value={graphProject} onChange={e => setGraphProject(e.target.value)}
          style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontSize: 13, fontWeight: 600, color: "#1a2744", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", outline: "none" }}>
          <option value="Tous">Tous les projets</option>
          {availableProjects.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Ligne 1 - KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 220px))", justifyContent: "start", gap: 12, marginBottom: 16 }}>
        {kpis.map(k => (
          <div key={k.label} onClick={() => onFilter(k.filter)} style={{ background: k.bg, borderRadius: 12, padding: 12, cursor: "pointer", position: "relative", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", transition: "all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.08)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)"; }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600, marginBottom: 4 }}>{k.label}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
                  {k.delta && (
                    <div style={{
                      fontSize: 11, fontWeight: 700,
                      color: k.delta.positive ? "#16a34a" : "#dc2626",
                      background: k.delta.positive ? "#f0fdf4" : "#fef2f2",
                      padding: "2px 6px", borderRadius: 8,
                    }}>
                      {k.delta.label} {k.delta.positive ? "▲" : "▼"}
                    </div>
                  )}
                </div>
                {k.delta && (
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>vs import précédent</div>
                )}
              </div>
              <span style={{ fontSize: 18 }}>{k.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Cumulative KPI banner ── */}
      {cumulativeStats && cumulativeStats.totalCommandes > 0 && (
        <div style={{ background: "linear-gradient(135deg,#1a2744 0%,#1e3a5f 100%)", borderRadius: 12, padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.08em" }}>Cumul session</span>
          </div>
          {[
            { label: "Commandes traitées", value: cumulativeStats.totalCommandes, color: "#93c5fd" },
            { label: "Reçues (cumul)", value: cumulativeStats.recues, color: "#4ade80" },
            { label: "En retard (cumul)", value: cumulativeStats.enRetard, color: "#f87171" },
            { label: "Imports effectués", value: cumulativeStats.imports, color: "#fbbf24" },
          ].map(k => (
            <div key={k.label} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>{k.label}</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: k.color, lineHeight: 1.2 }}>{k.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Comparison panel — Avant / Après ── */}
      {previousData && showComparison && (
        <div style={{ background: "#1a2744", borderRadius: 12, padding: "16px 20px", marginBottom: 16, color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 14 }}>⇄</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Comparaison — Avant / Après import</span>
              <span style={{ background: "#ffffff10", borderRadius: 20, padding: "2px 10px", fontSize: 11, color: "#94a3b8" }}>
                {previousData.length} → {data.length} lignes
              </span>
            </div>
            <button onClick={() => setShowComparison(false)}
              style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
          </div>

          {/* Diff summary chips */}
          {importDiff && (
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ background: "#f0fdf420", border: "1px solid #4ade8040", borderRadius: 8, padding: "6px 12px", display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ color: "#4ade80", fontWeight: 700, fontSize: 16 }}>{importDiff.added.length}</span>
                <span style={{ fontSize: 12, color: "#86efac" }}>nouvelles lignes</span>
              </div>
              <div style={{ background: "#fbbf2420", border: "1px solid #fbbf2440", borderRadius: 8, padding: "6px 12px", display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: 16 }}>{importDiff.modified.length}</span>
                <span style={{ fontSize: 12, color: "#fde68a" }}>lignes modifiées</span>
              </div>
              <div style={{ background: "#f8717120", border: "1px solid #f8717140", borderRadius: 8, padding: "6px 12px", display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ color: "#f87171", fontWeight: 700, fontSize: 16 }}>{importDiff.newRetards.length}</span>
                <span style={{ fontSize: 12, color: "#fca5a5" }}>nouveaux retards</span>
              </div>
              <div style={{ background: "#ffffff08", borderRadius: 8, padding: "6px 12px", display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: 16 }}>{data.length - previousData.length >= 0 ? "+" : ""}{data.length - previousData.length}</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>variation volume</span>
              </div>
            </div>
          )}

          {/* Status before → after */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "Total", prev: prevCounts?.total, curr: counts.total, lowerBetter: false },
              { label: "Manquants Plus", prev: prevCounts?.critiques, curr: counts.critiques, lowerBetter: true },
              { label: "Point dur", prev: prevCounts?.pointDur, curr: filteredData.filter(d => d.statut === "Point dur").length, lowerBetter: true },
              { label: "Retard", prev: prevCounts?.retards, curr: counts.retards, lowerBetter: true },
              { label: "En cours", prev: prevCounts?.enCours, curr: counts.enCours, lowerBetter: false },
              { label: "Reçu", prev: prevCounts?.recus, curr: counts.recus, lowerBetter: false },
            ].map(item => {
              const diff = item.curr - item.prev;
              const improved = item.lowerBetter ? diff < 0 : diff > 0;
              const neutral = diff === 0;
              const clr = neutral ? "#64748b" : improved ? "#4ade80" : "#f87171";
              return (
                <div key={item.label} style={{ background: "#ffffff0a", borderRadius: 8, padding: "8px 14px", minWidth: 120 }}>
                  <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>{item.prev}</span>
                    <span style={{ fontSize: 10, color: "#334155" }}>→</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{item.curr}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: clr }}>
                      {neutral ? "=" : (diff > 0 ? "+" : "") + diff + (improved ? " ▲" : " ▼")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* New retards detail */}
          {importDiff && importDiff.newRetards.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #ffffff10" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#f87171", marginBottom: 8 }}>
                Nouvelles dégradations détectées
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {importDiff.newRetards.slice(0, 6).map(d => (
                  <span key={d.id} onClick={() => onFilter(d.statut)} style={{ background: "#f8717118", border: "1px solid #f8717130", color: "#fca5a5", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, cursor: "pointer" }}>
                    {d.article || d.id} → {d.statut}
                  </span>
                ))}
                {importDiff.newRetards.length > 6 && <span style={{ color: "#64748b", fontSize: 11, padding: "3px 0" }}>+{importDiff.newRetards.length - 6} autres</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ligne 2 - cards compactes en ligne */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "nowrap", overflowX: "auto", paddingBottom: 2 }}>
        {/* Carte OTD compacte */}
        <div style={{ background: otdBg, borderRadius: 12, padding: 12, border: "1px solid #e2e8f0", minWidth: 220, maxWidth: 280, flex: "1 1 220px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>Taux OTD</div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: otdColor, lineHeight: 1 }}>{otdPercent}%</div>
            {otdDelta !== null && otdDelta !== 0 && (
              <div style={{ fontSize: 11, fontWeight: 700, color: otdDelta > 0 ? "#16a34a" : "#dc2626" }}>
                {otdDelta > 0 ? `+${otdDelta}%` : `${otdDelta}%`}
              </div>
            )}
            {otdDelta === 0 && <div style={{ fontSize: 11, color: "#94a3b8" }}>stable</div>}
          </div>
          <div style={{ background: "#f1f5f9", borderRadius: 20, height: 5, overflow: "hidden", marginTop: 10 }}>
            <div style={{ background: otdColor, height: "100%", width: `${otdPercent}%` }} />
          </div>
        </div>

        {/* Carte Semaine compacte */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 12, border: "1px solid #e2e8f0", minWidth: 280, maxWidth: 340, flex: "1 1 280px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2744", marginBottom: 8 }}>Semaine en cours</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
            <div style={{ background: "#f8fafc", borderRadius: 8, padding: "6px 8px" }}>
              <div style={{ fontSize: 10, color: "#64748b" }}>Attendues</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2744" }}>{sTotal}</div>
            </div>
            <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "6px 8px" }}>
              <div style={{ fontSize: 10, color: "#64748b" }}>Conf.</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#16a34a" }}>{sConf}</div>
            </div>
            <div style={{ background: "#fffbeb", borderRadius: 8, padding: "6px 8px" }}>
              <div style={{ fontSize: 10, color: "#64748b" }}>Non conf.</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#d97706" }}>{sNonConf}</div>
            </div>
            <div style={{ background: "#fef2f2", borderRadius: 8, padding: "6px 8px" }}>
              <div style={{ fontSize: 10, color: "#64748b" }}>Risque</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#dc2626" }}>{sRisk}</div>
            </div>
          </div>
          <div style={{ background: "#f1f5f9", borderRadius: 20, height: 5, overflow: "hidden", marginTop: 8 }}>
            <div style={{ background: "#16a34a", height: "100%", width: `${sTotal ? (sConf / sTotal) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Fournisseurs a risque en lignes */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 12, border: "1px solid #e2e8f0", minWidth: 360, flex: "2 1 420px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2744", marginBottom: 8 }}>Fournisseurs a risque</div>
          {topRiskSuppliers.length === 0 ? (
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Aucun risque detecte</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {topRiskSuppliers.map(f => (
                <div
                  key={f.name}
                  onClick={() => onSetFournisseur(f.name)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#eef2ff"; e.currentTarget.style.borderColor = "#c7d2fe"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 12 }}>{f.ic}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1a2744", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 170 }}>{f.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "#64748b", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 999, padding: "2px 8px" }}>{f.riskCount} risques</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: f.col, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 999, padding: "2px 8px" }}>OTD {f.otd}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SVG Multi-courbes */}
      <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid #e2e8f0", marginBottom: 28 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1a2744", marginBottom: 16 }}>
          Évolution des statuts / Mois — {graphProject}
          {filteredData.some(d => d.dateEcheance || d.dateTransfertPegase) && (
            <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 500, color: "#16a34a", background: "#f0fdf4", padding: "2px 8px", borderRadius: 10 }}>données réelles</span>
          )}
        </h3>
        <div style={{ width: "100%", overflowX: "auto" }}>
          <svg viewBox={`-20 -20 ${chartW + 40} ${chartH + 50}`} style={{ minWidth: 600, width: "100%", maxHeight: 260 }}>
            {[0, 0.25, 0.5, 0.75, 1].map(r => <line key={r} x1={0} y1={chartH * r} x2={chartW} y2={chartH * r} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />)}
            {[0, 0.5, 1].map(r => <text key={r} x={-10} y={chartH * r + 4} textAnchor="end" fill="#94a3b8" fontSize="11">{Math.round(chartMaxVal * (1 - r))}</text>)}
            {GRAPH_DATA.series.map(s => {
              const h = hiddenSeries.includes(s.label);
              return (
                <g key={s.label} style={{ opacity: h ? 0.15 : 1, transition: "opacity 0.2s" }}>
                  <polyline points={toSVGPoints(s.data)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {!h && s.data.map((v, i) => (
                    <g key={i} style={{ cursor: "pointer" }}>
                      <circle cx={(i/(s.data.length-1))*chartW} cy={chartH - (v/chartMaxVal)*chartH} r="4" fill="#fff" stroke={s.color} strokeWidth="2" />
                      <title>{s.label} : {v}</title>
                    </g>
                  ))}
                </g>
              );
            })}
            {GRAPH_DATA.mois.map((m, i) => <text key={m} x={(i/(GRAPH_DATA.mois.length-1))*chartW} y={chartH + 20} textAnchor="middle" fill="#94a3b8" fontSize="11">{m}</text>)}
          </svg>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 12, flexWrap: "wrap" }}>
          {GRAPH_DATA.series.map(s => {
            const h = hiddenSeries.includes(s.label);
            return (
              <div key={s.label} onClick={() => setHiddenSeries(prev => prev.includes(s.label) ? prev.filter(l => l !== s.label) : [...prev, s.label])}
                style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", opacity: h ? 0.4 : 1, transition: "all 0.2s" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Calendrier hebdomadaire ─── */}
      {(() => {
        const weekDays = [];
        const monday = new Date(currentWeekStart);
        let calTotal = 0, calConf = 0, calRisk = 0;

        // Calendar debug logging removed in production cleanup

        for (let i = 0; i < 5; i++) {
          const dayDate = new Date(monday);
          dayDate.setDate(monday.getDate() + i);
          const dayStart = new Date(dayDate); dayStart.setHours(0,0,0,0);
          const dayEnd = new Date(dayDate); dayEnd.setHours(23,59,59,999);
          const dayStr = toLocalDateKey(dayDate);
          const isToday = todayKey === dayStr;
          const dayNames = ['LUN','MAR','MER','JEU','VEN'];
          let dTotal = 0, dConf = 0, dNonConf = 0, dRisk = 0;
          filteredData.forEach(d => {
            const t = parseDateToTime(d.dateEcheance);
            if (t >= dayStart.getTime() && t <= dayEnd.getTime()) {
              dTotal++;
              if (d.dateLivraisonConfirmee) dConf++; else dNonConf++;
              if (d.statut === "Retard" || d.statut === "Manquants Plus") dRisk++;
            }
          });
          calTotal += dTotal; calConf += dConf; calRisk += dRisk;
          const ratio = dTotal ? (dConf / dTotal) * 100 : 0;
          let cardBg = "#fff", cardBorder = "#e2e8f0";
          if (dTotal > 0 && dRisk > 0) { cardBg = "#fef2f2"; cardBorder = "#fca5a5"; }
          else if (dTotal > 0 && dNonConf > 0) { cardBg = "#fffbeb"; cardBorder = "#fcd34d"; }
          else if (dTotal > 0) { cardBg = "#f0fdf4"; cardBorder = "#86efac"; }
          if (dTotal === 0) { cardBg = "#f8fafc"; cardBorder = "#e2e8f0"; }
          if (isToday) cardBorder = "#1a2744";
          weekDays.push({ dayName: dayNames[i], dayNum: dayDate.getDate(), isToday, dTotal, dConf, dNonConf, dRisk, ratio, cardBg, cardBorder, dayStr });
        }
        return (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1a2744", margin: 0 }}>
                📅 Calendrier des échéances — Semaine courante
                {graphProject !== "Tous" && <span style={{ fontSize: 12, fontWeight: 400, color: "#64748b", marginLeft: 8 }}>(filtré sur {graphProject})</span>}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {graphProject !== "Tous" && (
                  <button
                    onClick={() => setGraphProject("Tous")}
                    style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontSize: 11, cursor: "pointer" }}
                  >
                    Afficher tous les projets
                  </button>
                )}
                <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>{calTotal} pièces · <span style={{ color: "#16a34a", fontWeight: 600 }}>{calConf} confirmées</span> · <span style={{ color: "#dc2626", fontWeight: 600 }}>{calRisk} à risque</span></div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
              {weekDays.map(day => (
                <div key={day.dayStr} onClick={() => { onFilter(""); onSearch && onSearch(""); }}
                  style={{ background: day.cardBg, borderRadius: 12, border: `2px solid ${day.cardBorder}`, padding: 16, cursor: "pointer", transition: "all 0.2s", position: "relative" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "4px 8px", borderRadius: 6, background: day.isToday ? "#1a2744" : "#f1f5f9" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: day.isToday ? "#fff" : "#64748b" }}>{day.dayName} {day.dayNum}</span>
                    {day.isToday && <span style={{ fontSize: 9, fontWeight: 700, background: "#60a5fa", color: "#fff", padding: "1px 6px", borderRadius: 8 }}>Aujourd'hui</span>}
                  </div>
                  {day.dTotal === 0 ? (
                    <div style={{ textAlign: "center", padding: "12px 0", color: "#94a3b8" }}>
                      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>—</div>
                      <div style={{ fontSize: 11 }}>Aucune échéance</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ textAlign: "center", fontSize: 28, fontWeight: 700, color: "#1a2744", marginBottom: 6 }}>{day.dTotal}</div>
                      <div style={{ display: "flex", justifyContent: "center", gap: 8, fontSize: 11, marginBottom: 8 }}>
                        <span style={{ color: "#16a34a", fontWeight: 600 }}>✅ {day.dConf}</span>
                        <span style={{ color: "#d97706", fontWeight: 600 }}>🟠 {day.dNonConf}</span>
                        <span style={{ color: "#dc2626", fontWeight: 600 }}>🔴 {day.dRisk}</span>
                      </div>
                      <div style={{ background: "#f1f5f9", borderRadius: 20, height: 5, overflow: "hidden" }}>
                        <div style={{ background: "#16a34a", height: "100%", width: `${day.ratio}%`, transition: "width 0.3s" }} />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
        {/* Actions requises */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #e2e8f0" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1a2744", marginBottom: 16 }}>⚡ Actions requises aujourd'hui</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ACTIONS.length === 0 ? <div style={{ fontSize: 13, color: "#94a3b8" }}>Aucune action détectée.</div> :
             ACTIONS.map((a, i) => (
              <div key={i} onClick={() => {
                if (a.cible === 'fournisseur') onSetFournisseur(a.valeur);
                else if (a.cible === 'article' && onSearch) onSearch(a.valeur);
              }}
              style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: a.bg, borderRadius: 8, borderLeft: `4px solid ${a.color}`, cursor: "pointer", transition: "transform 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateX(4px)"} onMouseLeave={e => e.currentTarget.style.transform = ""}>
                <span style={{ fontSize: 18, marginTop: -2 }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2744", marginBottom: 2 }}>{a.action}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{a.detail}</div>
                </div>
                {onCreateWorkflowTask && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateWorkflowTask({
                        title: a.action,
                        description: a.detail,
                        status: "A faire",
                        sourceLabel: "Action suggérée du dashboard",
                        sourceSummary: `${a.action} · ${a.detail}`,
                      });
                    }}
                    style={{ alignSelf: "center", padding: "8px 10px", borderRadius: 8, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    Créer tâche
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Export page ────────────────────────────────────── */
function PageExport({ filteredCount, totalCount, filteredData, allData }) {
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const exportToExcel = (data, filename) => {
    if (!data || data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, filename);
  };

  const exportGraphMode = (data, filename) => {
    if (!data || data.length === 0) return;
    
    // Aggregate data for graph export
    const statusCounts = {};
    const fournisseurCounts = {};
    const projetCounts = {};
    
    data.forEach(row => {
      // Status aggregation
      const status = row.statut || 'Non défini';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      // Fournisseur aggregation
      const fournisseur = row.nomFournisseur || 'Non défini';
      fournisseurCounts[fournisseur] = (fournisseurCounts[fournisseur] || 0) + 1;
      
      // Projet aggregation
      const projet = row.nomProjet || 'Non défini';
      projetCounts[projet] = (projetCounts[projet] || 0) + 1;
    });
    
    // Create summary sheets
    const summaryData = [
      { Section: 'Statuts', Total: Object.keys(statusCounts).length },
      ...Object.entries(statusCounts).map(([status, count]) => ({ Statut: status, Nombre: count })),
      { Section: '', Total: '' },
      { Section: 'Fournisseurs', Total: Object.keys(fournisseurCounts).length },
      ...Object.entries(fournisseurCounts).map(([fournisseur, count]) => ({ Fournisseur: fournisseur, Nombre: count })),
      { Section: '', Total: '' },
      { Section: 'Projets', Total: Object.keys(projetCounts).length },
      ...Object.entries(projetCounts).map(([projet, count]) => ({ Projet: projet, Nombre: count }))
    ];
    
    const ws = XLSX.utils.json_to_sheet(summaryData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Analyse Graphique');
    XLSX.writeFile(wb, filename);
  };

  const cards = [
    { icon: "📋", title: "Vue actuelle", lines: filteredCount, desc: "Exporter les lignes actuellement filtrées", data: filteredData },
    { icon: "📊", title: "Table globale", lines: totalCount, desc: "Exporter toutes les lignes de la table", data: allData },
    { icon: "📁", title: "Toutes les tables", lines: totalCount, desc: "Exporter l'ensemble des données", data: allData },
    { icon: "🕐", title: "Historique des lignes", lines: totalCount, desc: "Exporter l'historique complet", data: allData },
    { icon: "📈", title: "Mode Graphique", lines: totalCount, desc: "Export professionnel avec analyses graphiques", data: allData, isGraph: true }
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a2744", marginBottom: 20 }}>📤 Export</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {cards.map(c => (
          <div key={c.title} style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2744", marginBottom: 4 }}>{c.title}</div>
            <div style={{ fontSize: 13, color: "#3b82f6", fontWeight: 600, marginBottom: 6 }}>{c.lines} lignes</div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>{c.desc}</div>
            <div style={{ display: "flex", gap: 8 }}>
              {c.isGraph ? (
                <button 
                  style={{ flex: 1, padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fef3c7", cursor: "pointer", fontWeight: 600, fontSize: 13, color: "#1a2744", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#f59e0b"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#fef3c7"; e.currentTarget.style.color = "#1a2744"; }}
                  onClick={() => exportGraphMode(c.data, `${c.title.replace(/\s+/g, '_')}_Graphique.xlsx`)}
                >
                  📊 Excel Graphique
                </button>
              ) : (
                <>
                  <button 
                    style={{ flex: 1, padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f0f4ff", cursor: "pointer", fontWeight: 600, fontSize: 13, color: "#1a2744", transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#1a2744"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#f0f4ff"; e.currentTarget.style.color = "#1a2744"; }}
                    onClick={() => exportToCSV(c.data, `${c.title.replace(/\s+/g, '_')}.csv`)}
                  >
                    📄 CSV
                  </button>
                  <button 
                    style={{ flex: 1, padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f0fdf4", cursor: "pointer", fontWeight: 600, fontSize: 13, color: "#1a2744", transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#16a34a"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#f0fdf4"; e.currentTarget.style.color = "#1a2744"; }}
                    onClick={() => exportToExcel(c.data, `${c.title.replace(/\s+/g, '_')}.xlsx`)}
                  >
                    📗 Excel
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Page Mon Profil ───────────────────────────── */
function PageProfil({ onLogout }) {
  const user = {
    name: "Othman Khay",
    role: "Administrateur / Senior Developer",
    email: "othman.khay@operix.com",
    avatar: "👤",
    joinDate: "Mars 2026",
    lastLogin: "Aujourd'hui, 08:30"
  };

  return (
    <div style={{ padding: 32, maxWidth: 800 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a2744", marginBottom: 24 }}>👤 Mon Profil</h2>
      
      <div style={{ display: "flex", gap: 32, background: "#fff", padding: 32, borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
        <div style={{ width: 120, height: 120, borderRadius: 60, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, border: "4px solid #dbeafe" }}>
          {user.avatar}
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: "#1a2744", margin: "0 0 4px" }}>{user.name}</h3>
              <span style={{ fontSize: 13, background: "#eff6ff", color: "#1e40af", padding: "4px 12px", borderRadius: 20, fontWeight: 600 }}>{user.role}</span>
            </div>
            <button onClick={onLogout} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fef2f2", color: "#dc2626", fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"} onMouseLeave={e => e.currentTarget.style.background = "#fef2f2"}>
              🚪 Déconnexion
            </button>
          </div>
          
          <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <label style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Email Professionnel</label>
              <div style={{ fontSize: 14, color: "#475569", marginTop: 4 }}>{user.email}</div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Membre depuis</label>
              <div style={{ fontSize: 14, color: "#475569", marginTop: 4 }}>{user.joinDate}</div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Dernière connexion</label>
              <div style={{ fontSize: 14, color: "#475569", marginTop: 4 }}>{user.lastLogin}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 32, background: "#fff", padding: 24, borderRadius: 16, border: "1px solid #e2e8f0" }}>
        <h4 style={{ fontSize: 16, fontWeight: 700, color: "#1a2744", marginBottom: 12 }}>ℹ️ À propos de l'application</h4>
        <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, margin: 0 }}>
          <b>OPERIX</b> est une plateforme intégrée de suivi logistique industriel conçue pour optimiser l'excellence opérationnelle. 
          Elle permet un suivi en temps réel des pièces critiques, du rapport d'impact et de la performance fournisseur (OTD, RFT).
          <br /><br />
          Version v2.4.0 (Stable) - 2026.
        </p>
      </div>
    </div>
  );
}

/* ─── Page Rapport Impact ───────────────────────────── */
function PageRapportImpact({ 
  sousProjet, data, 
  impactSearch, setImpactSearch, 
  impactDateFrom, setImpactDateFrom, 
  impactDateTo, setImpactDateTo, 
  impactForm, setImpactForm, 
  comments, setComments 
}) {
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingCell, setEditingCell] = useState(null);
  const editRef = useRef(null);

  const parseDate = dstr => {
    if (!dstr) return 0;
    const [d, m, y] = dstr.split("/");
    const date = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  };

  const fromTime = impactDateFrom ? new Date(impactDateFrom).getTime() : 0;
  const toTime = impactDateTo ? new Date(impactDateTo).getTime() : 0;

  const filtered = data
    .filter(r => !impactSearch || Object.values(r).some(v => String(v).toLowerCase().includes(impactSearch.toLowerCase())))
    .filter(r => !fromTime || parseDate(r.dateEngagement) >= fromTime)
    .filter(r => !toTime || parseDate(r.dateEngagement) <= toTime)
    .filter(r => !impactForm.statut || r.statut === impactForm.statut)
    .filter(r => !impactForm.warehouseName || (r.magasin && r.magasin.toLowerCase().includes(impactForm.warehouseName.toLowerCase())))
    .filter(r => !impactForm.requirementType || r.requirementType === impactForm.requirementType)
    .filter(r => !impactForm.requirementDocument || (r.nCtmqBa && r.nCtmqBa.toLowerCase().includes(impactForm.requirementDocument.toLowerCase())));

  const rowsPerPage = 10;
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paged = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const toggleAll = () => {
    if (selectedRows.length === paged.length) setSelectedRows([]);
    else setSelectedRows(paged.map(r => r.id));
  };

  const handleEditStart = (id, field) => setEditingCell({ id, field });
  const handleEditEnd = (id, field, value) => {
    setComments({ ...comments, [id + "_" + field]: value });
    setEditingCell(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", background: "#f8fafc", height: "100%" }}>
      {/* Barre d'actions */}
      <div style={{ padding: "24px 24px 0 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a2744", margin: 0 }}>📊 Rapport d'impact — {sousProjet}</h2>
          
          <div style={{ height: 24, width: 1, background: "#cbd5e1" }} />
          
          <button disabled={selectedRows.length === 0} 
            style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: selectedRows.length > 0 ? "#1e40af" : "#cbd5e1", color: "#fff", fontWeight: 600, fontSize: 13, cursor: selectedRows.length > 0 ? "pointer" : "not-allowed" }}>
            Mise à jour masse {selectedRows.length > 0 ? `(${selectedRows.length})` : ""}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input type="text" placeholder="Recherche rapide..." value={impactSearch} onChange={e => setImpactSearch(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, outline: "none", width: 220 }}
            onFocus={e => e.currentTarget.style.border = "1px solid #3b82f6"} onBlur={e => e.currentTarget.style.border = "1px solid #e2e8f0"} />
          
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Du</span>
            <input type="date" value={impactDateFrom} onChange={e => setImpactDateFrom(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Au</span>
            <input type="date" value={impactDateTo} onChange={e => setImpactDateTo(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13 }} />
          </div>

          <button onClick={() => { setImpactSearch(""); setImpactDateFrom(""); setImpactDateTo(""); setImpactForm({name:"", warehouseName:"", requirementType:"", requirementDocument:"", statut:""}); }}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            ✕ Clear
          </button>
          
          <div style={{ height: 24, width: 1, background: "#cbd5e1", margin: "0 4px" }} />

          <button style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #dbeafe", background: "#f0f4ff", cursor: "pointer", fontWeight: 600, fontSize: 13, color: "#1e40af", display: "flex", alignItems: "center", gap: 6 }}>
            📄 CSV
          </button>
          <button style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #dcfce7", background: "#f0fdf4", cursor: "pointer", fontWeight: 600, fontSize: 13, color: "#16a34a", display: "flex", alignItems: "center", gap: 6 }}>
            📗 Excel
          </button>
        </div>
      </div>
      </div>

      <div style={{ padding: "0 24px 24px 24px", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ 
          background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", 
          overflowX: "auto", overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", flex: 1,
          position: "relative" 
        }}>
          <table style={{ minWidth: 1400, width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#f8fafc", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            <tr>
              <th style={{ position: "sticky", left: 0, zIndex: 20, background: "#f8fafc", padding: "14px 16px", borderBottom: "2px solid #e2e8f0", width: 40, textAlign: "center" }}>
                <input type="checkbox" checked={paged.length > 0 && selectedRows.length === paged.length} onChange={toggleAll} />
              </th>
              {["ID", "ID IBA/VC", "N° Ctmq / BA", "Article", "Désignation", "Code fonction", "Fourn", "Nom fournisseur", "PSA ID", "Utilisateur PSA", "Mag", "Quantité Nécessaire", "Date d'engagement", "Date Ech Lundi", "Statut", "Date livraison confirmée", "Dernier commentaire", "Statut du rapport d'impact"].map(h => (
                <th key={h} style={{ padding: "14px 16px", textAlign: "left", color: "#475569", fontWeight: 700, fontSize: 11, borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => {
              const sc = getStatusColor(row.statut);
              let sriBg = "#f1f5f9", sriColor = "#475569";
              if (row.statutRapportImpact === "Bloquant") { sriBg = "#fde8e8"; sriColor = "#c0392b"; }
              else if (row.statutRapportImpact === "À surveiller") { sriBg = "#fff3e0"; sriColor = "#e67e22"; }
              else if (row.statutRapportImpact === "OK") { sriBg = "#eafaf1"; sriColor = "#27ae60"; }
              
              let isOverdueEngagement = false;
              let isOverdueEch = false;
              const today = new Date().getTime();
              const engagementT = parseDate(row.dateEngagement);
              const echT = parseDate(row.dateEchLundi);
              if (engagementT > 0 && engagementT < today) isOverdueEngagement = true;
              if (echT > 0 && echT < today) isOverdueEch = true;

              const field = "impact_comment";
              const val = comments[row.id + "_" + field] ?? row.dernierCommentaire;
              const isEditing = editingCell && editingCell.id === row.id && editingCell.field === field;
              const isSelected = selectedRows.includes(row.id);

              return (
                <tr key={row.id} style={{ background: isSelected ? "#dbeafe" : (i % 2 === 1 ? "#fafbfc" : "#fff"), borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = isSelected ? "#dbeafe" : "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = isSelected ? "#dbeafe" : (i % 2 === 1 ? "#fafbfc" : "#fff")}>
                  <td style={{ position: "sticky", left: 0, zIndex: 5, background: isSelected ? "#dbeafe" : (i % 2 === 1 ? "#fafbfc" : "#fff"), padding: "10px 16px", textAlign: "center" }}>
                    <input type="checkbox" checked={isSelected} onChange={() => setSelectedRows(prev => isSelected ? prev.filter(r => r !== row.id) : [...prev, row.id])} />
                  </td>
                  <td style={{ padding: "10px 16px", whiteSpace: "nowrap", fontWeight: 600 }}>{row.id}</td>
                  <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>{row.idIbaVc}</td>
                  <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>{row.nCtmqBa}</td>
                  <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>{row.article}</td>
                  <td style={{ padding: "10px 16px", maxWidth: 220 }}>
                    <div title={row.designation} style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: 220 }}>{row.designation}</div>
                  </td>
                  <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>{row.codeFonction}</td>
                  <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>{row.codeFournisseur}</td>
                  <td style={{ padding: "10px 16px", maxWidth: 180 }}>
                    <div title={row.nomFournisseur} style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: 180 }}>{row.nomFournisseur}</div>
                  </td>
                  <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>{row.psaId}</td>
                  <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>{row.utilisateurPSA}</td>
                  <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>{row.magasin}</td>
                  <td style={{ padding: "10px 16px", whiteSpace: "nowrap", textAlign: "right" }}>{row.quantiteNecessaire}</td>
                  
                  <td style={{ padding: "10px 16px", whiteSpace: "nowrap", color: isOverdueEngagement ? "#dc2626" : "inherit", fontWeight: isOverdueEngagement ? 700 : 400 }}>{row.dateEngagement}</td>
                  <td style={{ padding: "10px 16px", whiteSpace: "nowrap", color: isOverdueEch ? "#dc2626" : "inherit", fontWeight: isOverdueEch ? 700 : 400 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{row.dateEchLundi || row.dateEcheance}</span>
                      {row._mergedCount > 1 && (
                        <span
                          title={`${row._mergedCount} échéances groupées — cliquer pour voir le détail`}
                          onClick={e => {
                            e.stopPropagation();
                            setMergedDatesModal({
                              rowId: row.id,
                              title: row.designation || row.article || row.id,
                              project: row.nomProjet || "",
                              echeances: row._mergedEcheances || [],
                            });
                          }}
                          style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#3b82f6", color: "#fff", fontWeight: 700, fontSize: 10, borderRadius: 10, padding: "1px 6px", userSelect: "none" }}>
                          +{row._mergedCount - 1}
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: sc.bg, color: sc.color, fontWeight: 600, fontSize: 11 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot }} />{row.statut}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>{row.dateLivraisonConfirmee}</td>
                  
                  <td style={{ padding: "10px 16px", minWidth: 200, maxWidth: 260 }}>
                    {isEditing ? (
                      <input ref={editRef} autoFocus defaultValue={val}
                        style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1.5px solid #3b82f6", background: "#eff6ff", fontSize: 13, outline: "none" }}
                        onBlur={e => handleEditEnd(row.id, field, e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") handleEditEnd(row.id, field, e.key === "Escape" ? val : e.target.value); }} />
                    ) : (
                      <div onClick={() => handleEditStart(row.id, field)}
                        title={val || ""}
                        style={{ cursor: "pointer", padding: "6px 10px", borderRadius: 6, border: "1px solid transparent", transition: "all 0.15s", minHeight: 30, maxHeight: 56, overflow: "hidden", wordBreak: "break-word", whiteSpace: "normal", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                        onMouseEnter={e => { e.currentTarget.style.border = "1px solid #cbd5e1"; }}
                        onMouseLeave={e => { e.currentTarget.style.border = "1px solid transparent"; }}>
                        {val || <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: 12 }}>Cliquer pour commenter... ✏️</span>}
                      </div>
                    )}
                  </td>

                  <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 6, background: sriBg, color: sriColor, fontWeight: 600, fontSize: 11 }}>
                      {row.statutRapportImpact}
                    </span>
                  </td>
                </tr>
              );
            })}
            {paged.length === 0 && (
              <tr><td colSpan={18} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Aucun résultat pour cette recherche</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 16 }}>
          <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: currentPage === 1 ? "default" : "pointer", fontSize: 13, color: currentPage === 1 ? "#cbd5e1" : "#475569" }}>Préc.</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i + 1} onClick={() => setCurrentPage(i + 1)}
              style={{ padding: "6px 12px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: currentPage === i + 1 ? 700 : 400, background: currentPage === i + 1 ? "#1a2744" : "transparent", color: currentPage === i + 1 ? "#fff" : "#475569", cursor: "pointer" }}>{i + 1}</button>
          ))}
          <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: currentPage === totalPages ? "default" : "pointer", fontSize: 13, color: currentPage === totalPages ? "#cbd5e1" : "#475569" }}>Suiv.</button>
        </div>
      )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   APP WRAPPER (Splash → Login → Main)
   ═══════════════════════════════════════════════════════ */
export default function AppWrapper() {
  const [appPhase, setAppPhase] = useState("splash"); // "splash" | "login" | "app"
  const [currentUser, setCurrentUser] = useState("");
  const handleSplashDone = useCallback(() => setAppPhase("login"), []);
  const handleLogin = useCallback((email) => { setCurrentUser(email || "Utilisateur"); setAppPhase("app"); }, []);

  if (appPhase === "splash") return <SplashScreen onFinish={handleSplashDone} />;
  if (appPhase === "login") return <LoginPage onLogin={handleLogin} />;
  return <ProcureApp currentUser={currentUser} />;
}

/* ═══════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════ */
function ProcureApp({ currentUser }) {
  const [toasts, setToasts] = useState([]);
  
  // Initialize visible columns from localStorage or use defaults
  const [visibleCols, setVisibleColsState] = useState(() => {
    try {
      const saved = localStorage.getItem("visibleColumns");
      return saved ? JSON.parse(saved) : DEFAULT_VISIBLE;
    } catch {
      return DEFAULT_VISIBLE;
    }
  });
  
  // Wrapper function to save to localStorage whenever columns change
  const setVisibleCols = (cols) => {
    setVisibleColsState(cols);
    try {
      localStorage.setItem("visibleColumns", JSON.stringify(cols));
    } catch (e) {
      console.warn("Failed to save visible columns to localStorage:", e);
    }
  };
  
  const [showColPanel, setShowColPanel] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedProjet, setSelectedProjet] = useState("");
  const [selectedSousProjet, setSelectedSousProjet] = useState("");
  const [selectedProjectFamily, setSelectedProjectFamily] = useState("");
  const [selectedOtherProject, setSelectedOtherProject] = useState("");
  const [projectFadeAlt, setProjectFadeAlt] = useState(false);
  const [openDropdown, setOpenDropdown] = useState("");
  const [selectedStatut, setSelectedStatut] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);
  const [since, setSince] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [comments, setComments] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  // States locaux pour Rapport d'impact
  const [impactSearch, setImpactSearch] = useState("");
  const [impactDateFrom, setImpactDateFrom] = useState("");
  const [impactDateTo, setImpactDateTo] = useState("");
  const [impactForm, setImpactForm] = useState({
    name: "", warehouseName: "", requirementType: "", requirementDocument: "", statut: ""
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePanel, setActivePanel] = useState("");
  const [activePage, setActivePage] = useState("table");
  const [importedData, setImportedData] = useState(null);
  const [previousData, setPreviousData] = useState(null);
  const [importDiff, setImportDiff] = useState(null);
  const [showSupplierSidebar, setShowSupplierSidebar] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [colorLines, setColorLines] = useState(false);
  const [showFournisseurs, setShowFournisseurs] = useState(false);
  const [selectedFournisseur, setSelectedFournisseur] = useState("");
  const [ficheFournisseur, setFicheFournisseur] = useState(null);
  const [frozenUpTo, setFrozenUpTo] = useState("");
  const [mergedDatesModal, setMergedDatesModal] = useState(null);
  const [importHistory, setImportHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("importHistory")) || [];
    } catch {
      return [];
    }
  });
  const [savedFilters, setSavedFilters] = useState([
    { id: 1, name: "Retards Multi Projets", criteria: { selectedProjet: "Multi Projets", selectedSousProjet: "", selectedStatut: "Retard", selectedFournisseur: "", search: "", since: "" } },
    { id: 2, name: "Manquants Ferrage", criteria: { selectedProjet: "Ferrage Projet", selectedSousProjet: "", selectedStatut: "Manquants Plus", selectedFournisseur: "", search: "", since: "" } },
    { id: 3, name: "Reçus Vie Série", criteria: { selectedProjet: "Vie Série", selectedSousProjet: "", selectedStatut: "Reçu", selectedFournisseur: "", search: "", since: "" } },
  ]);
  const [filterName, setFilterName] = useState("");
  const editRef = useRef(null);
  const carteRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const [pageSize, setPageSize] = useState(25);

  // ── Modal states for row actions ───────────────────────
  const [historyModal, setHistoryModal]     = useState(null); // rowId or null
  const [pplrlogModal, setPplrlogModal]     = useState(null); // rowId or null
  const [commentsModal, setCommentsModal]   = useState(null); // rowId or null
  const [openRowActionMenu, setOpenRowActionMenu] = useState(null);
  const [historySearch, setHistorySearch]   = useState("");
  const [pplrlogInput, setPplrlogInput]     = useState("");
  const [commentsInput, setCommentsInput]   = useState("");
  const [rowHistory, setRowHistory]         = useState({}); // { rowId: [{when,who,field,from,to}] }
  const [pplrlogComments, setPplrlogComments] = useState({}); // { rowId: [{user, comment}] }
  const [generalComments, setGeneralComments] = useState({}); // { rowId: [{user, comment}] }
  const [cumulativeStats, setCumulativeStats] = useState({ totalCommandes: 0, recues: 0, enRetard: 0, imports: 0 });
  const [workflowTasks, setWorkflowTasks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("workflowTasks")) || [];
    } catch {
      return [];
    }
  });
  const [workflowComposerRequest, setWorkflowComposerRequest] = useState(null);

  // Use imported data only
  const tableData = importedData || [];

  const projectNavModel = useProjectNavModel(tableData);
  const compactProjectNav = useCompactNav(900);
  const { isRelanceEligible, openRelanceEmail } = useRelanceEmail();
  const sidebarExpandedWidth = compactProjectNav ? 188 : 204;
  const sidebarCollapsedWidth = compactProjectNav ? 48 : 56;
  const sidePanelWidth = activePanel ? (activePanel === "rapport-impact" ? 280 : 250) : 0;

  const applyProjectScope = useCallback((rows) => {
    if (!rows || rows.length === 0) return [];
    return rows.filter((d) => {
      const family = getProjectFamily(d.nomProjet);
      if (selectedProjectFamily === "ga") return family === "ga";
      if (selectedProjectFamily === "biw") return family === "biw";
      if (selectedProjectFamily === "vie_serie") return family === "vie_serie";
      if (selectedProjectFamily === "other") {
        if (selectedOtherProject) return d.nomProjet === selectedOtherProject;
        return family === "other";
      }
      return true;
    });
  }, [selectedProjectFamily, selectedOtherProject]);

  const scopedTableData = useMemo(() => applyProjectScope(tableData), [tableData, applyProjectScope]);
  const scopedPreviousData = useMemo(
    () => (previousData ? applyProjectScope(previousData) : null),
    [previousData, applyProjectScope]
  );

  // Configuration des largeurs de colonnes pour le freeze
  const COL_WIDTHS = {
    checkbox: 40,
    id: 90,
    nomProjet: 130,
    utilisateurPSA: 130,
    article: 110,
    sousProjet: 130,
    idIbaVc: 120,
    magasin: 100,
    quantiteNecessaire: 120,
    statut: 130,
    designation: 180,
    codeFournisseur: 110,
    nomFournisseur: 130,
    dernierCommentaire: 200,
    dernierPPLRLOG: 200,
  };

  const getLeftOffset = (colList, targetKey) => {
    let offset = COL_WIDTHS.checkbox; // starts after checkbox (40)
    for (let key of colList) {
      if (key === targetKey) break;
      offset += (COL_WIDTHS[key] || 120);
    }
    return offset;
  };

  // Dropdown fournisseurs: recalculate position when shown
  useEffect(() => {
    if (showFournisseurs && carteRef.current) {
      const rect = carteRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
  }, [showFournisseurs]);

  // Toast init
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToasts(TOAST_CONFIGS.map((t, i) => ({ ...t, id: i })));
  }, []);

  // Listen for importHistory changes in localStorage
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "importHistory" || e.key === null) {
        try {
          const updated = JSON.parse(localStorage.getItem("importHistory")) || [];
          setImportHistory(updated);
        } catch (err) {
          console.warn("Failed to reload importHistory:", err);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // History management for browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state) {
        const state = event.state;
        setActivePage(state.activePage || "table");
        setActivePanel(state.activePanel || "");
        setSelectedStatut(state.selectedStatut || "");
        setSearch(state.search || "");
        setSince(state.since || "");
        setCurrentPage(state.currentPage || 1);
        setSelectedFournisseur(state.selectedFournisseur || "");
        setSelectedRows(state.selectedRows || []);
        setShowFournisseurs(state.showFournisseurs || false);
        setShowColPanel(state.showColPanel || false);
        setColorLines(state.colorLines !== undefined ? state.colorLines : false);
        setVisibleCols(state.visibleCols || DEFAULT_VISIBLE);
        setFrozenUpTo(state.frozenUpTo || "");
        setPageSize(state.pageSize || 25);
        setSelectedProjet(state.selectedProjet || "");
        setSelectedSousProjet(state.selectedSousProjet || "");
        setSelectedProjectFamily(state.selectedProjectFamily || "");
        setSelectedOtherProject(state.selectedOtherProject || "");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Function to navigate with history
  const navigateWithHistory = (newPage, newPanel = "") => {
    const state = {
      activePage: newPage,
      activePanel: newPanel,
      selectedStatut,
      search,
      since,
      currentPage,
      selectedFournisseur,
      selectedRows,
      showFournisseurs,
      showColPanel,
      colorLines,
      visibleCols,
      frozenUpTo,
      pageSize,
      selectedProjet,
      selectedSousProjet,
      selectedProjectFamily,
      selectedOtherProject,
    };

    // Push new state to history
    window.history.pushState(state, "", `#${newPage}${newPanel ? `-${newPanel}` : ""}`);
    
    // Update state
    setActivePage(newPage);
    setActivePanel(newPanel);
  };

  // Load initial state on mount
  useEffect(() => {
    // State is already initialized from the useState declarations, no need to set it again
  }, []);

  // Save state whenever page changes
  useEffect(() => {
    const state = { activePage, activePanel };
    try {
      sessionStorage.setItem("appState", JSON.stringify(state));
    } catch (e) {
      console.warn("Failed to save state", e);
    }
  }, [activePage, activePanel]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("projectFilterState");
      if (!raw) return;
      const saved = JSON.parse(raw);
      setSelectedProjectFamily(saved.selectedProjectFamily || "");
      setSelectedOtherProject(saved.selectedOtherProject || "");
    } catch (e) {
      console.warn("Failed to load project filter state", e);
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        "projectFilterState",
        JSON.stringify({ selectedProjectFamily, selectedOtherProject })
      );
    } catch (e) {
      console.warn("Failed to save project filter state", e);
    }
  }, [selectedProjectFamily, selectedOtherProject]);

  useEffect(() => {
    setProjectFadeAlt(prev => !prev);
  }, [selectedProjectFamily, selectedOtherProject]);

  useEffect(() => {
    try {
      localStorage.setItem("workflowTasks", JSON.stringify(workflowTasks));
    } catch (e) {
      console.warn("Failed to save workflowTasks", e);
    }
  }, [workflowTasks]);

  useEffect(() => {
    if (tableData.length === 0) return;
    if (selectedProjectFamily === "ga" && projectNavModel.ga.count === 0) setSelectedProjectFamily("");
    if (selectedProjectFamily === "biw" && projectNavModel.biw.count === 0) setSelectedProjectFamily("");
    if (selectedProjectFamily === "vie_serie" && projectNavModel.vie_serie.count === 0) setSelectedProjectFamily("");
    if (selectedProjectFamily === "other" && selectedOtherProject) {
      const exists = projectNavModel.other.projects.some(p => p.name === selectedOtherProject);
      if (!exists) setSelectedOtherProject("");
    }
    if (!selectedProjectFamily && !selectedOtherProject) {
      if (projectNavModel.ga.count > 0) setSelectedProjectFamily("ga");
      else if (projectNavModel.biw.count > 0) setSelectedProjectFamily("biw");
      else if (projectNavModel.vie_serie.count > 0) setSelectedProjectFamily("vie_serie");
      else if (projectNavModel.other.count > 0) setSelectedProjectFamily("other");
    }
  }, [tableData, projectNavModel, selectedProjectFamily, selectedOtherProject]);

  const showToasts = () => setToasts(TOAST_CONFIGS.map((t, i) => ({ ...t, id: Date.now() + i })));

  const clearFilters = () => {
    setSearch(""); setSelectedProjet(""); setSelectedSousProjet("");
    setSelectedStatut(""); setSelectedFournisseur(""); setSince("");
    setCurrentPage(1); setPageSize(25); setOpenDropdown(""); setShowFournisseurs(false);
    setSelectedProjectFamily(""); setSelectedOtherProject("");
  };

  const openWorkflowComposer = useCallback((draft = {}) => {
    const fallbackProject = ["ga", "biw", "vie_serie"].includes(selectedProjectFamily) ? selectedProjectFamily : "ga";
    const requestedProject = ["ga", "biw", "vie_serie"].includes(draft.project) ? draft.project : fallbackProject;
    setWorkflowComposerRequest({
      assignee: currentUser || "Utilisateur",
      status: "A faire",
      project: requestedProject,
      ...draft,
      project: requestedProject,
    });
    navigateWithHistory("workflow", "");
  }, [currentUser, navigateWithHistory, selectedProjectFamily]);

  // Filtering
  const filtered = scopedTableData.filter(d => {
    if (selectedProjet && d.nomProjet !== selectedProjet) return false;
    if (selectedSousProjet && d.sousProjet !== selectedSousProjet) return false;
    if (selectedStatut && d.statut !== selectedStatut) return false;
    if (selectedFournisseur && d.nomFournisseur !== selectedFournisseur) return false;
    if (search) {
      const s = search.toLowerCase();
      const match = ALL_COLUMNS.some(c => String(d[c.key] || "").toLowerCase().includes(s)) ||
        (comments[d.id + "_comment"] || "").toLowerCase().includes(s) ||
        (comments[d.id + "_pplrlog"] || "").toLowerCase().includes(s);
      if (!match) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const relanceCount = filtered.filter(isRelanceEligible).length;

  // Fournisseurs
  const fournisseursList = [...new Set(scopedTableData.map(d => d.nomFournisseur))];
  const fournisseurCounts = {};
  fournisseursList.forEach(f => { fournisseurCounts[f] = scopedTableData.filter(d => d.nomFournisseur === f).length; });

  // Unique suppliers for sidebar
  const uniqueSuppliers = fournisseursList.map(f => {
    return scopedTableData.find(d => d.nomFournisseur === f) || { nomFournisseur: f, psaId: "", quantiteEcheancee: "-", quantiteLivree: "-", dateEcheance: "-" };
  });

  // Counts
  const statusCounts = {};
  scopedTableData.forEach(d => { statusCounts[d.statut] = (statusCounts[d.statut] || 0) + 1; });

  // Editable cell handler
  const handleEditStart = (id, field) => { setEditingCell({ id, field }); };
  const handleEditEnd = (id, field, value) => {
    const oldValue = comments[id + "_" + field] || "";
    if (value !== oldValue) {
      const fieldLabel = field === "comment" ? "Dernier commentaire" : "Dernier PPL RLOG Commentaire";
      setRowHistory(prev => ({
        ...prev,
        [id]: [...(prev[id] || []), {
          when: new Date().toLocaleString("fr-FR"),
          who: currentUser || "Utilisateur",
          field: fieldLabel,
          from: oldValue,
          to: value,
        }],
      }));
    }
    setComments(prev => ({ ...prev, [id + "_" + field]: value }));
    setEditingCell(null);
  };

  const applyFilter = (criteria) => {
    setSelectedProjet(criteria.selectedProjet || "");
    setSelectedSousProjet(criteria.selectedSousProjet || "");
    setSelectedProjectFamily("");
    setSelectedOtherProject("");
    setSelectedStatut(criteria.selectedStatut || "");
    setSelectedFournisseur(criteria.selectedFournisseur || "");
    setSearch(criteria.search || "");
    setSince(criteria.since || "");
    setCurrentPage(1);
    navigateWithHistory("table", "");
  };

  const saveCurrentFilter = () => {
    if (!filterName.trim()) return;
    const newFilter = {
      id: Date.now(),
      name: filterName.trim(),
      criteria: { selectedProjet, selectedSousProjet, selectedStatut, selectedFournisseur, search, since }
    };
    setSavedFilters(prev => [...prev, newFilter]);
    setFilterName("");
  };

  const navPageLabel = () => {
    if (activePage === "dashboard") return "Dashboard";
    if (activePage === "workflow") return "Workflow";
    if (activePage === "imports") return "Imports";
    if (activePage === "export") return "Export";
    if (activePage === "graphique") return "Graphique";
    if (activePage === "journal") return "Journal imports";
    if (activePage === "otd") return "OTD";
    if (activePage === "rapport-impact") return "Rapport d'impact";
    if (activePage === "rapport-rft") return "Rapport RFT";
    if (activePage === "profil") return "Mon Profil";
    return "Table principale";
  };

  // inline keyframes
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `@keyframes slideIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes fadeProjectA{from{opacity:.82}to{opacity:1}}@keyframes fadeProjectB{from{opacity:.82}to{opacity:1}}@keyframes slideInLeft{from{transform:translateX(-18px);opacity:0}to{transform:translateX(0);opacity:1}}`;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#1a202c" }}>
      {/* ─── TOASTS ──────────────────────────────────── */}
      <div style={{ position: "fixed", top: 60, right: 16, zIndex: 1100, display: "flex", flexDirection: "column", gap: 10 }}>
        {toasts.map((t, i) => (
          <Toast key={t.id} t={t} index={i}
            onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            onApply={st => { setSelectedStatut(st); navigateWithHistory("table", ""); }} />
        ))}
      </div>

      {/* ─── TOP NAV (FIXED) ─────────────────────────── */}
      <div style={{ 
        position: "fixed", top: 0, left: 0, right: 0, width: "100vw", height: 52, 
        background: "#1a2744", display: "flex", alignItems: "center", padding: "0 20px", 
        zIndex: 300, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", boxSizing: "border-box"
      }}>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 20, letterSpacing: 1.5, marginRight: 16 }}>OPERIX</span>
        <div style={{ width: 1, height: 24, background: "#ffffff22", marginRight: 16 }} />
        <TopProjectNav
          projectNavModel={projectNavModel}
          selectedProjectFamily={selectedProjectFamily}
          selectedOtherProject={selectedOtherProject}
          compactProjectNav={compactProjectNav}
          openDropdown={openDropdown}
          setOpenDropdown={setOpenDropdown}
          onSelectFamily={(key, isActive) => {
            const next = isActive ? "" : key;
            setSelectedProjectFamily(next);
            setSelectedOtherProject("");
            setSelectedProjet("");
            setSelectedSousProjet("");
            setCurrentPage(1);
          }}
          onSelectOtherGroup={() => {
            setSelectedProjectFamily("other");
            setSelectedOtherProject("");
            setSelectedProjet("");
            setSelectedSousProjet("");
            setOpenDropdown("");
            setCurrentPage(1);
          }}
          onSelectOtherProject={(projectName) => {
            setSelectedProjectFamily("other");
            setSelectedOtherProject(projectName);
            setSelectedProjet("");
            setSelectedSousProjet("");
            setOpenDropdown("");
            setCurrentPage(1);
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative", cursor: "pointer" }} onClick={showToasts}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <span style={{ position: "absolute", top: -6, right: -8, background: "#dc2626", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 5px", minWidth: 16, textAlign: "center" }}>3</span>
          </div>
          
          <div style={{ position: "relative", cursor: "pointer", display: "flex", alignItems: "center" }} onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#60a5fa", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12 }}>
              OM
            </div>
            {showProfileMenu && (
              <>
                <div onClick={e => { e.stopPropagation(); setShowProfileMenu(false); }} style={{ position: "fixed", inset: 0, zIndex: 999 }} />
                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, background: "#fff", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 16, zIndex: 1000, minWidth: 260, cursor: "default", border: "1px solid #e2e8f0" }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#60a5fa", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 20 }}>
                      OM
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1a2744" }}>Othmane M.</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>Admin / Logistique</div>
                    </div>
                  </div>
                  
                  <div style={{ height: 1, background: "#f1f5f9", margin: "12px 0" }} />
                  
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>À propos</div>
                    <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                      Connecté depuis : {new Date().toLocaleDateString()}<br/>
                      Dernière connexion : 10:23 AM<br/>
                      Rôle : Super Utilisateur<br/>
                      Email : othmane@operix.local
                    </div>
                  </div>

                  <div style={{ height: 1, background: "#f1f5f9", margin: "12px 0" }} />

                  <button onClick={() => { navigateWithHistory("profil", ""); setShowProfileMenu(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", borderRadius: 8, border: "none", background: "#f8fafc", color: "#1a2744", fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "background 0.2s", marginBottom: 6 }}
                    onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"} onMouseLeave={e => e.currentTarget.style.background = "#f8fafc"}>
                    <span style={{ fontSize: 16 }}>👤</span> Mon Profil
                  </button>

                  <button onClick={() => window.location.reload()} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", borderRadius: 8, border: "none", background: "#fef2f2", color: "#dc2626", fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "background 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"} onMouseLeave={e => e.currentTarget.style.background = "#fef2f2"}>
                    <span style={{ fontSize: 16 }}>🚪</span> Déconnexion
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── BODY: sidebar + panel + main ───────────── */}
      <div style={{ display: "flex", marginTop: 52, minHeight: "calc(100vh - 52px)" }}>
        {/* Sidebar (FIXED) */}
        <div style={{ 
          position: "fixed", top: 52, left: 0, height: "calc(100vh - 52px)", 
          width: sidebarOpen ? sidebarExpandedWidth : sidebarCollapsedWidth,
          transition: "width 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s ease",
          background: "#fff", borderRight: "1px solid #e2e8f0", boxShadow: "2px 0 8px rgba(0,0,0,0.04)", 
          zIndex: 200, display: "flex", flexDirection: "column", overflowY: "auto", overflowX: "hidden",
          paddingTop: 8
        }}>
          <button onClick={() => { setSidebarOpen(!sidebarOpen); if (sidebarOpen) setActivePanel(""); }}
            aria-label={sidebarOpen ? "Reduire le panel" : "Agrandir le panel"}
            style={{
              position: "absolute",
              top: "50%",
              right: -14,
              transform: "translateY(-50%)",
              width: 28,
              height: 52,
              borderRadius: 999,
              border: "1px solid #dbe2ea",
              background: "#ffffff",
              boxShadow: "0 8px 18px rgba(15,23,42,0.08)",
              cursor: "pointer",
              fontSize: 13,
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 210,
              transition: "transform 0.2s ease, background 0.2s ease"
            }}>
            {sidebarOpen ? "◀" : "▶"}
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: sidebarOpen ? "0 8px 8px 8px" : "0 4px 8px 4px" }}>
          {SIDEBAR_ITEMS.map(item => {
            const isActive = item.type === "page" ? activePage === item.page && !activePanel : activePanel === item.panel;
            return (
              <div key={item.label} title={!sidebarOpen ? item.label : ""} onClick={() => {
                if (item.type === "page") { navigateWithHistory(item.page, ""); }
                else { setActivePanel(activePanel === item.panel ? "" : item.panel); navigateWithHistory("table", activePanel === item.panel ? "" : item.panel); }
              }} style={{
                display: "flex", alignItems: "center", gap: 10, padding: sidebarOpen ? "9px 12px" : "9px 0",
                cursor: "pointer", background: isActive ? "#eff6ff" : "transparent",
                borderLeft: isActive ? "3px solid #3b82f6" : "3px solid transparent",
                color: isActive ? "#1e40af" : "#475569", fontWeight: isActive ? 600 : 500, fontSize: 13,
                transition: "all 0.18s ease", justifyContent: sidebarOpen ? "flex-start" : "center",
                borderRadius: 10
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f8fafc"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                <span style={{ fontSize: 15, minWidth: 18, textAlign: "center" }}>{item.icon}</span>
                {sidebarOpen && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
              </div>
            );
          })}

          {/* Sub-project items — visible only when a specific sous-projet is selected */}
          {selectedSousProjet && (
            <>
              {sidebarOpen && <div style={{ padding: "10px 12px 4px", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, borderTop: "1px solid #e2e8f0", marginTop: 6 }}>📂 {selectedSousProjet}</div>}
              {[
                { icon: "📊", label: "Rapport d'impact", type: "special", page: "rapport-impact", panel: "rapport-impact" },
                { icon: "🔴", label: "Pièces manquantes", type: "panel", panel: "rapport-manquants" },
                { icon: "🕐", label: "OTD", type: "page", page: "otd" },
                { icon: "✅", label: "Rapport RFT", type: "page", page: "rapport-rft" },
              ].map(item => {
                const isActive = item.type === "special" ? (activePage === item.page && activePanel === item.panel) : (item.type === "page" ? activePage === item.page && !activePanel : activePanel === item.panel);
                return (
                  <div key={item.label} title={!sidebarOpen ? item.label : ""} onClick={() => {
                    if (item.type === "special") { navigateWithHistory(item.page, item.panel); }
                    else if (item.type === "page") { navigateWithHistory(item.page, ""); }
                    else { setActivePanel(activePanel === item.panel ? "" : item.panel); navigateWithHistory("table", activePanel === item.panel ? "" : item.panel); }
                  }} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: sidebarOpen ? "8px 12px 8px 22px" : "9px 0",
                    cursor: "pointer", background: isActive ? "#eff6ff" : "transparent",
                    borderLeft: isActive ? "3px solid #3b82f6" : "3px solid transparent",
                    color: isActive ? "#1e40af" : "#64748b", fontWeight: isActive ? 600 : 500, fontSize: 12,
                    transition: "all 0.18s ease", justifyContent: sidebarOpen ? "flex-start" : "center",
                    borderRadius: 10
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f8fafc"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                    {sidebarOpen && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
                  </div>
                );
              })}
            </>
          )}
          </div>
        </div>

        {/* Side Panel (Fixed to sidebar) */}
        {activePanel && (
          <div style={{ 
            position: "fixed", top: 52, left: sidebarOpen ? sidebarExpandedWidth : sidebarCollapsedWidth, height: "calc(100vh - 52px)",
            width: activePanel === "rapport-impact" ? 280 : 250, borderRight: "1px solid #e2e8f0", 
            background: "#fff", display: "flex", flexDirection: "column", 
            animation: "slideInLeft 0.3s ease-out", padding: 14, zIndex: 195, 
            boxShadow: "2px 0 8px rgba(0,0,0,0.02)", overflowY: "auto"
          }}>

            {/* ── FILTRES (3 sections) ── */}
            {activePanel === "filtres" && (
              <div>
                {/* Section 1 — Saved Filters */}
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1a2744", marginBottom: 10 }}>🔖 Filtres sauvegardés</h3>
                {savedFilters.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", marginBottom: 16 }}>Aucun filtre sauvegardé</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                    {savedFilters.map(f => (
                      <div key={f.id} onClick={() => applyFilter(f.criteria)} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px",
                        borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer",
                        fontSize: 13, fontWeight: 500, color: "#1a2744", transition: "all 0.15s"
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.borderColor = "#3b82f6"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#e2e8f0"; }}>
                        <span>🔖 {f.name}</span>
                        <button onClick={e => { e.stopPropagation(); setSavedFilters(prev => prev.filter(x => x.id !== f.id)); }}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#94a3b8", padding: "0 2px" }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Section 2 — Save current filter */}
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12, marginBottom: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>💾 Sauvegarder le filtre actif</h4>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Nommer ce filtre..."
                      style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, outline: "none" }}
                      onKeyDown={e => { if (e.key === "Enter") saveCurrentFilter(); }} />
                    <button onClick={saveCurrentFilter} style={{
                      padding: "7px 12px", borderRadius: 6, border: "none", background: "#1a2744", color: "#fff",
                      fontWeight: 600, fontSize: 12, cursor: filterName.trim() ? "pointer" : "default",
                      opacity: filterName.trim() ? 1 : 0.4, transition: "opacity 0.2s", whiteSpace: "nowrap"
                    }}>💾 </button>
                  </div>
                </div>

                {/* Section 3 — Quick filter options */}
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>⚡ Filtres rapides</h4>
                  {[
                    { label: "Tous les retards", statut: "Retard" },
                    { label: "Manquants Plus", statut: "Manquants Plus" },
                    { label: "Points durs", statut: "Point dur" },
                    { label: "Pièces reçues", statut: "Reçu" },
                    { label: "En cours", statut: "En cours" },
                    { label: "Confirmés", statut: "Confirmé" },
                  ].map(f => (
                    <button key={f.label} onClick={() => { setSelectedStatut(selectedStatut === f.statut ? "" : f.statut); setCurrentPage(1); }}
                      style={{
                        display: "block", width: "100%", padding: "10px 14px", marginBottom: 6, borderRadius: 8, border: "1px solid #e2e8f0",
                        background: selectedStatut === f.statut ? "#eff6ff" : "#f8fafc",
                        color: selectedStatut === f.statut ? "#1e40af" : "#475569",
                        fontWeight: selectedStatut === f.statut ? 600 : 400, cursor: "pointer", textAlign: "left", fontSize: 13, transition: "all 0.15s"
                      }}>{f.label}</button>
                  ))}
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <button onClick={clearFilters} style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fff1f1", color: "#dc2626", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>✕ Effacer filtres</button>
                    <button onClick={() => setVisibleCols(DEFAULT_VISIBLE)} style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>↩ Réinit. vue</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── FIGER ── */}
            {activePanel === "figer" && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a2744", marginBottom: 8 }}>❄️ Figer le volet</h3>
                <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.5 }}>
                  Cliquer sur une colonne pour la figer. Tout ce qui est à gauche restera immobile lors du scroll horizontal.
                </p>
                
                {visibleCols.map(key => {
                  const col = ALL_COLUMNS.find(c => c.key === key);
                  if (!col) return null;
                  
                  const isFrozen = frozenUpTo && visibleCols.indexOf(key) <= visibleCols.indexOf(frozenUpTo);
                  const isExact = frozenUpTo === key;

                  return (
                    <button key={key} onClick={() => setFrozenUpTo(isExact ? "" : key)}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center", 
                        width: "100%", padding: "10px 14px", marginBottom: 6, borderRadius: 8,
                        border: isFrozen ? "1px solid #3b82f6" : "1px solid #e2e8f0",
                        background: isFrozen ? "#eff6ff" : "#fff",
                        color: isFrozen ? "#1e40af" : "#475569",
                        fontWeight: isFrozen ? 600 : 400, cursor: "pointer", textAlign: "left", fontSize: 13,
                        transition: "all 0.15s"
                      }}>
                      <span>{col.label}</span>
                      {isFrozen && <span style={{ fontSize: 14 }}>❄️</span>}
                    </button>
                  );
                })}

                {frozenUpTo && (
                  <button onClick={() => setFrozenUpTo("")} style={{
                    width: "100%", padding: "10px", marginTop: 12, borderRadius: 8, border: "none",
                    background: "#fef2f2", color: "#dc2626", fontWeight: 600, fontSize: 13, cursor: "pointer",
                    display: "flex", justifyContent: "center", gap: 8
                  }}>
                    ❌ Dégeler tout
                  </button>
                )}
              </div>
            )}

            {/* ── RAPPORT D'IMPACT (Nouveau Panel 280px) ── */}
            {activePanel === "rapport-impact" && (
              <div style={{ paddingRight: 4, height: "100%", overflowY: "auto" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a2744", marginBottom: 16 }}>📊 Rapport d'impact</h3>
                
                {/* Bloc 1 — Formulaire de création / filtrage */}
                <div style={{ background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                  <h4 style={{ fontSize: 13, color: "#1a2744", fontWeight: 700, marginBottom: 12 }}>Filtres de rapport</h4>
                  
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Name</label>
                    <input type="text" placeholder="Nom du rapport..." value={impactForm.name} onChange={e => setImpactForm({ ...impactForm, name: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, outline: "none", boxSizing: "border-box" }}
                      onFocus={e => e.currentTarget.style.border = "1px solid #3b82f6"} onBlur={e => e.currentTarget.style.border = "1px solid #e2e8f0"} />
                  </div>
                  
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Warehouse Name</label>
                    <input type="text" placeholder="Nom du magasin..." value={impactForm.warehouseName} onChange={e => setImpactForm({ ...impactForm, warehouseName: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, outline: "none", boxSizing: "border-box" }}
                      onFocus={e => e.currentTarget.style.border = "1px solid #3b82f6"} onBlur={e => e.currentTarget.style.border = "1px solid #e2e8f0"} />
                  </div>
                  
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Requirement Type</label>
                    <select value={impactForm.requirementType} onChange={e => setImpactForm({ ...impactForm, requirementType: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, outline: "none", boxSizing: "border-box", cursor: "pointer" }}
                      onFocus={e => e.currentTarget.style.border = "1px solid #3b82f6"} onBlur={e => e.currentTarget.style.border = "1px solid #e2e8f0"}>
                      <option value="">Sélectionner...</option>
                      <option value="Standard">Standard</option>
                      <option value="Urgent">Urgent</option>
                      <option value="Critique">Critique</option>
                    </select>
                  </div>
                  
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Requirement Document</label>
                    <input type="text" placeholder="N° document..." value={impactForm.requirementDocument} onChange={e => setImpactForm({ ...impactForm, requirementDocument: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, outline: "none", boxSizing: "border-box" }}
                      onFocus={e => e.currentTarget.style.border = "1px solid #3b82f6"} onBlur={e => e.currentTarget.style.border = "1px solid #e2e8f0"} />
                  </div>
                  
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Statut</label>
                    <select value={impactForm.statut} onChange={e => setImpactForm({ ...impactForm, statut: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, outline: "none", boxSizing: "border-box", cursor: "pointer" }}
                      onFocus={e => e.currentTarget.style.border = "1px solid #3b82f6"} onBlur={e => e.currentTarget.style.border = "1px solid #e2e8f0"}>
                      <option value="">Sélectionner...</option>
                      {["pas de date", "pas de visibilité", "pieces manquantes", "marge 24h", "marge 48h", "prevue a l heure", "livré"].map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>

                  <button style={{ width: "100%", padding: "8px", borderRadius: 8, border: "none", background: "#1a2744", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", marginBottom: 8 }}>
                    🔍 Appliquer
                  </button>
                  <button onClick={() => setImpactForm({ name: "", warehouseName: "", requirementType: "", requirementDocument: "", statut: "" })} style={{ width: "100%", padding: "8px", borderRadius: 8, border: "none", background: "#f1f5f9", color: "#475569", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                    ✕ Réinitialiser
                  </button>
                </div>

                {/* Bloc 2 — Filtres dates + recherche */}
                <div style={{ background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                  <h4 style={{ fontSize: 13, color: "#1a2744", fontWeight: 700, marginBottom: 12 }}>Affiner la vue</h4>
                  
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Recherche globale</label>
                    <input type="text" placeholder="Rechercher ID, article..." value={impactSearch} onChange={e => setImpactSearch(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, outline: "none", boxSizing: "border-box" }}
                      onFocus={e => e.currentTarget.style.border = "1px solid #3b82f6"} onBlur={e => e.currentTarget.style.border = "1px solid #e2e8f0"} />
                  </div>
                  
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Du</label>
                      <input type="date" value={impactDateFrom} onChange={e => setImpactDateFrom(e.target.value)}
                        style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Au</label>
                      <input type="date" value={impactDateTo} onChange={e => setImpactDateTo(e.target.value)}
                        style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                </div>

                {/* Bloc 3 — Export (informative in panel, handled in page) */}
                <div style={{ background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                  <h4 style={{ fontSize: 13, color: "#1a2744", fontWeight: 700, marginBottom: 12 }}>Export Rapport</h4>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, padding: "8px", borderRadius: 6, background: "#f0f4ff", color: "#1e40af", fontWeight: 600, fontSize: 12, textAlign: "center", border: "1px solid #dbeafe" }}>📄 CSV</div>
                    <div style={{ flex: 1, padding: "8px", borderRadius: 6, background: "#f0fdf4", color: "#16a34a", fontWeight: 600, fontSize: 12, textAlign: "center", border: "1px solid #dcfce7" }}>📗 Excel</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── RAPPORT MANQUANTS ── */}
            {activePanel === "rapport-manquants" && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1a2744", marginBottom: 12 }}>🔴 Rapport pièces manquantes</h3>
                <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>Sous-projet : <b style={{ color: "#1a2744" }}>{selectedSousProjet}</b></p>
                {/* Bloc Filtres */}
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 8 }}>Statuts critiques</h4>
                  {["Manquants Plus", "Manquant", "Point dur"].map(st => (
                    <button key={st} onClick={() => { setSelectedStatut(selectedStatut === st ? "" : st); setCurrentPage(1); }}
                      style={{ display: "block", width: "100%", padding: "7px 12px", marginBottom: 4, borderRadius: 6, border: "1px solid #e2e8f0", background: selectedStatut === st ? "#fde8e8" : "#f8fafc", color: selectedStatut === st ? "#c0392b" : "#475569", fontWeight: selectedStatut === st ? 600 : 400, cursor: "pointer", fontSize: 12, textAlign: "left" }}>{st}</button>
                  ))}
                </div>
                {/* Bloc Mini Graphique filtré sur critiques */}
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: 12, marginBottom: 16 }}>
                  <h4 style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 8 }}>Répartition critiques</h4>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
                    {["Manquants Plus", "Manquant", "Point dur"].map(st => {
                      const count = filtered.filter(d => d.statut === st).length;
                      const h = Math.max(8, count * 25);
                      const sc = getStatusColor(st);
                      return (
                        <div key={st} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: sc.dot, marginBottom: 3 }}>{count}</span>
                          <div style={{ width: "80%", height: h, background: sc.dot, borderRadius: "4px 4px 0 0", minHeight: 4, transition: "height 0.3s" }} />
                          <span style={{ fontSize: 9, color: "#94a3b8", marginTop: 3, textAlign: "center", lineHeight: 1.1 }}>{st.slice(0, 8)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Bloc Export */}
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={{ flex: 1, padding: "8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f0f4ff", cursor: "pointer", fontWeight: 600, fontSize: 12, color: "#1a2744" }}>📄 CSV</button>
                  <button style={{ flex: 1, padding: "8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f0fdf4", cursor: "pointer", fontWeight: 600, fontSize: 12, color: "#1a2744" }}>📗 Excel</button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Main content */}
        {/* Main Content Area with dynamic margin to compensate for fixed sidebar/panel */}
        <div style={{ 
          flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
          marginLeft: (sidebarOpen ? sidebarExpandedWidth : sidebarCollapsedWidth) + sidePanelWidth,
          transition: "margin-left 0.25s cubic-bezier(0.4,0,0.2,1)",
          animation: `${projectFadeAlt ? "fadeProjectA" : "fadeProjectB"} 180ms ease`
        }}>
          {/* Breadcrumb */}
          <div style={{ background: "#fff", borderBottom: "1px solid #f1f5f9", padding: "10px 20px", fontSize: 13, color: "#64748b", flexShrink: 0 }}>
            <span onClick={() => { navigateWithHistory("table", ""); clearFilters(); }} style={{ cursor: "pointer", fontWeight: 600, color: "#3b82f6" }}>OPERIX</span>
            {selectedProjet && <span> › {selectedProjet}</span>}
            {selectedSousProjet && <span> › {selectedSousProjet}</span>}
            <span> › {navPageLabel()}</span>
          </div>

          {/* Page routing */}
          {activePage === "dashboard" && <PageDashboard data={scopedTableData} previousData={scopedPreviousData} importDiff={importDiff} cumulativeStats={cumulativeStats}
            onFilter={st => { setSelectedStatut(st); navigateWithHistory("table", ""); setCurrentPage(1); }}
            onSetFournisseur={f => { setSelectedFournisseur(f); navigateWithHistory("table", ""); setCurrentPage(1); }}
            onSetProjet={p => { setSelectedProjectFamily(""); setSelectedOtherProject(""); setSelectedProjet(p); navigateWithHistory("table", ""); setCurrentPage(1); }}
            onSearch={s => { setSearch(s); navigateWithHistory("table", ""); setCurrentPage(1); }}
            onCreateWorkflowTask={openWorkflowComposer}
          />}
          {activePage === "workflow" && (
            <WorkflowPage
              tasks={workflowTasks}
              setTasks={setWorkflowTasks}
              currentUser={currentUser}
              composerRequest={workflowComposerRequest}
              onComposerRequestHandled={() => setWorkflowComposerRequest(null)}
              initialProjectFilter={["ga", "biw", "vie_serie"].includes(selectedProjectFamily) ? selectedProjectFamily : "all"}
            />
          )}
          {activePage === "profil" && <PageProfil onLogout={() => window.location.reload()} />}
          {activePage === "imports" && <ErrorBoundary><Suspense fallback={<div style={{ padding: 24, color: "#64748b" }}>Chargement...</div>}><PageImports
            currentUser={currentUser}
            currentData={tableData}
            onImport={(data) => {
              if (!Array.isArray(data) || data.length === 0) {
                console.error("[App] onImport: données invalides", data);
                return;
              }
              // Import logging removed in production cleanup
              const prev = importedData || [];
              let diff = { added: [], modified: [], newRetards: [] };
              try { diff = computeDiff(prev, data); } catch (e) { console.warn("[App] computeDiff a échoué:", e); }
              setPreviousData(prev);
              setImportDiff(diff);
              setImportedData(data);
              setCumulativeStats(s => ({
                totalCommandes: s.totalCommandes + data.length,
                recues: s.recues + data.filter(d => d.statut === "Reçu").length,
                enRetard: s.enRetard + data.filter(d => ["Retard","Manquants Plus"].includes(d.statut)).length,
                imports: s.imports + 1,
              }));
              // Ne pas changer de page pour conserver l'historique des imports dans PageImports
              setActivePanel("");
            }}
            onNavigateToTable={() => {
              navigateWithHistory("table", "");
            }}
          /></Suspense></ErrorBoundary>}
          {activePage === "export" && <PageExport filteredCount={filtered.length} totalCount={scopedTableData.length} filteredData={filtered} allData={scopedTableData} />}
          {activePage === "graphique" && <Suspense fallback={<div style={{ padding: 24, color: "#64748b" }}>Chargement...</div>}><PageGraphique data={scopedTableData} /></Suspense>}
          {activePage === "journal" && <Suspense fallback={<div style={{ padding: 24, color: "#64748b" }}>Chargement...</div>}><PageJournal importHistory={importHistory} /></Suspense>}
          {activePage === "otd" && <Suspense fallback={<div style={{ padding: 24, color: "#64748b" }}>Chargement...</div>}><PageOTD /></Suspense>}
          {activePage === "rapport-rft" && <Suspense fallback={<div style={{ padding: 24, color: "#64748b" }}>Chargement...</div>}><PageRFT /></Suspense>}

          {activePage === "rapport-impact" && (
            <PageRapportImpact 
              sousProjet={selectedSousProjet}
              data={scopedTableData}
              impactSearch={impactSearch} setImpactSearch={setImpactSearch}
              impactDateFrom={impactDateFrom} setImpactDateFrom={setImpactDateFrom}
              impactDateTo={impactDateTo} setImpactDateTo={setImpactDateTo}
              impactForm={impactForm} setImpactForm={setImpactForm}
              comments={comments} setComments={setComments}
            />
          )}

          {activePage === "table" && (
            <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div style={{ padding: "20px 20px 0 20px", flexShrink: 0 }}>
                {/* Mini dashboard cards */}
                <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                {[
                  { label: "Total", value: filtered.length, bg: "#f0f4ff", color: "#1a2744", filter: "" },
                  { label: "Critiques", value: filtered.filter(d => d.statut === "Manquants Plus").length, bg: "#fff1f1", color: "#dc2626", filter: "Manquants Plus" },
                  { label: "Retards", value: filtered.filter(d => d.statut === "Retard").length, bg: "#fffbeb", color: "#d97706", filter: "Retard" },
                  { label: "En cours", value: filtered.filter(d => d.statut === "En cours").length, bg: "#f0fdf4", color: "#1e8449", filter: "En cours" },
                  { label: "Reçus", value: filtered.filter(d => d.statut === "Reçu").length, bg: "#eff6ff", color: "#2e86c1", filter: "Reçu" },
                ].map(c => (
                  <div key={c.label} onClick={() => { setSelectedStatut(selectedStatut === c.filter ? "" : c.filter); setCurrentPage(1); }}
                    style={{ background: c.bg, borderRadius: 12, padding: "12px 18px", cursor: "pointer", transition: "all 0.2s", minWidth: 120 }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>{c.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
                  </div>
                ))}

                {/* Fournisseurs card */}
                <div ref={carteRef} style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 18px", cursor: "pointer", minWidth: 140, position: "relative" }}
                  onClick={() => setShowFournisseurs(!showFournisseurs)}>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Fournisseurs</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 22, fontWeight: 700, color: "#1a2744" }}>{fournisseursList.length}</span>
                    <div style={{ display: "flex", gap: 2 }}>
                      {[16, 12, 8].map((h, i) => <div key={i} style={{ width: 4, height: h, background: "#cbd5e1", borderRadius: 2 }} />)}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#3b82f6", fontWeight: 500, marginTop: 2 }}>
                    {showFournisseurs ? "▲ Masquer" : "▼ Voir la liste"}
                  </div>
                  {showFournisseurs && (
                    <div onClick={e => e.stopPropagation()} style={{
                      position: 'fixed', top: dropdownPos.top, right: dropdownPos.right, background: "#fff", borderRadius: 12,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 8, zIndex: 9999, minWidth: 260, border: "1px solid #e2e8f0"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2744" }}>Filtrer par fournisseur</span>
                        {selectedFournisseur && <button onClick={() => setSelectedFournisseur("")} style={{ fontSize: 11, color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>✕ Effacer</button>}
                      </div>
                      <div onClick={() => { setSelectedFournisseur(""); setShowFournisseurs(false); setCurrentPage(1); }}
                        style={{ padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500, background: !selectedFournisseur ? "#eff6ff" : "transparent", color: !selectedFournisseur ? "#1e40af" : "#1a202c" }}>
                        Tous les fournisseurs
                      </div>
                      {fournisseursList.map(f => (
                        <div key={f} style={{ display: "flex", alignItems: "center", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                          <div onClick={() => { setSelectedFournisseur(f); setShowFournisseurs(false); setCurrentPage(1); }}
                            style={{ flex: 1, padding: "6px 10px", display: "flex", alignItems: "center", gap: 6, fontWeight: 500, background: selectedFournisseur === f ? "#eff6ff" : "transparent", color: selectedFournisseur === f ? "#1e40af" : "#1a202c", borderRadius: "6px 0 0 6px" }}
                            onMouseEnter={e => { if (selectedFournisseur !== f) e.currentTarget.style.background = "#f8fafc"; }}
                            onMouseLeave={e => { if (selectedFournisseur !== f) e.currentTarget.style.background = "transparent"; }}>
                            🏭 {f}
                            <span style={{ marginLeft: "auto", background: "#f1f5f9", borderRadius: 10, padding: "1px 8px", fontSize: 11, color: "#64748b", fontWeight: 600 }}>{fournisseurCounts[f]}</span>
                          </div>
                          <button onClick={e => { e.stopPropagation(); setFicheFournisseur(f); setShowFournisseurs(false); }}
                            style={{ padding: "6px 10px", border: "none", borderLeft: "1px solid #f1f5f9", background: "transparent", cursor: "pointer", fontSize: 13 }} title="Voir fiche">📋</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

                {/* Action bar (STICKY) */}
                <div style={{ 
                  position: "sticky", top: 0, zIndex: 100, background: "#ffffff", 
                  borderBottom: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  borderRadius: 12, padding: "12px 18px", display: "flex", alignItems: "center", 
                  gap: 10, marginBottom: 14, flexWrap: "wrap", border: "1px solid #e2e8f0" 
                }}>
                <button style={{ padding: "7px 14px", borderRadius: 8, border: "none", cursor: selectedRows.length ? "pointer" : "default", fontWeight: 600, fontSize: 13, background: selectedRows.length ? "#1a2744" : "#e2e8f0", color: selectedRows.length ? "#fff" : "#94a3b8" }}>
                  ⚡ Mise à jour{selectedRows.length > 0 && ` (${selectedRows.length})`}
                </button>
                <button onClick={clearFilters} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#f1f5f9", cursor: "pointer", fontWeight: 500, fontSize: 13, color: "#64748b" }}>✕ Clear Filters</button>
                {importedData && (
                  <div style={{
                    background: "#16a34a15",
                    border: "1px solid #16a34a44",
                    borderRadius: 8,
                    padding: "4px 12px",
                    fontSize: 11,
                    color: "#86efac",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 600
                  }}>
                    📥 Données importées — {importedData.length} lignes
                    <span
                      onClick={() => { setImportedData(null); setPreviousData(null); setImportDiff(null); }}
                      style={{ cursor: "pointer", color: "#475569", marginLeft: 4 }}
                    >
                      ✕ Réinitialiser
                    </span>
                  </div>
                )}
                <div style={{
                  background: relanceCount > 0 ? "#fff7ed" : "#f8fafc",
                  border: `1px solid ${relanceCount > 0 ? "#fdba74" : "#e2e8f0"}`,
                  borderRadius: 8,
                  padding: "4px 10px",
                  fontSize: 11,
                  color: relanceCount > 0 ? "#c2410c" : "#64748b",
                  fontWeight: 700
                }}>
                  ✉️ Relances disponibles: {relanceCount}
                </div>
                <div style={{ width: 1, height: 24, background: "#e2e8f0" }} />
                <select value={selectedStatut} onChange={e => { setSelectedStatut(e.target.value); setCurrentPage(1); }}
                  style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 13, cursor: "pointer" }}>
                  <option value="">Tous les statuts</option>
                  {Object.keys(getAllStatusColors()).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div style={{ flex: 1, position: "relative", minWidth: 180 }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
                  <input value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Rechercher..."
                    style={{ width: "100%", padding: "7px 12px 7px 32px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 13, outline: "none" }} />
                </div>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>Depuis</span>
                <input type="datetime-local" value={since} onChange={e => setSince(e.target.value)}
                  style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, background: "#f8fafc" }} />
                <div style={{ width: 1, height: 24, background: "#e2e8f0" }} />
                <button onClick={() => setShowColPanel(!showColPanel)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontWeight: 500, fontSize: 13, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
                  ⚙ Colonnes <span style={{ background: "#3b82f6", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{visibleCols.length}</span>
                </button>
                <div style={{ width: 1, height: 24, background: "#e2e8f0" }} />
                <button onClick={() => setColorLines(!colorLines)} style={{
                  padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
                  background: colorLines ? "#1a2744" : "#f1f5f9", color: colorLines ? "#fff" : "#475569",
                  display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s"
                }}>
                  <span style={{ display: "flex", gap: 2 }}>
                    {["#dc2626", "#e67e22", "#27ae60", "#2e86c1", "#7d3c98"].map(c => <span key={c} style={{ width: 8, height: 8, borderRadius: 2, background: c }} />)}
                  </span>
                  Couleur ligne
                </button>
                <button onClick={() => setShowSupplierSidebar(true)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontWeight: 500, fontSize: 13, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
                  🏭 Fournisseurs
                </button>
              </div>

              {/* Column panel */}
              <ColumnSelectionModal 
                isOpen={showColPanel}
                onClose={() => setShowColPanel(false)}
                visibleColumns={visibleCols}
                onColumnsChange={setVisibleCols}
              />

              </div>
              <div style={{ flex: 1, padding: "0 20px 20px 20px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Table with freeze frame logic */}
                <div style={{ flex: 1, overflowX: "auto", overflowY: "auto", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", position: "relative" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead style={{ position: "sticky", top: 0, zIndex: 3, background: "#f8fafc", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                      <tr>
                      <th style={{ position: "sticky", left: 0, zIndex: 3, padding: "10px 12px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", borderRight: frozenUpTo === "" ? "1px solid #e2e8f0" : "none" }}>
                        <input type="checkbox" checked={selectedRows.length === paged.length && paged.length > 0}
                          onChange={() => setSelectedRows(selectedRows.length === paged.length ? [] : paged.map(d => d.id))} />
                      </th>
                      {visibleCols.map((key) => {
                        const col = ALL_COLUMNS.find(c => c.key === key);
                        if (!col) return null;
                        
                        const colWidth = COL_WIDTHS[key] || 120;
                        const isFrozen = frozenUpTo && visibleCols.indexOf(key) <= visibleCols.indexOf(frozenUpTo);
                        const isLastFrozen = isFrozen && key === frozenUpTo;

                        return (
                          <th key={key} style={{ 
                            width: colWidth,
                            minWidth: colWidth,
                            maxWidth: colWidth,
                            padding: "10px 14px", 
                            textAlign: "left", 
                            color: "#475569", 
                            fontWeight: 600, 
                            fontSize: 12, 
                            borderBottom: "1px solid #e2e8f0", 
                            whiteSpace: "nowrap", 
                            textTransform: "uppercase", 
                            letterSpacing: 0.3, 
                            background: "#f8fafc",
                            position: isFrozen ? "sticky" : "relative",
                            left: isFrozen ? getLeftOffset(visibleCols, key) : "auto",
                            zIndex: isFrozen ? 3 : 1,
                            borderRight: isLastFrozen ? "2px solid #cbd5e1" : "1px solid #e2e8f0"
                          }}>{col.label}</th>
                        );
                      })}
                      <th style={{ position: "relative", zIndex: 1, padding: "10px 14px", textAlign: "left", color: "#475569", fontWeight: 600, fontSize: 12, borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((row, i) => {
                      const sc = getStatusColor(row.statut);
                      const relanceEligible = isRelanceEligible(row);
                      const isSelected = selectedRows.includes(row.id);
                      let rowBg = i % 2 === 1 ? "#fafbfc" : "#fff";
                      if (isSelected) rowBg = "#dbeafe";
                      else if (colorLines) rowBg = sc.bg;
                      return (
                        <tr key={row.id} style={{ background: rowBg, transition: "background 0.15s" }}
                          onMouseEnter={e => { if (!isSelected && !colorLines) e.currentTarget.style.background = "#f8fafc"; }}
                          onMouseLeave={e => { if (!isSelected && !colorLines) e.currentTarget.style.background = i % 2 === 1 ? "#fafbfc" : "#fff"; }}>
                          <td style={{ 
                            position: "sticky", left: 0, zIndex: 2, width: 40, minWidth: 40, maxWidth: 40, padding: "10px 12px", 
                            borderBottom: colorLines ? `1px solid ${sc.dot}22` : "1px solid #f1f5f9", 
                            background: rowBg, 
                            borderRight: "1px solid #e2e8f0",
                            textAlign: "center"
                          }}>
                            <input type="checkbox" checked={isSelected} onChange={() => setSelectedRows(prev => isSelected ? prev.filter(x => x !== row.id) : [...prev, row.id])} />
                          </td>
                          {visibleCols.map((key) => {
                            const colWidth = COL_WIDTHS[key] || 120;
                            const isFrozen = frozenUpTo && visibleCols.indexOf(key) <= visibleCols.indexOf(frozenUpTo);
                            const isLastFrozen = isFrozen && key === frozenUpTo;
                            
                            const cellStyle = {
                              width: colWidth,
                              minWidth: colWidth,
                              maxWidth: colWidth,
                              padding: "10px 14px",
                              borderBottom: colorLines ? `1px solid ${sc.dot}22` : "1px solid #f1f5f9",
                              whiteSpace: "nowrap",
                              position: isFrozen ? "sticky" : "relative",
                              left: isFrozen ? getLeftOffset(visibleCols, key) : "auto",
                              zIndex: isFrozen ? 2 : 0,
                              background: rowBg,
                              borderRight: isLastFrozen ? "2px solid #cbd5e1" : "1px solid #e2e8f0"
                            };

                            if (key === "statut") {
                              return (
                                <td key={key} style={cellStyle}>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 12px", borderRadius: 20, background: sc.bg, color: sc.color, fontWeight: 600, fontSize: 12 }}>
                                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: sc.dot }} />{row.statut}
                                  </span>
                                </td>
                              );
                            }
                            if (key === "dernierCommentaire" || key === "dernierPPLRLOG") {
                              const field = key === "dernierCommentaire" ? "comment" : "pplrlog";
                              const val = comments[row.id + "_" + field] || "";
                              const isEditing = editingCell && editingCell.id === row.id && editingCell.field === field;
                              return (
                                <td key={key} style={{ ...cellStyle, minWidth: 160 }}>
                                  {isEditing ? (
                                    <input ref={editRef} autoFocus defaultValue={val}
                                      style={{ width: "100%", padding: "4px 8px", borderRadius: 6, border: "1.5px solid #3b82f6", background: "#eff6ff", fontSize: 13, outline: "none" }}
                                      onBlur={e => handleEditEnd(row.id, field, e.target.value)}
                                      onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") handleEditEnd(row.id, field, e.key === "Escape" ? val : e.target.value); }} />
                                  ) : (
                                    <div onClick={() => handleEditStart(row.id, field)}
                                      title={val || ""}
                                      style={{ cursor: "pointer", padding: "4px 8px", borderRadius: 6, border: "1px solid transparent", transition: "all 0.15s", minHeight: 28, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: colWidth - 24 }}
                                      onMouseEnter={e => { e.currentTarget.style.border = "1px solid #cbd5e1"; }}
                                      onMouseLeave={e => { e.currentTarget.style.border = "1px solid transparent"; }}>
                                      {val || <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: 12 }}>Cliquer pour commenter... ✏️</span>}
                                    </div>
                                  )}
                                </td>
                              );
                            }
                            if (key === "dateEcheance" && row._mergedCount > 1) {
                              return (
                                <td key={key} style={cellStyle}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span>{row[key]}</span>
                                    <span
                                      title={`${row._mergedCount} échéances groupées — cliquer pour voir le détail`}
                                      onClick={e => {
                                        e.stopPropagation();
                                        setMergedDatesModal({
                                          rowId: row.id,
                                          title: row.designation || row.article || row.id,
                                          project: row.nomProjet || "",
                                          echeances: row._mergedEcheances || [],
                                        });
                                      }}
                                      style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#3b82f6", color: "#fff", fontWeight: 700, fontSize: 10, borderRadius: 10, padding: "1px 6px", userSelect: "none" }}>
                                      +{row._mergedCount - 1}
                                    </span>
                                  </div>
                                </td>
                              );
                            }
                            const cellVal = row[key];
                            const cellText = cellVal != null ? String(cellVal) : "";
                            return (
                              <td key={key} style={cellStyle}>
                                <div title={cellText} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: colWidth - 28 }}>{cellVal}</div>
                              </td>
                            );
                          })}
                          <td style={{ padding: "10px 14px", borderBottom: colorLines ? `1px solid ${sc.dot}22` : "1px solid #f1f5f9", whiteSpace: "nowrap", position: "relative", overflow: "visible" }}>
                            <div style={{ position: "relative", width: 164 }}>
                              <button
                                title="Ouvrir les actions de la ligne"
                                onClick={() => setOpenRowActionMenu(openRowActionMenu === row.id ? null : row.id)}
                                style={{
                                  width: "100%",
                                  padding: "8px 12px",
                                  borderRadius: 10,
                                  border: "1px solid #dbe2ea",
                                  background: openRowActionMenu === row.id ? "#eff6ff" : "#fff",
                                  color: openRowActionMenu === row.id ? "#1d4ed8" : "#475569",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 8,
                                  transition: "all 0.18s ease",
                                }}>
                                <span>Actions</span>
                                <span style={{ fontSize: 10 }}>{openRowActionMenu === row.id ? "▲" : "▶"}</span>
                              </button>

                              <div
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  right: 0,
                                  width: 220,
                                  maxWidth: "calc(100vw - 48px)",
                                  background: "#ffffff",
                                  border: "1px solid #dbe2ea",
                                  borderRadius: 14,
                                  boxShadow: "0 18px 40px rgba(15,23,42,0.16)",
                                  padding: 10,
                                  zIndex: openRowActionMenu === row.id ? 40 : -1,
                                  opacity: openRowActionMenu === row.id ? 1 : 0,
                                  transform: openRowActionMenu === row.id ? "translateX(12px)" : "translateX(-10px)",
                                  pointerEvents: openRowActionMenu === row.id ? "auto" : "none",
                                  transition: "transform 0.22s ease, opacity 0.22s ease",
                                }}
                              >
                                <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4, padding: "2px 4px 8px" }}>
                                  Selectionner l'action a faire
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  {relanceEligible && (
                                    <button
                                      onClick={() => { openRelanceEmail(row); setOpenRowActionMenu(null); }}
                                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #fdba74", background: "#fff7ed", color: "#c2410c", fontWeight: 700, fontSize: 12, cursor: "pointer", textAlign: "left" }}
                                    >
                                      <span>✉️</span>
                                      <span>Relancer</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => { setHistoryModal(row.id); setHistorySearch(""); setOpenRowActionMenu(null); }}
                                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 700, fontSize: 12, cursor: "pointer", textAlign: "left" }}
                                  >
                                    <span>🕐</span>
                                    <span>Historique</span>
                                  </button>
                                  <button
                                    onClick={() => { setPplrlogModal(row.id); setPplrlogInput(""); setOpenRowActionMenu(null); }}
                                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 700, fontSize: 12, cursor: "pointer", textAlign: "left" }}
                                  >
                                    <span>📋</span>
                                    <span>PPL RLOG</span>
                                  </button>
                                  <button
                                    onClick={() => { setCommentsModal(row.id); setCommentsInput(""); setOpenRowActionMenu(null); }}
                                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 700, fontSize: 12, cursor: "pointer", textAlign: "left" }}
                                  >
                                    <span>💬</span>
                                    <span>Commentaires</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      openWorkflowComposer({
                                        title: row.statut === "Retard" ? `Créer une action pour ce retard` : `Action sur ${row.article || row.id}`,
                                        description: `Suivi opérationnel lié à la ligne ${row.id}${row.article ? ` · Article ${row.article}` : ""}${row.nomFournisseur ? ` · Fournisseur ${row.nomFournisseur}` : ""}.`,
                                        project: getProjectFamily(row.nomProjet),
                                        deadline: row.dateEcheance || "",
                                        sourceLabel: `Ligne ${row.id}${row.article ? ` · ${row.article}` : ""}`,
                                        sourceSummary: `${row.nomProjet || "Projet non défini"} · ${row.nomFournisseur || "Fournisseur non défini"} · Statut ${row.statut || "N/A"}`,
                                      });
                                      setOpenRowActionMenu(null);
                                    }}
                                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", fontWeight: 700, fontSize: 12, cursor: "pointer", textAlign: "left" }}
                                  >
                                    <span>🗂️</span>
                                    <span>Creer une tache</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {paged.length === 0 && (
                      <tr><td colSpan={visibleCols.length + 2} style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>Aucun résultat</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Avancée — Table principale */}
              <div style={{ background: "#fff", borderTop: "1px solid #f1f5f9", padding: "12px 18px", display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, borderRadius: "0 0 12px 12px" }}>
                {/* Partie gauche */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748b" }}>
                  Afficher 
                  <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", fontSize: 13, outline: "none", cursor: "pointer", color: "#1a2744", fontWeight: 500 }}>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  lignes par page
                </div>

                {/* Partie centre */}
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  Affichage de {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} à {Math.min(currentPage * pageSize, filtered.length)} sur {filtered.length} résultats
                </div>

                {/* Partie droite */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                    style={{ padding: "6px 10px", borderRadius: 6, background: "transparent", border: "none", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.3 : 1, fontSize: 12, color: "#475569" }}>◀◀</button>
                  <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                    style={{ padding: "6px 10px", borderRadius: 6, background: "transparent", border: "none", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.3 : 1, fontSize: 12, color: "#475569" }}>◀</button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1 || (currentPage <= 3 && p <= 5) || (currentPage >= totalPages - 2 && p >= totalPages - 4))
                    .map((p, index, array) => (
                      <div key={p} style={{ display: "flex", alignItems: "center" }}>
                        {index > 0 && p - array[index - 1] > 1 && <span style={{ padding: "0 4px", color: "#94a3b8" }}>...</span>}
                        <button onClick={() => setCurrentPage(p)}
                          style={{ padding: "6px 12px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: currentPage === p ? 700 : 500, background: currentPage === p ? "#1a2744" : "transparent", color: currentPage === p ? "#fff" : "#475569", cursor: "pointer" }}>{p}</button>
                      </div>
                  ))}

                  <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages || totalPages === 0}
                    style={{ padding: "6px 10px", borderRadius: 6, background: "transparent", border: "none", cursor: currentPage === totalPages || totalPages === 0 ? "not-allowed" : "pointer", opacity: currentPage === totalPages || totalPages === 0 ? 0.3 : 1, fontSize: 12, color: "#475569" }}>▶</button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0}
                    style={{ padding: "6px 10px", borderRadius: 6, background: "transparent", border: "none", cursor: currentPage === totalPages || totalPages === 0 ? "not-allowed" : "pointer", opacity: currentPage === totalPages || totalPages === 0 ? 0.3 : 1, fontSize: 12, color: "#475569" }}>▶▶</button>
                </div>
              </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Supplier Sidebar */}
      <SupplierSidebar
        suppliers={uniqueSuppliers}
        open={showSupplierSidebar}
        onClose={() => setShowSupplierSidebar(false)}
        onSelect={(f) => { setSelectedFournisseur(f); navigateWithHistory("table", ""); setCurrentPage(1); setShowSupplierSidebar(false); }}
      />

      {/* Fiche Fournisseur Modal */}
      {ficheFournisseur && (
        <FicheFournisseur fournisseur={ficheFournisseur} data={scopedTableData}
          onClose={() => setFicheFournisseur(null)}
          onFilter={f => { setSelectedFournisseur(f); navigateWithHistory("table", ""); setCurrentPage(1); }} />
      )}

      {/* ── Modal: Historique de la ligne ──────────────── */}
      {historyModal && (() => {
        const entries = (rowHistory[historyModal] || []).filter(e => {
          if (!historySearch.trim()) return true;
          const q = historySearch.toLowerCase();
          return [e.when, e.who, e.field, e.from, e.to].some(v => String(v || "").toLowerCase().includes(q));
        });
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setHistoryModal(null)}>
            <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 16px 48px rgba(0,0,0,0.18)", width: 720, maxWidth: "95vw", maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
              onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2744" }}>🕐 Historique de la ligne</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>ID : {historyModal}</div>
                </div>
                <button onClick={() => setHistoryModal(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8", padding: 4 }}>✕</button>
              </div>
              {/* Search */}
              <div style={{ padding: "12px 24px", borderBottom: "1px solid #f1f5f9" }}>
                <input
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="Rechercher dans l'historique..."
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.currentTarget.style.borderColor = "#3b82f6"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"} />
              </div>
              {/* Table */}
              <div style={{ overflowY: "auto", flex: 1 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                      {["Quand", "Qui", "Champ", "De", "À"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontStyle: "italic" }}>
                        {(rowHistory[historyModal] || []).length === 0 ? "Aucune modification enregistrée pour cette ligne." : "Aucun résultat pour cette recherche."}
                      </td></tr>
                    ) : entries.map((e, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                        <td style={{ padding: "9px 16px", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>{e.when}</td>
                        <td style={{ padding: "9px 16px", borderBottom: "1px solid #f1f5f9", fontWeight: 500 }}>{e.who}</td>
                        <td style={{ padding: "9px 16px", borderBottom: "1px solid #f1f5f9", color: "#3b82f6", fontWeight: 500 }}>{e.field}</td>
                        <td style={{ padding: "9px 16px", borderBottom: "1px solid #f1f5f9", color: "#dc2626", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.from || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>—</span>}</td>
                        <td style={{ padding: "9px 16px", borderBottom: "1px solid #f1f5f9", color: "#16a34a", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.to || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: "10px 24px", borderTop: "1px solid #f1f5f9", fontSize: 12, color: "#94a3b8" }}>
                {entries.length} entrée{entries.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal: PPL RLOG Commentaires ───────────────── */}
      {pplrlogModal && (() => {
        const entries = pplrlogComments[pplrlogModal] || [];
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setPplrlogModal(null)}>
            <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 16px 48px rgba(0,0,0,0.18)", width: 600, maxWidth: "95vw", maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
              onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2744" }}>📋 PPL RLOG Commentaires</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>ID : {pplrlogModal}</div>
                </div>
                <button onClick={() => setPplrlogModal(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8", padding: 4 }}>✕</button>
              </div>
              {/* Input */}
              <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a2744", marginBottom: 8 }}>Ajouter un commentaire :</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    value={pplrlogInput}
                    onChange={e => setPplrlogInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && pplrlogInput.trim()) {
                        setPplrlogComments(prev => ({ ...prev, [pplrlogModal]: [...(prev[pplrlogModal] || []), { user: currentUser || "Utilisateur", comment: pplrlogInput.trim() }] }));
                        setPplrlogInput("");
                      }
                    }}
                    placeholder="Saisir un commentaire PPL RLOG..."
                    style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none" }}
                    onFocus={e => e.currentTarget.style.borderColor = "#3b82f6"}
                    onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"} />
                  <button
                    onClick={() => {
                      if (!pplrlogInput.trim()) return;
                      setPplrlogComments(prev => ({ ...prev, [pplrlogModal]: [...(prev[pplrlogModal] || []), { user: currentUser || "Utilisateur", comment: pplrlogInput.trim() }] }));
                      setPplrlogInput("");
                    }}
                    style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#1a2744", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                    Ajouter
                  </button>
                </div>
              </div>
              {/* Table */}
              <div style={{ overflowY: "auto", flex: 1 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                      {["Utilisateur", "PPL RLOG Commentaire"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.length === 0 ? (
                      <tr><td colSpan={2} style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontStyle: "italic" }}>Aucun commentaire PPL RLOG pour cette ligne.</td></tr>
                    ) : entries.map((e, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                        <td style={{ padding: "9px 16px", borderBottom: "1px solid #f1f5f9", fontWeight: 600, color: "#1a2744", whiteSpace: "nowrap", width: 160 }}>{e.user}</td>
                        <td style={{ padding: "9px 16px", borderBottom: "1px solid #f1f5f9", color: "#374151" }}>{e.comment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: "10px 24px", borderTop: "1px solid #f1f5f9", fontSize: 12, color: "#94a3b8" }}>
                {entries.length} commentaire{entries.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal: Commentaires généraux ───────────────── */}
      {commentsModal && (() => {
        const entries = generalComments[commentsModal] || [];
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setCommentsModal(null)}>
            <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 16px 48px rgba(0,0,0,0.18)", width: 600, maxWidth: "95vw", maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
              onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2744" }}>💬 Commentaires</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>ID : {commentsModal}</div>
                </div>
                <button onClick={() => setCommentsModal(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8", padding: 4 }}>✕</button>
              </div>
              {/* Input */}
              <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a2744", marginBottom: 8 }}>Ajouter un commentaire :</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    value={commentsInput}
                    onChange={e => setCommentsInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && commentsInput.trim()) {
                        setGeneralComments(prev => ({ ...prev, [commentsModal]: [...(prev[commentsModal] || []), { user: currentUser || "Utilisateur", comment: commentsInput.trim() }] }));
                        setCommentsInput("");
                      }
                    }}
                    placeholder="Saisir un commentaire..."
                    style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none" }}
                    onFocus={e => e.currentTarget.style.borderColor = "#3b82f6"}
                    onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"} />
                  <button
                    onClick={() => {
                      if (!commentsInput.trim()) return;
                      setGeneralComments(prev => ({ ...prev, [commentsModal]: [...(prev[commentsModal] || []), { user: currentUser || "Utilisateur", comment: commentsInput.trim() }] }));
                      setCommentsInput("");
                    }}
                    style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#1a2744", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                    Ajouter
                  </button>
                </div>
              </div>
              {/* Table */}
              <div style={{ overflowY: "auto", flex: 1 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                      {["Utilisateur", "Commentaire"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.length === 0 ? (
                      <tr><td colSpan={2} style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontStyle: "italic" }}>Aucun commentaire pour cette ligne.</td></tr>
                    ) : entries.map((e, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                        <td style={{ padding: "9px 16px", borderBottom: "1px solid #f1f5f9", fontWeight: 600, color: "#1a2744", whiteSpace: "nowrap", width: 160 }}>{e.user}</td>
                        <td style={{ padding: "9px 16px", borderBottom: "1px solid #f1f5f9", color: "#374151" }}>{e.comment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: "10px 24px", borderTop: "1px solid #f1f5f9", fontSize: 12, color: "#94a3b8" }}>
                {entries.length} commentaire{entries.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        );
      })()}

      {mergedDatesModal && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(15,23,42,0.42)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, animation: "fadeProjectA 0.18s ease" }}
          onClick={() => setMergedDatesModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 460, maxWidth: "95vw", background: "#fff", borderRadius: 18, border: "1px solid #dbeafe", boxShadow: "0 24px 60px rgba(15,23,42,0.22)", overflow: "hidden", animation: "slideIn 0.22s ease" }}
          >
            <div style={{ padding: "18px 20px", background: "linear-gradient(135deg,#eff6ff 0%,#f8fbff 100%)", borderBottom: "1px solid #dbeafe", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#1e3a8a", marginBottom: 4 }}>Detail des echeances</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{mergedDatesModal.title}</div>
                {mergedDatesModal.project && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{mergedDatesModal.project}</div>}
              </div>
              <button onClick={() => setMergedDatesModal(null)} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid #bfdbfe", background: "#fff", color: "#1e40af", cursor: "pointer", fontSize: 18 }}>×</button>
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(mergedDatesModal.echeances || []).map((item, idx) => (
                  <div key={`${mergedDatesModal.rowId}-${idx}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: idx % 2 === 0 ? "#f8fafc" : "#eff6ff", border: "1px solid #dbeafe" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Date d'echeance</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{item.dateEcheance || "—"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Quantite</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#1d4ed8" }}>{item.quantiteEcheancee} u.</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





