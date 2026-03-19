import { useState } from "react";

const INITIAL_JALONS = [
  { id: 1, nom: "1.1 Base AT6 BEV",  date: "2022-05-30", domaine: "439", projet: "P64 Ferrage" },
  { id: 2, nom: "1.1 Base AT6 MHEV", date: "2022-04-18", domaine: "439", projet: "P64 Ferrage" },
  { id: 3, nom: "1.1 Base AT6 PHEV", date: "2022-07-11", domaine: "439", projet: "P64 Ferrage" },
  { id: 4, nom: "1.1 Base BDL BEV",  date: "2022-06-13", domaine: "439", projet: "P64 Ferrage" },
  { id: 5, nom: "1.1 Base BDL MHEV", date: "2022-05-02", domaine: "439", projet: "P64 Ferrage" },
  { id: 6, nom: "1.1 Base BDL PHEV", date: "2022-07-25", domaine: "439", projet: "P64 Ferrage" },
];

function formatDateDisplay(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function PageJalons() {
  const [jalons, setJalons] = useState(INITIAL_JALONS);
  const [searchJalon, setSearchJalon] = useState("");
  const [selectedJalon, setSelectedJalon] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Modal form state
  const [formNom, setFormNom] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formDomaine, setFormDomaine] = useState("");

  const filtered = jalons.filter(j => {
    if (!searchJalon) return true;
    const s = searchJalon.toLowerCase();
    return j.nom.toLowerCase().includes(s) || formatDateDisplay(j.date).includes(s) || j.date.includes(s);
  });

  const openAdd = () => {
    setSelectedJalon(null);
    setFormNom("");
    setFormDate("");
    setFormDomaine("");
    setShowModal(true);
  };

  const openEdit = (jalon) => {
    setSelectedJalon(jalon);
    setFormNom(jalon.nom);
    setFormDate(jalon.date);
    setFormDomaine(jalon.domaine);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedJalon(null);
  };

  const handleSave = () => {
    if (selectedJalon) {
      setJalons(prev => prev.map(j => j.id === selectedJalon.id ? { ...j, nom: formNom, date: formDate, domaine: formDomaine } : j));
    } else {
      const newId = jalons.length > 0 ? Math.max(...jalons.map(j => j.id)) + 1 : 1;
      setJalons(prev => [...prev, { id: newId, nom: formNom, date: formDate, domaine: formDomaine, projet: "P64 Ferrage" }]);
    }
    closeModal();
  };

  const handleDelete = () => {
    if (selectedJalon) {
      setJalons(prev => prev.filter(j => j.id !== selectedJalon.id));
    }
    closeModal();
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a2744", display: "flex", alignItems: "center", gap: 8 }}>
          🚩 Jalons
          <span style={{ fontSize: 13, fontWeight: 500, color: "#64748b", background: "#f1f5f9", borderRadius: 20, padding: "2px 10px" }}>
            {filtered.length} jalon{filtered.length !== 1 ? "s" : ""}
          </span>
        </h2>
        <button onClick={openAdd} style={{
          padding: "8px 18px", borderRadius: 8, border: "none", background: "#1a2744", color: "#fff",
          fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          transition: "all 0.2s", boxShadow: "0 2px 8px rgba(26,39,68,0.15)"
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "#253560"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(26,39,68,0.25)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "#1a2744"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(26,39,68,0.15)"; }}>
          ＋ Ajouter un jalon
        </button>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 18 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
        <input
          value={searchJalon}
          onChange={e => setSearchJalon(e.target.value)}
          placeholder="Rechercher par nom ou par date..."
          style={{
            width: "100%", padding: "10px 14px 10px 36px", borderRadius: 10, border: "1px solid #e2e8f0",
            background: "#f8fafc", fontSize: 14, outline: "none", transition: "border 0.2s",
            boxSizing: "border-box"
          }}
          onFocus={e => e.currentTarget.style.border = "1px solid #3b82f6"}
          onBlur={e => e.currentTarget.style.border = "1px solid #e2e8f0"}
        />
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Nom", "Date", "Domaine", "Projet"].map(h => (
                <th key={h} style={{
                  padding: "12px 18px", textAlign: "left", color: "#475569", fontWeight: 600, fontSize: 12,
                  borderBottom: "1px solid #e2e8f0", textTransform: "uppercase", letterSpacing: 0.3
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                  Aucun jalon trouvé
                </td>
              </tr>
            ) : (
              filtered.map((j, i) => (
                <tr
                  key={j.id}
                  onClick={() => openEdit(j)}
                  style={{
                    background: i % 2 === 1 ? "#fafbfc" : "#fff",
                    cursor: "pointer",
                    transition: "background 0.15s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 1 ? "#fafbfc" : "#fff"}
                >
                  <td style={{ padding: "12px 18px", fontWeight: 500, color: "#1a2744" }}>{j.nom}</td>
                  <td style={{ padding: "12px 18px", color: "#475569" }}>{formatDateDisplay(j.date)}</td>
                  <td style={{ padding: "12px 18px", color: "#475569" }}>
                    <span style={{ background: "#f0f4ff", color: "#3b82f6", padding: "3px 10px", borderRadius: 6, fontWeight: 600, fontSize: 12 }}>{j.domaine}</span>
                  </td>
                  <td style={{ padding: "12px 18px", color: "#475569" }}>{j.projet}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1001, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={closeModal} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(2px)" }} />
          <div style={{
            position: "relative", width: "min(460px, 94vw)", borderRadius: 14, background: "#fff",
            boxShadow: "0 20px 60px rgba(0,0,0,0.18)", overflow: "hidden"
          }}>
            {/* Modal Header */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "18px 22px", borderBottom: "1px solid #f1f5f9"
            }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1a2744", margin: 0 }}>
                {selectedJalon ? "Modifier le jalon" : "Nouveau jalon"}
              </h3>
              <button onClick={closeModal} style={{
                background: "none", border: "none", fontSize: 20, color: "#94a3b8", cursor: "pointer", padding: 4,
                transition: "color 0.15s"
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#1a2744"}
              onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}>✕</button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Milestone Name</label>
                <input
                  value={formNom}
                  onChange={e => setFormNom(e.target.value)}
                  placeholder="Entrer le nom du jalon"
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0",
                    fontSize: 14, outline: "none", background: "#f8fafc", transition: "border 0.2s",
                    boxSizing: "border-box"
                  }}
                  onFocus={e => e.currentTarget.style.border = "1px solid #3b82f6"}
                  onBlur={e => e.currentTarget.style.border = "1px solid #e2e8f0"}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Milestone Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0",
                    fontSize: 14, outline: "none", background: "#f8fafc", transition: "border 0.2s",
                    boxSizing: "border-box"
                  }}
                  onFocus={e => e.currentTarget.style.border = "1px solid #3b82f6"}
                  onBlur={e => e.currentTarget.style.border = "1px solid #e2e8f0"}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Domaine</label>
                <input
                  value={formDomaine}
                  onChange={e => setFormDomaine(e.target.value)}
                  placeholder="Ex: 439"
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0",
                    fontSize: 14, outline: "none", background: "#f8fafc", transition: "border 0.2s",
                    boxSizing: "border-box"
                  }}
                  onFocus={e => e.currentTarget.style.border = "1px solid #3b82f6"}
                  onBlur={e => e.currentTarget.style.border = "1px solid #e2e8f0"}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: "flex", justifyContent: selectedJalon ? "space-between" : "flex-end",
              alignItems: "center", padding: "16px 22px", borderTop: "1px solid #f1f5f9", gap: 10
            }}>
              {selectedJalon && (
                <button onClick={handleDelete} style={{
                  padding: "9px 18px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fee2e2",
                  color: "#dc2626", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex",
                  alignItems: "center", gap: 5, transition: "all 0.2s"
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#fecaca"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#fee2e2"; }}>
                  🗑 Supprimer
                </button>
              )}
              <button onClick={handleSave} style={{
                padding: "9px 22px", borderRadius: 8, border: "none", background: "#1a2744",
                color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex",
                alignItems: "center", gap: 5, transition: "all 0.2s",
                boxShadow: "0 2px 8px rgba(26,39,68,0.15)"
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#253560"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#1a2744"; }}>
                💾 Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
