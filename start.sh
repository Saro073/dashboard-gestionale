#!/bin/bash

# ============================================================
# 🚀 Dashboard Gestionale - Launcher Script
# ============================================================
# Avvia backend storage (Node.js) + frontend (Python HTTP)
# Uso: ./start.sh (o bash start.sh)
# ============================================================

# Colori
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🏠 Dashboard Gestionale Ferienwohnung               ║${NC}"
echo -e "${BLUE}║   Avvio completo: Backend + Frontend                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"

# Vai nella cartella del progetto
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# ==================== STEP 1: Installa dipendenze Node.js ====================
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Prima esecuzione: installo dipendenze Node.js...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Errore installazione dipendenze${NC}"
        echo -e "${YELLOW}   Verifica di avere Node.js installato: https://nodejs.org/${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Dipendenze installate${NC}"
fi

# ==================== STEP 2: Avvia backend Node.js ====================
echo -e "${BLUE}🗄️  Avvio backend storage (Node.js su porta 3000)...${NC}"
node server.js > /tmp/dashboard_backend.log 2>&1 &
BACKEND_PID=$!

# Aspetta che il backend si avvii
sleep 3

# Verifica che il backend sia attivo
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Backend storage attivo (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}❌ Errore avvio backend${NC}"
    echo -e "${YELLOW}   Controlla log: tail -f /tmp/dashboard_backend.log${NC}"
    exit 1
fi

# ==================== STEP 3: Avvia frontend (Python HTTP) ====================
# Verifica se porta 8000 è libera
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Porta 8000 già in uso, uso porta 8001${NC}"
    PORT=8001
else
    PORT=8000
fi

echo -e "${BLUE}🌐 Avvio frontend (Python HTTP su porta ${PORT})...${NC}"
python3 -m http.server $PORT > /tmp/dashboard_frontend.log 2>&1 &
FRONTEND_PID=$!

# Aspetta che il server si avvii
sleep 2

# Verifica che il server sia attivo
if kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Frontend attivo (PID: $FRONTEND_PID)${NC}"
else
    echo -e "${RED}❌ Errore avvio frontend${NC}"
    # Killa backend se frontend fallisce
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# ==================== STEP 4: Apri browser ====================
URL="http://localhost:$PORT"
echo -e "${GREEN}✅ Apertura browser a ${BLUE}${URL}${NC}"

# Diversi OS handlers
if command -v open &> /dev/null; then
    # macOS
    open "$URL"
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open "$URL"
elif command -v start &> /dev/null; then
    # Windows (Git Bash)
    start "$URL"
else
    echo -e "${YELLOW}⚠️  Non riesco ad aprire il browser automaticamente${NC}"
    echo -e "${YELLOW}   Apri manualmente: ${BLUE}${URL}${NC}"
fi

# ==================== STEP 5: Info e cleanup ====================
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ DASHBOARD PRONTO                                 ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║   Frontend: ${BLUE}http://localhost:${PORT}${GREEN}                     ║${NC}"
echo -e "${GREEN}║   Backend:  ${BLUE}http://localhost:3000${GREEN}                      ║${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}║   📁 Dati salvati in: ./data/*.json                   ║${NC}"
echo -e "${GREEN}║   💾 Backup automatici in: ./backups/                 ║${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}║   Login: admin / admin (first time setup)              ║${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}║   Per stoppare: Ctrl+C                                ║${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}║   Log backend:  tail -f /tmp/dashboard_backend.log    ║${NC}"
echo -e "${GREEN}║   Log frontend: tail -f /tmp/dashboard_frontend.log   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Funzione cleanup quando si preme Ctrl+C
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Spegnimento dashboard...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✅ Processi terminati${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Mantieni i server attivi
wait
