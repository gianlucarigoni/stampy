export type GoogleEmailClaims = { email: string; emailVerified: boolean; hd?: string };

// - autorevole: Google garantisce l'indirizzo (Gmail, oppure Workspace con `hd`): collegamento automatico ammesso.
// - terzi: indirizzo non Gmail e senza `hd`, verificato da Google: ammesso l'accesso con un account nuovo,
//   mai il collegamento automatico a un utente esistente (CONTEXT.md §5.3).
// - non-verificata: Google non garantisce la verifica: rifiuto sempre.
export type GoogleEmailTrust = "autorevole" | "terzi" | "non-verificata";

export function classifyGoogleEmail(c: GoogleEmailClaims): GoogleEmailTrust {
  if (!c.emailVerified) return "non-verificata";
  const isGmail = c.email.trim().toLowerCase().endsWith("@gmail.com");
  return isGmail || !!c.hd ? "autorevole" : "terzi";
}
