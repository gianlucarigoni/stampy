import { OTP_TTL_MINUTES } from "../../api/auth/otp/otp.service";

// Stile allineato al frontend (stampy.scss): arancione #f16417, sfondo scuro #171310 / #221c18.
// Solo CSS inline e nessuna risorsa esterna: i client email non caricano altro.
const BRAND = "#f16417";

export function renderOtpEmail(code: string): { subject: string; text: string; html: string } {
  const subject = "Il tuo codice Stampy";
  const text = `Il tuo codice Stampy è ${code}.\nÈ valido per ${OTP_TTL_MINUTES} minuti. Se non l'hai richiesto, ignora questa email.`;
  const html = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<style>
  @media (prefers-color-scheme: dark) {
    .bg { background-color: #171310 !important; }
    .card { background-color: #221c18 !important; }
    .txt { color: #f1ece8 !important; }
    .muted { color: #a89f98 !important; }
    .code { background-color: #171310 !important; }
  }
</style>
</head>
<body class="bg" style="margin:0;padding:0;background-color:#f6f3f0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="bg" style="background-color:#f6f3f0;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="card" style="max-width:440px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
      <tr><td style="background-color:${BRAND};padding:20px 28px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:.3px;">Stampy</td></tr>
      <tr><td class="txt" style="padding:28px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2b2621;">
        <p style="margin:0 0 8px;font-size:20px;font-weight:600;">Il tuo codice di accesso</p>
        <p class="muted" style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#6b625b;">Inseriscilo nella pagina di Stampy per accedere alla tua tessera.</p>
        <div class="code" style="background-color:#f6f3f0;border:2px solid ${BRAND};border-radius:12px;padding:18px;text-align:center;">
          <span style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:8px;color:${BRAND};">${code}</span>
        </div>
        <p class="muted" style="margin:20px 0 0;font-size:14px;line-height:1.5;color:#6b625b;">È valido per ${OTP_TTL_MINUTES} minuti. Se non l'hai richiesto tu, ignora questa email: nessuno può accedere senza il codice.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
  return { subject, text, html };
}
