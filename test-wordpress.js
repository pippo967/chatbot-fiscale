// test-wordpress.js
// Script per testare la connessione WordPress e la knowledge base

require('dotenv').config();
const axios = require('axios');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m'
};

async function testWordPressConnection() {
    console.log('\n🔍 TEST CONNESSIONE WORDPRESS\n');
    
    const wpUrl = process.env.WP_SITE_URL || 'https://www.stpappalardo.it';
    const username = process.env.WP_USERNAME;
    const password = process.env.WP_PASSWORD;

    // Test 1: Verifica variabili d'ambiente
    console.log('📋 Verifica configurazione:');
    console.log(`   WP_SITE_URL: ${wpUrl ? colors.green + '✓' : colors.red + '✗'} ${wpUrl}${colors.reset}`);
    console.log(`   WP_USERNAME: ${username ? colors.green + '✓' : colors.red + '✗'} ${username ? '***' : 'NON CONFIGURATO'}${colors.reset}`);
    console.log(`   WP_PASSWORD: ${password ? colors.green + '✓' : colors.red + '✗'} ${password ? '***' : 'NON CONFIGURATO'}${colors.reset}`);

    if (!username || !password) {
        console.log(`\n${colors.red}❌ ERRORE: Configura WP_USERNAME e WP_PASSWORD nel file .env${colors.reset}\n`);
        return;
    }

    // Test 2: Verifica API disponibile
    console.log('\n🌐 Test disponibilità API WordPress:');
    try {
        const apiCheck = await axios.get(`${wpUrl}/wp-json/wp/v2`);
        console.log(`   ${colors.green}✓${colors.reset} API REST WordPress disponibile`);
    } catch (error) {
        console.log(`   ${colors.red}✗${colors.reset} API non disponibile: ${error.message}`);
        return;
    }

    // Test 3: Scarica articoli
    console.log('\n📥 Download articoli:');
    try {
        const apiUrl = `${wpUrl}/wp-json/wp/v2/posts`;
        
        const response = await axios.get(apiUrl, {
            auth: {
                username: username,
                password: password
            },
            params: {
                status: 'publish',
                per_page: 10,
                _embed: true
            }
        });

        console.log(`   ${colors.green}✓${colors.reset} Scaricati ${response.data.length} articoli`);
        
        if (response.data.length > 0) {
            console.log(`\n${colors.blue}📰 Primi 5 articoli trovati:${colors.reset}`);
            response.data.slice(0, 5).forEach((post, idx) => {
                console.log(`   ${idx + 1}. ${post.title.rendered}`);
                console.log(`      URL: ${post.link}`);
                console.log(`      Data: ${new Date(post.date).toLocaleDateString('it-IT')}`);
            });
        } else {
            console.log(`\n   ${colors.yellow}⚠️  Nessun articolo pubblicato trovato${colors.reset}`);
        }

        // Test 4: Verifica contenuto articolo
        if (response.data.length > 0) {
            const firstPost = response.data[0];
            const contentLength = firstPost.content.rendered.replace(/<[^>]*>/g, '').length;
            
            console.log(`\n${colors.blue}📄 Dettagli primo articolo:${colors.reset}`);
            console.log(`   Titolo: ${firstPost.title.rendered}`);
            console.log(`   Lunghezza contenuto: ${contentLength} caratteri`);
            console.log(`   Categorie: ${firstPost._embedded?.['wp:term']?.[0]?.map(c => c.name).join(', ') || 'Nessuna'}`);
        }

    } catch (error) {
        console.log(`   ${colors.red}✗${colors.reset} Errore download articoli:`);
        
        if (error.response) {
            console.log(`      Status: ${error.response.status}`);
            console.log(`      Message: ${error.response.statusText}`);
            
            if (error.response.status === 401) {
                console.log(`\n   ${colors.yellow}💡 Suggerimento: Verifica username e password${colors.reset}`);
                console.log(`      - Usa Application Password, non la password principale`);
                console.log(`      - WordPress → Utenti → Profilo → Password Applicazioni`);
            }
        } else {
            console.log(`      ${error.message}`);
        }
        return;
    }

    console.log(`\n${colors.green}✅ TEST COMPLETATO CON SUCCESSO!${colors.reset}\n`);
}

// Esegui il test
testWordPressConnection().catch(error => {
    console.error(`\n${colors.red}❌ Errore durante il test:${colors.reset}`, error.message);
    process.exit(1);
});
