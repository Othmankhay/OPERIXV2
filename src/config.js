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
  // Identification
  { key: "id", label: "ID" },
  { key: "isExpired", label: "Expiré" },
  { key: "nomProjet", label: "Nom du Projet" },
  { key: "utilisateurPSA", label: "Utilisateur PSA" },
  { key: "article", label: "Article" },
  { key: "designation", label: "Désignation" },
  { key: "codeFournisseur", label: "Fourn" },
  { key: "nomFournisseur", label: "Nom fournisseur" },
  { key: "ru", label: "RU" },
  { key: "affaire", label: "Affaire" },
  
  // Logistics
  { key: "dateEcheance", label: "Date d'échéance" },
  { key: "quantiteEcheancee", label: "Qté échéancée" },
  { key: "quantiteLivree", label: "Qté livrée" },
  { key: "magasin", label: "Mag" },
  { key: "site", label: "Site" },
  { key: "dateTransfertPegase", label: "Date de transfert Pegase" },
  { key: "psaId", label: "PSA ID" },
  { key: "sousProjet", label: "Sous projet" },
  { key: "documentAchat", label: "Doc achat" },
  { key: "article10", label: "Article10" },
  { key: "evolutionQuantiteReception", label: "Evolution de quantité après réception" },
  { key: "multilignesTotal", label: "Multilignes Totale" },
  { key: "multilignesRecu", label: "Multilignes reçu" },
  { key: "fauxManquant", label: "Faux manquant" },
  { key: "livraisonPointDur", label: "Livr Pt Dur" },
  { key: "pastillage", label: "Pastillage" },
  { key: "numeroPastillage", label: "N° pastillage" },
  
  // Delivery
  { key: "promesseLivraisonPilote", label: "Promesse livraison pilote pastillage" },
  { key: "dateLivraisonConfirmee", label: "Date de livraison confirmée" },
  { key: "dateEnvoiCommande", label: "Date d'envoi de commande" },
  { key: "confirmeDate", label: "Confirmé date de livraison" },
  { key: "etape", label: "Étape" },
  { key: "dateEchLundi", label: "Date Ech Lundi" },
  { key: "dernierCommentaire", label: "Dernier commentaire" },
  { key: "motCle", label: "Mot clé" },
  { key: "dernierPPLRLOG", label: "Dernier PPL RLOG Commentaire" },
  
  // Archiving/Metadata
  { key: "statut", label: "Statut" },
  { key: "dateAjout", label: "Date d'ajout" },
  { key: "archiveFlag", label: "Archivé" },
  { key: "dateArchivage", label: "Date d'archivage" },
  { key: "typeVsPF", label: "VS/P/F?" },
  { key: "typeImport", label: "Type Import" },
  
  // Proposed
  { key: "priorite", label: "Priorité" },
  { key: "commentairesInternes", label: "Commentaires Internes" },
  { key: "coutUnitaire", label: "Coût Unitaire" },
  { key: "dateModification", label: "Date de la Dernière Modification" },
  { key: "responsable", label: "Responsable" },
];

// Essential columns visible by default
export const DEFAULT_VISIBLE = ["id","nomProjet","article","statut","dateEcheance","quantiteEcheancee","quantiteLivree","nomFournisseur","dateLivraisonConfirmee"];

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
  { icon: "🗂️", label: "Workflow", type: "page", page: "workflow" },
  { icon: "📋", label: "Table principale", type: "page", page: "table" },
  { icon: "🔽", label: "Filtres", type: "panel", panel: "filtres" },
  { icon: "❄️", label: "Figer le volet", type: "panel", panel: "figer" },
  { icon: "📥", label: "Imports", type: "page", page: "imports" },
  { icon: "📤", label: "Export", type: "page", page: "export" },
  { icon: "📈", label: "Graphique", type: "page", page: "graphique" },
  { icon: "📋", label: "Journal imports", type: "page", page: "journal" },
];


