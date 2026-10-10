#!/bin/zsh
# Starts the local server (same headers as Vercel) and opens the app. Keep this window open.
cd "${0:A:h}"
python3 serve.py 8765 --open
