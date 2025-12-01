#!/usr/bin/env bash
# create-pr.sh
# Script sicuro per:
# 1) Archiviare e rimuovere `app.js` root (spostandolo nella cartella `legacy`) o cancellarlo
# 2) Creare un branch, aggiungere commit, push e aprire una PR con 'gh' se presente

set -euo pipefail
IFS=$'\n\t'

# Configuration
BASE_BRANCH="main"  # branch di base su cui aprire la PR
NEW_BRANCH="chore/remove-legacy-root-and-update-edit-note"
ARCHIVE_DIR="legacy"
ROOT_FILE="app.js"
ARCHIVE_FILE="${ARCHIVE_DIR}/app.legacy.js"

echo "--- Create PR script (safe) ---"

# Ensure we are in repo root
if [ ! -d ".git" ]; then
  echo "ERRORE: Questa cartella non è un repository git. Clona il repo prima di eseguire questo script."
  exit 1
fi

# Fetch and update base branch
echo "Checkout e aggiornamento del base branch ${BASE_BRANCH}"
git fetch origin --prune
git checkout ${BASE_BRANCH}
git pull origin ${BASE_BRANCH}

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Attenzione: hai modifiche non committate. Esegui 'git status' e committa o stash prima di procedere."
  git status --short
  read -p "Svuotare lo stash e continuare? [y/N]: " yn
  if [[ $yn != "y" && $yn != "Y" ]]; then
    echo "Annullato. Commita o stash le modifiche prima di riprovare."
    exit 1
  fi
fi

# Crea il branch
git checkout -b ${NEW_BRANCH}

# Make sure archive folder exists
mkdir -p ${ARCHIVE_DIR}

# If root file exists -> move to legacy; otherwise, skip
if [ -f "${ROOT_FILE}" ]; then
  echo "Archivia ${ROOT_FILE} in ${ARCHIVE_FILE}"
  # Copia come backup e rimuovi il file da root
  cp "${ROOT_FILE}" "${ARCHIVE_FILE}"
  git rm "${ROOT_FILE}"
  git add "${ARCHIVE_FILE}"
  git commit -m "chore: archive root app.js into legacy/app.legacy.js and delete root file"
else
  echo "Nessun ${ROOT_FILE} root trovato; saltato archiviazione"
fi

# Aggiungi altri cambi importanti (se vuoi)
# Esegui 'git status' per verificare
echo "Esempio: Assicurarsi che tutti i files modificati siano corretti"
git status --short

read -p "Vuoi aggiungere tutte le modifiche attualmente non staged (git add -A)? [y/N]: " addAll
if [[ $addAll == "y" || $addAll == "Y" ]]; then
  git add -A
  git commit -m "chore: finalize changes (remove legacy root; implement notes/contacts fixes)" || true
fi

# Push branch
git push -u origin ${NEW_BRANCH}

# Attempt create PR with gh
if command -v gh &> /dev/null; then
  echo "Creando PR con GitHub CLI..."
  gh pr create --base ${BASE_BRANCH} --head ${NEW_BRANCH} \
    --title "chore: archive legacy root app.js; implement editNote + contact improvements" \
    --body "Rimuove root \`app.js\` e archivia in \`legacy/app.legacy.js\`. Aggiorna \`js/app.js\` con editNote, contatti multi-email/phone, e migliorie di storage.\n\nTesting: accedere e testare note/contatti, verificare overview/activity log." || true
  echo "Se la creazione tramite gh fallisce, apri la PR manualmente su GitHub usando il branch appena pushato."
else
  echo "gh non è installato: apri una PR manuale su GitHub usando il branch: ${NEW_BRANCH}"
fi

echo "Fatto. PR branch: ${NEW_BRANCH}"
