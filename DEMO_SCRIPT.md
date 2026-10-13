# Presentation Demo Script (~6 min)

**Before going on stage:** run `start.bat` and open the app. Load butane once to warm up the backend and the ONNX model. Set browser zoom so all panels fit, and press F11 for fullscreen.

### 1. Hook (30s)
"Chemistry students learn conformations from flat drawings. Phase-Conform AI lets you *feel* them."
- Click **Spin Molecule** in Cinematic Controls. Let it rotate while you talk.

### 2. Conformations (90s), using butane
- Stop the spin. Click the **0°** preset: *Syn*. Point out the coral steric glow and the high energy dot on the graph.
- Click **60° → 120° → 180°**. Narrate Gauche → Eclipsed → **Anti** (the global minimum).
- Click **Spin Active Bond**. The dot runs along the energy curve and the Boltzmann population fills under it.
- Show the **Clash Factor** flipping between CRITICAL and STABLE.

### 3. Render modes (20s)
- Switch Ball & Stick → Space-Filling (show why eclipsed clashes) → Wireframe.

### 4. Complex molecules (60s)
- Load a larger molecule (e.g. ibuprofen). The **blue bonds** are rotatable. Click one and it turns pink and becomes the active dihedral.
- Load glucose and click an R/S label to invert a stereocenter.

### 5. AI (90s), the wow moment
- Point to the **AI Deep Learning** panel: energy, dipole and partial charges predicted *in the browser* by our trained neural network (ONNX).
- Open the co-pilot (pink ⚡ button) and type or say:
  - "Load ethane and show me the eclipsed conformation"
  - "Why is anti more stable than gauche?"
- The AI drives the app itself.

### 6. Close (30s)
"RDKit physics + a custom neural network + an LLM co-pilot, all live in the browser."

---
**If something fails live:**
- Backend down: cached demo molecules still load ("Offline demo mode").
- Wi-Fi or Gemini down: type simple commands like `load butane` or `show anti`. They work locally.
- If something freezes, refresh the page (F5). State reloads in about 2 seconds.
