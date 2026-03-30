import { useState, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";

/* ─── Field mapping configuration ──────────────────────────────────── */
const FIELD_MAP = [
  { key: "id",                    label: "Identifiant",           aliases: ["ID","Référence","Reference","REF"] },
  { key: "nomProjet",             label: "Projet",                aliases: ["Projet","Project","NOM PROJET","Nom Projet"] },
  { key: "sousProjet",            label: "Sous-projet",           aliases: ["Sous-projet","Sous Projet","SousProjet","SOUS PROJET"] },
  { key: "article",               label: "Article",               aliases: ["Article","Référence Article","ARTICLE","Ref Article"] },
  { key: "designation",           label: "Désignation",           aliases: ["Désignation","Designation","DESIGNATION","Libellé"] },
  { key: "nomFournisseur",        label: "Fournisseur",           aliases: ["Fournisseur","NOM FOURNISSEUR","Nom Fournisseur","Supplier"] },
  { key: "codeFournisseur",       label: "Code fournisseur",      aliases: ["Code Fournisseur","CODE FOURN","Code Fourn","FOURNISSEUR CODE"] },
  { key: "utilisateurPSA",        label: "Utilisateur PSA",       aliases: ["Utilisateur PSA","Utilisateur","USER","UTILISATEUR"] },
  { key: "magasin",               label: "Magasin",               aliases: ["Magasin","MAGASIN","Warehouse","Entrepôt"] },
  { key: "site",                  label: "Site",                  aliases: ["Site","SITE","Usine","Plant"] },
  { key: "statut",                label: "Statut",                aliases: ["Statut","STATUT","Status","État"] },
  { key: "quantiteEcheancee",     label: "Quantité échéancée",    aliases: ["Quantité","Quantite","QTE","Qte","QUANTITE","Qté échéancée","Qty"] },
  { key: "quantiteLivree",        label: "Quantité livrée",       aliases: ["Quantité livrée","Qte livrée","QTE LIV","Qty Delivered"] },
  { key: "dateEcheance",          label: "Date échéance",         aliases: ["Date Echéance","Date Echeance","DATE ECH","Date Ech","Echéance","Due Date"] },
  { key: "dateLivraisonConfirmee",label: "Date livraison",        aliases: ["Date Livraison","Date Confirmée","DATE LIV","Conf. Date","Delivery Date"] },
  { key: "dateEnvoiCommande",     label: "Date envoi commande",   aliases: ["Date Envoi","Date Commande","DATE CMD","Order Date"] },
  { key: "dernierCommentaire",    label: "Commentaire",           aliases: ["Commentaire","COMMENTAIRE","Comment","Remarque"] },
  { key: "dernierPPLRLOG",        label: "PPL/RLOG",              aliases: ["PPL/RLOG","PPL","RLOG","PPL RLOG"] },
  { key: "domaine",               label: "Domaine",               aliases: ["Domaine","DOMAINE","Domain","Famille"] },
  { key: "serie",                 label: "Série",                 aliases: ["Série","Serie","SERIE","Series"] },
  { key: "psaId",                 label: "PSA ID",                aliases: ["PSA ID","PSA","PSAID","Id PSA"] },
  { key: "ru",                    label: "RU",                    aliases: ["RU","Ru","Unite Ressource"] },
  { key: "affaire",               label: "Affaire",               aliases: ["Affaire","AFFAIRE","N° Affaire"] },
];

/* ─── Guaranteed fields (added if absent from Excel) ───────────────── */
const GUARANTEED_FIELDS = ["quantiteLivree","dateLivraisonConfirmee","dateEnvoiCommande","psaId","ru","affaire"];

/* ─── Validation ───────────────────────────────────────────────────── */
const VALID_STATUTS = ["Manquants Plus","Point dur","À venir","Retard","Manquant","Confirmé","Faux manquant","Reçu","En cours"];
const DATE_RE = /^(\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?|\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?)?)$/;

function validateRow(row) {
  const issues = [];
  if (!row.id)            issues.push({ field: "id",     type: "missing" });
  if (!row.article)       issues.push({ field: "article",type: "missing" });
  if (row.statut && !VALID_STATUTS.includes(row.statut))
    issues.push({ field: "statut", type: "invalid", value: row.statut });
  ["dateEcheance","dateLivraisonConfirmee","dateEnvoiCommande"].forEach(f => {
    if (row[f] && !DATE_RE.test(String(row[f]).trim()))
      issues.push({ field: f, type: "date_format" });
  });
  if (row.quantiteEcheancee && isNaN(Number(row.quantiteEcheancee)))
    issues.push({ field: "quantiteEcheancee", type: "not_number" });
  return issues;
}

