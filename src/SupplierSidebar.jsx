import React from "react";
import SupplierCard from "./SupplierCard";

/**
 * SupplierSidebar - Barre latérale droite pour la liste des fournisseurs
 * Props :
 *   - suppliers: tableau d'objets fournisseur
 *   - open: booléen (affichée ou non)
 *   - onClose: callback pour fermer
 *   - onSelect: callback (clic sur une carte)
 */
export default function SupplierSidebar({ suppliers, open, onClose, onSelect }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: 380,
        maxWidth: "96vw",
        background: "#f8fafc",
        boxShadow: open ? "-8px 0 32px rgba(30,41,59,0.13)" : "none",
        zIndex: 2002,
        transform: open ? "translateX(0)" : "translateX(110%)",
        transition: "transform 0.35s cubic-bezier(.77,.2,.05,1.0)",
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid #e2e8f0"
      }}
      tabIndex={-1}
      aria-hidden={!open}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px 8px 18px", borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
        <span style={{ fontWeight: 700, fontSize: 17, color: "#1a2744" }}>Fournisseurs</span>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#64748b", cursor: "pointer", padding: 4 }}>⟶</button>
      </div>
      {/* Liste des cartes */}
      <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 18 }}>
        {suppliers && suppliers.length > 0 ? suppliers.map(s => (
          <SupplierCard key={s.id || s.nomFournisseur} supplier={s} onClick={() => onSelect && onSelect(s.nomFournisseur)} />
        )) : <div style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", marginTop: 40 }}>Aucun fournisseur</div>}
      </div>
    </div>
  );
}
