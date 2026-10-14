# 🧪 Phase-Conform AI — Beginner's Guide & Instructions

Welcome to **Phase-Conform AI**! Think of this web application as an **interactive 3D playground and Google Maps for molecules**. 

In the real world, molecules aren't stiff, flat drawings on a blackboard—they wiggle, twist, bend, and rotate millions of times every second around chemical bonds. This website lets you grab any molecule with your mouse or finger, spin its bonds in 3D, and watch quantum physics, thermodynamic energy, and artificial intelligence respond in real time!

---

## 🚀 Quick Start: Your First 60 Seconds

1. **Grab the Molecule**: Click and drag anywhere in the 3D canvas (the central window) to rotate the molecule in 3D space. Scroll with your mouse wheel (or pinch on your phone) to zoom in and out.
2. **Rotate a Bond**: Look for the **neon pink/magenta cylinder**. That is the rotatable bond! Drag the **Dihedral Angle slider** at the bottom from `0°` to `360°` and watch the atoms twist around each other.
3. **Watch the Energy Curve**: Look at the chart on the right side. As you slide the angle, the little colored dot moves along an energy rollercoaster! Low dips are stable; high peaks are energetic barriers.
4. **Search a Favorite Molecule**: Click the search bar at the top, type `Caffeine`, `Aspirin`, or `Dopamine`, and click **Load**.

---

## 🧭 The Interface: What Does What?

### 1. The Top Header Bar

- **Molecule Name & Formula (`Formula: C₄H₁₀`)**: Shows the chemical formula of whatever molecule is currently loaded, with proper subscript counts.
- **`ONNX Active` Badge**: Shows that the in-browser Graph Neural Network (AI) is running locally on your graphics card / browser with zero latency.
- **`Offline Cache` Badge**: Appears if your internet or local backend server is offline; indicates that pre-computed, high-fidelity demo conformations are serving as instant fallbacks.
- **🎨 Color Palette Picker (10 Themes)**: Click the palette icon to switch between 10 styles, including **Midnight Neon**, **Monokai Pro**, **Dracula**, **Nord Arctic**, **Cyber Sunset**, **Emerald Matrix**, and more.
- **☀️ / 🌙 Dark & Light Mode Switch**: Instantly toggles between high-contrast dark laboratory mode and clean daylight lecture mode.
- **⚡ Gemini 3.8 Flash Co-Pilot Button**: Opens the autonomous conversational AI assistant.

---

### 2. Search & Molecule Loading

Located directly beneath the brand header:

- **Autocomplete Search Bar**:
  - **Common Names**: Type `Aspirin`, `Caffeine`, `Ibuprofen`, `Serotonin`, `Glucose`, `Adrenaline`, etc.
  - **Empirical Formulas**: Type `C4H10`, `C2H6`, `C6H12O6`, `C9H8O4`, etc.
  - **SMILES Strings**: Chemical shorthand notation like `CCCC` (butane) or `c1ccccc1` (benzene).
- **Interactive Suggestions Menu**:
  - When you focus the search bar, a menu opens with popular molecules.
  - Use the category pills (**Textbook Rotors**, **Drugs & Bioactive**, **Rings & Chiral**) to explore.
  - Full keyboard support: Use `↑` and `↓` arrows to browse, `Enter` to select, and `Escape` to close.
- **AI Typo & Spell-Correction Engine**:
  - Don't worry about spelling mistakes!
  - If you type `"caffiene"`, `"asprin"`, `"dopamin"`, `"seratonin"`, or `"paracetemol"`, the AI instantly detects the typo, displays a *"Did you mean...?"* suggestion, and can automatically load the correct molecule.
- **🎲 Random Button**: Picks a random molecule from our library of alkanes, cycloalkanes, neurotransmitters, and chiral drugs.
- **📖 2D Notebook Button**: Opens the **2D Chemistry Lab Notebook** modal (Skeletal structures, Newman projections, Cyclohexane Chair-Boat ring flips, and Fischer projections).
- **✏️ Draw Button**: Opens the **Ketcher 2D Molecular Sketcher** where you can draw any organic chemical structure from scratch and bring it into 3D.

---

### 3. The 3D Molecule Viewport (The Main Stage)

