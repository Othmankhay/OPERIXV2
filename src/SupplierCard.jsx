import React from "react";

/**
 * SupplierCard - Carte fournisseur moderne (Dashboard/CRM style)
 * Props :
 *   - supplier: objet fournisseur (toutes les infos dynamiques)
 *   - onClick: callback (ouvre la fiche besoins)
 *   - fields: tableau de champs à afficher (optionnel, sinon auto)
 *
 * Affichage :
 *   - Header : Nom, ID PSA
 *   - Corps : Qté éch./livrée, Date d'échéance la + proche, RU, Affaire, etc.
 *   - Footer : 3 icônes action (Historique, PPL RLOG, Commentaires)
 *   - Responsive : grille 1 colonne en mobile
 */
export default function SupplierCard({ supplier, onClick, fields }) {
  if (!supplier) return null;
  // Champs dynamiques (fallback sur les plus courants)
  const {
    nomFournisseur,
    psaId,
    quantiteEcheancee,
    quantiteLivree,
    dateEcheance,
    ru,
    affaire,
    codeFournisseur,
    ...rest
  } = supplier;

  // Recherche date d'échéance la plus proche (si plusieurs)
  // (Ici, on suppose dateEcheance est déjà la plus proche)

  // Icônes actions - à implémenter suite à l'intégration du module de gestion d'actions
  // Les actions suivantes sont en attente :
  // - Historique : Afficher l'historique des interactions fournisseur
  // - PPL RLOG : Lien vers le système de log PPL
  // - Commentaires : Ouverture du module de commentaires fournisseur
  // const actions = [
  //   { icon: "📜", label: "Historique", onClick: e => { /* TODO */ } },
  //   { icon: "📦", label: "PPL RLOG", onClick: e => { /* TODO */ } },
  //   { icon: "💬", label: "Commentaires", onClick: e => { /* TODO */ } },
  // ];

  return (
    <div
      className="supplier-card"
      tabIndex={0}
      onClick={onClick}
      style={{
        background: "#fff",
        borderRadius: 14,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        border: "1px solid #e2e8f0",
        padding: 20,
        minWidth: 260,
        maxWidth: 380,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        cursor: "pointer",
        transition: "box-shadow 0.18s, transform 0.18s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.13)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
        e.currentTarget.style.transform = "none";
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
        <span style={{ fontWeight: 700, fontSize: 18, color: "#1a2744", flex: 1 }}>{nomFournisseur || "Fournisseur ?"}</span>
        {psaId && <span style={{ fontSize: 13, color: "#3b82f6", background: "#f0f4ff", borderRadius: 8, padding: "2px 8px", fontWeight: 600 }}>{psaId}</span>}
      </div>
      {/* Corps */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
        <div style={{ minWidth: 90 }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Qté éch.</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2744" }}>{quantiteEcheancee ?? "-"}</div>
        </div>
        <div style={{ minWidth: 90 }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Qté livrée</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#27ae60" }}>{quantiteLivree ?? "-"}</div>
        </div>
        <div style={{ minWidth: 120 }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Échéance</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#d97706" }}>{dateEcheance ?? "-"}</div>
        </div>
        {ru && (
          <div style={{ minWidth: 70 }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>RU</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1a2744" }}>{ru}</div>
          </div>
        )}
        {affaire && (
          <div style={{ minWidth: 90 }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Affaire</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1a2744" }}>{affaire}</div>
          </div>
        )}
        {codeFournisseur && (
          <div style={{ minWidth: 90 }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Code</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1a2744" }}>{codeFournisseur}</div>
          </div>
        )}
        {/* Champs dynamiques supplémentaires */}
        {fields && fields.map(f => rest[f] && (
          <div key={f} style={{ minWidth: 90 }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>{f}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1a2744" }}>{rest[f]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

