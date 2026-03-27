import { useState } from "react";
import * as XLSX from "xlsx";

/* ─── Mapping function Excel columns to OPERIX fields ────────────────── */
const mapExcelRowToOperix = (row, index) => {
  return {
    id: row["ID"] || row["Référence"] || row["Reference"] || `IMP-${String(index + 1).padStart(3, "0")}`,
    nomProjet: row["Projet"] || row["Project"] || row["NOM PROJET"] || "",
    nomSousProjet: row["Sous-projet"] || row["Sous Projet"] || row["SousProjet"] || "",
    article: row["Article"] || row["Référence Article"] || row["ARTICLE"] || "",
    designation: row["Désignation"] || row["Designation"] || row["DESIGNATION"] || "",
    nomFournisseur: row["Fournisseur"] || row["NOM FOURNISSEUR"] || row["Nom Fournisseur"] || "",
    codeFournisseur: row["Code Fournisseur"] || row["CODE FOURN"] || "",
    utilisateurPSA: row["Utilisateur PSA"] || row["Utilisateur"] || row["USER"] || "",
    magasin: row["Magasin"] || row["MAGASIN"] || "",
    site: row["Site"] || row["SITE"] || "",
    quantiteNecessaire: parseInt(row["Quantité"] || row["Quantite"] || row["QTE"] || 0),
    dateEcheance: row["Date Echéance"] || row["Date Echeance"] || row["DATE ECH"] || "",
    dateLivraisonConfirmee: row["Date Livraison"] || row["Date Confirmée"] || "",
    statut: row["Statut"] || row["STATUT"] || "En cours",
    dernierCommentaire: row["Commentaire"] || row["COMMENTAIRE"] || "",
    dernierPPLRLOG: row["PPL/RLOG"] || row["PPL"] || "",
    // Additional fields for compatibility
    sousProjet: row["Sous-projet"] || row["Sous Projet"] || row["SousProjet"] || "",
    psaId: "",
    documentAchat: "",
    serie: "",
    domaine: "",
    ru: "",
    affaire: "",
    reference: row["Référence"] || row["Reference"] || "",
    article10: "",
    typeImport: "Excel",
    dateTransfertPegase: "",
    quantiteEcheancee: parseInt(row["Quantité"] || row["Quantite"] || row["QTE"] || 0),
    quantiteLivree: 0,
    dateEnvoiCommande: "",
    motCle: "",
    indicateur: "",
    fauxManquant: "",
    livraisonPointDur: "",
    confirmeDate: "",
  };
};

