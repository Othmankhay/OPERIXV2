const parseAnyDateToTime = (value) => {
  if (!value) return 0;
  const raw = String(value).trim();
  if (!raw) return 0;

  const isoOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoOnly) {
    const [, y, m, d] = isoOnly;
    const dt = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
    return isNaN(dt.getTime()) ? 0 : dt.getTime();
  }

  const slash = raw.split(" ")[0].split("/");
  if (slash.length === 3) {
    const [d, m, y] = slash;
    const dt = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
    return isNaN(dt.getTime()) ? 0 : dt.getTime();
  }

  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const toNumberSafe = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function useRelanceEmail() {
  const isRelanceEligible = (row) => {
    const due = parseAnyDateToTime(row.dateEcheance);
    if (!due) return false;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const qteEcheance = toNumberSafe(row.qteEcheance ?? row.quantiteEcheancee);
    const qteLivree = toNumberSafe(row.qteLivree ?? row.quantiteLivree);
    return due < todayStart.getTime() && qteLivree < qteEcheance;
  };

  const openRelanceEmail = (row) => {
    const to = row.emailFournisseur || row.email || "";
    const qteEcheance = row.qteEcheance ?? row.quantiteEcheancee ?? "-";
    const subject = `[URGENT] Relance Livraison - Projet : ${row.nomProjet || "-"} - Réf : ${row.article || "-"}`;
    const body = `Bonjour ${row.nomFournisseur || "Fournisseur"},\n\nNous constatons un retard sur la pièce ${row.designation || "-"} (Code : ${row.article || "-"}).\nQuantité attendue : ${qteEcheance}\nDate d'échéance : ${row.dateEcheance || "-"}\n\nMerci de nous confirmer une nouvelle date de livraison par retour de mail.\n\nCordialement,\nL'équipe Logistique.`;
    const mailtoLink = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  return { isRelanceEligible, openRelanceEmail };
}
