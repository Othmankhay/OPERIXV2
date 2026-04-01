import React from "react";

export default function TopProjectNav({
  projectNavModel,
  selectedProjectFamily,
  selectedOtherProject,
  compactProjectNav,
  openDropdown,
  setOpenDropdown,
  onSelectFamily,
  onSelectOtherProject,
  onSelectOtherGroup,
}) {
  return (
    <div style={{ display: "flex", gap: 10, flex: 1, justifyContent: "center", overflowX: "auto", padding: "2px 0" }}>
      {[
        { key: "ga", title: "PROJET GA", subtitle: "Multi projet", count: projectNavModel.ga.count },
        { key: "biw", title: "PROJET BIW", subtitle: "Ferrage projet", count: projectNavModel.biw.count },
        { key: "vie_serie", title: "VIE SÉRIE", subtitle: "Vie série", count: projectNavModel.vie_serie.count },
      ].map((item) => {
        const active = selectedProjectFamily === item.key;
        const disabled = item.count === 0;
        return (
          <button
            key={item.key}
            disabled={disabled}
            onClick={() => onSelectFamily(item.key, active)}
            style={{
              border: "1px solid",
              borderColor: active ? "#3b82f6" : "#d1d5db",
              background: active ? "#eff6ff" : "#ffffff",
              color: disabled ? "#94a3b8" : (active ? "#1e40af" : "#334155"),
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 14px",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.6 : 1,
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.1 }}>
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.2 }}>{item.title}</span>
              {!compactProjectNav && (
                <span style={{ fontSize: 11, color: active ? "#64748b" : "#9ca3af", fontWeight: 500, marginTop: 2 }}>
                  {item.subtitle}
                </span>
              )}
            </span>
            <span style={{ fontSize: 11, color: active ? "#1e40af" : "#64748b", background: active ? "#dbeafe" : "#f1f5f9", borderRadius: 999, padding: "2px 8px" }}>
              {item.count}
            </span>
          </button>
        );
      })}

      <div style={{ position: "relative" }}>
        <button
          disabled={projectNavModel.other.count === 0}
          onClick={() => setOpenDropdown(openDropdown === "other-projects" ? "" : "other-projects")}
          style={{
            border: "1px solid",
            borderColor: selectedProjectFamily === "other" ? "#3b82f6" : "#d1d5db",
            background: selectedProjectFamily === "other" ? "#eff6ff" : "#ffffff",
            color: projectNavModel.other.count === 0 ? "#94a3b8" : (selectedProjectFamily === "other" ? "#1e40af" : "#334155"),
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            padding: "8px 14px",
            cursor: projectNavModel.other.count === 0 ? "not-allowed" : "pointer",
            opacity: projectNavModel.other.count === 0 ? 0.6 : 1,
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.2 }}>AUTRES</span>
          <span style={{ fontSize: 11, color: selectedProjectFamily === "other" ? "#1e40af" : "#64748b", background: selectedProjectFamily === "other" ? "#dbeafe" : "#f1f5f9", borderRadius: 999, padding: "2px 8px" }}>
            {projectNavModel.other.count}
          </span>
          <span style={{ fontSize: 10 }}>▼</span>
        </button>

        {openDropdown === "other-projects" && projectNavModel.other.count > 0 && (
          <>
            <div onClick={() => setOpenDropdown("")} style={{ position: "fixed", inset: 0, zIndex: 999 }} />
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 260, maxHeight: 320, overflowY: "auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 10px 24px rgba(15,23,42,0.12)", zIndex: 1000, padding: 8 }}>
              <div
                onClick={onSelectOtherGroup}
                style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: selectedProjectFamily === "other" && !selectedOtherProject ? "#1e40af" : "#334155", background: selectedProjectFamily === "other" && !selectedOtherProject ? "#eff6ff" : "transparent" }}
              >
                Tous les autres projets
              </div>
              {projectNavModel.other.projects.map((p) => (
                <div
                  key={p.name}
                  onClick={() => onSelectOtherProject(p.name)}
                  style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13, color: selectedOtherProject === p.name ? "#1e40af" : "#334155", background: selectedOtherProject === p.name ? "#eff6ff" : "transparent", display: "flex", justifyContent: "space-between", gap: 10 }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: "#64748b", background: "#f1f5f9", borderRadius: 999, padding: "1px 8px" }}>{p.count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
