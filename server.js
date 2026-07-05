#!/usr/bin/env node

/**
 * ==================== BACKEND STORAGE SERVER ====================
 * Server Node.js minimale per gestire persistenza dati su file system
 * Sostituisce localStorage con salvataggio su file JSON
 * 
 * Port: 3000 (API) - il frontend resta su 8000
 * Data folder: ./data/
 * 
 * Endpoints:
 * - GET  /api/storage/:key  → Carica dati
 * - POST /api/storage/:key  → Salva dati
 * - DELETE /api/storage/:key → Elimina chiave
 * - GET  /api/storage       → Lista tutte le chiavi
 * - POST /api/backup        → Crea backup manuale
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const BACKUP_DIR = path.join(__dirname, 'backups');

// Middleware
app.use(cors()); // Permetti richieste da localhost:8000
app.use(express.json({ limit: '50mb' })); // Parser JSON con limite alto

// ==================== UTILITY FUNCTIONS ====================

/**
 * Crea cartelle se non esistono
 */
async function ensureDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    console.log('✅ Cartelle data/ e backups/ pronte');
  } catch (error) {
    console.error('❌ Errore creazione cartelle:', error);
    process.exit(1);
  }
}

/**
 * Sanitizza il nome della chiave per file system
 */
function sanitizeKey(key) {
  return key.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Percorso file per una chiave
 */
function getFilePath(key) {
  const safeKey = sanitizeKey(key);
  return path.join(DATA_DIR, `${safeKey}.json`);
}

/**
 * Backup automatico ogni operazione di scrittura
 */
async function autoBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `backup_${timestamp}.json`);
    
    // Leggi tutti i file dalla cartella data
    const files = await fs.readdir(DATA_DIR);
    const allData = {};
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const key = file.replace('.json', '');
        const content = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
        allData[key] = JSON.parse(content);
      }
    }
    
    await fs.writeFile(backupFile, JSON.stringify(allData, null, 2));
    
    // Mantieni solo ultimi 50 backup (pulisci vecchi)
    const backups = await fs.readdir(BACKUP_DIR);
    if (backups.length > 50) {
      const sorted = backups.sort();
      for (let i = 0; i < backups.length - 50; i++) {
        await fs.unlink(path.join(BACKUP_DIR, sorted[i]));
      }
    }
    
    console.log(`💾 Backup automatico creato: ${backupFile}`);
  } catch (error) {
    console.error('⚠️  Errore backup automatico:', error.message);
    // Non bloccare l'operazione principale se backup fallisce
  }
}

// ==================== API ENDPOINTS ====================

/**
 * GET /api/storage/:key
 * Carica dati per una chiave specifica
 */
app.get('/api/storage/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const filePath = getFilePath(key);
    
    try {
      const data = await fs.readFile(filePath, 'utf8');
      res.json({ success: true, data: JSON.parse(data) });
    } catch (error) {
      // File non esiste → restituisci null (come localStorage)
      if (error.code === 'ENOENT') {
        res.json({ success: true, data: null });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error(`❌ Errore GET /api/storage/${req.params.key}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/storage/:key
 * Salva dati per una chiave specifica
 */
app.post('/api/storage/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { data } = req.body;
    const filePath = getFilePath(key);
    
    // Salva su file
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    
    // Backup automatico (non-blocking)
    autoBackup().catch(err => console.error('Backup failed:', err));
    
    console.log(`💾 Salvato: ${key}`);
    res.json({ success: true });
  } catch (error) {
    console.error(`❌ Errore POST /api/storage/${req.params.key}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/storage/:key
 * Elimina una chiave
 */
app.delete('/api/storage/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const filePath = getFilePath(key);
    
    await fs.unlink(filePath);
    console.log(`🗑️  Eliminato: ${key}`);
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json({ success: true }); // Già non esiste
    } else {
      console.error(`❌ Errore DELETE /api/storage/${req.params.key}:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

/**
 * GET /api/storage
 * Lista tutte le chiavi disponibili
 */
app.get('/api/storage', async (req, res) => {
  try {
    const files = await fs.readdir(DATA_DIR);
    const keys = files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
    
    res.json({ success: true, keys });
  } catch (error) {
    console.error('❌ Errore GET /api/storage:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/backup
 * Crea backup manuale completo
 */
app.post('/api/backup', async (req, res) => {
  try {
    await autoBackup();
    res.json({ success: true, message: 'Backup creato' });
  } catch (error) {
    console.error('❌ Errore POST /api/backup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/calendar/fetch?url=...
 * Proxy server-side per feed calendario remoti (ICS/ICAL) così il browser non dipende dal CORS.
 */
app.get('/api/calendar/fetch', async (req, res) => {
  try {
    const rawUrl = req.query.url;

    if (!rawUrl || typeof rawUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'URL mancante' });
    }

    let targetUrl;
    try {
      targetUrl = new URL(rawUrl);
    } catch (error) {
      return res.status(400).json({ success: false, error: 'URL non valido' });
    }

    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return res.status(400).json({ success: false, error: 'Protocollo non supportato' });
    }

    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Dashboard-Gestionale-CalendarSync/1.0'
      }
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        error: `Feed non raggiungibile (${response.status})`
      });
    }

    const text = await response.text();
    res.json({
      success: true,
      text,
      contentType: response.headers.get('content-type') || 'text/calendar'
    });
  } catch (error) {
    console.error('❌ Errore GET /api/calendar/fetch:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /health
 * Health check per verificare che il server sia attivo
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== SERVER STARTUP ====================

async function startServer() {
  await ensureDirectories();
  
  app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   🗄️  STORAGE SERVER ATTIVO                           ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║   Port: ${PORT}                                          ║`);
    console.log(`║   Data: ${DATA_DIR}                            ║`);
    console.log(`║   Backups: ${BACKUP_DIR}                       ║`);
    console.log('║                                                        ║');
    console.log('║   Endpoints:                                           ║');
    console.log('║   - GET  /api/storage/:key                             ║');
    console.log('║   - POST /api/storage/:key                             ║');
    console.log('║   - DELETE /api/storage/:key                           ║');
    console.log('║   - GET  /api/storage (list all)                       ║');
    console.log('║   - POST /api/backup                                   ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
  });
}

// Gestione errori non catturati
process.on('uncaughtException', (error) => {
  console.error('❌ Errore non gestito:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Promise rejection non gestita:', error);
});

// Avvia server
startServer();
