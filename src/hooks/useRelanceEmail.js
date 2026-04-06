/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODULE: useRelanceEmail
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PURPOSE: Automated Supplier Follow-up Email Generation
 * ────────
 * This hook manages the creation and sending of follow-up emails for
 * late or missing supplier deliveries. It detects eligible items based on
 * their status and generates pre-filled mailto: links with contextual
 * information from the supply chain data.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DELAY DETECTION LOGIC
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * An item is eligible for follow-up (relance) when its status is one of:
 * 
 *   1. "Manquant" (Missing)
 *      → Item never received, deadline has passed
 *      → Requires immediate supplier contact
 * 
 *   2. "Manquants Plus" (Missing+)
 *      → Item partially received, significant shortage remains
 *      → Shortage impacts production planning
 * 
 *   3. "Retard" (Late/Delayed)
 *      → Item has not arrived by the confirmed due date
 *      → May still be in transit but behind schedule
 * 
 *   4. "Point dur" (Hard point / Critical issue)
 *      → Item has recurring supply problems or quality issues
 *      → Escalated status indicating supplier performance concern
 * 
 * DETECTION METHOD:
 *   The eligibility check uses a Set for O(1) lookup performance.
 *   Status comparison is case-sensitive and trimmed to handle whitespace.
 *   Example: isRelanceEligible(row) checks if row.statut is in the Set.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EMAIL GENERATION & MAILTO: PROTOCOL
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * MAILTO: URL Structure:
 * ──────────────────────
 *   mailto:{email}?subject={encoded_subject}&body={encoded_body}
 * 
 * When executed (via window.location.href), this opens the user's default
 * email client with a pre-filled message, ready for the user to review
 * and send.
 *
 * URL ENCODING (encodeURIComponent):
 * ────────────────────────────────
 *   - Converts special characters to %XX hexadecimal format
 *   - Preserves readability: letters, numbers, spaces remain visible in source
 *   - Critical for email body: line breaks (\r\n) encoded as %0D%0A
 *   - Prevents URL parsing errors with special chars: é, ?, &, etc.
 * 
 * Examples of encoding:
 *   Space       → %20
 *   Newline     → %0A
 *   Carriage return + newline → %0D%0A
 *   Accent (é)  → %C3%A9
 *   Question (?) → %3F
 *   Ampersand (&) → %26
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EMAIL TEMPLATE VARIABLES (DYNAMIC INJECTION)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * The email body uses dynamic variables from the supply chain item (row),
 * enabling contextual follow-up messages. If a field is missing, a fallback
 * value "--" is used to prevent broken emails.
 * 
 * VARIABLES USED IN TEMPLATE:
 * ──────────────────────────
 * 
 *   ${row.nomFournisseur}
 *       Field Name: nomFournisseur (Supplier Name)
 *       Purpose: Greeting/salutation
 *       Fallback: "Fournisseur" (generic)
 *       Example: "Bonjour ACME Industries,"
 * 
 *   ${row.designation}
 *       Field Name: designation (Item Description)
 *       Purpose: Human-readable item name
 *       Fallback: "-"
 *       Example: "Brake Pad Assembly - Front"
 * 
 *   ${row.article}
 *       Field Name: article (Item Code)
 *       Purpose: Unique reference number
 *       Fallback: "-"
 *       Example: "AR-12345-FR"
 * 
 *   ${qteEcheance}
 *       Field Name: qteEcheance or quantiteEcheancee (Quantity Due)
 *       Purpose: Number of units expected
 *       Fallback: "-" (if neither field present)
 *       Example: "500 unites"
 *       Calculation: row.qteEcheance ?? row.quantiteEcheancee ?? "-"
 * 
 *   ${row.nomProjet}
 *       Field Name: nomProjet (Project Name)
 *       Purpose: Production context / project reference
 *       Fallback: "-"
 *       Example: "PSA PEUGEOT 3008 HYBRID"
 * 
 *   ${row.dateEcheance}
 *       Field Name: dateEcheance (Due Date)
 *       Purpose: Original commitment date
 *       Fallback: "-"
 *       Example: "2026-03-15"
 *       Format: Typically YYYY-MM-DD (backend dependent)
 * 
 * FALLBACK MECHANISM:
 * ──────────────────
 *   The || operator returns "-" for falsy values:
 *     - undefined / null (field missing)
 *     - empty string
 *     - 0 (could be valid quantity, avoid here)
 *   
 *   This ensures emails are always complete even with partial data.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * RETURN OBJECT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 *   isRelanceEligible(row: Object): boolean
 *   ─────────────────────────────────────
 *   Checks if a supply item is eligible for follow-up email.
 *   
 *   Parameter: row - Supply chain item object
 *   Returns:   true if row.statut is in RELANCE_ALLOWED_STATUS, false otherwise
 *   Usage:     Used by UI to show/hide follow-up button
 *   Example:   if (isRelanceEligible(supplier)) { showFollowUpButton(); }
 * 
 * 
 *   openRelanceEmail(row: Object): void
 *   ────────────────────────────────
 *   Generates and opens a pre-filled follow-up email in the user's email client.
 *   
 *   Parameter: row - Supply chain item with supplier contact info
 *   Returns:   void (triggers mailto: protocol)
 *   Side effects:
 *     - Reads multiple fields from row object
 *     - Constructs email subject and body with dynamic variables
 *     - URL-encodes subject and body
 *     - Redirects window.location.href to mailto: URL
 *   Usage:     onClick handler for "Send Follow-up Email" button
 *   Example:   <button onClick={() => openRelanceEmail(row)}>
 *              Envoyer Relance
 *              </button>
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * IMPLEMENTATION NOTES & BEST PRACTICES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 1. STATELESS HOOK
 *    - No useState/useEffect
 *    - Purely functional for email generation logic
 *    - Returns consistent object on every call
 * 
 * 2. SET FOR PERFORMANCE
 *    - RELANCE_ALLOWED_STATUS uses Set data structure
 *    - O(1) lookup time vs O(n) array.includes()
 *    - Set is recreated on each hook call (stateless design)
 *    - Minor optimization, but good practice for scale
 * 
 * 3. EMAIL BODY TEMPLATE
 *    - Uses French language for PSA/Logistics context
 *    - Professional tone suitable for supplier communication
 *    - Emphasizes urgency without being aggressive
 *    - Includes request for 24-hour response and firm delivery date
 * 
 * 4. FALLBACK VALUES
 *    - Uses || "-" for missing fields
 *    - Prevents \"undefined\" appearing in emails
 *    - Makes incomplete data visible in email (user can edit before sending)
 * 
 * 5. SECURITY CONSIDERATIONS
 *    - encodeURIComponent() handles all special characters
 *    - No user input validation needed (data from backend)
 *    - mailto: URLs are browser-native, no third-party API calls
 *    - Email client opens client-side, user can review before sending
 * 
 * 6. BROWSER COMPATIBILITY
 *    - mailto: protocol supported in all modern browsers (IE10+)
 *    - encodeURIComponent() is standard JS function
 *    - Works on desktop and mobile email clients
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default function useRelanceEmail() {
  const RELANCE_ALLOWED_STATUS = new Set([
    "Manquant",
    "Manquants Plus",
    "Retard",
    "Point dur",
  ]);

  /**
   * Checks if a supply item is eligible for automated follow-up.
   * 
   * @param {Object} row - Supply chain item
   * @param {string} row.statut - Item status
   * @returns {boolean} true if item should show follow-up button
   */
  const isRelanceEligible = (row) => {
    return RELANCE_ALLOWED_STATUS.has(String(row.statut || "").trim());
  };

  /**
   * Opens a pre-filled follow-up email in the user's email client.
   * Generates mailto: URL with subject and body pre-populated from item data.
   * 
   * @param {Object} row - Supply chain item with required fields:
   *   - emailFournisseur or email: recipient (fallback: "")
   *   - qteEcheance or quantiteEcheancee: quantity expected
   *   - designation: item description
   *   - article: item code
   *   - nomProjet: project name
   *   - dateEcheance: due date
   *   - nomFournisseur: supplier name
   * @returns {void} Redirects to mailto: URL
   */
  const openRelanceEmail = (row) => {
    // Extract recipient email with fallback chain
    const to = row.emailFournisseur || row.email || "";
    
    // Extract quantity due with fallback chain
    const qteEcheance = row.qteEcheance ?? row.quantiteEcheancee ?? "-";
    
    // Generate email subject with item context
    const subject = `[URGENT] Relance Livraison - ${row.designation || "-"} (Réf : ${row.article || "-"}) - Projet : ${row.nomProjet || "-"}`;
    
    // Generate email body as array of lines, joined with CRLF for email format
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

    // URL-encode subject and body for safe transmission in mailto: URL
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    
    // Construct and execute mailto: URL
    // Browser will open default email client with pre-filled message
    const mailtoLink = `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`;
    window.location.href = mailtoLink;
  };

  return { isRelanceEligible, openRelanceEmail };
}
