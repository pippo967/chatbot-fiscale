// server.js - Backend per Chatbot Fiscale con Knowledge Base WordPress + PDF
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const pdfParse = require('pdf-parse');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurazione
const TRUSTED_SOURCES = [
    'agenziaentrate.gov.it',
    'inps.it',
    'fiscooggi.it',
    'ipsoa.it',
    'ilsole24ore.com',
    'stpappalardo.it' // Il tuo sito
];

// Knowledge Base in-memory
let knowledgeBase = {
    articles: [],
    pdfs: [],
    lastUpdate: null
};

// Middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Storage per file upload PDF
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './knowledge-base/pdfs';
        if (!fs.existsSync('./knowledge-base')) {
            fs.mkdirSync('./knowledge-base');
        }
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
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

// ========================================
// FUNZIONI WORDPRESS INTEGRATION
// ========================================

async function fetchWordPressArticles() {
    try {
        console.log('📥 Downloading articoli da WordPress...');
        
        const wpUrl = process.env.WP_SITE_URL || 'https://www.stpappalardo.it';
        const username = process.env.WP_USERNAME;
        const password = process.env.WP_PASSWORD;

        if (!username || !password) {
            console.warn('⚠️  Credenziali WordPress non configurate');
            return [];
        }

        // API REST WordPress endpoint per posts
        const apiUrl = `${wpUrl}/wp-json/wp/v2/posts?per_page=100`;
        
        const response = await axios.get(apiUrl, {
            auth: {
                username: username,
                password: password
            },
            params: {
                status: 'publish',
                _embed: true // Include autore e categorie
            }
        });

        const articles = response.data.map(post => ({
            id: post.id,
            title: post.title.rendered,
            content: stripHtml(post.content.rendered),
            excerpt: stripHtml(post.excerpt.rendered),
            url: post.link,
            date: post.date,
            categories: post._embedded?.['wp:term']?.[0]?.map(cat => cat.name) || [],
            source: 'Studio Pappalardo'
        }));

        console.log(`✅ Scaricati ${articles.length} articoli da WordPress`);
        return articles;

    } catch (error) {
        console.error('❌ Errore download WordPress:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
        return [];
    }
}

// Helper per rimuovere HTML
function stripHtml(html) {
    return html
        .replace(/<[^>]*>/g, '') // Rimuovi tag HTML
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/\s+/g, ' ') // Normalizza spazi
        .trim();
}

// ========================================
// FUNZIONI PDF PROCESSING
// ========================================

async function loadPDFsFromFolder() {
    try {
        const pdfFolder = './knowledge-base/pdfs';
        if (!fs.existsSync(pdfFolder)) {
            return [];
        }

        const files = fs.readdirSync(pdfFolder).filter(f => f.endsWith('.pdf'));
        const pdfs = [];

        for (const file of files) {
            try {
                const filePath = path.join(pdfFolder, file);
                const dataBuffer = fs.readFileSync(filePath);
                const data = await pdfParse(dataBuffer);

                pdfs.push({
                    filename: file,
                    title: file.replace(/^\d+-/, '').replace('.pdf', ''),
                    content: data.text,
                    pages: data.numpages,
                    path: filePath,
                    source: 'PDF Studio Pappalardo'
                });

                console.log(`📄 Caricato PDF: ${file} (${data.numpages} pagine)`);
            } catch (err) {
                console.error(`❌ Errore caricamento PDF ${file}:`, err.message);
            }
        }

        return pdfs;

    } catch (error) {
        console.error('❌ Errore caricamento PDFs:', error.message);
        return [];
    }
}

// ========================================
// FUNZIONI RICERCA KNOWLEDGE BASE
// ========================================

function searchInKnowledgeBase(query) {
    const results = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);

    // Cerca negli articoli WordPress
    for (const article of knowledgeBase.articles) {
        const titleLower = article.title.toLowerCase();
        const contentLower = article.content.toLowerCase();
        
        let score = 0;
        
        // Calcola rilevanza
        for (const word of queryWords) {
            if (titleLower.includes(word)) score += 3;
            if (contentLower.includes(word)) score += 1;
        }

        if (score > 0) {
            // Estrai snippet rilevante
            const snippet = extractRelevantSnippet(article.content, queryWords, 500);
            
            results.push({
                type: 'article',
                title: article.title,
                content: snippet,
                fullContent: article.content,
                url: article.url,
                date: article.date,
                source: article.source,
                score: score
            });
        }
    }

    // Cerca nei PDF
    for (const pdf of knowledgeBase.pdfs) {
        const contentLower = pdf.content.toLowerCase();
        const titleLower = pdf.title.toLowerCase();
        
        let score = 0;
        
        for (const word of queryWords) {
            if (titleLower.includes(word)) score += 3;
            if (contentLower.includes(word)) score += 1;
        }

        if (score > 0) {
            const snippet = extractRelevantSnippet(pdf.content, queryWords, 500);
            
            results.push({
                type: 'pdf',
                title: pdf.title,
                content: snippet,
                fullContent: pdf.content,
                filename: pdf.filename,
                source: pdf.source,
                score: score
            });
        }
    }

    // Ordina per rilevanza
    results.sort((a, b) => b.score - a.score);
    
    return results.slice(0, 5); // Top 5 risultati
}

