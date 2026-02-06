# 🤖 Chatbot Fiscale AI - Backend

Assistente intelligente specializzato in materia fiscale, previdenziale e contabile italiana.

## 🌟 Caratteristiche

- ✅ **Ricerca intelligente** su fonti istituzionali affidabili
- ✅ **Citazioni precise** con link diretti alle fonti
- ✅ **Upload documenti PDF** per knowledge base personalizzata
- ✅ **API sicure** con CORS configurabile
- ✅ **Integrazione WordPress** facile e veloce

## 🚀 Quick Start

### Requisiti
- Node.js 18+ 
- Account Anthropic (per API key)

### Installazione locale

1. **Clona o scarica il progetto**
   ```bash
   cd chatbot-fiscale
   ```

2. **Installa dipendenze**
   ```bash
   npm install
   ```

3. **Configura variabili d'ambiente**
   - Copia `.env.template` → `.env`
   - Aggiungi la tua `ANTHROPIC_API_KEY`
   - Configura `ALLOWED_ORIGINS` con il dominio del tuo sito

4. **Avvia il server**
   ```bash
   npm start
   ```

Il server sarà disponibile su `http://localhost:3000`

## 📁 Struttura File

```
chatbot-fiscale/
├── server.js              # Server Express principale
├── package.json           # Dipendenze Node.js
├── .env.template          # Template configurazione
├── .gitignore            # File da ignorare in Git
├── wordpress-widget.html  # Codice widget per WordPress
├── GUIDA-INSTALLAZIONE.md # Guida completa passo-passo
└── README.md             # Questo file
```

## 🔧 Configurazione

### Variabili d'ambiente (.env)

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
ALLOWED_ORIGINS=https://tuosito.com,https://www.tuosito.com
PORT=3000
```

### Fonti autorizzate

Il chatbot cerca informazioni SOLO su questi domini:
- agenziaentrate.gov.it
- inps.it
- fiscooggi.it
- ipsoa.it
- ilsole24ore.com

Per modificare la lista, edita l'array `TRUSTED_SOURCES` in `server.js`.

## 🌐 Deploy

### Render.com (Consigliato - Free tier disponibile)

1. Crea account su https://render.com
2. Crea nuovo "Web Service"
3. Connetti repository GitHub
4. Configura:
   - Build: `npm install`
   - Start: `npm start`
   - Aggiungi variabili d'ambiente
5. Deploy!

Vedi `GUIDA-INSTALLAZIONE.md` per istruzioni dettagliate.

## 🔌 API Endpoints

### POST /api/chat
Invia un messaggio al chatbot

**Request:**
```json
{
  "message": "Quali sono le scadenze fiscali di febbraio?",
  "conversationHistory": [],
  "uploadedDocs": []
}
```

**Response:**
```json
{
  "response": "Le principali scadenze fiscali di febbraio sono...",
  "sources": [
    {
      "title": "Scadenzario fiscale",
      "url": "https://agenziaentrate.gov.it/...",
      "domain": "agenziaentrate.gov.it"
    }
  ],
  "conversationId": "conv_123456..."
}
```

### POST /api/upload
Carica documenti PDF

**Request:** multipart/form-data con file PDF

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "id": "1234567-documento.pdf",
      "name": "documento.pdf",
      "size": 123456
    }
  ]
}
```

### GET /health
Verifica stato del server

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-02-06T10:30:00.000Z"
}
```

## 🔒 Sicurezza

- ✅ API key NON esposta nel frontend
- ✅ CORS configurabile per domini specifici
- ✅ Validazione input
- ✅ Rate limiting (gestito da Anthropic)
- ✅ File upload limitato a PDF (max 10MB)

## 🎨 Integrazione WordPress

1. Apri `wordpress-widget.html`
2. Sostituisci `YOUR_BACKEND_URL` con l'URL del tuo backend
3. Copia tutto il codice
4. Incolla in WordPress → Aspetto → Personalizza → HTML Aggiuntivo

Vedi `GUIDA-INSTALLAZIONE.md` per tutti i metodi di integrazione.

## 📊 Monitoraggio

### Log locali
```bash
npm start
# I log appariranno in console
```

### Log su Render
Dashboard → Tuo servizio → Logs

### Usage API Anthropic
https://console.anthropic.com → Usage

## 🐛 Debugging

### Test locale
```bash
curl http://localhost:3000/health
```

### Test endpoint chat
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Test"}'
```

### Errori comuni

**Error: Missing API key**
→ Verifica che `.env` contenga `ANTHROPIC_API_KEY`

**CORS error in browser**
→ Aggiungi il dominio del tuo sito a `ALLOWED_ORIGINS`

**Upload error**
→ Verifica che la cartella `uploads/` esista e sia scrivibile

## 💡 Personalizzazione

### Modificare il system prompt
In `server.js`, cerca la variabile `systemPrompt` e modifica le istruzioni.

### Aggiungere nuove fonti
Aggiungi domini all'array `TRUSTED_SOURCES`:
```javascript
const TRUSTED_SOURCES = [
    'agenziaentrate.gov.it',
    // ... altri domini
    'nuovafonte.it'
];
```

### Cambiare modello Claude
In `server.js`, modifica:
```javascript
model: 'claude-sonnet-4-20250514'
// Oppure: 'claude-opus-4-20250514'
```

## 📝 Licenza

MIT

## 🤝 Supporto

Per problemi o domande:
1. Controlla `GUIDA-INSTALLAZIONE.md`
2. Verifica i log del server
3. Consulta la documentazione Anthropic: https://docs.anthropic.com

## 🎯 Prossimi sviluppi

- [ ] Database per persistenza conversazioni
- [ ] Dashboard admin per analytics
- [ ] Supporto multi-lingua
- [ ] Integrazione con Stripe per payments
- [ ] App mobile companion

---

**Creato con ❤️ per professionisti fiscali e contabili**
