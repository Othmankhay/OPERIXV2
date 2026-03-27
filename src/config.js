export const STATUT_CONFIG = {
  "Manquants Plus": { bg: "#fde8e8", color: "#c0392b", dot: "#c0392b" },
  "Point dur":      { bg: "#f3e8fd", color: "#7d3c98", dot: "#7d3c98" },
  "À venir":        { bg: "#fdf0e0", color: "#6e2c00", dot: "#a0522d" },
  "Retard":         { bg: "#fff3e0", color: "#e67e22", dot: "#e67e22" },
  "Manquant":       { bg: "#fde8f3", color: "#e84393", dot: "#e84393" },
  "Confirmé":       { bg: "#e8f4fd", color: "#2e86c1", dot: "#2e86c1" },
  "Faux manquant":  { bg: "#f2f3f4", color: "#7f8c8d", dot: "#7f8c8d" },
  "Reçu":           { bg: "#eafaf1", color: "#27ae60", dot: "#27ae60" },
  "En cours":       { bg: "#d5f5e3", color: "#1e8449", dot: "#1e8449" },
};

export const PROJETS = {
  "Projet - GA ":  ["P512 SX", "P514 LX", "P520 MX"],
  "Vie Série":      ["P610 VS", "P612 VS", "P615 VS"],
  "Projet - BIW": ["P312 FP", "P315 FP"],
};

export const ALL_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "nomProjet", label: "Projet" },
  { key: "utilisateurPSA", label: "Utilisateur PSA" },
  { key: "article", label: "Article" },
  { key: "codeFournisseur", label: "Code Fourn." },
  { key: "nomFournisseur", label: "Nom Fourn." },
  { key: "magasin", label: "Magasin" },
  { key: "site", label: "Site" },
  { key: "dernierCommentaire", label: "Commentaire" },
  { key: "dernierPPLRLOG", label: "PPL/RLOG" },
  { key: "statut", label: "Statut" },
  { key: "psaId", label: "PSA ID" },
  { key: "documentAchat", label: "Doc. Achat" },
  { key: "sousProjet", label: "Sous-projet" },
  { key: "serie", label: "Série" },
  { key: "domaine", label: "Domaine" },
  { key: "ru", label: "RU" },
  { key: "affaire", label: "Affaire" },
  { key: "reference", label: "Référence" },
  { key: "article10", label: "Article 10" },
  { key: "designation", label: "Désignation" },
  { key: "typeImport", label: "Type Import" },
  { key: "dateTransfertPegase", label: "Date Pégase" },
  { key: "quantiteEcheancee", label: "Qté Éch." },
  { key: "quantiteLivree", label: "Qté Livrée" },
  { key: "dateEcheance", label: "Date Éch." },
  { key: "dateLivraisonConfirmee", label: "Date Livr. Conf." },
  { key: "dateEnvoiCommande", label: "Date Envoi Cmd." },
  { key: "motCle", label: "Mot clé" },
  { key: "indicateur", label: "Indicateur" },
  { key: "fauxManquant", label: "Faux Manquant" },
  { key: "livraisonPointDur", label: "Livr. Point dur" },
  { key: "confirmeDate", label: "Date Confirmée" },
];

export const DEFAULT_VISIBLE = ["id","nomProjet","utilisateurPSA","article","codeFournisseur","nomFournisseur","magasin","site","dernierCommentaire","dernierPPLRLOG","statut"];

const PROJETS_KEYS = Object.keys(PROJETS);
const STATUTS_DISTRIBUTION = [
  'En cours','En cours','En cours','En cours',
  'Confirmé','Confirmé','Confirmé',
  'Reçu','Reçu','Reçu',
  'Retard','Retard',
  'À venir','À venir',
  'Manquant',
  'Point dur',
  'Faux manquant',
  'Manquants Plus',
];

const FOURNISSEURS = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta'];
const USERS = ['Dupont M.', 'Martin L.', 'Leroy J.', 'Bernard A.', 'Moreau C.', 'Simon P.', 'Petit R.', 'Durand H.'];
const SITES = ['Poissy', 'Mulhouse', 'Sochaux', 'Rennes', 'Valenciennes'];
const DOMAINES = ['Mécanique', 'Roulement', 'Étanchéité', 'Électrique', 'Tôlerie', 'Pneumatique', 'Câblage', 'Visserie', 'Tuyauterie', 'Motorisation'];