function extractRelevantSnippet(text, keywords, maxLength = 500) {
    // Trova la posizione della prima keyword
    let bestPosition = 0;
    let maxScore = 0;

    for (let i = 0; i < text.length - maxLength; i += 100) {
        const chunk = text.substring(i, i + maxLength).toLowerCase();
        let score = 0;
        
        for (const keyword of keywords) {
            if (chunk.includes(keyword)) score++;
        }
        
        if (score > maxScore) {
            maxScore = score;
            bestPosition = i;
        }
    }

    // Estrai snippet
    let snippet = text.substring(bestPosition, bestPosition + maxLength);
    
    // Pulisci inizio e fine
    snippet = snippet.replace(/^\S+\s+/, ''); // Rimuovi parola parziale all'inizio
    snippet = snippet.replace(/\s+\S+$/, ''); // Rimuovi parola parziale alla fine
    
    return snippet.trim() + '...';
}

// ========================================
// AGGIORNAMENTO KNOWLEDGE BASE
// ========================================

async function updateKnowledgeBase() {
    console.log('🔄 Aggiornamento Knowledge Base...');
    
    const [articles, pdfs] = await Promise.all([
        fetchWordPressArticles(),
        loadPDFsFromFolder()
    ]);

    knowledgeBase.articles = articles;
    knowledgeBase.pdfs = pdfs;
    knowledgeBase.lastUpdate = new Date().toISOString();

    console.log(`✅ Knowledge Base aggiornata:`);
    console.log(`   📰 Articoli: ${articles.length}`);
    console.log(`   📄 PDF: ${pdfs.length}`);
}

// ========================================
// ENDPOINTS
// ========================================

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        knowledgeBase: {
            articles: knowledgeBase.articles.length,
            pdfs: knowledgeBase.pdfs.length,
            lastUpdate: knowledgeBase.lastUpdate
        }
    });
});

