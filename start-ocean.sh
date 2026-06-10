#!/bin/bash

echo "🚀 Starting Ocean Full Stack..."

# Backend (Flask)
gnome-terminal -- bash -c "
source .venv/bin/activate;
cd app;
python wsgi.py;
exec bash
"

# Frontend (Bun)
gnome-terminal -- bash -c "
cd ui;
bun run dev --host;
exec bash
"

# Tunnel (bore / other tool)
gnome-terminal -- bash -c "
echo '🌐 Starting tunnel...';
bore local 5173 --to bore.pub --port 51730;
exec bash
"

# echo "✅ Ocean is running and Tunnel activated"
echo "✅ Ocean is running (backend + frontend). Tunnel is activated"