/* ─── Anti-duplicate detection ─────────────────────────────────────── */
function detectDuplicates(mappedRows, currentData) {
  const currentIds = new Set((currentData || []).map(d => String(d.id)));
  const dupes  = mappedRows.filter(r => currentIds.has(String(r.id)));
  const fresh  = mappedRows.filter(r => !currentIds.has(String(r.id)));
  return { dupes, fresh, dupeIds: new Set(dupes.map(r => String(r.id))) };
}

/* ─── Mapping function ─────────────────────────────────────────────── */
const buildMapping = (excelHeaders) => {
  const result = {};
  excelHeaders.forEach(h => {
    const normalized = h.trim().toLowerCase();
    const field = FIELD_MAP.find(f =>
      f.aliases.some(a => a.toLowerCase() === normalized)
    );
    if (field && !result[field.key]) {
      result[field.key] = h;
    }
  });
  return result;
};

/* ─── Date normalization (handles Excel serials, JS Dates, strings) ── */
const normalizeDate = (val) => {
  if (val === null || val === undefined || val === "") return "";
  // JavaScript Date object (returned by XLSX when cellDates: true)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return "";
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  // Excel serial number (integer, days since 1899-12-30)
  if (typeof val === "number") {
    if (val < 1) return "";
    const date = new Date(Math.round((val - 25569) * 86400000));
    if (isNaN(date.getTime())) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  // String — already in YYYY-MM-DD or DD/MM/YYYY
  const s = String(val).trim();
  if (!s) return "";
  // DD/MM/YYYY → YYYY-MM-DD
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2].padStart(2,"0")}-${dmyMatch[1].padStart(2,"0")}`;
  // DD-MM-YYYY → YYYY-MM-DD
  const dmyDash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyDash) return `${dmyDash[3]}-${dmyDash[2].padStart(2,"0")}-${dmyDash[1].padStart(2,"0")}`;
  // Already YYYY-MM-DD (or ISO) — return as-is up to 10 chars
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  return s;
};

const DATE_FIELDS = ["dateEcheance","dateLivraisonConfirmee","dateEnvoiCommande","dateTransfertPegase","confirmeDate"];

const mapRow = (row, mapping, index) => {
  const mapped = {};
  FIELD_MAP.forEach(f => {
    const excelCol = mapping[f.key];
    mapped[f.key] = excelCol ? (row[excelCol] ?? "") : "";
  });
  // Normalize date fields
  DATE_FIELDS.forEach(f => { mapped[f] = normalizeDate(mapped[f]); });
  // Defaults & normalization
  if (!mapped.id) mapped.id = `IMP-${String(index + 1).padStart(3, "0")}`;
  if (!mapped.statut) mapped.statut = "En cours";
  mapped.quantiteEcheancee = parseInt(mapped.quantiteEcheancee) || 0;
  mapped.quantiteLivree    = parseInt(mapped.quantiteLivree)    || 0;
  mapped.typeImport = "Excel";
  // Guarantee all required fields (add as empty if missing)
  ["psaId","documentAchat","serie","ru","affaire","reference","article10",
   "dateTransfertPegase","dateEnvoiCommande","motCle","indicateur",
   "fauxManquant","livraisonPointDur","confirmeDate",
   ...GUARANTEED_FIELDS].forEach(k => {
    if (mapped[k] === undefined || mapped[k] === null) mapped[k] = "";
  });
  return mapped;
};

/* ─── Step indicator ───────────────────────────────────────────────── */
function StepBar({ step }) {
  const steps = ["Sélection fichier", "Validation colonnes", "Confirmation import"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
      {steps.map((s, i) => {
        const active = i === step;
        const done   = i < step;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? "1" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? "#16a34a" : active ? "#1a2744" : "#e2e8f0",
                color: done || active ? "#fff" : "#94a3b8",
                fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "#1a2744" : done ? "#16a34a" : "#94a3b8", whiteSpace: "nowrap" }}>
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? "#16a34a" : "#e2e8f0", margin: "0 12px", minWidth: 20 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Mapping table ────────────────────────────────────────────────── */
function MappingTable({ mapping, excelHeaders }) {
  const matched   = FIELD_MAP.filter(f => mapping[f.key]);
  const unmatched = FIELD_MAP.filter(f => !mapping[f.key]);
  const extraCols = excelHeaders.filter(h => !Object.values(mapping).includes(h));
  const score     = Math.round((matched.length / FIELD_MAP.length) * 100);

  let scoreBg = "#fef2f2", scoreColor = "#dc2626";
  if (score >= 80) { scoreBg = "#f0fdf4"; scoreColor = "#16a34a"; }
  else if (score >= 50) { scoreBg = "#fffbeb"; scoreColor = "#d97706"; }

  return (
    <div>
      {/* Score bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div style={{ background: scoreBg, borderRadius: 10, padding: "8px 16px", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: scoreColor }}>{score}%</span>
          <span style={{ fontSize: 13, color: scoreColor, fontWeight: 600 }}>Qualité du mapping</span>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
          <span style={{ color: "#16a34a", fontWeight: 600 }}>✓ {matched.length} colonnes reconnues</span>
          <span style={{ color: "#94a3b8" }}>· {unmatched.length} non détectées</span>
          {extraCols.length > 0 && <span style={{ color: "#64748b" }}>· {extraCols.length} colonnes Excel ignorées</span>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Matched */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Colonnes détectées
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
            {matched.map(f => (
              <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#f0fdf4", borderRadius: 7, border: "1px solid #bbf7d0" }}>
                <span style={{ color: "#16a34a", fontSize: 14 }}>✓</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1a2744", minWidth: 130 }}>{f.label}</span>
                <span style={{ fontSize: 11, color: "#64748b" }}>← {mapping[f.key]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Unmatched */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Champs non trouvés
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
            {unmatched.map(f => (
              <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#f8fafc", borderRadius: 7, border: "1px solid #e2e8f0" }}>
                <span style={{ color: "#cbd5e1", fontSize: 14 }}>–</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Data preview ─────────────────────────────────────────────────── */
const PREVIEW_COLS = [
  { key: "id",             label: "ID" },
  { key: "nomProjet",      label: "Projet" },
  { key: "nomFournisseur", label: "Fournisseur" },
  { key: "article",        label: "Article" },
  { key: "designation",    label: "Désignation" },
  { key: "statut",         label: "Statut" },
  { key: "quantiteEcheancee", label: "Qté" },
  { key: "dateEcheance",   label: "Échéance" },
];

const STATUT_COLORS = {
  "Manquants Plus": "#c0392b",
  "Point dur":      "#7d3c98",
  "Retard":         "#e67e22",
  "Manquant":       "#e84393",
  "Confirmé":       "#2e86c1",
  "En cours":       "#1e8449",
  "Reçu":           "#27ae60",
  "À venir":        "#a0522d",
  "Faux manquant":  "#7f8c8d",
};

/* ─── Main component ───────────────────────────────────────────────── */
/* ─── Auto-journal generation ─────────────────────────────────────── */
function generateJournal(fileInfo, currentData, importMode) {
  const newIds = new Set(fileInfo.mappedRows.map(r => String(r.id)));
  const oldIds = new Set((currentData || []).map(d => String(d.id)));

  const added    = fileInfo.dupeInfo.fresh.length;
  const modified = importMode !== "skip_dupes" ? fileInfo.dupeInfo.dupes.length : 0;
  const deleted  = [...oldIds].filter(id => !newIds.has(id)).length;

  // Detect newly mapped columns vs what currentData has
  const currentFields = currentData && currentData.length > 0
    ? new Set(Object.keys(currentData[0]).filter(k => {
        const v = currentData[0][k];
        return v !== "" && v !== null && v !== undefined;
      }))
    : new Set();
  const newCols = Object.keys(fileInfo.mapping).filter(k => !currentFields.has(k));

  const parts = [];
  if (added    > 0) parts.push(`${added} ligne${added > 1 ? "s" : ""} ajoutée${added > 1 ? "s" : ""}`);
  if (modified > 0) parts.push(`${modified} modifiée${modified > 1 ? "s" : ""}`);
  if (deleted  > 0) parts.push(`${deleted} supprimée${deleted > 1 ? "s" : ""}`);
  if (newCols.length > 0) parts.push(`col. ajoutées : ${newCols.slice(0, 3).join(", ")}${newCols.length > 3 ? "…" : ""}`);
  if (parts.length === 0) parts.push("Aucun changement détecté");
  return parts.join(" · ");
}

export default function PageImports({ onImport, currentData, currentUser }) {
  const [step, setStep] = useState(0);
  const [fileInfo, setFileInfo] = useState(null);
  // { fileName, fileSize, sheetName, excelHeaders, rows, mapping, mappedRows, validation, dupeInfo }
  const [isDragging, setIsDragging] = useState(false);
  const [importHistory, setImportHistory] = useState([]);
  const [error, setError] = useState("");
  const [previewPage, setPreviewPage] = useState(0);
  const [importMode, setImportMode] = useState("all"); // "all" | "skip_dupes" | "update_dupes"

  // Charger l'historique depuis localStorage au mount
  useEffect(() => {
    const saved = localStorage.getItem("importHistory");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setImportHistory(parsed);
      } catch (e) {
        console.warn("Erreur lors du chargement de l'historique:", e);
      }
    }
  }, []);

  const PREVIEW_PER_PAGE = 8;

  const processFile = useCallback((file) => {
    if (!file) return;
    setError("");
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      setError("Format non supporté. Utilisez .xlsx, .xls ou .csv");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        if (rows.length === 0) { setError("Le fichier ne contient aucune donnée."); return; }
        const excelHeaders = Object.keys(rows[0]);
        const mapping = buildMapping(excelHeaders);
        const mappedRows = rows.map((row, i) => mapRow(row, mapping, i));
        // Validation
        const validationMap = {};
        let errorCount = 0, warnCount = 0;
        mappedRows.forEach(row => {
          const issues = validateRow(row);
          if (issues.length > 0) {
            validationMap[row.id] = issues;
            issues.forEach(i => { if (i.type === "missing") errorCount++; else warnCount++; });
          }
        });

        // Anti-duplicate detection
        const dupeInfo = detectDuplicates(mappedRows, currentData);
        setFileInfo({
          fileName: file.name,
          fileSize: (file.size / 1024).toFixed(1),
          sheetName,
          excelHeaders,
          rows,
          mapping,
          mappedRows,
          validation: { map: validationMap, errorCount, warnCount },
          dupeInfo,
        });
        setPreviewPage(0);
        setStep(1);
      } catch (err) {
        setError("Erreur lors de la lecture : " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files[0]);
  }, [processFile]);

  const confirmerImport = () => {
    if (!fileInfo) {
      return;
    }
    setError("");

    let finalRows = fileInfo.mappedRows;
    if (importMode === "skip_dupes") finalRows = fileInfo.dupeInfo.fresh;
    // "all" and "update_dupes" keep all rows
    let statut = "Succès";
    try {
      onImport(finalRows);
    } catch (error) {
      statut = "Échec";
    }
    const now = new Date();
    const pad = n => String(n).padStart(2, "0");
    const datetime = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const ext = fileInfo.fileName.split(".").pop().toUpperCase();
    const journal = generateJournal(fileInfo, currentData, importMode);

    const newEntry = {
      id:         Date.now(),
      fileName:   fileInfo.fileName,
      fileType:   ext,
      lignes:     finalRows.length,
      colonnes:   Object.keys(fileInfo.mapping).length,
      datetime,
      uploadPar:  currentUser || "—",
      statut,
      journal,
      score:      Math.round((Object.keys(fileInfo.mapping).length / FIELD_MAP.length) * 100),
      dupes:      fileInfo.dupeInfo.dupes.length,
      errors:     fileInfo.validation.errorCount,
      mode:       importMode,
    };

    setImportHistory(prev => {
      const updated = [newEntry, ...prev];
      localStorage.setItem("importHistory", JSON.stringify(updated));
      return updated;
    });
    setFileInfo(null);
    setStep(0);
  };

  const annuler = () => { setFileInfo(null); setStep(0); setError(""); };

  const clearImportHistory = () => {
    if (!window.confirm("Voulez-vous vraiment effacer tout l'historique des imports ?")) return;
    setImportHistory([]);
    localStorage.removeItem("importHistory");
  };

  const matchedCount = fileInfo ? Object.keys(fileInfo.mapping).length : 0;
  const score        = fileInfo ? Math.round((matchedCount / FIELD_MAP.length) * 100) : 0;
  const totalPreviewPages = fileInfo ? Math.ceil(fileInfo.mappedRows.length / PREVIEW_PER_PAGE) : 0;

  /* ─ render ─ */
  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1, background: "#f8fafc", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          OPERIX · Gestion des données
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a2744", margin: 0 }}>Import de fichiers</h2>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
          Importez vos fichiers Excel ou CSV pour mettre à jour les données du tableau de bord.
        </div>
      </div>

      <StepBar step={step} />

      {/* Error banner */}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, color: "#dc2626", fontSize: 13, fontWeight: 600 }}>
          <span style={{ fontSize: 18 }}>⚠</span> {error}
          <button onClick={() => setError("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ─── STEP 0 : Upload ─── */}
      {step === 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "start" }}>
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a2744" }}>Zone d'upload</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Glissez un fichier ou cliquez pour parcourir</div>
            </div>
            <div style={{ padding: 20 }}>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-input-pro").click()}
                style={{
                  border: `2px dashed ${isDragging ? "#3b82f6" : "#334155"}`,
                  borderRadius: 12,
                  padding: "52px 24px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: isDragging ? "rgba(59,130,246,0.06)" : "#1e293b",
                  transition: "all 0.18s",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.8 }}>
                  {isDragging ? "📂" : "📁"}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>
                  {isDragging ? "Relâchez pour charger" : "Déposez votre fichier ici"}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>
                  ou cliquez pour parcourir
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  {[".xlsx", ".xls", ".csv"].map(ext => (
                    <span key={ext} style={{ background: "#334155", color: "#94a3b8", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6 }}>{ext}</span>
                  ))}
                </div>
              </div>
              <input id="file-input-pro" type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
                onChange={(e) => processFile(e.target.files[0])} />
            </div>
          </div>

          {/* Info panel */}
          <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2744", marginBottom: 10 }}>Champs reconnus</div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>{FIELD_MAP.length} champs OPERIX supportés</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Nommage SAP, français et anglais</div>
            </div>
            <div style={{ background: "#eff6ff", borderRadius: 12, border: "1px solid #bfdbfe", padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>Conseils</div>
              <div style={{ fontSize: 11, color: "#3b82f6", lineHeight: 1.6 }}>
                · La 1ère ligne doit contenir les en-têtes<br/>
                · Le statut sera normalisé automatiquement<br/>
                · Les dates doivent être en JJ/MM/AAAA
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 1 : Mapping validation ─── */}
      {step === 1 && fileInfo && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* File info bar */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <span style={{ fontSize: 28 }}>📊</span>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1a2744" }}>{fileInfo.fileName}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {fileInfo.rows.length.toLocaleString("fr-FR")} lignes · {fileInfo.excelHeaders.length} colonnes · {fileInfo.fileSize} Ko · Feuille : {fileInfo.sheetName}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {/* Validation indicators */}
                {fileInfo.validation.errorCount > 0 && (
                  <span style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                    ⚠ {fileInfo.validation.errorCount} erreur{fileInfo.validation.errorCount > 1 ? "s" : ""}
                  </span>
                )}
                {fileInfo.validation.warnCount > 0 && (
                  <span style={{ background: "#fffbeb", border: "1px solid #fcd34d", color: "#d97706", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                    ! {fileInfo.validation.warnCount} avertissement{fileInfo.validation.warnCount > 1 ? "s" : ""}
                  </span>
                )}
                {/* Duplicate indicator */}
                {fileInfo.dupeInfo.dupes.length > 0 && (
                  <span style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                    ⇄ {fileInfo.dupeInfo.dupes.length} doublon{fileInfo.dupeInfo.dupes.length > 1 ? "s" : ""}
                  </span>
                )}
                {fileInfo.validation.errorCount === 0 && fileInfo.validation.warnCount === 0 && fileInfo.dupeInfo.dupes.length === 0 && (
                  <span style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                    ✓ Données valides
                  </span>
                )}
                <button onClick={annuler}
                  style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  Changer
                </button>
                <button onClick={() => setStep(2)}
                  style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: "#1a2744", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  Aperçu →
                </button>
              </div>
            </div>
          </div>

          {/* Mapping table */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a2744", marginBottom: 4 }}>Validation du mapping</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>Correspondance entre les colonnes Excel et les champs OPERIX</div>
            <MappingTable mapping={fileInfo.mapping} excelHeaders={fileInfo.excelHeaders} />
          </div>
        </div>
      )}

      {/* ─── STEP 2 : Preview & confirm ─── */}
      {step === 2 && fileInfo && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Summary bar */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: fileInfo.dupeInfo.dupes.length > 0 ? 12 : 0 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1a2744" }}>{fileInfo.fileName}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {fileInfo.rows.length.toLocaleString("fr-FR")} lignes · {matchedCount} champs mappés · Score {score}%
                  {fileInfo.validation.errorCount > 0 && <span style={{ color: "#dc2626", marginLeft: 8 }}>· {fileInfo.validation.errorCount} erreur(s) de données</span>}
                </div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {/* Uploader name input */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 180 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Upload par
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", minWidth: 160 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#1a2744", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, flexShrink: 0 }}>
                      {(currentUser || "?").charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 12, color: "#475569", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {currentUser || "—"}
                    </span>
                  </div>
                </div>
                <button onClick={() => setStep(1)}
                  style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  ← Mapping
                </button>
                <button onClick={annuler}
                  style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  Annuler
                </button>
                <button onClick={confirmerImport}
                  style={{ padding: "7px 20px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  Confirmer ({importMode === "skip_dupes" ? fileInfo.dupeInfo.fresh.length : fileInfo.rows.length} lignes)
                </button>
              </div>
            </div>

            {/* Duplicate mode selector */}
            {fileInfo.dupeInfo.dupes.length > 0 && (
              <div style={{ background: "#eff6ff", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1e40af" }}>
                  ⇄ {fileInfo.dupeInfo.dupes.length} identifiant{fileInfo.dupeInfo.dupes.length > 1 ? "s" : ""} déjà présent{fileInfo.dupeInfo.dupes.length > 1 ? "s" : ""} — que faire ?
                </span>
                {[
                  { value: "all",         label: "Importer tout (écraser)" },
                  { value: "update_dupes",label: "Mettre à jour les doublons" },
                  { value: "skip_dupes",  label: `Ignorer doublons (${fileInfo.dupeInfo.fresh.length} nouvelles lignes)` },
                ].map(opt => (
                  <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "#1e40af", fontWeight: importMode === opt.value ? 700 : 400 }}>
                    <input type="radio" name="importMode" value={opt.value} checked={importMode === opt.value} onChange={() => setImportMode(opt.value)} style={{ accentColor: "#1e40af" }} />
                    {opt.label}
                  </label>
                ))}
              </div>
            )}

            {/* Guaranteed fields notice */}
            <div style={{ marginTop: fileInfo.dupeInfo.dupes.length > 0 ? 8 : 0, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Champs garantis :</span>
              {GUARANTEED_FIELDS.map(f => (
                <span key={f} style={{
                  fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                  background: fileInfo.mapping[f] ? "#f0fdf4" : "#f1f5f9",
                  color: fileInfo.mapping[f] ? "#16a34a" : "#94a3b8",
                  border: `1px solid ${fileInfo.mapping[f] ? "#bbf7d0" : "#e2e8f0"}`,
                }}>
                  {fileInfo.mapping[f] ? "✓" : "+"} {f}
                </span>
              ))}
            </div>
          </div>

          {/* Preview table */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1a2744" }}>Aperçu des données</span>
                <span style={{ marginLeft: 10, fontSize: 12, color: "#94a3b8" }}>
                  Lignes {previewPage * PREVIEW_PER_PAGE + 1}–{Math.min((previewPage + 1) * PREVIEW_PER_PAGE, fileInfo.rows.length)} / {fileInfo.rows.length}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setPreviewPage(p => Math.max(0, p - 1))} disabled={previewPage === 0}
                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: previewPage === 0 ? "#f8fafc" : "#fff", cursor: previewPage === 0 ? "default" : "pointer", color: "#64748b", fontSize: 13 }}>
                  ‹
                </button>
                <button onClick={() => setPreviewPage(p => Math.min(totalPreviewPages - 1, p + 1))} disabled={previewPage >= totalPreviewPages - 1}
                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: previewPage >= totalPreviewPages - 1 ? "#f8fafc" : "#fff", cursor: previewPage >= totalPreviewPages - 1 ? "default" : "pointer", color: "#64748b", fontSize: 13 }}>
                  ›
                </button>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "#94a3b8", borderBottom: "1px solid #e2e8f0", width: 40 }}>#</th>
                    {PREVIEW_COLS.map(c => (
                      <th key={c.key} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>
                        {c.label}
                        {!fileInfo.mapping[c.key] && (
                          <span style={{ marginLeft: 4, fontSize: 10, color: "#f59e0b" }} title="Champ non détecté">⚠</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fileInfo.mappedRows.slice(previewPage * PREVIEW_PER_PAGE, (previewPage + 1) * PREVIEW_PER_PAGE).map((row, idx) => {
                    const realIdx = previewPage * PREVIEW_PER_PAGE + idx;
                    const rowIssues = fileInfo.validation.map[row.id] || [];
                    const isDupe = fileInfo.dupeInfo.dupeIds.has(String(row.id));
                    const rowBg = rowIssues.some(i => i.type === "missing") ? "#fef2f2"
                                : isDupe ? "#eff6ff"
                                : realIdx % 2 === 0 ? "#fff" : "#fafafa";
                    return (
                      <tr key={realIdx} style={{ borderBottom: "1px solid #f1f5f9", background: rowBg }}>
                        <td style={{ padding: "8px 12px", textAlign: "center", fontSize: 11 }}>
                          {isDupe
                            ? <span style={{ color: "#1e40af", fontWeight: 700, fontSize: 10 }} title="Doublon">⇄</span>
                            : rowIssues.length > 0
                              ? <span style={{ color: "#dc2626", fontWeight: 700, fontSize: 10 }} title={rowIssues.map(i=>i.field).join(", ")}>⚠</span>
                              : <span style={{ color: "#cbd5e1" }}>{realIdx + 1}</span>
                          }
                        </td>
                        {PREVIEW_COLS.map(c => {
                          const hasIssue = rowIssues.some(i => i.field === c.key);
                          return (
                            <td key={c.key} style={{ padding: "8px 12px", color: hasIssue ? "#dc2626" : c.key === "statut" ? (STATUT_COLORS[row[c.key]] || "#64748b") : "#334155", fontWeight: c.key === "statut" ? 600 : 400, whiteSpace: "nowrap", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
                              {c.key === "statut" && row[c.key] ? (
                                <span style={{ background: (STATUT_COLORS[row[c.key]] || "#94a3b8") + "18", color: STATUT_COLORS[row[c.key]] || "#64748b", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                                  {String(row[c.key])}
                                </span>
                              ) : hasIssue ? (
                                <span style={{ textDecoration: "underline dotted" }} title="Valeur invalide">{String(row[c.key] ?? "—")}</span>
                              ) : (
                                String(row[c.key] ?? "—")
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tableau de suivi des imports ─── */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", marginTop: 28, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a2744" }}>Suivi des imports</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
              Historique complet — alimenté automatiquement à chaque import
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {importHistory.length > 0 && (
              <>
                <span style={{ background: "#f0fdf4", color: "#16a34a", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                  {importHistory.filter(i => i.statut === "Succès").length} succès
                </span>
                {importHistory.some(i => i.statut === "Échec") && (
                  <span style={{ background: "#fef2f2", color: "#dc2626", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                    {importHistory.filter(i => i.statut === "Échec").length} échec(s)
                  </span>
                )}
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{importHistory.length} entrée{importHistory.length > 1 ? "s" : ""}</span>
              </>
            )}
            <button
              onClick={clearImportHistory}
              style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 11, cursor: "pointer" }}
            >
              Effacer l'historique
            </button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                {[
                  { label: "#",                  width: 40,  center: true },
                  { label: "Type",               width: 64 },
                  { label: "Fichier importé",    width: 200 },
                  { label: "Date du chargement", width: 140 },
                  { label: "Upload par",         width: 160 },
                  { label: "Lignes",             width: 70,  center: true },
                  { label: "Statut",             width: 100, center: true },
                  { label: "Journal des imports",width: "auto" },
                ].map(h => (
                  <th key={h.label} style={{
                    padding: "10px 14px", textAlign: h.center ? "center" : "left",
                    fontWeight: 700, color: "#475569", whiteSpace: "nowrap",
                    width: h.width !== "auto" ? h.width : undefined,
                    fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {importHistory.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: "40px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.2 }}>📋</div>
                    <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>Aucun import dans cette session</div>
                    <div style={{ fontSize: 12, color: "#cbd5e1" }}>Le tableau se remplit automatiquement après chaque import</div>
                  </td>
                </tr>
              ) : (
                importHistory.map((item, idx) => {
                  const isSuccess = item.statut === "Succès";
                  return (
                    <tr key={item.id} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f1f5f9", transition: "background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f0f4ff"}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafafa"}>

                      {/* # */}
                      <td style={{ padding: "12px 14px", textAlign: "center", color: "#cbd5e1", fontWeight: 600, fontSize: 11 }}>
                        {importHistory.length - idx}
                      </td>

                      {/* Type badge */}
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{
                          display: "inline-block", fontWeight: 700, fontSize: 10,
                          padding: "3px 8px", borderRadius: 6,
                          background: item.fileType === "XLSX" ? "#eff6ff" : item.fileType === "CSV" ? "#f0fdf4" : "#fff7ed",
                          color: item.fileType === "XLSX" ? "#1e40af" : item.fileType === "CSV" ? "#15803d" : "#c2410c",
                        }}>
                          {item.fileType}
                        </span>
                      </td>

                      {/* Fichier */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 600, color: "#1a2744", fontSize: 12 }}>{item.fileName}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                          {item.lignes.toLocaleString("fr-FR")} lignes · {item.colonnes} champs · score {item.score}%
                        </div>
                      </td>

                      {/* Date */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 600, color: "#475569", fontFamily: "monospace", fontSize: 12 }}>{item.datetime}</div>
                      </td>

                      {/* Upload par */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#1a2744", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 700, flexShrink: 0 }}>
                            {(item.uploadPar || "?").charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{item.uploadPar || "—"}</span>
                        </div>
                      </td>

                      {/* Lignes */}
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <span style={{ fontWeight: 700, color: "#1a2744", fontSize: 14 }}>{item.lignes.toLocaleString("fr-FR")}</span>
                      </td>

                      {/* Statut */}
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          fontWeight: 700, fontSize: 11, padding: "4px 12px", borderRadius: 20,
                          background: isSuccess ? "#f0fdf4" : "#fef2f2",
                          color: isSuccess ? "#16a34a" : "#dc2626",
                          border: `1px solid ${isSuccess ? "#bbf7d0" : "#fca5a5"}`,
                        }}>
                          <span style={{ fontSize: 9 }}>{isSuccess ? "●" : "●"}</span>
                          {item.statut}
                        </span>
                      </td>

                      {/* Journal */}
                      <td style={{ padding: "12px 14px", maxWidth: 340 }}>
                        <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
                          {item.journal.split(" · ").map((part, i) => {
                            const isAdd  = part.includes("ajoutée");
                            const isMod  = part.includes("modifiée");
                            const isDel  = part.includes("supprimée");
                            const isCol  = part.includes("col.");
                            const color  = isAdd ? "#16a34a" : isMod ? "#d97706" : isDel ? "#dc2626" : isCol ? "#1e40af" : "#64748b";
                            const bg     = isAdd ? "#f0fdf4" : isMod ? "#fffbeb" : isDel ? "#fef2f2" : isCol ? "#eff6ff" : "#f8fafc";
                            return (
                              <span key={i} style={{ display: "inline-block", background: bg, color, fontWeight: 600, fontSize: 11, padding: "2px 8px", borderRadius: 10, marginRight: 4, marginBottom: 2 }}>
                                {part}
                              </span>
                            );
                          })}
                        </div>
                        {(item.dupes > 0 || item.errors > 0) && (
                          <div style={{ marginTop: 4, display: "flex", gap: 6 }}>
                            {item.dupes > 0 && <span style={{ fontSize: 10, color: "#1e40af", background: "#eff6ff", padding: "1px 6px", borderRadius: 8, fontWeight: 600 }}>⇄ {item.dupes} doublon{item.dupes > 1 ? "s" : ""}</span>}
                            {item.errors > 0 && <span style={{ fontSize: 10, color: "#dc2626", background: "#fef2f2", padding: "1px 6px", borderRadius: 8, fontWeight: 600 }}>⚠ {item.errors} erreur{item.errors > 1 ? "s" : ""}</span>}
                            <span style={{ fontSize: 10, color: "#94a3b8", background: "#f1f5f9", padding: "1px 6px", borderRadius: 8 }}>{(() => {
                              const modeLabels = { all: "Tout importé", skip_dupes: "Doublons ignorés", update_dupes: "Doublons mis à jour" };
                              return modeLabels[item.mode] || "";
                            })()}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
