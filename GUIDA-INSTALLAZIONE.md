# 🚀 GUIDA COMPLETA - INSTALLAZIONE CHATBOT FISCALE

## 📋 PANORAMICA
Questa guida ti accompagna passo-passo nell'installazione del chatbot fiscale sul tuo sito WordPress.

---

## FASE 1: SETUP LOCALE (Sul tuo computer)

### Step 1.1: Verifica Node.js
Apri il Prompt dei comandi e digita:
```
node --version
npm --version
```
Dovresti vedere due numeri di versione (es: v20.11.0 e 10.2.4)

### Step 1.2: Scarica i file del progetto
1. Estrai i file che ti ho fornito in una cartella (es: C:\chatbot-fiscale)
2. Apri il Prompt dei comandi
3. Vai nella cartella:
   ```
   cd C:\chatbot-fiscale
   ```

### Step 1.3: Installa le dipendenze
Nel Prompt dei comandi, digita:
```
npm install
```
Aspetta che finisca (può richiedere 1-2 minuti)

### Step 1.4: Configura le variabili d'ambiente
1. Copia il file `.env.template` e rinominalo in `.env`
2. Apri `.env` con Notepad
3. Modifica queste righe:
   ```
   ANTHROPIC_API_KEY=sk-ant-TUA_API_KEY_QUI
   ALLOWED_ORIGINS=https://tuosito.com
   ```
4. Sostituisci:
   - `TUA_API_KEY_QUI` con la tua API key di Anthropic
   - `tuosito.com` con il dominio del tuo sito WordPress

### Step 1.5: Test locale
Nel Prompt dei comandi, digita:
```
npm start
```

Se vedi: "🚀 Server chatbot fiscale avviato su porta 3000" → PERFETTO!

Premi Ctrl+C per fermarlo.

---

## FASE 2: DEPLOY SU RENDER (Hosting gratuito)

### Step 2.1: Crea account Render
1. Vai su https://render.com
2. Clicca "Get Started for Free"
3. Registrati con email/GitHub

### Step 2.2: Crea un nuovo Web Service
1. Clicca "New +" → "Web Service"
2. Scegli "Deploy from GitHub" (o "Public Git Repository")

#### OPZIONE A - Con GitHub (Consigliato)
1. Connetti il tuo account GitHub
2. Crea un nuovo repository su GitHub
3. Carica i file del progetto
4. Seleziona il repository su Render

#### OPZIONE B - Senza GitHub
1. Seleziona "Public Git Repository"
2. Usa questo comando per creare un repository temporaneo:
   - Installa Git da https://git-scm.com
   - Nel Prompt dei comandi (nella cartella del progetto):
     ```
     git init
     git add .
     git commit -m "Initial commit"
     ```
   - Puoi usare servizi come GitLab (gratuito) per hostare il codice

