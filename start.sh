#!/bin/bash

# ============================================================
# 🚀 Dashboard Gestionale - Launcher Script
# ============================================================
# Avvia il dashboard in locale in 2 secondi
# Uso: ./start.sh (o bash start.sh)
# ============================================================

# Colori
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🏠 Dashboard Gestionale Ferienwohnung               ║${NC}"
echo -e "${BLUE}║   Avvio server locale...                             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"

# Verifica se è già in esecuzione
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Porta 8000 già in uso${NC}"
    echo -e "${YELLOW}   Trying porta 8001 instead...${NC}"
    PORT=8001
else
    PORT=8000
fi

# Vai nella cartella del progetto
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Avvia server Python
echo -e "${GREEN}✅ Avvio server su porta ${PORT}...${NC}"
python3 -m http.server $PORT > /tmp/dashboard_server.log 2>&1 &
SERVER_PID=$!

# Aspetta che il server si avvii
sleep 2

# Verifica che il server sia attivo
if kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Server avviato (PID: $SERVER_PID)${NC}"
else
    echo -e "${RED}❌ Errore avvio server${NC}"
    exit 1
fi

# Apri il browser
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

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ DASHBOARD PRONTO                                 ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║   URL: ${BLUE}http://localhost:${PORT}${GREEN}                       ║${NC}"
echo -e "${GREEN}║   Login: admin / admin (first time setup)              ║${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}║   Per stoppare: Ctrl+C                                ║${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}║   Log server: /tmp/dashboard_server.log               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Mantieni il server attivo
wait $SERVER_PID
