# Mockup tablet · Staff (chat 15)

Sorgente `mockup/tablet/staff.mjs`, HTML autonomo `mockup/tablet/staff/staff.html`, PNG scala 2 in `mockup/tablet/staff/png/`, esito validazione `mockup/tablet/staff/validate.json`. Schermate: L01-L02, Q01-Q11, SH01-SH03 e verifica orizzontale Q01h 1180×820.

D34 A (header con chip del locale, Coda con contatore, Storico, Profilo/Esci solo icona); D35 A (lista 264 + dettaglio; a 1180 lista 360): l'esito sta nel pannello di dettaglio, la riga diventa quieta, Scaduta/Già gestita restano selezionate; cambio locale = popover 300; storico a righe per giorno con pannello filtri a 3 colonne.

Validazione: tutti i frame validi al primo giro (contrasti, target ≥ 44, testo ≥ 13, nessuno scroll orizzontale, nessun URL esterno, dimensione dichiarata, header 64). Fonti: dir-i, `50-responsive-spec.md` con D34-D43, `21-design-system.md`, frame mobile. Dettagli per frame in `52-tablet-plan.md`.
