/**
 * Test della funzione pura `splitStamps` (regola dei timbri, decisione 27/10/2026).
 *
 * Esecuzione (NON serve il server né il DB):
 *   npx tsx scripts/stamps-split.ts
 *
 * Lo staff inserisce QUANTI PRODOTTI sono stati consumati, premio compreso.
 * Ogni prodotto è un timbro tranne quello gratuito, che si ottiene al
 * raggiungimento della soglia e consuma una unità della quantità.
 *
 * Esempio di riferimento (soglia 10, card 0, quantità 15):
 *   10 timbri → prodotto 11 gratis → 4 timbri → card 4/10, 1 premio consumato.
 */
import { splitStamps } from "../src/utils/stamps";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(label: string, ok: boolean, detail = "") {
  console.log(`   ${ok ? "✔" : "✘"} ${label}${detail ? `  (${detail})` : ""}`);
  return ok;
}

const signature = (segments: { type: string; quantity: number }[]) =>
  segments.map((s) => `${s.type}:${s.quantity}`).join(",");

type Case = {
  name: string;
  required: number;
  current: number;
  quantity: number;
  segments: string;
  finalCount: number;
  rewards: number;
};

const cases: Case[] = [
  // --- un solo giro, senza arrivare alla soglia ---
  { name: "0/10 + 1 prodotto", required: 10, current: 0, quantity: 1, segments: "stamp:1", finalCount: 1, rewards: 0 },
  { name: "0/10 + 9 prodotti", required: 10, current: 0, quantity: 9, segments: "stamp:9", finalCount: 9, rewards: 0 },
  { name: "5/10 + 0 prodotti", required: 10, current: 5, quantity: 0, segments: "", finalCount: 5, rewards: 0 },

  // --- soglia raggiunta esattamente: la card resta piena, premio disponibile ---
  {
    name: "0/10 + 10 prodotti (soglia esatta, premio disponibile)",
    required: 10,
    current: 0,
    quantity: 10,
    segments: "stamp:10",
    finalCount: 10,
    rewards: 0,
  },
  {
    name: "3/10 + 7 prodotti (soglia esatta)",
    required: 10,
    current: 3,
    quantity: 7,
    segments: "stamp:7",
    finalCount: 10,
    rewards: 0,
  },
  {
    name: "9/10 + 1 prodotto (soglia esatta)",
    required: 10,
    current: 9,
    quantity: 1,
    segments: "stamp:1",
    finalCount: 10,
    rewards: 0,
  },

  // --- il prodotto in premio consuma una unità della quantità ---
  {
    name: "0/10 + 11 prodotti (10 timbri + 1 gratis)",
    required: 10,
    current: 0,
    quantity: 11,
    segments: "stamp:10,redeem:1",
    finalCount: 0,
    rewards: 1,
  },
  {
    name: "0/10 + 15 prodotti (esempio di riferimento)",
    required: 10,
    current: 0,
    quantity: 15,
    segments: "stamp:10,redeem:1,stamp:4",
    finalCount: 4,
    rewards: 1,
  },
  {
    name: "3/10 + 8 prodotti",
    required: 10,
    current: 3,
    quantity: 8,
    segments: "stamp:7,redeem:1",
    finalCount: 0,
    rewards: 1,
  },
  {
    name: "3/10 + 15 prodotti",
    required: 10,
    current: 3,
    quantity: 15,
    segments: "stamp:7,redeem:1,stamp:7",
    finalCount: 7,
    rewards: 1,
  },
  {
    name: "9/10 + 2 prodotti (ultimo timbro + premio)",
    required: 10,
    current: 9,
    quantity: 2,
    segments: "stamp:1,redeem:1",
    finalCount: 0,
    rewards: 1,
  },
  {
    name: "9/10 + 15 prodotti (due premi)",
    required: 10,
    current: 9,
    quantity: 15,
    segments: "stamp:1,redeem:1,stamp:10,redeem:1,stamp:2",
    finalCount: 2,
    rewards: 2,
  },
  {
    name: "0/10 + 22 prodotti (due giri completi)",
    required: 10,
    current: 0,
    quantity: 22,
    segments: "stamp:10,redeem:1,stamp:10,redeem:1",
    finalCount: 0,
    rewards: 2,
  },
  {
    name: "0/10 + 21 prodotti (secondo giro esatto, premio disponibile)",
    required: 10,
    current: 0,
    quantity: 21,
    segments: "stamp:10,redeem:1,stamp:10",
    finalCount: 10,
    rewards: 1,
  },

  // --- card già piena: il primo prodotto è gratis ---
  {
    name: "card piena 10/10 + 1 prodotto",
    required: 10,
    current: 10,
    quantity: 1,
    segments: "redeem:1",
    finalCount: 0,
    rewards: 1,
  },
  {
    name: "card piena 10/10 + 11 prodotti",
    required: 10,
    current: 10,
    quantity: 11,
    segments: "redeem:1,stamp:10",
    finalCount: 10,
    rewards: 1,
  },

  // --- soglia 1 (promozione degenere, ma non deve ciclare) ---
  {
    name: "soglia 1: 0/1 + 3 prodotti",
    required: 1,
    current: 0,
    quantity: 3,
    segments: "stamp:1,redeem:1,stamp:1",
    finalCount: 1,
    rewards: 1,
  },
  {
    name: "soglia 1: 0/1 + 4 prodotti",
    required: 1,
    current: 0,
    quantity: 4,
    segments: "stamp:1,redeem:1,stamp:1,redeem:1",
    finalCount: 0,
    rewards: 2,
  },

  // --- tetto della conferma ---
  {
    name: "tetto conferma: 0/10 + 50 prodotti",
    required: 10,
    current: 0,
    quantity: 50,
    segments: "stamp:10,redeem:1,stamp:10,redeem:1,stamp:10,redeem:1,stamp:10,redeem:1,stamp:6",
    finalCount: 6,
    rewards: 4,
  },
];