export const MOCK_DATA = Array.from({ length: 100 }, (_, i) => {
  const nomProjet = PROJETS_KEYS[i % PROJETS_KEYS.length];
  const sousProjet = PROJETS[nomProjet][i % PROJETS[nomProjet].length];
  
  return {
    id: `PRC-${String(i + 1).padStart(3, '0')}`,
    nomProjet,
    sousProjet,
    utilisateurPSA: USERS[i % 8],
    article: `ART-${1000 + i}`,
    codeFournisseur: `FRN-00${(i % 7) + 1}`,
    nomFournisseur: FOURNISSEURS[i % 7],
    magasin: `MAG-${String.fromCodePoint(65 + (i % 5))}${1 + (i % 3)}`,
    site: SITES[i % 5],
    statut: STATUTS_DISTRIBUTION[i % STATUTS_DISTRIBUTION.length],
    psaId: `PSA-${10421 + i}`,
    documentAchat: `DA-2025-${String(i + 1).padStart(3, '0')}`,
    serie: `S${1 + (i % 3)}`,
    domaine: DOMAINES[i % 10],
    ru: `RU-${10 + (i % 15)}`,
    affaire: `AFF-${String(i + 1).padStart(3, '0')}`,
    reference: `REF-${1000 + i}`,
    article10: `ART10-${String(i + 1).padStart(3, '0')}`,
    designation: `Pièce industrielle ${i + 1}`,
    typeImport: ['Excel', 'SAP', 'CSV'][i % 3],
    dateTransfertPegase: `2026-03-${String(1 + (i % 28)).padStart(2, '0')}`,
    quantiteEcheancee: (i + 1) * 10,
    quantiteLivree: (i % 2 === 0) ? (i + 1) * 10 : 0,
    dateEcheance: (() => { const dates = ['2026-03-16','2026-03-17','2026-03-18','2026-03-19','2026-03-20','2026-03-23','2026-03-24','2026-03-25','2026-03-10','2026-03-12']; return dates[i % dates.length]; })(),
    dateLivraisonConfirmee: (i % 3 === 0) ? `2026-03-${String(2 + (i % 28)).padStart(2, '0')}` : "",
    dateEnvoiCommande: `2026-02-${String(1 + (i % 28)).padStart(2, '0')}`,
    motCle: DOMAINES[i % 10].toLowerCase(),
    indicateur: `I${1 + (i % 4)}`,
    fauxManquant: (i % 15 === 0) ? "Oui" : "Non",
    livraisonPointDur: (i % 12 === 0) ? "Oui" : "Non",
    confirmeDate: (i % 4 === 0) ? `2025-04-${String(10 + (i % 20)).padStart(2, '0')}` : "",
    dernierCommentaire: "", 
    dernierPPLRLOG: ""
  };
});

export const TOAST_CONFIGS = [
  { message: "🔴 3 nouvelles pièces critiques", type: "critical", filterStatut: "Manquants Plus" },
  { message: "🟠 2 retards signalés", type: "warning", filterStatut: "Retard" },
  { message: "✅ 5 pièces reçues ce matin", type: "success", filterStatut: "Reçu" },
];

export const TOAST_STYLES = {
  critical: { bg: "#fff1f1", border: "#fca5a5", accent: "#dc2626" },
  warning:  { bg: "#fffbeb", border: "#fcd34d", accent: "#d97706" },
  success:  { bg: "#f0fdf4", border: "#86efac", accent: "#16a34a" },
};

export const SIDEBAR_ITEMS = [
  { icon: "📊", label: "Dashboard", type: "page", page: "dashboard" },
  { icon: "📋", label: "Table principale", type: "page", page: "table" },
  { icon: "🔽", label: "Filtres", type: "panel", panel: "filtres" },
  { icon: "❄️", label: "Figer le volet", type: "panel", panel: "figer" },
  { icon: "�", label: "Imports", type: "page", page: "imports" },
  { icon: "�📤", label: "Export", type: "page", page: "export" },
  { icon: "📈", label: "Graphique", type: "page", page: "graphique" },
  { icon: "📋", label: "Journal imports", type: "page", page: "journal" },
];
