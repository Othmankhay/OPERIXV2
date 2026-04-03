import React, { useMemo, useState } from "react";
import SupplierCard from "./SupplierCard";

/**
 * SupplierSidebar - Barre laterale droite pour la liste des fournisseurs
 * Props :
 *   - suppliers: tableau d'objets fournisseur
 *   - open: booleen (affichee ou non)
 *   - onClose: callback pour fermer
 *   - onSelect: callback (clic sur une carte)
 */
export default function SupplierSidebar({ suppliers, open, onClose, onSelect }) {
  const [search, setSearch] = useState("");

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return suppliers || [];

    return (suppliers || []).filter((supplier) => {
      const haystack = [
        supplier.nomFournisseur,
        supplier.psaId,
        supplier.codeFournisseur,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return haystack.includes(query);
    });
  }, [search, suppliers]);

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
        borderLeft: "1px solid #e2e8f0",
      }}
      tabIndex={-1}
      aria-hidden={!open}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px 8px 18px", borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
        <span style={{ fontWeight: 700, fontSize: 17, color: "#1a2744" }}>Fournisseurs</span>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#64748b", cursor: "pointer", padding: 4 }}>⟶</button>
      </div>

      <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#94a3b8" }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un fournisseur..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px 10px 34px",
              borderRadius: 10,
              border: "1px solid #dbe2ea",
              background: "#f8fafc",
              color: "#334155",
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
          {filteredSuppliers.length} fournisseur{filteredSuppliers.length > 1 ? "s" : ""}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 18 }}>
        {filteredSuppliers.length > 0 ? (
          filteredSuppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id || supplier.nomFournisseur}
              supplier={supplier}
              onClick={() => onSelect && onSelect(supplier.nomFournisseur)}
            />
          ))
        ) : (
          <div style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", marginTop: 40 }}>
            Aucun fournisseur trouve
          </div>
        )}
      </div>
    </div>
  );
}