#### How to Navigate:
- **Rotate View**: Left-click and drag (or 1-finger swipe on mobile).
- **Pan / Move**: Right-click and drag (or 2-finger drag on mobile).
- **Zoom**: Mouse scroll wheel (or 2-finger pinch on mobile).
- **Fit to Screen**: Press the **`F`** key on your keyboard to instantly re-center and fit any molecule to the window!

#### What the Colors Mean:
- **Grey Atoms**: Carbon ($\text{C}$)
- **White Atoms**: Hydrogen ($\text{H}$)
- **Red Atoms**: Oxygen ($\text{O}$)
- **Blue Atoms**: Nitrogen ($\text{N}$)
- **Translucent White/Grey Bonds**: Static covalent bonds.
- **Neon Pink/Magenta Bond**: The **Active Rotatable Dihedral Bond**. When you move the slider, this is the bond that rotates!
- **Cyan/Blue Bonds**: Other rotatable bonds in the molecule. **Click any blue bond** to select it and make it the active rotation axis!

#### Visual Warning Effects:
- **⚠️ Glowing Red / Coral Atoms (Steric Clash)**: In chemistry, atoms take up physical space. When you rotate a bond into an awkward angle and two atoms bump into each other's electron clouds (van der Waals radii), they glow bright red/coral! This visualizes **Pauli exchange repulsion** (steric strain).
- **🟡 Golden / Yellow Arrow (Dipole Vector)**: Shows the net electrical polarity of the molecule. As the molecule rotates, watch how the arrow shrinks (when opposite charges cancel out) or grows (when polar groups line up)!

#### Floating Toolbar Controls:
- **Camera Presets**:
  - **Front**: Standard 3D perspective view.
  - **Chair / Iso**: Isometric angle ideal for viewing cyclohexane rings.
  - **Haworth**: Angled perspective for carbohydrate pyranose rings.
  - **Fischer / Newman**: Top-down view looking straight down the central bond axis.
- **Spin Controls**:
  - **Turntable**: Spins the entire 3D molecule slowly like a showcase display.
  - **Bond Spin**: Automatically turns the dihedral bond through all 360 degrees.
- **Render Modes**:
  - **Ball & Stick**: Clean educational view showing ball atoms and cylindrical bonds.
  - **Space-Filling (VDW)**: Expands atoms to their true physical van der Waals electron clouds.
  - **Wireframe**: Stripped-down minimalist line representation.
  - **ESP**: Electrostatic Potential visualization.

---

### 4. Dihedral Angle & Conformation Presets (Bottom Bar)

- **The Main Slider (`0°` to `360°`)**: Smoothly rotates the active bond by single degrees.
- **Preset Quick-Buttons**:
  - **`180° Anti` (Anti-periplanar)**: Usually the lowest energy, most stable, and most relaxed conformation. Opposing bulky groups are as far away from each other as possible.
  - **`60° Gauche` / `300° Gauche`**: Staggered minimums where groups are reasonably separated, but close enough to experience slight neighborly interactions.
  - **`0° Syn` (Syn-periplanar / Fully Eclipsed)**: Bulky groups are forced right next to each other. This is typically the **highest energy barrier** with maximum steric clashes.
  - **`120° Eclipsed` / `240° Eclipsed`**: Intermediate torsional transition barriers.
- **Temperature Slider (`100 K` to `600 K`)**:
  - Adjusts molecular temperature in Kelvin and Celsius.
  - Watch the **Boltzmann Population** on the chart change: at cold temperatures, almost all molecules freeze into the low-energy Anti state; at hot temperatures, molecules have enough thermal energy to jump over the barrier into Gauche states!

---

### 5. Telemetry & Energy Analysis Panels (Right Side)

#### Panel 1: Conformation Copilot
- **Simplified Mode**: Explains what the molecule is doing in everyday, intuitive language.
- **Descriptive Mode**: Explains orbital hyperconjugation, steric hindrance, and dipole physics.
- **⚡ Ask Gemini 3.8 Flash Quantum Deep-Dive**: Click this button anytime to generate an elite, real-time frontier molecular orbital report from Gemini 3.8 Flash ($\sigma \to \sigma^*$ orbital stabilization, Pauli exclusion mechanics, and dipole vector sums). All characters are rendered in clean scientific Unicode ($\text{Å}$, $\text{°}$, $\sigma$, $\pi$).

