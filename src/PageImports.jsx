import { useState, useCallback } from "react";
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

const mapRow = (row, mapping, index) => {
  const mapped = {};
  FIELD_MAP.forEach(f => {
    const excelCol = mapping[f.key];
    mapped[f.key] = excelCol ? (row[excelCol] ?? "") : "";
  });
  // Defaults & normalization
  if (!mapped.id) mapped.id = `IMP-${String(index + 1).padStart(3, "0")}`;
  if (!mapped.statut) mapped.statut = "En cours";
  mapped.quantiteEcheancee = parseInt(mapped.quantiteEcheancee) || 0;
  mapped.quantiteLivree    = parseInt(mapped.quantiteLivree)    || 0;
  mapped.typeImport = "Excel";
  // Fill non-mapped structural fields
  ["psaId","documentAchat","serie","ru","affaire","reference","article10",
   "dateTransfertPegase","dateEnvoiCommande","motCle","indicateur",
   "fauxManquant","livraisonPointDur","confirmeDate"].forEach(k => {
    if (mapped[k] === undefined) mapped[k] = "";
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
export default function PageImports({ onImport, onNavigateToTable }) {
  const [step, setStep] = useState(0);
  const [fileInfo, setFileInfo] = useState(null);
  // { fileName, fileSize, sheetName, excelHeaders, rows, mapping, mappedRows }
  const [isDragging, setIsDragging] = useState(false);
  const [importHistory, setImportHistory] = useState([]);
  const [error, setError] = useState("");
  const [previewPage, setPreviewPage] = useState(0);

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
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        if (rows.length === 0) { setError("Le fichier ne contient aucune donnée."); return; }
        const excelHeaders = Object.keys(rows[0]);
        const mapping = buildMapping(excelHeaders);
        const mappedRows = rows.map((row, i) => mapRow(row, mapping, i));
        setFileInfo({
          fileName: file.name,
          fileSize: (file.size / 1024).toFixed(1),
          sheetName,
          excelHeaders,
          rows,
          mapping,
          mappedRows,
        });
        setPreviewPage(0);
        setStep(1);
      } catch (err) {
        setError("Erreur lors de la lecture : " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files[0]);
  }, [processFile]);

  const confirmerImport = () => {
    if (!fileInfo) return;
    onImport(fileInfo.mappedRows);
    setImportHistory(prev => [{
      id: Date.now(),
      fileName:   fileInfo.fileName,
      fileSize:   fileInfo.fileSize,
      lignes:     fileInfo.rows.length,
      colonnes:   Object.keys(fileInfo.mapping).length,
      heure:      new Date().toLocaleTimeString("fr-FR"),
      date:       new Date().toLocaleDateString("fr-FR"),
      score:      Math.round((Object.keys(fileInfo.mapping).length / FIELD_MAP.length) * 100),
    }, ...prev]);
    setFileInfo(null);
    setStep(0);
  };

  const annuler = () => { setFileInfo(null); setStep(0); setError(""); };

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
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 20px", display: "flex", alignItems: "center", gap: 20 }}>
            <span style={{ fontSize: 28 }}>📊</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a2744" }}>{fileInfo.fileName}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {fileInfo.rows.length.toLocaleString("fr-FR")} lignes · {fileInfo.excelHeaders.length} colonnes détectées · {fileInfo.fileSize} Ko · Feuille : {fileInfo.sheetName}
              </div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button onClick={annuler}
                style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Changer de fichier
              </button>
              <button onClick={() => setStep(2)}
                style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: "#1a2744", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Aperçu des données →
              </button>
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
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 20px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a2744" }}>{fileInfo.fileName}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {fileInfo.rows.length.toLocaleString("fr-FR")} enregistrements · {matchedCount} champs mappés · Score {score}%
              </div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                Confirmer l'import ({fileInfo.rows.length} lignes)
              </button>
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
                    return (
                      <tr key={realIdx} style={{ borderBottom: "1px solid #f1f5f9", background: realIdx % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "8px 12px", textAlign: "center", color: "#cbd5e1", fontWeight: 600, fontSize: 11 }}>{realIdx + 1}</td>
                        {PREVIEW_COLS.map(c => (
                          <td key={c.key} style={{ padding: "8px 12px", color: c.key === "statut" ? (STATUT_COLORS[row[c.key]] || "#64748b") : "#334155", fontWeight: c.key === "statut" ? 600 : 400, whiteSpace: "nowrap", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {c.key === "statut" && row[c.key] ? (
                              <span style={{ background: (STATUT_COLORS[row[c.key]] || "#94a3b8") + "18", color: STATUT_COLORS[row[c.key]] || "#64748b", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                                {String(row[c.key])}
                              </span>
                            ) : (
                              String(row[c.key] ?? "—")
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Import history ─── */}
      {importHistory.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", marginTop: 28, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a2744" }}>Historique de session</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{importHistory.length} import{importHistory.length > 1 ? "s" : ""}</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Fichier","Lignes","Champs","Score","Date","Heure","Statut"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {importHistory.map((item, idx) => (
                  <tr key={item.id} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 14px", color: "#1a2744", fontWeight: 600 }}>{item.fileName}</td>
                    <td style={{ padding: "10px 14px", color: "#64748b" }}>{item.lignes.toLocaleString("fr-FR")}</td>
                    <td style={{ padding: "10px 14px", color: "#64748b" }}>{item.colonnes}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontWeight: 700, color: item.score >= 80 ? "#16a34a" : item.score >= 50 ? "#d97706" : "#dc2626" }}>{item.score}%</span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#64748b" }}>{item.date}</td>
                    <td style={{ padding: "10px 14px", color: "#64748b" }}>{item.heure}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f0fdf4", color: "#16a34a", fontWeight: 700, fontSize: 11, padding: "3px 10px", borderRadius: 20 }}>
                        ✓ Importé
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty history */}
      {importHistory.length === 0 && step === 0 && (
        <div style={{ marginTop: 28, background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>📋</div>
          <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>Aucun import effectué dans cette session</div>
        </div>
      )}
    </div>
  );
}
