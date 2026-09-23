# Hashira Hub - ITA · Sito in tempo reale

Sito collegato al server Discord e al bot: membri online/offline/totali, staff, info del server e comandi del bot si aggiornano da soli.

## Struttura

```
hashira-hub/
├── .env               ← lo crei tu (token del bot)
├── .env.example       ← modello del file .env
├── .gitignore
├── package.json
├── server.js          ← bot + server web + aggiornamenti live
└── public/
    └── index.html     ← il sito (Home, Staff, Info)
```

## 1. Configura il bot nel Developer Portal

Vai su https://discord.com/developers/applications, apri il tuo bot e poi **Bot**:

1. Attiva **Presence Intent** (serve per online/offline).
2. Attiva **Server Members Intent** (serve per membri e staff).
3. Attiva **Message Content Intent** (serve per leggere il testo degli annunci).
4. Copia il token con **Reset Token**.

Il bot deve essere già nel server (usa il tuo link d'invito).

## 2. Crea il file .env

Copia `.env.example`, rinominalo `.env` e incolla il token:

```
DISCORD_TOKEN=il_tuo_token
```

## 3. Avvia

Serve Node.js 20.6 o più recente.

```
npm install
npm start
```

Apri http://localhost:3000. Nel terminale vedrai "Bot online come ...".

## 4. Mettilo online 24 ore su 24

Serve un hosting che faccia girare Node.js (Railway, Render, un VPS, ecc.):

- Comando di build: `npm install`
- Comando di avvio: `npm start`
- Variabile d'ambiente: `DISCORD_TOKEN` (sui servizi cloud si imposta nel pannello, senza file `.env`)

Su alcuni servizi il comando `npm start` non trova il file `.env`: se succede, usa `node server.js` come comando di avvio e imposta il token dal pannello.

## Cosa si aggiorna e quando

| Cosa | Quando |
| --- | --- |
| Membri online/offline/totali | Subito (meno di 1 secondo) |
| Annunci (nuovi, modificati, eliminati) | Subito |
| Staff e ruoli | Subito |
| Canali, ruoli, boost | Subito |
| Comandi del bot | Entro 60 secondi |

## Se qualcosa non funziona

- **Contatori a "–" o zero:** controlla i due Intent nel Developer Portal.
- **Staff vuoto:** verifica gli ID dei ruoli in cima a `server.js` (lista `ROLES`).
- **Annunci vuoti o senza testo:** controlla il Message Content Intent e che il bot veda il canale annunci.
- **Errore "Used disallowed intents":** gli Intent non sono attivi.
- **Il pallino è rosso:** il server non è raggiungibile; controlla che `npm start` sia in esecuzione.
