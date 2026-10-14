import { GoogleGenAI, Type } from '@google/genai';
import { NextResponse } from 'next/server';
import { sanitizeScientificText } from '../../../utils/formatScientific';

function handleLocalFallback(message, state = null) {
  const lower = message.toLowerCase().trim();

  // 1. Tool call: Load molecule
  const loadMatch = lower.match(/(?:load|show|switch to|display|open|search)\s+([a-zA-Z0-9\-]+)/i);
  if (loadMatch && !lower.includes('mode') && !lower.includes('theme') && !loadMatch[1].match(/^(wireframe|vdw|space|ball|stick|anti|syn|gauche|eclipsed|fischer|haworth|chair|front|monokai|catppuccin|nord|dracula|hotdog|emerald|solarized|sunset|radioactive|obsidian|midnight)$/i)) {
    const compound = loadMatch[1].charAt(0).toUpperCase() + loadMatch[1].slice(1);
    return {
      type: 'tool_call',
      functionName: 'load_molecule',
      args: { query: compound },
      text: `[Offline Autonomous Command] Searching PubChem and loading '${compound}' into the 3D viewer.`
    };
  }

  // 2. Tool call: Render modes
  if (lower.includes('wireframe')) {
    return {
      type: 'tool_call',
      functionName: 'set_render_mode',
      args: { mode: 'wireframe' },
      text: `[Offline Autonomous Command] Setting 3D render mode to Wireframe.`
    };
  }
  if (lower.includes('space') || lower.includes('vdw') || lower.includes('space-filling')) {
    return {
      type: 'tool_call',
      functionName: 'set_render_mode',
      args: { mode: 'vdw' },
      text: `[Offline Autonomous Command] Setting 3D render mode to Space-Filling (van der Waals radii).`
    };
  }
  if (lower.includes('ball') || lower.includes('stick')) {
    return {
      type: 'tool_call',
      functionName: 'set_render_mode',
      args: { mode: 'ball-stick' },
      text: `[Offline Autonomous Command] Setting 3D render mode to Ball & Stick.`
    };
  }
  if (lower.includes('esp') || lower.includes('heatmap') || lower.includes('electrostatic')) {
    return {
      type: 'tool_call',
      functionName: 'set_render_mode',
      args: { mode: 'esp' },
      text: `[Offline Autonomous Command] Setting 3D render mode to ESP Heatmap.`
    };
  }

  // 3. Tool call: Dihedral Angle & Conformations
  if (lower.includes('anti')) {
    return {
      type: 'tool_call',
      functionName: 'set_dihedral_angle',
      args: { angle: 180 },
      text: `[Offline Autonomous Command] Rotating dihedral to 180° Anti-periplanar (global energy minimum).`
    };
  }
  if (lower.includes('gauche')) {
    return {
      type: 'tool_call',
      functionName: 'set_dihedral_angle',
      args: { angle: 60 },
      text: `[Offline Autonomous Command] Rotating dihedral to 60° Gauche (metastable staggered minimum).`
    };
  }
  if (lower.includes('syn')) {
    return {
      type: 'tool_call',
      functionName: 'set_dihedral_angle',
      args: { angle: 0 },
      text: `[Offline Autonomous Command] Rotating dihedral to 0° Syn-periplanar (maximum steric clash barrier).`
    };
  }
  if (lower.includes('eclipsed')) {
    return {
      type: 'tool_call',
      functionName: 'set_dihedral_angle',
      args: { angle: 120 },
      text: `[Offline Autonomous Command] Rotating dihedral to 120° Anticlinal Eclipsed transition barrier.`
    };
  }
  const angleMatch = lower.match(/(?:rotate|angle|dihedral|turn)\s+(?:to\s+)?(\d+)(?:°|deg)?/i);
  if (angleMatch) {
    const deg = Math.min(360, Math.max(0, parseInt(angleMatch[1])));
    return {
      type: 'tool_call',
      functionName: 'set_dihedral_angle',
      args: { angle: deg },
      text: `[Offline Autonomous Command] Rotating dihedral to ${deg}°.`
    };
  }

  // 4. Tool call: Auto-spin
  if (lower.includes('stop spin') || lower.includes('pause spin') || lower.includes('halt spin')) {
    return {
      type: 'tool_call',
      functionName: 'toggle_auto_spin',
      args: { target: 'both', state: false },
      text: `[Offline Autonomous Command] Stopping all auto-rotation animations.`
    };
  }
  if (lower.includes('spin bond') || lower.includes('rotate bond auto') || lower.includes('auto bond')) {
    return {
      type: 'tool_call',
      functionName: 'toggle_auto_spin',
      args: { target: 'bond', state: true },
      text: `[Offline Autonomous Command] Starting continuous dihedral bond auto-rotation.`
    };
  }
  if (lower.includes('spin molecule') || lower.includes('spin turntable') || (lower.includes('spin') && !lower.includes('stop'))) {
    return {
      type: 'tool_call',
      functionName: 'toggle_auto_spin',
      args: { target: 'molecule', state: true },
      text: `[Offline Autonomous Command] Starting continuous 3D molecule turntable rotation.`
    };
  }

  // 5. Tool call: Temperature
  const tempMatch = lower.match(/(?:temp|temperature|kelvin)\s*(?:to\s*)?(\d+)/i);
  if (tempMatch) {
    const k = Math.min(800, Math.max(50, parseInt(tempMatch[1])));
    return {
      type: 'tool_call',
      functionName: 'set_temperature',
      args: { temperature: k },
      text: `[Offline Autonomous Command] Setting thermodynamic temperature to ${k} K.`
    };
  }

  // 6. Tool call: Camera views
  if (lower.includes('front view') || lower.includes('camera front')) {
    return {
      type: 'tool_call',
      functionName: 'set_camera_view',
      args: { view: 'front' },
      text: `[Offline Autonomous Command] Aligning camera to Front projection.`
    };
  }
  if (lower.includes('chair view') || lower.includes('iso view') || lower.includes('isometric')) {
    return {
      type: 'tool_call',
      functionName: 'set_camera_view',
      args: { view: 'chair' },
      text: `[Offline Autonomous Command] Aligning camera to Isometric Chair projection.`
    };
  }
  if (lower.includes('haworth view') || lower.includes('haworth')) {
    return {
      type: 'tool_call',
      functionName: 'set_camera_view',
      args: { view: 'haworth' },
      text: `[Offline Autonomous Command] Aligning camera to Haworth projection.`
    };
  }
  if (lower.includes('fischer view') || lower.includes('top view') || lower.includes('fischer') || lower.includes('newman')) {
    return {
      type: 'tool_call',
      functionName: 'set_camera_view',
      args: { view: 'fischer' },
      text: `[Offline Autonomous Command] Aligning camera to top-down Fischer / Newman axial view.`
    };
  }

  // 7. Tool call: Dipole vector
  if (lower.includes('hide dipole') || lower.includes('turn off dipole') || lower.includes('disable dipole')) {
    return {
      type: 'tool_call',
      functionName: 'toggle_dipole_vector',
      args: { show: false },
      text: `[Offline Autonomous Command] Hiding 3D molecular dipole vector arrow.`
    };
  }
  if (lower.includes('show dipole') || lower.includes('turn on dipole') || lower.includes('display dipole')) {
    return {
      type: 'tool_call',
      functionName: 'toggle_dipole_vector',
      args: { show: true },
      text: `[Offline Autonomous Command] Displaying live 3D net molecular dipole vector arrow.`
    };
  }

  // 8. Tool call: Reasoning mode
  if (lower.includes('descriptive') || lower.includes('quantum mode') || lower.includes('detailed mode')) {
    return {
      type: 'tool_call',
      functionName: 'set_reasoning_mode',
      args: { mode: 'descriptive' },
      text: `[Offline Autonomous Command] Switching Copilot to Descriptive Quantum Reasoning mode.`
    };
  }
  if (lower.includes('simplified') || lower.includes('simple mode') || lower.includes('intuitive')) {
    return {
      type: 'tool_call',
      functionName: 'set_reasoning_mode',
      args: { mode: 'simplified' },
      text: `[Offline Autonomous Command] Switching Copilot to Simplified Intuitive Reasoning mode.`
    };
  }

  // 9. Tool call: Panels minimize/expand
  if (lower.includes('minimize') || lower.includes('collapse') || lower.includes('hide hud')) {
    return {
      type: 'tool_call',
      functionName: 'toggle_panel_visibility',
      args: { panel: 'both', minimize: true },
      text: `[Offline Autonomous Command] Minimizing bottom telemetry HUD panels.`
    };
  }
  if (lower.includes('expand') || lower.includes('restore hud') || lower.includes('show panel')) {
    return {
      type: 'tool_call',
      functionName: 'toggle_panel_visibility',
      args: { panel: 'both', minimize: false },
      text: `[Offline Autonomous Command] Expanding bottom telemetry HUD panels.`
    };
  }

  // 10. Tool call: 2D Chemical Sketcher
  if (lower.includes('draw') || lower.includes('sketch') || lower.includes('ketcher')) {
    return {
      type: 'tool_call',
      functionName: 'open_chemical_drawer',
      args: { open: true },
      text: `[Offline Autonomous Command] Opening 2D Molecular Sketcher.`
    };
  }

  // 10b. Tool call: 2D Notebook Structure Suite (Skeletal, Newman, Chair-Boat, Fischer)
  if (lower.includes('chair') || lower.includes('boat') || lower.includes('twist-boat') || lower.includes('cyclohexane')) {
    return {
      type: 'tool_call',
      functionName: 'show_2d_notebook_structure',
      args: { show: true, tab: 'chair-boat' },
      text: `[Offline Autonomous Command] Opening Chair-Boat Conformations in 2D Notebook.`
    };
  }
  if (lower.includes('fischer') || lower.includes('fisher') || lower.includes('d-glucose') || lower.includes('d-sugar') || lower.includes('l-sugar') || lower.includes('stereocenter')) {
    return {
      type: 'tool_call',
      functionName: 'show_2d_notebook_structure',
      args: { show: true, tab: 'fischer' },
      text: `[Offline Autonomous Command] Opening Fischer Configuration & 3D Wedge/Dash Inspector in 2D Notebook.`
    };
  }
  if (lower.includes('newman')) {
    return {
      type: 'tool_call',
      functionName: 'show_2d_notebook_structure',
      args: { show: true, tab: 'newman' },
      text: `[Offline Autonomous Command] Opening Dynamic Newman Projection in 2D Notebook.`
    };
  }
  if (lower.includes('notebook') || lower.includes('2d structure') || lower.includes('draw in notebook') || lower.includes('skeletal structure') || lower.includes('write in notebook') || lower.includes('2d view') || lower.includes('2d formula')) {
    return {
      type: 'tool_call',
      functionName: 'show_2d_notebook_structure',
      args: { show: true, tab: 'skeletal' },
      text: `[Offline Autonomous Command] Opening 2D Chemistry Lab Notebook Suite.`
    };
  }

  // 11. Tool call: Fit to Window / Zoom to Fit
  if (lower.includes('fit') || lower.includes('zoom to fit') || lower.includes('fit to screen') || lower.includes('fit window') || lower.includes('fit model') || lower.includes('center view') || lower.includes('center molecule') || lower.includes('reset view') || lower.includes('reset zoom')) {
    return {
      type: 'tool_call',
      functionName: 'fit_to_window',
      args: { preset: 'current' },
      text: `[Offline Autonomous Command] Fitting 3D molecule model perfectly within viewport.`
    };
  }

  // 11. Tool call: 10 Popular Themes & Dark/Light Mode
  if (lower.includes('dracula')) {
    return {
      type: 'tool_call',
      functionName: 'set_theme_palette',
      args: { palette: 'dracula' },
      text: `[Offline Autonomous Command] Switching website theme palette to Dracula.`
    };
  }
  if (lower.includes('nord')) {
    return {
      type: 'tool_call',
      functionName: 'set_theme_palette',
      args: { palette: 'nord' },
      text: `[Offline Autonomous Command] Switching website theme palette to Nord Arctic.`
    };
  }
  if (lower.includes('monokai') || lower.includes('catppuccin')) {
    return {
      type: 'tool_call',
      functionName: 'set_theme_palette',
      args: { palette: 'monokai' },
      text: `[Offline Autonomous Command] Switching website theme palette to Monokai Pro.`
    };
  }
  if (lower.includes('hotdog') || lower.includes('hot dog') || lower.includes('ketchup') || lower.includes('mustard') || lower.includes('tokyo')) {
    return {
      type: 'tool_call',
      functionName: 'set_theme_palette',
      args: { palette: 'hotdog' },
      text: `[Offline Autonomous Command] Switching website theme palette to Hot Dog Stand (Windows 3.1 Absurd).`
    };
  }
  if (lower.includes('emerald') || lower.includes('matrix') || lower.includes('forest')) {
    return {
      type: 'tool_call',
      functionName: 'set_theme_palette',
      args: { palette: 'emerald' },
      text: `[Offline Autonomous Command] Switching website theme palette to Emerald Matrix.`
    };
  }
  if (lower.includes('solarized')) {
    return {
      type: 'tool_call',
      functionName: 'set_theme_palette',
      args: { palette: 'solarized' },
      text: `[Offline Autonomous Command] Switching website theme palette to Solarized.`
    };
  }
  if (lower.includes('sunset') || lower.includes('synthwave')) {
    return {
      type: 'tool_call',
      functionName: 'set_theme_palette',
      args: { palette: 'sunset' },
      text: `[Offline Autonomous Command] Switching website theme palette to Cyber Sunset.`
    };
  }
  if (lower.includes('radioactive') || lower.includes('slime') || lower.includes('chernobyl') || lower.includes('biohazard') || lower.includes('toxic') || lower.includes('rose') || lower.includes('rosé')) {
    return {
      type: 'tool_call',
      functionName: 'set_theme_palette',
      args: { palette: 'radioactive' },
      text: `[Offline Autonomous Command] Switching website theme palette to Radioactive Slime (Chernobyl Biohazard).`
    };
  }
  if (lower.includes('absurd')) {
    return {
      type: 'tool_call',
      functionName: 'set_theme_palette',
      args: { palette: 'hotdog' },
      text: `[Offline Autonomous Command] Switching website theme palette to the ultimate absurd theme: Hot Dog Stand (Windows 3.1 Ketchup & Mustard)!`
    };
  }
  if (lower.includes('obsidian') || lower.includes('monochrome') || lower.includes('minimalist')) {
    return {
      type: 'tool_call',
      functionName: 'set_theme_palette',
      args: { palette: 'obsidian' },
      text: `[Offline Autonomous Command] Switching website theme palette to Obsidian Clean.`
    };
  }
  if (lower.includes('midnight') || lower.includes('cyberpunk')) {
    return {
      type: 'tool_call',
      functionName: 'set_theme_palette',
      args: { palette: 'midnight' },
      text: `[Offline Autonomous Command] Switching website theme palette to Midnight Neon.`
    };
  }
  if (lower.includes('light mode') || lower.includes('day mode') || lower.includes('light theme')) {
    return {
      type: 'tool_call',
      functionName: 'set_theme_mode',
      args: { mode: 'light' },
      text: `[Offline Autonomous Command] Switching theme to Light Mode.`
    };
  }
  if (lower.includes('dark mode') || lower.includes('night mode') || lower.includes('dark theme')) {
    return {
      type: 'tool_call',
      functionName: 'set_theme_mode',
      args: { mode: 'dark' },
      text: `[Offline Autonomous Command] Switching theme to Dark Mode.`
    };
  }

  // 11. State Awareness Queries
  if (state) {
    if (lower.includes('what molecule') || lower.includes('current molecule')) {
      return {
        type: 'text',
        text: `You are currently viewing **${state.molecule?.name || 'Target Molecule'}** (SMILES: \`${state.molecule?.smiles || 'N/A'}\`, Formula: ${state.molecule?.formula || 'N/A'}). Active rotating bond: ${state.molecule?.activeBond || 'None'}.`
      };
    }
    if (lower.includes('what angle') || lower.includes('current angle') || lower.includes('dihedral')) {
      return {
        type: 'text',
        text: `The active central dihedral angle is currently set at **${state.angle}°**, with a conformational energy of **${state.currentEnergy} kJ/mol** and dipole of **${state.liveDipole?.magnitude ?? '0.00'} D**.`
      };
    }
    if (lower.includes('what energy') || lower.includes('current energy')) {
      return {
        type: 'text',
        text: `Current conformational potential energy is **${state.currentEnergy} kJ/mol** (${(state.currentEnergy / 4.184).toFixed(2)} kcal/mol).`
      };
    }
    if (lower.includes('what temperature') || lower.includes('current temperature')) {
      return {
        type: 'text',
        text: `The simulation temperature is set to **${state.temperature} K** (${(state.temperature - 273.15).toFixed(1)} °C).`
      };
    }
  }

  // 12. Common chemistry Q&A
  if (lower.includes('strain') || lower.includes('steric')) {
    return {
      type: 'text',
      text: `Steric strain occurs when non-bonded electron clouds are forced closer than their van der Waals radii allow, causing electron cloud Pauli repulsion and raising conformational energy.`
    };
  }
  if (lower.includes('boltzmann')) {
    return {
      type: 'text',
      text: `The Boltzmann distribution P(E) ∝ exp(-ΔE / kT) governs conformer populations at thermal equilibrium, meaning the lowest energy state (Anti) dominates population density.`
    };
  }
  if (lower.includes('dipole')) {
    return {
      type: 'text',
      text: `The molecular dipole moment represents the vector sum of individual bond dipoles: μ = Σ q_i * r_i. Conformation directly alters the spatial orientation and cancellation of these vectors.`
    };
  }

  return {
    type: 'text',
    text: `Phase-Conform AI: Ready! You can ask me to "load caffeine", "set wireframe", "rotate to anti", "spin the bond", "set temperature to 450 K", "fischer view", "toggle dipole", or ask any chemical question.`
  };
}

