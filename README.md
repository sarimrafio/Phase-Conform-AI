# Phase-Conform AI

Interactive 3D conformational analysis with live AI. Rotate bonds, watch the
energy profile update in real time, flip R/S stereocenters, and talk to a Gemini
co-pilot that drives the app for you.

## Features
- **3D viewer** (react-three-fiber): Ball & Stick, Space-Filling, Wireframe.
- **Steric strain heat map**: atoms glow coral when van der Waals radii overlap.
- **Multiple rotatable bonds**: click any blue bond to make it the active (pink) dihedral.
- **Dihedral control**: slider plus 0/60/120/180/240/300° presets, with the conformation name (Syn, Gauche, Eclipsed, Anti).
- **Energy surface and Boltzmann population** chart (RDKit MMFF94).
- **Energy Extrema and Clash Factor** readouts.
- **R/S stereocenter inversion** for multi-chiral molecules.
- **In-browser ONNX model** predicting energy, dipole and partial charges.
- **Gemini co-pilot** (chat) with function calling to load molecules and change views.
- **Cinematic controls**: zoom, spin the molecule, spin the active bond.
- **Ketcher structure drawer**.
- **Offline fallbacks**: cached demo molecules if the backend is down; local command parsing if Gemini is unavailable.

## Architecture
```
Browser (Next.js, app/page.jsx)
  |-- ONNX Runtime Web  -> public/ultimate_chem_ai.onnx
  |-- /api/chat (Next route) -> Gemini API (function calling)
  `-- http://localhost:8000 (FastAPI + RDKit, backend/main.py)
        /api/analyze        embed, rotatable bonds, torsion energy scan
        /api/invert_stereo  flip a chiral center
```

## Setup (first time)
Requirements: Node 18+, Python 3.10+.
```bat
npm install
cd backend
python -m venv venv
venv\Scripts\activate
pip install fastapi uvicorn rdkit
```
Create `.env.local` in the project root:
```
GEMINI_API_KEY=your_key_here
```

## Run
Double-click **`start.bat`**. It starts both servers and opens http://localhost:3000.

Manual:
```bat
cd backend && venv\Scripts\activate && uvicorn main:app --port 8000
npm run dev
```

## AI model
- `train_ultimate_chem_ai.py`: trains the current model (QM9-based) and exports `public/ultimate_chem_ai.onnx`.
- `train_spice.py` (if present): retrains on conformer data (SPICE). The output goes to `models/staging/`; see the README there before swapping it in.

## Troubleshooting
| Symptom | Fix |
|---|---|
| `npm.ps1 cannot be loaded` | Use `cmd /c "npm run dev"` or `start.bat` |
| "Offline demo mode" badge | Backend not running, so start it on port 8000 |
| Chat says AI unavailable | Check `GEMINI_API_KEY` in `.env.local`; basic commands still work |
| Port in use | Re-run `start.bat` (it frees ports 3000/8000) |