### Step 2.3: Configura il servizio su Render
Compila i campi:
- **Name**: chatbot-fiscale (o un nome a tua scelta)
- **Region**: Frankfurt (più vicino all'Italia)
- **Branch**: main
- **Runtime**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Instance Type**: Free

### Step 2.4: Aggiungi le variabili d'ambiente
Nella sezione "Environment":
1. Clicca "Add Environment Variable"
2. Aggiungi:
   - **Key**: `ANTHROPIC_API_KEY`
   - **Value**: la tua API key (sk-ant-...)
   
3. Aggiungi:
   - **Key**: `ALLOWED_ORIGINS`
   - **Value**: https://tuosito.com (il tuo dominio WordPress)

### Step 2.5: Deploy!
1. Clicca "Create Web Service"
2. Aspetta 2-5 minuti che venga deployato
3. Quando vedi "Live", il tuo backend è online! 🎉
4. Copia l'URL (es: https://chatbot-fiscale-xxxx.onrender.com)

---

## FASE 3: INTEGRAZIONE IN WORDPRESS

### Step 3.1: Prepara il codice widget
1. Apri il file `wordpress-widget.html`
2. Trova questa riga:
   ```javascript
   const BACKEND_URL = 'YOUR_BACKEND_URL';
   ```
3. Sostituisci con l'URL di Render:
   ```javascript
   const BACKEND_URL = 'https://chatbot-fiscale-xxxx.onrender.com';
   ```
4. Copia TUTTO il contenuto del file

### Step 3.2: Installa in WordPress

#### METODO 1 - Personalizza → HTML Aggiuntivo (Più semplice)
1. Vai in WordPress → Aspetto → Personalizza
2. Cerca "HTML Aggiuntivo" o "Additional CSS/JS"
3. Incolla il codice nella sezione "Prima di </body>" o "Footer"
4. Clicca "Pubblica"

#### METODO 2 - Plugin "Insert Headers and Footers"
1. Vai in Plugin → Aggiungi nuovo
2. Cerca "Insert Headers and Footers"
3. Installa e attiva
4. Vai in Impostazioni → Insert Headers and Footers
5. Incolla il codice nella sezione "Footer"
6. Salva

#### METODO 3 - Modifica tema (Avanzato)
1. Vai in Aspetto → Editor del tema
2. Apri `footer.php`
3. Incolla il codice prima di `</body>`
4. Salva

### Step 3.3: Verifica funzionamento
1. Visita il tuo sito WordPress
2. Dovresti vedere il pulsante del chatbot in basso a destra (⚖️)
3. Cliccaci sopra per aprirlo
4. Prova a fare una domanda: "Quali sono le scadenze fiscali?"

---

## 🎨 PERSONALIZZAZIONE

### Cambiare i colori
Nel file `wordpress-widget.html`, cerca questa sezione CSS:
```css
background: linear-gradient(135deg, #1e3a8a 0%, #dc2626 100%);
```

Sostituisci i colori:
- `#1e3a8a` (blu scuro) → il tuo colore primario
- `#dc2626` (rosso) → il tuo colore secondario

### Cambiare posizione del widget
Nel CSS, cerca:
```css
.fiscal-chatbot-widget {
    bottom: 24px;
    right: 24px;
}
```

Modifica per spostarlo (es: `left: 24px` invece di `right: 24px`)

### Cambiare il messaggio di benvenuto
Nel codice HTML, cerca:
```html
<div class="fiscal-message-content">
    Ciao! Sono il tuo assistente...
</div>
```
E modifica il testo.

---

## 🔒 SICUREZZA

### Proteggere l'API Key
✅ L'API key è sul server Render (non nel codice WordPress)
✅ CORS è configurato solo per il tuo dominio
✅ Mai condividere il file `.env`

### Limitare i domini autorizzati
In Render, modifica `ALLOWED_ORIGINS`:
```
https://tuosito.com,https://www.tuosito.com
```
Aggiungi tutti i tuoi domini separati da virgola.

---

## 📊 MONITORAGGIO

### Controllare i log su Render
1. Vai su Render.com
2. Seleziona il tuo servizio
3. Clicca su "Logs"
4. Vedi tutte le richieste in tempo reale

### Controllare l'uso dell'API
1. Vai su https://console.anthropic.com
2. Clicca su "Usage" nel menu
3. Vedi quante richieste hai fatto e quanto hai speso

---

## ❓ RISOLUZIONE PROBLEMI

### Il chatbot non appare su WordPress
- Controlla che il codice sia stato incollato correttamente
- Svuota la cache di WordPress (plugin o browser)
- Verifica che non ci siano conflitti con altri plugin

### Errore "Failed to fetch" o "Network error"
- Verifica che l'URL del backend sia corretto nel widget
- Controlla che il servizio su Render sia "Live"
- Verifica che ALLOWED_ORIGINS includa il tuo dominio

### Il chatbot risponde lentamente
- Render Free può "dormire" dopo 15 min di inattività
- La prima richiesta dopo il "risveglio" può richiedere 30-60 secondi
- Considera l'upgrade a piano pagato per prestazioni migliori

### Errore 429 (Too Many Requests)
- Hai superato il limite di richieste dell'API
- Aspetta qualche minuto
- Considera l'upgrade del piano Anthropic

---

## 💰 COSTI

### Render (Hosting Backend)
- **Free tier**: 750 ore/mese GRATIS
- **Paid tier**: $7/mese per performance migliori

### Anthropic API
- **Prezzo**: ~$3 per 1 milione di token input, ~$15 per 1 milione token output
- **Stima**: ~500 conversazioni = $1-2
- Primo mese spesso include crediti gratuiti

---

## 📞 SUPPORTO

### Se hai problemi:
1. Controlla i log su Render
2. Verifica il file `.env`
3. Testa il backend direttamente: https://tuo-backend.onrender.com/health
4. Controlla la console del browser (F12) per errori JavaScript

### Aggiornamenti futuri:
- Puoi modificare il codice e fare deploy su Render
- Render rileverà automaticamente i cambiamenti da GitHub
- Per aggiornare il widget WordPress, modifica il codice nel pannello

---

## ✅ CHECKLIST FINALE

Prima di considerare il progetto completo, verifica:

- [ ] Node.js installato e funzionante
- [ ] Account Anthropic creato e API key ottenuta
- [ ] Progetto deployato su Render con successo
- [ ] Variabili d'ambiente configurate correttamente
- [ ] Widget installato in WordPress
- [ ] Chatbot visibile sul sito
- [ ] Test con domanda fiscale funzionante
- [ ] Fonti citate correttamente nelle risposte

---

## 🎓 PROSSIMI PASSI (OPZIONALI)

### Miglioramenti possibili:
1. **Analytics**: Traccia quali domande fanno gli utenti
2. **Upload documenti**: Abilita l'upload di PDF dal widget
3. **Chat multipli**: Supporta più conversazioni simultanee
4. **Backup conversazioni**: Salva le chat su database
5. **Design personalizzato**: Adatta completamente al tuo brand

---

**Congratulazioni! Il tuo chatbot fiscale AI è pronto! 🎉**
