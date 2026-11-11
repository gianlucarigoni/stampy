import { describe, expect, it } from "vitest";
import { classifyGoogleEmail } from "../../src/api/auth/google/google-email";

// "autorevole" = Google garantisce l'indirizzo (Gmail, oppure Workspace con `hd`):
//   ammesso il collegamento automatico a un utente esistente.
// "terzi" = indirizzo non Gmail e senza `hd`, verificato da Google: ammesso l'accesso
//   (account nuovo) ma non il collegamento automatico. CONTEXT.md §5.3 (aggiornato dal proprietario).
// "non-verificata" = Google non garantisce la verifica: rifiuto sempre.
describe("classifyGoogleEmail", () => {
  it("@gmail.com con email_verified true → autorevole", () => {
    expect(classifyGoogleEmail({ email: "mario@gmail.com", emailVerified: true })).toBe("autorevole");
  });

  it("@gmail.com con email_verified false → non-verificata", () => {
    expect(classifyGoogleEmail({ email: "mario@gmail.com", emailVerified: false })).toBe("non-verificata");
  });

  it("dominio Workspace con hd e email_verified true → autorevole", () => {
    expect(classifyGoogleEmail({ email: "anna@azienda.it", emailVerified: true, hd: "azienda.it" })).toBe(
      "autorevole",
    );
  });

  it("hd presente ma email_verified false → non-verificata", () => {
    expect(classifyGoogleEmail({ email: "anna@azienda.it", emailVerified: false, hd: "azienda.it" })).toBe(
      "non-verificata",
    );
  });

  it("libero.it verificata e senza hd → terzi", () => {
    expect(classifyGoogleEmail({ email: "luigi@libero.it", emailVerified: true })).toBe("terzi");
  });

  it("libero.it non verificata → non-verificata", () => {
    expect(classifyGoogleEmail({ email: "luigi@libero.it", emailVerified: false })).toBe("non-verificata");
  });

  it("domini che somigliano a gmail.com (gmail.com.evil.it, xgmail.com) → terzi, mai autorevole", () => {
    expect(classifyGoogleEmail({ email: "a@gmail.com.evil.it", emailVerified: true })).toBe("terzi");
    expect(classifyGoogleEmail({ email: "evil@xgmail.com", emailVerified: true })).toBe("terzi");
  });

  it("dominio gmail in maiuscolo (@GMAIL.com) → autorevole", () => {
    expect(classifyGoogleEmail({ email: "Mario@GMAIL.com", emailVerified: true })).toBe("autorevole");
  });
});