/* ─── PageImports Component ────────────────────────────────────────── */
export default function PageImports({ onImport, onNavigateToTable }) {
  const [filePreview, setFilePreview] = useState(null);
  // { fileName, lignes, rows, mappedRows }
  const [importHistory, setImportHistory] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const lireFichier = (file) => {
    if (!file) return;

    // Check extension
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      alert("Format non supporté. Utilisez .xlsx, .xls ou .csv");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (rows.length === 0) {
          alert("Le fichier ne contient pas de données");
          return;
        }

        const mappedRows = rows.map((row, i) => mapExcelRowToOperix(row, i));

        setFilePreview({
          fileName: file.name,
          lignes: rows.length,
          rows: rows,
          mappedRows: mappedRows,
        });
      } catch (error) {
        alert("Erreur lors de la lecture du fichier: " + error.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const confirmerImport = () => {
    if (!filePreview) return;

    // Update main table data
    onImport(filePreview.mappedRows);

    // Add to history
    setImportHistory((prev) => [
      {
        id: Date.now(),
        fileName: filePreview.fileName,
        lignes: filePreview.lignes,
        heure: new Date().toLocaleTimeString("fr-FR"),
        statut: "success",
      },
      ...prev,
    ]);

    // Reset preview
    setFilePreview(null);

    // Navigate to main table
    onNavigateToTable();
  };

  const annulerImport = () => {
    setFilePreview(null);
  };

  const PREVIEW_COLUMNS = [
    "id",
    "nomProjet",
    "nomFournisseur",
    "article",
    "statut",
    "quantiteNecessaire",
    "dateEcheance",
  ];

  return (
    <div
      style={{
        padding: 24,
        fontSize: "1.05em",
        overflowY: "auto",
        flex: 1,
        background: "#f8fafc",
      }}
    >
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#1a2744",
          margin: "0 0 24px 0",
        }}
      >
        📥 Imports
      </h2>

      {/* ─── Zone 1: Upload ────────────────────────────────────────── */}
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          border: "1px solid #e2e8f0",
        }}
      >
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#1a2744",
            marginTop: 0,
            marginBottom: 16,
          }}
        >
          Zone d'upload
        </h3>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            lireFichier(file);
          }}
          onClick={() => document.getElementById("file-input").click()}
          style={{
            border: `2px dashed ${isDragging ? "#3b82f6" : "#334155"}`,
            borderRadius: 14,
            padding: "40px 24px",
            textAlign: "center",
            cursor: "pointer",
            background: isDragging ? "#1e40af10" : "#1e293b",
            transition: "all 0.2s",
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 12 }}>📂</div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#e2e8f0",
              marginBottom: 4,
            }}
          >
            Glisser votre fichier Excel ici
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            ou cliquer pour parcourir
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>
            Formats acceptés : .xlsx .xls .csv
          </div>
        </div>

        <input
          id="file-input"
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: "none" }}
          onChange={(e) => lireFichier(e.target.files[0])}
        />
      </div>

      {/* ─── Zone 2: Aperçu ──────────────────────────────────────── */}
      {filePreview && (
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
            border: "1px solid #e2e8f0",
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#1a2744",
              marginTop: 0,
              marginBottom: 16,
            }}
          >
            Aperçu avant import
          </h3>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
              <strong>Nom du fichier:</strong> {filePreview.fileName}
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              <strong>Nombre de lignes:</strong> {filePreview.lignes}
            </div>
          </div>

          {/* Preview table - 5 first rows */}
          <div
            style={{
              overflowX: "auto",
              marginBottom: 16,
              borderRadius: 8,
              border: "1px solid #334155",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#1a2744",
                    borderBottom: "1px solid #334155",
                  }}
                >
                  {PREVIEW_COLUMNS.map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: "8px 12px",
                        textAlign: "left",
                        color: "#e2e8f0",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filePreview.mappedRows.slice(0, 5).map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      background: idx % 2 === 0 ? "#1e293b" : "#0f172a",
                      borderBottom: "1px solid #334155",
                    }}
                  >
                    {PREVIEW_COLUMNS.map((col) => (
                      <td
                        key={col}
                        style={{
                          padding: "8px 12px",
                          color: "#cbd5e1",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: 200,
                        }}
                      >
                        {String(row[col] || "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={confirmerImport}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: "#16a34a",
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#15803d";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#16a34a";
              }}
            >
              ✅ Confirmer l'import
            </button>
            <button
              onClick={annulerImport}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#475569",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f8fafc";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff";
              }}
            >
              ✕ Annuler
            </button>
          </div>
        </div>
      )}

      {/* ─── Zone 3: Historique ───────────────────────────────────── */}
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          border: "1px solid #e2e8f0",
        }}
      >
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#1a2744",
            marginTop: 0,
            marginBottom: 16,
          }}
        >
          Historique des imports
        </h3>

        {importHistory.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 13,
            }}
          >
            Aucun import effectué dans cette session
          </div>
        ) : (
          <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <thead>
                <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#475569",
                    }}
                  >
                    Nom du fichier
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#475569",
                    }}
                  >
                    Nb lignes
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#475569",
                    }}
                  >
                    Heure
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#475569",
                    }}
                  >
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody>
                {importHistory.map((item, idx) => (
                  <tr
                    key={item.id}
                    style={{
                      background: idx % 2 === 0 ? "#fff" : "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    <td
                      style={{
                        padding: "10px 12px",
                        color: "#1a2744",
                        fontWeight: 500,
                      }}
                    >
                      {item.fileName}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        color: "#64748b",
                      }}
                    >
                      {item.lignes}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        color: "#64748b",
                      }}
                    >
                      {item.heure}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          color: "#16a34a",
                          fontWeight: 600,
                        }}
                      >
                        ✅ Succès
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
