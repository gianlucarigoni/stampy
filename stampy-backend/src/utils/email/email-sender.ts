import { env } from "../../config/env";
import { GmailEmailSender, type GmailOptions } from "./gmail-email-sender";

export interface EmailSender {
  sendOtp(to: string, code: string): Promise<void>;
}

export class ConsoleEmailSender implements EmailSender {
  constructor() {
    if (env.NODE_ENV === "production") {
      throw new Error("ConsoleEmailSender non può essere usato in produzione");
    }
  }
  async sendOtp(to: string, code: string): Promise<void> {
    console.log(`[DEV] codice per ${to}: ${code}`);
  }
}

// Prima la console (resta il codice nel log anche se Gmail fallisce), poi Gmail.
class BothEmailSender implements EmailSender {
  constructor(
    private readonly first: EmailSender,
    private readonly second: EmailSender,
  ) {}
  async sendOtp(to: string, code: string): Promise<void> {
    await this.first.sendOtp(to, code);
    await this.second.sendOtp(to, code);
  }
}

export type EmailProvider = "console" | "gmail" | "both";

function gmailFromEnv(): GmailOptions {
  // env.ts garantisce le credenziali quando il provider non è "console".
  return { user: env.GMAIL_USER!, appPassword: env.GMAIL_APP_PASSWORD! };
}

export function createEmailSender(provider: EmailProvider, gmail?: GmailOptions): EmailSender {
  if (provider === "console") return new ConsoleEmailSender();
  const gmailSender = new GmailEmailSender(gmail ?? gmailFromEnv());
  if (provider === "gmail") return gmailSender;
  return new BothEmailSender(new ConsoleEmailSender(), gmailSender);
}

export const emailSender: EmailSender = createEmailSender(env.OTP_PROVIDER);
