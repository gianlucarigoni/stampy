import nodemailer, { type Transporter } from "nodemailer";
import type { EmailSender } from "./email-sender";
import { renderOtpEmail } from "./otp-email";

export type GmailOptions = { user: string; appPassword: string; transport?: Transporter };

export class GmailEmailSender implements EmailSender {
  private readonly transport: Transporter;
  private readonly user: string;

  constructor(opts: GmailOptions) {
    this.user = opts.user;
    this.transport =
      opts.transport ??
      nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: opts.user, pass: opts.appPassword },
      });
  }

  async sendOtp(to: string, code: string): Promise<void> {
    const { subject, text, html } = renderOtpEmail(code);
    try {
      await this.transport.sendMail({ from: { name: "Stampy", address: this.user }, to, subject, text, html });
    } catch (err) {
      // Visibile anche in sviluppo. Solo il messaggio dell'errore: mai destinatario o codice nei log.
      console.error("[EMAIL] invio fallito:", err instanceof Error ? err.message : "errore sconosciuto");
      throw err;
    }
  }
}