async function main() {
  console.log("Test di splitStamps (funzione pura)\n");

  for (const c of cases) {
    console.log(`▶ ${c.name}`);
    const result = splitStamps(c.required, c.current, c.quantity);
    const stamps = result.segments.filter((s) => s.type === "stamp").reduce((n, s) => n + s.quantity, 0);
    const redeems = result.segments.filter((s) => s.type === "redeem").length;
    const last = result.segments[result.segments.length - 1];

    const checks = [
      check("tratti attesi", signature(result.segments) === c.segments, signature(result.segments)),
      check("saldo finale", result.finalCount === c.finalCount, `${result.finalCount}`),
      check("premi consumati", result.rewards === c.rewards, `${result.rewards}`),
      // ogni prodotto è o un timbro o il premio: il premio consuma una unità
      check(
        "timbri + premi = quantità",
        stamps + result.rewards === c.quantity,
        `${stamps} + ${result.rewards} vs ${c.quantity}`,
      ),
      check("premi = numero di tratti redeem", redeems === result.rewards, `${redeems}`),
      check(
        "saldo finale in [0, soglia]",
        result.finalCount >= 0 && result.finalCount <= c.required,
        `${result.finalCount}`,
      ),
      // se la card resta piena il premio non è stato consumato: l'ultimo tratto è un timbro
      check(
        "card piena solo se il premio non è stato consumato",
        result.finalCount !== c.required || last?.type === "stamp",
        `${result.finalCount} / ultimo ${last?.type ?? "nessuno"}`,
      ),
      check(
        "tratti alternati e non vuoti",
        result.segments.every((s, i) => s.quantity >= 1 && (i === 0 || s.type !== result.segments[i - 1].type)),
      ),
    ];

    const ok = checks.every(Boolean);
    ok ? passed++ : (failed++, failures.push(c.name));
  }

  // input impossibili: devono lanciare, non ciclare
  console.log("\n▶ input impossibili");
  const invalid: [string, () => unknown][] = [
    ["soglia 0", () => splitStamps(0, 0, 1)],
    ["saldo negativo", () => splitStamps(10, -1, 1)],
    ["saldo oltre la soglia", () => splitStamps(10, 11, 1)],
    ["quantità negativa", () => splitStamps(10, 0, -1)],
    ["quantità non intera", () => splitStamps(10, 0, 1.5)],
  ];
  const invalidOk = invalid.map(([label, fn]) => {
    let threw = false;
    try {
      fn();
    } catch {
      threw = true;
    }
    return check(`${label} -> errore`, threw);
  });
  invalidOk.every(Boolean) ? passed++ : (failed++, failures.push("input impossibili"));

  console.log("\n==============================");
  console.log(`Passati: ${passed}   Falliti: ${failed}`);
  failures.forEach((f) => console.log(`  - ${f}`));
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