#### Panel 2: Energy Surface & Boltzmann Population Chart
- **Solid Purple Line (MMFF94 Physics)**: The computed conformational potential energy curve (in $\text{kJ/mol}$ and $\text{kcal/mol}$).
- **Dashed Line (SPICE ChemGNN AI)**: Quantum-trained Machine Learning prediction running alongside classical force fields.
- **Shaded Blue Area (Boltzmann Population)**: The statistical probability ($\%$) of finding the molecule in this exact shape in a real beaker at your chosen temperature.
- **Red Reference Dot**: Tracks your current rotation angle in real time!

#### Panel 3: AI Deep Learning HUD (ChemGNN ONNX)
- Instantaneous ($<10\text{ ms}$) in-browser inference powered by ONNX Runtime Web.
- Displays predicted molecular energy, net dipole magnitude ($\text{Debye}$), and partial atomic charges.

#### Panel 4: Thermodynamic Extrema & Barrier ($\Delta E^\ddagger$)
- **Min Energy**: The energy floor of the most relaxed conformer.
- **Max Energy**: The peak mountain barrier the molecule must overcome to rotate.
- **Rotational Barrier ($\Delta E^\ddagger$)**: The net activation energy needed to complete a full rotation.
- **Progress Bar**: Shows what percentage of the barrier you are currently climbing.

---

### 6. The 2D Chemistry Lab Notebook

Click the **`2D Notebook`** button in the search row to open this 4-in-1 notebook:

1. **2D Skeletal Tab**: Clean chemical bond-line diagram showing atom numbering and stereo wedge/dash bonds.
2. **Newman Projection Tab**: A classic organic chemistry projection looking straight down the carbon-carbon axis. Drag the angle slider inside the modal and watch the front and back hydrogens rotate past each other!
3. **Chair & Boat Tab**: For cyclohexane and six-membered rings. Displays the 3D chair conformation with color-coded **Axial (vertical)** and **Equatorial (slanted)** bonds. Click the **🔄 Ring-Flip** button to see all axial bonds flip to equatorial and vice versa!
4. **Fischer Projection Tab**: Top-down flat cross projection used in biochemistry and carbohydrates to assign stereochemistry and absolute $D / L$ configurations.

---

### 7. Gemini 3.8 Flash Co-Pilot (Voice & Chat Assistant)

Click the glowing **Gemini** icon in the header or the floating bubble in the bottom right:

- **Autonomous Actions**: Gemini isn't just a text bot—it can control the website for you!
  - Try typing: *"Load ibuprofen"*
  - *"Rotate bond to 180 degrees"*
  - *"Switch to space-filling render mode"*
  - *"Turn on bond auto-rotation"*
  - *"Change palette to Monokai and switch to light mode"*
  - *"Fit model to window"*
  - *"Open the 2D lab notebook"*
- **Scientific Q&A**: Ask any conceptual chemistry question, from *"Why is the anti conformer more stable than gauche?"* to *"What is hyperconjugation?"*
- **🎙️ Voice Microphone**: Click the microphone icon to speak hands-free! When you stop speaking for 1.2 seconds, your command auto-submits.
- **🔊 Speech Audio Output**: Toggle the speaker button to have Gemini read its answers aloud to you in natural spoken voice.

---

### 8. Mobile Phone & Tablet Experience

If you are browsing on a mobile phone in portrait mode:
- **View Switcher Tabs**: A selector appears at the top:
  - **All / Scroll**: Standard stacked view.
  - **Canvas**: Fullscreen interactive 3D studio.
  - **Analysis**: Focused telemetry and energy HUD.
- **Horizontal Scrollbars**: Toolbars and action buttons can be swiped smoothly left and right without cluttering the screen.
- **Touch Gestures**: Single-finger drag rotates the model; pinch-to-zoom zooms smoothly.

---

## 💡 Top Keyboard Shortcuts & Pro Tips

| Key / Action | What It Does |
|---|---|
| **`F`** | **Fit to Window** — Centers and auto-scales the molecule perfectly in view. |
| **`Click any Cyan Bond`** | Switches the active rotation dihedral to that specific bond. |
| **`↑` / `↓` in Search** | Navigates through compound suggestions without touching the mouse. |
| **`Enter` in Search** | Loads the selected suggestion or auto-corrects any typo. |
| **`Double-Click Model`** | Re-centers the orbit camera target. |

---

*Enjoy exploring molecular conformations with Phase-Conform AI!*
