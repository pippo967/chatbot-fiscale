// server.js - Backend per Chatbot Fiscale
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurazione
const TRUSTED_SOURCES = [
    'agenziaentrate.gov.it',
    'inps.it',
    'fiscooggi.it',
    'ipsoa.it',
    'ilsole24ore.com'
];

// Middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Storage per file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo file PDF sono ammessi'));
        }
    }
});

// Inizializza Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint principale chat
app.post('/api/chat', async (req, res) => {
    try {
        const { message, conversationHistory = [], uploadedDocs = [] } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Messaggio non valido' });
        }

        // Costruisci il contesto dei documenti
        let documentContext = '';
        if (uploadedDocs.length > 0) {
            documentContext = `\n\nDocumenti caricati dall'utente:\n${uploadedDocs.map(d => `- ${d.name}`).join('\n')}`;
        }

        // System prompt specializzato
        const systemPrompt = `Sei un assistente esperto in materia fiscale, previdenziale e contabile italiana.

ISTRUZIONI CRITICHE:
1. Utilizza SEMPRE lo strumento web_search per trovare informazioni aggiornate
2. Cerca SOLO sui seguenti domini affidabili: ${TRUSTED_SOURCES.join(', ')}
3. Per ogni ricerca web, filtra i risultati per includere SOLO i domini autorizzati
4. Cita SEMPRE le fonti utilizzate indicando:
   - Il titolo della pagina/articolo
   - Il link diretto alla fonte
   - La data se disponibile
5. Se non trovi informazioni sui siti autorizzati, dillo chiaramente all'utente
6. Rispondi in modo chiaro, professionale ma accessibile
7. Indica sempre quando le informazioni potrebbero essere soggette a cambiamenti o necessitano di verifica con un professionista
8. Non dare mai consigli che potrebbero costituire consulenza fiscale diretta - rimanda sempre a commercialisti/consulenti per casi specifici${documentContext}

FORMATO RISPOSTA:
- Rispondi in modo strutturato e chiaro
- Alla fine della risposta, includi una sezione "📚 Fonti:" con i link utilizzati
- Se hai usato più fonti, numerale

Ricorda: Sei un assistente informativo, non sostituisci un commercialista professionista.`;

        // Prepara i messaggi
        const messages = [
            ...conversationHistory,
            { role: 'user', content: message }
        ];

        // Chiamata API con web search
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            system: systemPrompt,
            messages: messages,
            tools: [
                {
                    type: "web_search_20250305",
                    name: "web_search"
                }
            ]
        });

        // Estrai la risposta e le eventuali fonti
        let assistantMessage = '';
        let sources = [];
        let toolUseBlocks = [];

        for (const block of response.content) {
            if (block.type === 'text') {
                assistantMessage += block.text;
            } else if (block.type === 'tool_use') {
                toolUseBlocks.push(block);
            }
        }

        // Se Claude ha usato tool, potremmo avere fonti nei risultati
        // (nota: nella risposta attuale le fonti sono già incorporate nel testo da Claude)
        
        // Filtra fonti per domini trusted (extra sicurezza)
        const trustedSources = sources.filter(source => {
            try {
                const hostname = new URL(source.url).hostname;
                return TRUSTED_SOURCES.some(trusted => hostname.includes(trusted));
            } catch {
                return false;
            }
        });

        res.json({
            response: assistantMessage,
            sources: trustedSources,
            conversationId: req.body.conversationId || generateConversationId()
        });

    } catch (error) {
        console.error('Errore chat:', error);
        
        if (error.status === 429) {
            return res.status(429).json({ 
                error: 'Troppe richieste. Attendi qualche secondo e riprova.' 
            });
        }
        
        if (error.status === 401) {
            return res.status(500).json({ 
                error: 'Errore di configurazione del server. Contatta l\'amministratore.' 
            });
        }

        res.status(500).json({ 
            error: 'Si è verificato un errore. Riprova più tardi.' 
        });
    }
});

// Endpoint upload documenti
app.post('/api/upload', upload.array('documents', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Nessun file caricato' });
        }

        const uploadedFiles = req.files.map(file => ({
            id: file.filename,
            name: file.originalname,
            size: file.size,
            path: file.path
        }));

        res.json({
            success: true,
            files: uploadedFiles,
            message: `${uploadedFiles.length} file caricati con successo`
        });

    } catch (error) {
        console.error('Errore upload:', error);
        res.status(500).json({ error: 'Errore durante l\'upload dei file' });
    }
});

// Endpoint per ottenere info su un documento
app.get('/api/document/:id', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.id);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Documento non trovato' });
    }

    res.json({
        id: req.params.id,
        exists: true,
        size: fs.statSync(filePath).size
    });
});

// Funzione helper per generare ID conversazione
function generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Gestione errori globale
app.use((error, req, res, next) => {
    console.error('Errore non gestito:', error);
    res.status(500).json({ error: 'Errore interno del server' });
});

// Avvio server
app.listen(PORT, () => {
    console.log(`🚀 Server chatbot fiscale avviato su porta ${PORT}`);
    console.log(`📚 Domini autorizzati: ${TRUSTED_SOURCES.join(', ')}`);
    console.log(`🔐 CORS abilitato per: ${process.env.ALLOWED_ORIGINS || 'tutti i domini'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM ricevuto, chiusura server...');
    process.exit(0);
});
