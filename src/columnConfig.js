/* ─── Column configuration organized by category ─────────────────── */
export const COLUMN_CATEGORIES = {
  identification: {
    label: "Identification",
    icon: "🏷️",
    fields: [
      { key: "id", label: "ID" },
      { key: "nomProjet", label: "Nom du Projet" },
      { key: "utilisateurPSA", label: "Utilisateur PSA" },
      { key: "article", label: "Article" },
      { key: "designation", label: "Désignation" },
      { key: "codeFournisseur", label: "Fourn" },
      { key: "nomFournisseur", label: "Nom fournisseur" },
      { key: "ru", label: "RU" },
      { key: "affaire", label: "Affaire" },
      { key: "isExpired", label: "Expiré" },
    ]
  },

  logistics: {
    label: "Gestion des Quantités & Logistique",
    icon: "📦",
    fields: [
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
    ]
  },

  delivery: {
    label: "Suivi Livraison / Engagement",
    icon: "🚚",
    fields: [
      { key: "promesseLivraisonPilote", label: "Promesse livraison pilote pastillage" },
      { key: "dateLivraisonConfirmee", label: "Date de livraison confirmée" },
      { key: "dateEnvoiCommande", label: "Date d'envoi de commande" },
      { key: "confirmeDate", label: "Confirmé date de livraison" },
      { key: "etape", label: "Étape" },
      { key: "dateEchLundi", label: "Date Ech Lundi" },
      { key: "dernierCommentaire", label: "Dernier commentaire" },
      { key: "motCle", label: "Mot clé" },
      { key: "dernierPPLRLOG", label: "Dernier PPL RLOG Commentaire" },
    ]
  },

  archiving: {
    label: "Archivage / Métadonnées",
    icon: "📋",
    fields: [
      { key: "statut", label: "Statut" },
      { key: "dateAjout", label: "Date d'ajout" },
      { key: "archiveFlag", label: "Archivé" },
      { key: "dateArchivage", label: "Date d'archivage" },
      { key: "typeVsPF", label: "VS/P/F?" },
      { key: "typeImport", label: "Type Import" },
    ]
  },

  proposed: {
    label: "Champs Supplémentaires (Proposés)",
    icon: "⭐",
    fields: [
      { key: "priorite", label: "Priorité" },
      { key: "commentairesInternes", label: "Commentaires Internes" },
      { key: "coutUnitaire", label: "Coût Unitaire" },
      { key: "dateModification", label: "Date de la Dernière Modification" },
      { key: "responsable", label: "Responsable" },
    ]
  },
};

/* ─── Generate default visible columns (essential ones) ──────────── */
export const getDefaultVisibleColumns = () => {
  return [
    "id",
    "nomProjet",
    "article",
    "statut",
    "dateEcheance",
    "quantiteEcheancee",
    "quantiteLivree",
    "nomFournisseur",
    "dateLivraisonConfirmee",
  ];
};

/* ─── Flatten all columns for easier lookup ────────────────────── */
export const getAllColumnsFlat = () => {
  const flat = [];
  Object.values(COLUMN_CATEGORIES).forEach(cat => {
    flat.push(...cat.fields);
  });
  return flat;
};
