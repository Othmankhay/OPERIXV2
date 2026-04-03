export default function useRelanceEmail() {
  const RELANCE_ALLOWED_STATUS = new Set([
    "Manquant",
    "Manquants Plus",
    "Retard",
    "Point dur",
  ]);

  const isRelanceEligible = (row) => {
    return RELANCE_ALLOWED_STATUS.has(String(row.statut || "").trim());
  };

  const openRelanceEmail = (row) => {
    const to = row.emailFournisseur || row.email || "";
    const qteEcheance = row.qteEcheance ?? row.quantiteEcheancee ?? "-";
    const subject = `[URGENT] Relance Livraison - ${row.designation || "-"} (Réf : ${row.article || "-"}) - Projet : ${row.nomProjet || "-"}`;
    const body = [
      `Bonjour ${row.nomFournisseur || "Fournisseur"},`,
      "",
      `Sauf erreur de notre part, nous constatons que la livraison prevue pour la reference ${row.designation || "-"} (Code : ${row.article || "-"}) n'a pas encore ete receptionnee.`,
      "",
      `Cette piece est critique pour le maintien de notre planning de production sur le projet ${row.nomProjet || "-"}. Tout retard supplementaire risque d'impacter directement nos operations.`,
      "",
      "Details de l'echeance non honoree :",
      `Quantite attendue : ${qteEcheance} unites`,
      `Date d'echeance initiale : ${row.dateEcheance || "-"}`,
      "",
      "Nous vous remercions de bien vouloir nous confirmer, par retour de mail et sous 24 heures, une nouvelle date de livraison ferme ainsi que les mesures prises pour regulariser cette situation.",
      "",
      "Nous comptons sur votre reactivite habituelle pour limiter l'impact de ce retard.",
      "",
      "Cordialement,",
      "L'equipe Logistique PSA",
    ].join("\r\n");

    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    const mailtoLink = `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`;
    window.location.href = mailtoLink;
  };

  return { isRelanceEligible, openRelanceEmail };
}
