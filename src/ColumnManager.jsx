import { useState, useEffect } from "react";
import { COLUMN_CATEGORIES, getDefaultVisibleColumns, getAllColumnsFlat } from "./columnConfig";

/* ─── Column Selection Modal ──────────────────────────────────────── */
export function ColumnSelectionModal({ isOpen, onClose, visibleColumns, onColumnsChange }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCount, setSelectedCount] = useState(visibleColumns.length);

  useEffect(() => {
    setSelectedCount(visibleColumns.length);
  }, [visibleColumns]);

  const toggleColumn = (key) => {
    if (visibleColumns.includes(key)) {
      onColumnsChange(visibleColumns.filter(k => k !== key));
    } else {
      onColumnsChange([...visibleColumns, key]);
    }
  };

  const toggleCategory = (categoryKey) => {
    const fields = COLUMN_CATEGORIES[categoryKey].fields.map(f => f.key);
    const allSelected = fields.every(f => visibleColumns.includes(f));
    if (allSelected) {
      onColumnsChange(visibleColumns.filter(k => !fields.includes(k)));
    } else {
      const toAdd = fields.filter(f => !visibleColumns.includes(f));
      onColumnsChange([...visibleColumns, ...toAdd]);
    }
  };

  const selectAll = () => {
    onColumnsChange(getAllColumnsFlat().map(f => f.key));
  };

  const selectDefault = () => {
    onColumnsChange(getDefaultVisibleColumns());
  };

  const selectNone = () => {
    onColumnsChange([]);
  };

  const filterFields = (fields) => {
    if (!searchQuery) return fields;
    const q = searchQuery.toLowerCase();
    return fields.filter(f => 
      f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q)
    );
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          width: "90%",
          maxWidth: 900,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'DM Sans','Segoe UI',sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a2744" }}>
                Personnaliser les Colonnes
              </h2>
              <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#64748b" }}>
                Sélectionnez les champs à afficher dans le tableau
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 24,
                color: "#94a3b8",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* Search bar */}
          <input
            type="text"
            placeholder="Rechercher des champs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 13,
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Action buttons */}
        <div style={{ padding: "12px 24px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={selectDefault}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#475569",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ⚙️ Par défaut
          </button>
          <button
            onClick={selectAll}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#475569",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ✓ Tous
          </button>
          <button
            onClick={selectNone}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#475569",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ✗ Rien
          </button>
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#64748b", fontWeight: 600, display: "flex", alignItems: "center" }}>
            {selectedCount} colonne{selectedCount !== 1 ? "s" : ""} sélectionnée{selectedCount !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Categories list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {Object.entries(COLUMN_CATEGORIES).map(([catKey, category]) => {
            const fields = filterFields(category.fields);
            const catFields = category.fields.map(f => f.key);
            const categorySelected = catFields.filter(f => visibleColumns.includes(f)).length;
            const categoryTotal = catFields.length;

            // Hide category if no matching fields in search
            if (searchQuery && fields.length === 0) return null;

            return (
              <div key={catKey} style={{ marginBottom: 24 }}>
                {/* Category header */}
                <div
                  onClick={() => toggleCategory(catKey)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: "#f8fafc",
                    borderRadius: 8,
                    cursor: "pointer",
                    marginBottom: 10,
                    border: "1px solid #e2e8f0",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#f8fafc")}
                >
                  <input
                    type="checkbox"
                    checked={categorySelected === categoryTotal && categoryTotal > 0}
                    onChange={() => {}}
                    style={{ cursor: "pointer", accentColor: "#1a2744" }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span style={{ fontSize: 16 }}>{category.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2744", flex: 1 }}>
                    {category.label}
                  </span>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                    {categorySelected}/{categoryTotal}
                  </span>
                </div>

                {/* Category fields */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 8 }}>
                  {fields.map((field) => (
                    <label
                      key={field.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid #e2e8f0",
                        background: visibleColumns.includes(field.key) ? "#f0fdf4" : "#fff",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#cbd5e1";
                        e.currentTarget.style.background = visibleColumns.includes(field.key) ? "#dcfce7" : "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.background = visibleColumns.includes(field.key) ? "#f0fdf4" : "#fff";
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(field.key)}
                        onChange={() => toggleColumn(field.key)}
                        style={{ cursor: "pointer", accentColor: "#16a34a" }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#1a2744", flex: 1 }}>
                        {field.label}
                      </span>
                      <span style={{ fontSize: 10, color: "#94a3b8", fontStyle: "italic" }}>
                        {field.key}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#475569",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Fermer
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "#16a34a",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}

export default ColumnSelectionModal;