export async function POST(req) {
  let message = "";
  let history = [];
  let state = null;
  try {
    const body = await req.json();
    message = body.message || "";
    history = body.history || [];
    state = body.state || null;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(handleLocalFallback(message, state));
    }

    const ai = new GoogleGenAI({ apiKey });

    // Define comprehensive tools for autonomous UI control across the ENTIRE dashboard
    const tools = [{
      functionDeclarations: [
        {
          name: "load_molecule",
          description: "Search PubChem and load any chemical compound into the 3D viewer (e.g., 'Butane', 'Aspirin', 'Caffeine', 'Glucose', 'Ibuprofen', 'Benzene', 'Ethanol', or any SMILES).",
          parameters: {
            type: Type.OBJECT,
            properties: {
              query: { type: Type.STRING, description: "Name of the chemical compound or SMILES string" }
            },
            required: ["query"]
          }
        },
        {
          name: "set_dihedral_angle",
          description: "Rotate the rotatable dihedral bond to an absolute target angle in degrees (0 to 360). 0 is Syn-periplanar (maximum clash), 60/300 is Gauche, 120/240 is Eclipsed, 180 is Anti-periplanar (lowest energy). If the user asks for a relative rotation (e.g. 'rotate by 30 more degrees'), calculate the new angle based on the current angle from the dashboard telemetry.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              angle: { type: Type.NUMBER, description: "Target angle in degrees (0-360)" }
            },
            required: ["angle"]
          }
        },
        {
          name: "set_temperature",
          description: "Set the thermodynamic temperature in Kelvin (50 K to 800 K) to update the Boltzmann conformer population distribution and thermal ensemble.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              temperature: { type: Type.NUMBER, description: "Temperature in Kelvin (e.g. 298 for room temp, 500 for hot, 100 for cold)" }
            },
            required: ["temperature"]
          }
        },
        {
          name: "set_render_mode",
          description: "Change the 3D molecular visualization rendering style.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              mode: { type: Type.STRING, description: "One of: 'ball-stick' (classic ball and stick), 'vdw' (space-filling van der Waals spheres), 'wireframe' (bonds only), or 'esp' (electrostatic potential charge surface)" }
            },
            required: ["mode"]
          }
        },
        {
          name: "toggle_auto_spin",
          description: "Start or stop continuous auto-rotation of either the dihedral bond or the entire 3D molecule turntable.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              target: { type: Type.STRING, description: "'bond' to rotate the dihedral angle continuously, 'molecule' to spin the 3D turntable, or 'both'" },
              state: { type: Type.BOOLEAN, description: "true to start spinning, false to stop spinning" }
            },
            required: ["target", "state"]
          }
        },
        {
          name: "toggle_dipole_vector",
          description: "Show or hide the live 3D net molecular dipole vector arrow in the 3D viewport.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              show: { type: Type.BOOLEAN, description: "true to show the dipole arrow, false to hide it" }
            },
            required: ["show"]
          }
        },
        {
          name: "set_camera_view",
          description: "Switch the 3D camera to a predefined stereochemical projection view angle.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              view: { type: Type.STRING, description: "'front' (standard front perspective), 'chair' (isometric chair view), 'haworth' (Haworth ring projection), or 'fischer' (top-down Fischer / Newman projection looking down the bond)" }
            },
            required: ["view"]
          }
        },
        {
          name: "set_reasoning_mode",
          description: "Switch the Conformation Copilot reasoning mode in Panel 1.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              mode: { type: Type.STRING, description: "'simplified' for intuitive physical concepts, 'descriptive' for quantum orbital and steric overlap mechanics" }
            },
            required: ["mode"]
          }
        },
        {
          name: "toggle_panel_visibility",
          description: "Minimize or expand the bottom telemetry HUD cards (Panel 3: AI Deep Learning, Panel 4: Thermodynamic Extrema).",
          parameters: {
            type: Type.OBJECT,
            properties: {
              panel: { type: Type.STRING, description: "'ai_metrics', 'extrema', or 'both'" },
              minimize: { type: Type.BOOLEAN, description: "true to collapse/minimize, false to expand" }
            },
            required: ["panel", "minimize"]
          }
        },
        {
          name: "open_chemical_drawer",
          description: "Open or close the 2D Ketcher molecular drawing modal to sketch a custom chemical structure.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              open: { type: Type.BOOLEAN, description: "true to open 2D drawer, false to close" }
            },
            required: ["open"]
          }
        },
        {
          name: "zoom_camera",
          description: "Zoom the 3D viewport camera in or out.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              direction: { type: Type.STRING, description: "'in' to zoom closer, 'out' to zoom further back" }
            },
            required: ["direction"]
          }
        },
        {
          name: "set_theme_palette",
          description: "Change the overall website color palette theme across the whole application. Supported 10 popular palettes: 'midnight' (Midnight Neon Cyberpunk), 'monokai' (Monokai Pro Techno Gold), 'nord' (Nord Arctic), 'dracula' (Dracula Vampire/Dawn), 'hotdog' (Hot Dog Stand Windows 3.1 Absurd Ketchup & Mustard), 'emerald' (Emerald Matrix BioTech), 'solarized' (Solarized Amber & Teal), 'sunset' (Cyber Sunset Synthwave), 'radioactive' (Radioactive Slime Chernobyl Biohazard), 'obsidian' (Obsidian OLED / Minimalist Studio).",
          parameters: {
            type: Type.OBJECT,
            properties: {
              palette: { type: Type.STRING, description: "Theme palette ID: 'midnight', 'monokai', 'nord', 'dracula', 'hotdog', 'emerald', 'solarized', 'sunset', 'radioactive', or 'obsidian'" }
            },
            required: ["palette"]
          }
        },
        {
          name: "set_theme_mode",
          description: "Toggle or switch the application between Dark Mode and Light Mode for the active color palette.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              mode: { type: Type.STRING, description: "'dark' or 'light'" }
            },
            required: ["mode"]
          }
        },
        {
          name: "fit_to_window",
          description: "Fit the whole 3D molecule model perfectly within the visible viewport window, automatically calculating the ideal camera distance and centering the bounding box so nothing is clipped.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              preset: { type: Type.STRING, description: "Optional view perspective: 'current' (maintains current user angle), 'front', 'chair', 'haworth', or 'fischer'" }
            }
          }
        },
        {
          name: "show_2d_notebook_structure",
          description: "Open or close the 2D Chemistry Lab Notebook inspector, featuring 2D skeletal bond-line formulas, dynamic Newman projections, cyclohexane Chair-Boat conformations (with axial/equatorial bonds & ring-flip), and Fischer configurations (with 3D wedge/dash equivalents & D/L rules).",
          parameters: {
            type: Type.OBJECT,
            properties: {
              show: { type: Type.BOOLEAN, description: "true to open 2D notebook viewer, false to close" },
              tab: { type: Type.STRING, description: "Optional specific tab to open: 'skeletal', 'newman', 'chair-boat', 'fischer', or 'guide'" }
            },
            required: ["show"]
          }
        }
      ]
    }];

    // Construct live dashboard telemetry context for Gemini
    let telemetryContext = "Dashboard telemetry currently unavailable.";
    if (state) {
      telemetryContext = `CURRENT LIVE DASHBOARD TELEMETRY:
- Loaded Molecule: ${state.molecule?.name || 'Unknown'} (SMILES: ${state.molecule?.smiles || 'N/A'}, Formula: ${state.molecule?.formula || 'N/A'}, Atoms: ${state.molecule?.numAtoms || 0})
- Rotatable Bond: ${state.molecule?.activeBond || 'None'}
- Dihedral Angle: ${state.angle}°
- Potential Energy: ${state.currentEnergy} kJ/mol (${(state.currentEnergy / 4.184).toFixed(2)} kcal/mol)
- Temperature: ${state.temperature} K (${(state.temperature - 273.15).toFixed(1)} °C)
- 3D Render Mode: ${state.renderMode} ('ball-stick', 'vdw', 'wireframe', or 'esp')
- 3D Dipole Vector: ${state.showDipole ? 'Visible' : 'Hidden'} (Magnitude: ${state.liveDipole?.magnitude ?? '0.00'} D, Vector: [${state.liveDipole?.vector?.join(', ') || '0, 0, 0'}])
- Steric Clash Status: ${state.clashData ? `${state.clashData.overlap} Å overlap between ${state.clashData.atoms}` : 'No active steric overlap'}
- Dihedral Auto-Spin: ${state.isAutoRotatingBond ? 'RUNNING' : 'STOPPED'}
- Turntable Auto-Spin: ${state.isAutoRotatingMolecule ? 'RUNNING' : 'STOPPED'}
- Active Theme: ${state.theme?.paletteName || state.theme?.palette || 'Midnight Neon'} (${state.theme?.mode || 'dark'} mode)
- Copilot Reasoning Mode: ${state.copilotMode} ('simplified' or 'descriptive')
- Bottom HUDs: AI Metrics is ${state.isAiMetricsMinimized ? 'minimized' : 'expanded'}, Extrema is ${state.isExtremaMinimized ? 'minimized' : 'expanded'}`;
    }

    const systemInstruction = `You are 'Phase-Conform AI', a world-class computational chemistry AI copilot and autonomous presenter built into this 3D web application.
You have FULL ACCESS to the live dashboard state and CAN AUTONOMOUSLY CONTROL EVERY FEATURE ON THE WEBSITE using your tools.

${telemetryContext}

CRITICAL INSTRUCTIONS:
1. AUTONOMOUS UI CONTROL: When the user asks you to load a molecule, rotate a bond, change temperature, switch render mode, toggle spin, change camera view, minimize panels, or open the sketcher, YOU MUST INVOKE THE RELEVANT TOOL. Do not just talk about doing it—execute it!
2. RELATIVE ADJUSTMENTS: If the user asks to "rotate 30 degrees more" or "heat it up by 50 degrees", check the current live telemetry above, compute the new value, and call the tool with the result.
3. PRECISE AND CONCISE: Answer scientific questions with high chemical accuracy (Pauli repulsion, hyperconjugation, dipole cancellation, Boltzmann populations) and keep responses concise and polished.
4. NO RAW LATEX: Never use raw LaTeX math syntax ($..., \\sigma, \\text{}, \\AA, ^\\circ). Always write clean standard Unicode directly: σ, π, σ*, Å, °, →, ΔE, μ, kJ/mol, Debye.`;

    const contents = history ? history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    })) : [];

    contents.push({ role: 'user', parts: [{ text: message }] });

    let response = null;
    const modelCandidates = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash'];
    for (const m of modelCandidates) {
      try {
        response = await ai.models.generateContent({
          model: m,
          contents: contents,
          config: {
            systemInstruction,
            tools,
            temperature: 0.7,
          }
        });
        if (response) break;
      } catch (mErr) {
        console.warn(`Model ${m} failed, trying next candidate:`, mErr.message);
      }
    }

    if (!response) {
      return NextResponse.json(handleLocalFallback(message, state));
    }

    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      let actionText = "Executing autonomous UI command...";
      if (call.name === 'set_dihedral_angle') {
        const ang = call.args?.angle ?? 180;
        const name = (ang === 180) ? "Anti (global minimum)" : (ang === 60 || ang === 300) ? "Gauche (metastable)" : (ang === 0) ? "Syn (max steric clash)" : `${ang}°`;
        actionText = `Rotating dihedral angle to ${ang}° [${name}].`;
      } else if (call.name === 'load_molecule') {
        actionText = `Searching PubChem and loading '${call.args?.query}' into the 3D viewer.`;
      } else if (call.name === 'set_render_mode') {
        actionText = `Switching 3D render mode to '${call.args?.mode}'.`;
      } else if (call.name === 'set_temperature') {
        actionText = `Adjusting thermodynamic temperature to ${call.args?.temperature} K.`;
      } else if (call.name === 'toggle_auto_spin') {
        actionText = `${call.args?.state ? 'Starting' : 'Stopping'} auto-rotation for ${call.args?.target}.`;
      } else if (call.name === 'toggle_dipole_vector') {
        actionText = `${call.args?.show ? 'Enabling' : 'Disabling'} 3D molecular dipole vector.`;
      } else if (call.name === 'set_camera_view') {
        actionText = `Aligning 3D camera to '${call.args?.view}' projection.`;
      } else if (call.name === 'set_reasoning_mode') {
        actionText = `Switching Copilot reasoning mode to '${call.args?.mode}'.`;
      } else if (call.name === 'toggle_panel_visibility') {
        actionText = `${call.args?.minimize ? 'Minimizing' : 'Expanding'} ${call.args?.panel} telemetry HUDs.`;
      } else if (call.name === 'open_chemical_drawer') {
        actionText = `${call.args?.open ? 'Opening' : 'Closing'} 2D molecular sketcher.`;
      } else if (call.name === 'zoom_camera') {
        actionText = `Zooming camera ${call.args?.direction}.`;
      } else if (call.name === 'set_theme_palette') {
        actionText = `Switching website color palette to '${call.args?.palette}'.`;
      } else if (call.name === 'set_theme_mode') {
        actionText = `Switching website theme to ${call.args?.mode} mode.`;
      } else if (call.name === 'fit_to_window') {
        actionText = `Fitting 3D molecular model perfectly within visible viewport window.`;
      }

      return NextResponse.json({
        type: 'tool_call',
        functionName: call.name,
        args: call.args,
        text: sanitizeScientificText(response.text || actionText)
      });
    }

    return NextResponse.json({
      type: 'text',
      text: sanitizeScientificText(response.text)
    });

  } catch (error) {
    console.warn("Gemini API Error (activating local fallback):", error.message);
    return NextResponse.json(handleLocalFallback(message, state));
  }
}