// Endpoint principale chat
app.post('/api/chat', async (req, res) => {
    try {
        const { message, conversationHistory = [] } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Messaggio non valido' });
        }

        // STEP 1: Cerca nella knowledge base interna (PRIORITÀ)
        const kbResults = searchInKnowledgeBase(message);
        
        let contextFromKB = '';
        let internalSources = [];

        if (kbResults.length > 0) {
            contextFromKB = '\n\n=== CONTENUTI INTERNI DELLO STUDIO (USA QUESTI COME FONTE PRIMARIA) ===\n\n';
            
            kbResults.forEach((result, idx) => {
                contextFromKB += `[FONTE INTERNA ${idx + 1}]\n`;
                contextFromKB += `Titolo: ${result.title}\n`;
                if (result.type === 'article') {
                    contextFromKB += `URL: ${result.url}\n`;
                    contextFromKB += `Data: ${new Date(result.date).toLocaleDateString('it-IT')}\n`;
                } else {
                    contextFromKB += `File: ${result.filename}\n`;
                }
                contextFromKB += `Contenuto: ${result.content}\n\n`;

                internalSources.push({
                    title: result.title,
                    url: result.url || result.filename,
                    domain: 'stpappalardo.it',
                    type: result.type,
                    isInternal: true
                });
            });
        }

        // System prompt specializzato con priorità knowledge base
        const systemPrompt = `Sei un assistente esperto dello Studio Pappalardo, specializzato in materia fiscale, previdenziale e contabile italiana.

ISTRUZIONI CRITICHE - ORDINE DI PRIORITÀ:

1. **PRIORITÀ ASSOLUTA**: Se trovi informazioni nei "CONTENUTI INTERNI DELLO STUDIO", usa SEMPRE quelli come fonte principale
2. Cita le fonti interne come "[STUDIO PAPPALARDO]" o "[PDF STUDIO]" 
3. Solo se i contenuti interni non sono sufficienti, usa lo strumento web_search sui domini: ${TRUSTED_SOURCES.join(', ')}
4. Quando usi fonti esterne, indica chiaramente che sono "fonti istituzionali di supporto"
5. FORMATO CITAZIONI:
   - Fonti interne: "📘 Fonte: Studio Pappalardo - [Titolo]"
   - Fonti esterne: "📚 Fonte istituzionale: [Nome sito]"

STILE DI RISPOSTA:
- Professionale ma accessibile
- Strutturato e chiaro
- Sempre disclaimer: "Per casi specifici, contatta lo Studio Pappalardo per una consulenza personalizzata"

${contextFromKB}

Ricorda: Sei l'assistente dello Studio Pappalardo - dai priorità ai nostri contenuti!`;

        // Prepara messaggi
        const messages = [
            ...conversationHistory,
            { role: 'user', content: message }
        ];

        // Chiamata API
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

        // Estrai risposta
        let assistantMessage = '';
        let toolUseBlocks = [];

        for (const block of response.content) {
            if (block.type === 'text') {
                assistantMessage += block.text;
            } else if (block.type === 'tool_use') {
                toolUseBlocks.push(block);
            }
        }

        // Combina fonti interne con eventuali fonti esterne
        const allSources = [...internalSources];

        res.json({
            response: assistantMessage,
            sources: allSources,
            conversationId: req.body.conversationId || generateConversationId(),
            usedInternalKnowledge: kbResults.length > 0
        });

    } catch (error) {
        console.error('❌ Errore chat:', error);
        
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

// Upload PDF endpoint
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

        // Ricarica i PDF nella knowledge base
        await updateKnowledgeBase();

        res.json({
            success: true,
            files: uploadedFiles,
            message: `${uploadedFiles.length} file caricati e indicizzati con successo`
        });

    } catch (error) {
        console.error('❌ Errore upload:', error);
        res.status(500).json({ error: 'Errore durante l\'upload dei file' });
    }
});

// Endpoint per forzare aggiornamento knowledge base
app.post('/api/refresh-knowledge', async (req, res) => {
    try {
        await updateKnowledgeBase();
        res.json({
            success: true,
            message: 'Knowledge base aggiornata',
            stats: {
                articles: knowledgeBase.articles.length,
                pdfs: knowledgeBase.pdfs.length,
                lastUpdate: knowledgeBase.lastUpdate
            }
        });
    } catch (error) {
        console.error('❌ Errore refresh:', error);
        res.status(500).json({ error: 'Errore aggiornamento knowledge base' });
    }
});

// Endpoint per vedere la knowledge base
app.get('/api/knowledge-stats', (req, res) => {
    res.json({
        articles: {
            count: knowledgeBase.articles.length,
            titles: knowledgeBase.articles.map(a => a.title)
        },
        pdfs: {
            count: knowledgeBase.pdfs.length,
            files: knowledgeBase.pdfs.map(p => p.title)
        },
        lastUpdate: knowledgeBase.lastUpdate
    });
});

// ========================================
// UTILITY FUNCTIONS
// ========================================

function generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Gestione errori globale
app.use((error, req, res, next) => {
    console.error('❌ Errore non gestito:', error);
    res.status(500).json({ error: 'Errore interno del server' });
});

// ========================================
// AVVIO SERVER
// ========================================

async function startServer() {
    console.log('🚀 Avvio server Chatbot Fiscale...');
    
    // Carica knowledge base all'avvio
    await updateKnowledgeBase();
    
    // Aggiorna knowledge base ogni 6 ore
    setInterval(async () => {
        console.log('⏰ Aggiornamento automatico knowledge base...');
        await updateKnowledgeBase();
    }, 6 * 60 * 60 * 1000); // 6 ore

    app.listen(PORT, () => {
        console.log(`\n✅ Server avviato su porta ${PORT}`);
        console.log(`📚 Domini autorizzati: ${TRUSTED_SOURCES.join(', ')}`);
        console.log(`🔐 CORS abilitato per: ${process.env.ALLOWED_ORIGINS || 'tutti i domini'}`);
        console.log(`📊 Knowledge Base: ${knowledgeBase.articles.length} articoli, ${knowledgeBase.pdfs.length} PDF\n`);
    });
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM ricevuto, chiusura server...');
    process.exit(0);
});

// Avvia!
startServer().catch(error => {
    console.error('❌ Errore avvio server:', error);
    process.exit(1);
});
