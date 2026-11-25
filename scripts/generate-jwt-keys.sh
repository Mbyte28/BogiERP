#!/usr/bin/env bash
# Genera las llaves RS256 para firmar y verificar los JWT.
# Las llaves quedan en backend/keys y no se versionan.

set -euo pipefail

KEYS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backend/keys"
mkdir -p "$KEYS_DIR"

if ! command -v openssl >/dev/null 2>&1; then
  echo "No se encontró openssl. Instálalo para generar las llaves." >&2
  exit 1
fi

openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$KEYS_DIR/privateKey.pem"
openssl rsa -pubout -in "$KEYS_DIR/privateKey.pem" -out "$KEYS_DIR/publicKey.pem"
chmod 600 "$KEYS_DIR/privateKey.pem"

echo ""
echo "Llaves generadas en: $KEYS_DIR"
echo "  privateKey.pem  (solo backend, no compartir)"
echo "  publicKey.pem"
