const BASE = "http://localhost:3000/api";
const VENUE_ID = "d666151f-251c-453d-b00e-7cdb9d9d04ff";
const USER_ID = "d651abfd-663f-45c8-b3c1-53c383bc6d62";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString();

async function main() {
  const visitRes = await fetch(`${BASE}/venues/${VENUE_ID}/visit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: USER_ID }),
  });
  const visitBody: any = await visitRes.json();
  console.log(`[${stamp()}] POST visit -> ${visitRes.status}`, visitBody);

  const requestId = visitBody.requestId;
  if (!requestId) {
    console.log("Nessun requestId nella risposta (card appena creata?). Esco.");
    return;
  }

  while (true) {
    await sleep(2000);
    const res = await fetch(`${BASE}/requests/${requestId}`);
    const body: any = await res.json();
    console.log(`[${stamp()}] GET request -> ${res.status}`, body);

    if (res.status !== 200) break; // 404, 400, 500: inutile continuare
    if (body.status && body.status !== "pending") break; // expired, approved, rejected
  }
}

main().catch((e) => console.error("Errore:", e));
