#!/usr/bin/env bash
# Build the app and publish it to Netlify (site "ps-daily" → https://ps-daily.netlify.app).
# Needs a Netlify personal access token: export NETLIFY_AUTH_TOKEN=... (or a proxy that injects it).
set -euo pipefail
SITE_ID="8e37dfe8-0ebb-42d4-ad6e-3c89ed9e0f30"
cd "$(dirname "$0")/.."
npm run build
ZIP="$(mktemp -d)/site.zip"
(cd dist && zip -qr "$ZIP" .)
AUTH=()
[ -n "${NETLIFY_AUTH_TOKEN:-}" ] && AUTH=(-H "Authorization: Bearer $NETLIFY_AUTH_TOKEN")
DEPLOY=$(curl -sS "${AUTH[@]}" -X POST "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys" \
  -H 'Content-Type: application/zip' --data-binary @"$ZIP" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
for _ in $(seq 1 40); do
  STATE=$(curl -sS "${AUTH[@]}" "https://api.netlify.com/api/v1/deploys/$DEPLOY" | python3 -c "import sys,json; print(json.load(sys.stdin)['state'])")
  [ "$STATE" = ready ] && { echo "Live: https://ps-daily.netlify.app"; exit 0; }
  [ "$STATE" = error ] && { echo "Deploy failed"; exit 1; }
  sleep 3
done
echo "Deploy still processing: $DEPLOY"
