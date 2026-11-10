import { afterEach, describe, expect, it, vi } from "vitest";
import nodemailer from "nodemailer";
import { createEmailSender } from "../../src/utils/email/email-sender";
import { GmailEmailSender } from "../../src/utils/email/gmail-email-sender";
import { renderOtpEmail } from "../../src/utils/email/otp-email";

// Mai invii reali: il transport è `jsonTransport` di nodemailer, che serializza il messaggio senza spedirlo.
const USER = "stampy@gmail.com";
const gmailOpts = (transport = nodemailer.createTransport({ jsonTransport: true })) => ({
  user: USER,
  appPassword: "abcdabcdabcdabcd",
  transport,
});
const failingTransport = () =>
  ({ sendMail: vi.fn().mockRejectedValue(new Error("SMTP giù")) }) as unknown as ReturnType<typeof nodemailer.createTransport>;

const TO = "cliente@test.it";
const CODE = "482915";

afterEach(() => vi.restoreAllMocks());

describe("renderOtpEmail", () => {
  it("l'HTML contiene il codice e i minuti di validità", () => {
    const { html } = renderOtpEmail(CODE);
    expect(html).toContain(CODE);
    expect(html).toMatch(/5 minuti/);
  });

  it("la versione testo contiene il codice (fallback per i client senza HTML)", () => {
    expect(renderOtpEmail(CODE).text).toContain(CODE);
  });

  it("usa il colore del brand del frontend (#f16417)", () => {
    expect(renderOtpEmail(CODE).html.toLowerCase()).toContain("#f16417");
  });

  it("nessuno script né risorse esterne (immagini/CSS remoti)", () => {
    const { html } = renderOtpEmail(CODE);
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/(src|href)=["']https?:/i);
  });
});

describe("GmailEmailSender", () => {
  it("invia un solo messaggio, al destinatario indicato", async () => {
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const spy = vi.spyOn(transport, "sendMail");
    await new GmailEmailSender(gmailOpts(transport)).sendOtp(TO, CODE);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toMatchObject({ to: TO });
  });

  it("il corpo (testo e HTML) contiene il codice", async () => {
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const spy = vi.spyOn(transport, "sendMail");
    await new GmailEmailSender(gmailOpts(transport)).sendOtp(TO, CODE);
    const msg = spy.mock.calls[0][0] as { text: string; html: string };
    expect(msg.text).toContain(CODE);
    expect(msg.html).toContain(CODE);
  });

  it("il From è l'account Gmail configurato", async () => {
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const spy = vi.spyOn(transport, "sendMail");
    await new GmailEmailSender(gmailOpts(transport)).sendOtp(TO, CODE);
    expect(JSON.stringify((spy.mock.calls[0][0] as { from: unknown }).from)).toContain(USER);
  });

  it("se il transport fallisce, sendOtp rigetta", async () => {
    await expect(new GmailEmailSender(gmailOpts(failingTransport())).sendOtp(TO, CODE)).rejects.toThrow();
  });

  it("se il transport fallisce, l'errore è visibile sulla console (anche in sviluppo) senza email né codice", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await new GmailEmailSender(gmailOpts(failingTransport())).sendOtp(TO, CODE).catch(() => {});
    expect(err).toHaveBeenCalled();
    const logged = JSON.stringify(err.mock.calls);
    expect(logged).toContain("SMTP giù");
    expect(logged).not.toContain(TO);
    expect(logged).not.toContain(CODE);
  });
});

describe("createEmailSender: selezione del provider", () => {
  it("console → logga il codice e non invia email", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const send = vi.spyOn(transport, "sendMail");
    await createEmailSender("console", gmailOpts(transport)).sendOtp(TO, CODE);
    expect(log).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
  });

  it("gmail → invia l'email e non logga il codice", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const send = vi.spyOn(transport, "sendMail");
    await createEmailSender("gmail", gmailOpts(transport)).sendOtp(TO, CODE);
    expect(send).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalled();
  });

  it("both → logga sulla console E invia l'email, con la console per prima", async () => {
    const order: string[] = [];
    vi.spyOn(console, "log").mockImplementation(() => void order.push("console"));
    const transport = nodemailer.createTransport({ jsonTransport: true });
    vi.spyOn(transport, "sendMail").mockImplementation((async () => void order.push("gmail")) as never);
    await createEmailSender("both", gmailOpts(transport)).sendOtp(TO, CODE);
    expect(order).toEqual(["console", "gmail"]);
  });

  it("both con Gmail che fallisce → sendOtp rigetta, ma la console ha già loggato il codice", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(createEmailSender("both", gmailOpts(failingTransport())).sendOtp(TO, CODE)).rejects.toThrow();
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(log.mock.calls)).toContain(CODE);
  });
});
