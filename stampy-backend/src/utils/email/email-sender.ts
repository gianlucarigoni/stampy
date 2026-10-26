import { env } from "../../config/env";

export interface EmailSender {
  sendOtp(to: string, code: string): Promise<void>;
}

class ConsoleEmailSender implements EmailSender {
  constructor() {
    if (env.NODE_ENV === "production") {
      throw new Error("ConsoleEmailSender non può essere usato in produzione");
    }
  }
  async sendOtp(to: string, code: string): Promise<void> {
    console.log(`[DEV] codice per ${to}: ${code}`);
  }
}

export const emailSender: EmailSender = new ConsoleEmailSender();
