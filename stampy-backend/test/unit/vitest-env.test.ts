import { describe, expect, it } from "vitest";
import { ConsoleEmailSender, emailSender } from "../../src/utils/email/email-sender";

// C17: i test non devono mai usare il sender reale, qualunque cosa dica il .env.
describe("ambiente dei test: OTP_PROVIDER", () => {
  it("durante i test OTP_PROVIDER è 'console'", () => {
    expect(process.env.OTP_PROVIDER).toBe("console");
  });

  it("l'emailSender usato dall'app è un ConsoleEmailSender, non Gmail", () => {
    expect(emailSender).toBeInstanceOf(ConsoleEmailSender);
  });
});
