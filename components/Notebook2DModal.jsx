"use client";
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Copy, Check, Download, BookOpen, Compass, FileText, 
  Sparkles, RefreshCw, Layers, ArrowRight, RotateCw, Info, CheckCircle2 
} from 'lucide-react';

// Dynamic Newman Substituent Extractor for ANY Compound
function extractNewmanSubstituents(molData) {
  if (!molData) {
    return {
      front: { top: "H", left: "H", right: "H" },
      back: { top: "H", left: "H", right: "H" },
      frontAtomName: "Front",
      backAtomName: "Back",
      hasRotatableBond: false
    };
  }

  const atoms = molData.atoms || [];
  const bonds = molData.bonds || [];
  const activeBond = molData.active_bond || molData.rotatable_bond;

  if (!activeBond || activeBond.a2 === undefined || activeBond.a3 === undefined) {
    return {
      front: { top: "CH₃", left: "H", right: "H" },
      back: { top: "CH₃", left: "H", right: "H" },
      frontAtomName: "C1",
      backAtomName: "C2",
      hasRotatableBond: false
    };
  }

  const a2 = activeBond.a2;
  const a3 = activeBond.a3;

  const getSubstituentForAtom = (centerIdx, otherIdx) => {
    const neighborBonds = bonds.filter(b => 
      (b.start === centerIdx && b.end !== otherIdx) || 
      (b.end === centerIdx && b.start !== otherIdx)
    );

    const labels = [];
    neighborBonds.forEach(b => {
      const nbrIdx = b.start === centerIdx ? b.end : b.start;
      const nbr = atoms[nbrIdx];
      if (!nbr) return;

      const sym = nbr.symbol || nbr.element || 'C';

      if (sym === 'H') {
        labels.push("H");
      } else if (sym === 'Cl' || sym === 'F' || sym === 'Br' || sym === 'I') {
        labels.push(sym);
      } else if (sym === 'O') {
        const isOH = bonds.some(ob => 
          (ob.start === nbrIdx || ob.end === nbrIdx) && 
          (atoms[ob.start === nbrIdx ? ob.end : ob.start]?.symbol === 'H' || atoms[ob.start === nbrIdx ? ob.end : ob.start]?.element === 'H')
        );
        labels.push(isOH ? "OH" : "O–R");
      } else if (sym === 'N') {
        labels.push("NH₂");
      } else if (sym === 'C') {
        const subBonds = bonds.filter(sb => 
          (sb.start === nbrIdx && sb.end !== centerIdx) || 
          (sb.end === nbrIdx && sb.start !== centerIdx)
        );
        const heavySub = subBonds.filter(sb => {
          const atIdx = sb.start === nbrIdx ? sb.end : sb.start;
          const s = atoms[atIdx]?.symbol || atoms[atIdx]?.element;
          return s && s !== 'H';
        });

        if (heavySub.length === 0) {
          labels.push("CH₃");
        } else if (heavySub.length === 1) {
          const firstAtIdx = heavySub[0].start === nbrIdx ? heavySub[0].end : heavySub[0].start;
          const firstSym = atoms[firstAtIdx]?.symbol || atoms[firstAtIdx]?.element;
          if (firstSym === 'O') labels.push("CHO");
          else labels.push("CH₂CH₃");
        } else {
          const hasOxygen = heavySub.some(sb => {
            const atIdx = sb.start === nbrIdx ? sb.end : sb.start;
            const s = atoms[atIdx]?.symbol || atoms[atIdx]?.element;
            return s === 'O';
          });
          if (hasOxygen) labels.push("COOH");
          else labels.push("R-Alkyl");
        }
      } else {
        labels.push(sym);
      }
    });

    while (labels.length < 3) {
      labels.push("H");
    }

    labels.sort((a, b) => {
      if (a === "H" && b !== "H") return 1;
      if (a !== "H" && b === "H") return -1;
      return 0;
    });

    return {
      top: labels[0] || "H",
      left: labels[1] || "H",
      right: labels[2] || "H"
    };
  };

  const frontSym = atoms[a2]?.symbol || atoms[a2]?.element || 'C';
  const backSym = atoms[a3]?.symbol || atoms[a3]?.element || 'C';

  return {
    front: getSubstituentForAtom(a2, a3),
    back: getSubstituentForAtom(a3, a2),
    frontAtomName: `${frontSym}${a2 + 1}`,
    backAtomName: `${backSym}${a3 + 1}`,
    hasRotatableBond: true
  };
}

// 6-Membered Saturated Cyclohexane Ring Analyzer
function analyzeCyclohexaneRing(molData) {
  if (!molData) return { hasRing: false, ringType: null, name: null, substituent: null, aValue: 0 };
  const smiles = molData.smiles || "";

  if (smiles === 'C1CCCCC1') {
    return { hasRing: true, ringType: 'cyclohexane', name: 'Cyclohexane', substituent: null, aValue: 0.0 };
  }
  if (smiles === 'CC1CCCCC1') {
    return { hasRing: true, ringType: 'methylcyclohexane', name: 'Methylcyclohexane', substituent: 'CH₃', aValue: 7.3 };
  }
  if (smiles === 'OC1CCCCC1') {
    return { hasRing: true, ringType: 'cyclohexanol', name: 'Cyclohexanol', substituent: 'OH', aValue: 3.8 };
  }
  if (smiles === 'ClC1CCCCC1') {
    return { hasRing: true, ringType: 'chlorocyclohexane', name: 'Chlorocyclohexane', substituent: 'Cl', aValue: 2.2 };
  }
  if (smiles.includes('C1CCCCC1') || smiles.includes('C1CCCC1') || smiles.includes('1CCCCC1')) {
    return { hasRing: true, ringType: 'substituted_cyclohexane', name: 'Substituted Cyclohexane', substituent: 'R', aValue: 5.0 };
  }
  if (smiles.includes('OC[C@H]1OC') || smiles.includes('C1OC(O)C(O)C(O)C1')) {
    return { hasRing: true, ringType: 'glucose', name: 'D-Glucose Pyranose Ring', substituent: 'OH / CH₂OH', aValue: 8.5 };
  }

  return { hasRing: false, ringType: null, name: molData.name || "Acyclic Compound", substituent: null, aValue: 0 };
}

// Fischer Projection Chirality Analyzer
function analyzeFischerChirality(molData) {
  if (!molData) return { isChiral: false, stereocenters: [], configType: null };
  const smiles = molData.smiles || "";
  const atoms = molData.atoms || [];

  if (smiles === 'CC(N)C(=O)O' || smiles === 'N[C@@H](C)C(=O)O' || smiles === 'N[C@H](C)C(=O)O') {
    return {
      isChiral: true,
      configType: 'alanine',
      name: 'L-Alanine',
      formula: 'C3H7NO2',
      chiralCount: 1,
      top: 'COOH',
      center: { name: 'Cα (S)', left: 'H₂N', right: 'H' },
      bottom: 'CH₃',
      dlFamily: 'L-Amino Acid',
      cip: '(S)-Alanine'
    };
  }

  if (smiles === 'OCC(O)C=O' || smiles === 'O=C[C@H](O)CO') {
    return {
      isChiral: true,
      configType: 'glyceraldehyde_d',
      name: 'D-Glyceraldehyde',
      formula: 'C3H6O3',
      chiralCount: 1,
      top: 'CHO',
      center: { name: 'C2 (2R)', left: 'H', right: 'OH' },
      bottom: 'CH₂OH',
      dlFamily: 'D-Sugar (Standard)',
      cip: '(2R)-Glyceraldehyde'
    };
  }

  if (smiles === 'O=C[C@@H](O)CO') {
    return {
      isChiral: true,
      configType: 'glyceraldehyde_l',
      name: 'L-Glyceraldehyde',
      formula: 'C3H6O3',
      chiralCount: 1,
      top: 'CHO',
      center: { name: 'C2 (2S)', left: 'HO', right: 'H' },
      bottom: 'CH₂OH',
      dlFamily: 'L-Sugar',
      cip: '(2S)-Glyceraldehyde'
    };
  }

  if (smiles.includes('C(O)C(O)C(=O)O') || smiles.includes('O=C(O)C(O)C(O)C(=O)O')) {
    return {
      isChiral: true,
      configType: 'tartaric_rr',
      name: '(2R,3R)-Tartaric Acid',
      formula: 'C4H6O6',
      chiralCount: 2,
      top: 'COOH',
      centers: [
        { name: 'C2 (2R)', left: 'H', right: 'OH' },
        { name: 'C3 (3R)', left: 'HO', right: 'H' }
      ],
      bottom: 'COOH',
      dlFamily: 'Chiral Tartrate',
      cip: '(2R,3R)'
    };
  }

  if (smiles.includes('OC[C@H]1OC') || smiles.includes('C(C(C(C(C=O)O)O)O)O') || smiles === 'OC[C@@H]1OC(O)[C@@H](O)[C@H](O)[C@H]1O') {
    return {
      isChiral: true,
      configType: 'glucose',
      name: 'D-Glucose',
      formula: 'C6H12O6',
      chiralCount: 4,
      top: 'CHO',
      centers: [
        { name: 'C2 (2R)', left: 'H', right: 'OH' },
        { name: 'C3 (3S)', left: 'OH', right: 'H' },
        { name: 'C4 (4R)', left: 'H', right: 'OH' },
        { name: 'C5 (5R)', left: 'H', right: 'OH' }
      ],
      bottom: 'CH₂OH',
      dlFamily: 'D-Aldohexose',
      cip: '(2R,3S,4R,5R)'
    };
  }

  if (smiles === 'CCC(O)C' || smiles === 'CC(O)CC') {
    return {
      isChiral: true,
      configType: 'generic_chiral',
      name: '2-Butanol',
      formula: 'C4H10O',
      chiralCount: 1,
      top: 'CH₃ (C1)',
      center: { name: 'C2 (2S)', left: 'HO', right: 'H' },
      bottom: 'CH₂CH₃ (C3–C4)',
      dlFamily: 'Chiral Alcohol',
      cip: '(2S)-sec-Butanol'
    };
  }

  if (smiles === 'CCC(Cl)C' || smiles === 'CC(Cl)CC') {
    return {
      isChiral: true,
      configType: 'generic_chiral',
      name: '2-Chlorobutane',
      formula: 'C4H9Cl',
      chiralCount: 1,
      top: 'CH₃ (C1)',
      center: { name: 'C2 (2S)', left: 'Cl', right: 'H' },
      bottom: 'CH₂CH₃ (C3–C4)',
      dlFamily: 'Chiral Halide',
      cip: '(2S)-Chlorobutane'
    };
  }

  const chiralAtoms = atoms.filter(a => a.stereo === 'R' || a.stereo === 'S');
  const hasAtInSmiles = smiles.includes('@');

  if (chiralAtoms.length > 0 || hasAtInSmiles) {
    return {
      isChiral: true,
      configType: 'generic_chiral',
      name: molData.name || 'Chiral Compound',
      formula: molData.formula || '',
      chiralCount: Math.max(chiralAtoms.length, 1),
      top: 'C-Terminal / Oxidized',
      center: { name: chiralAtoms[0] ? `C${chiralAtoms[0].index + 1} (${chiralAtoms[0].stereo})` : 'C* (Chiral)', left: 'Group A', right: 'Group B' },
      bottom: 'Alkyl / Alkane Tail',
      dlFamily: 'Chiral Stereoisomer',
      cip: chiralAtoms.map(a => `${a.element}${a.index + 1}: ${a.stereo}`).join(', ') || 'Chiral'
    };
  }

  return { isChiral: false, stereocenters: [], configType: null };
}

export default function Notebook2DModal({
  isOpen,
  onClose,
  moleculeData,
  angle = 180,
  setAngle,
  currentEnergy = 0,
  liveDipole,
  clashData,
  isDarkMode = true,
  currentTheme = {},
  initialTab = 'skeletal',
  onLoadMolecule
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'skeletal' | 'newman' | 'chair-boat' | 'fischer' | 'guide'

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [paperStyle, setPaperStyle] = useState('notebook'); // 'notebook' (ruled paper) | 'clean'
  const [viewMode, setViewMode] = useState('rdkit'); // 'rdkit' | 'pubchem'
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [customSvg, setCustomSvg] = useState(null);
  const [isLoadingSvg, setIsLoadingSvg] = useState(false);
  
  // Chair-Boat State
  const [chairConformer, setChairConformer] = useState('chair1'); // 'chair1' | 'chair2' | 'boat' | 'twist' | 'half'
  const [showAxialEquatorial, setShowAxialEquatorial] = useState(true);
  const [highlightFlagpole, setHighlightFlagpole] = useState(true);

  // Fischer State
  const [fischerPreset, setFischerPreset] = useState('active'); // 'active' | 'glucose' | 'glyceraldehyde_d' | 'glyceraldehyde_l' | 'alanine' | 'tartaric_rr' | 'tartaric_meso'
  const [showFischer3DWedges, setShowFischer3DWedges] = useState(true);

  // Automatically select Active Molecule when a chiral compound is loaded
  useEffect(() => {
    if (!moleculeData) return;
    const ch = analyzeFischerChirality(moleculeData);
    if (ch.isChiral) {
      setFischerPreset('active');
    } else {
      setFischerPreset('glucose');
    }
  }, [moleculeData?.smiles]);

  const newmanSvgRef = useRef(null);
  const skeletalContainerRef = useRef(null);
  const chairSvgRef = useRef(null);
  const fischerSvgRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch fresh 2D SVG if missing from moleculeData
  useEffect(() => {
    if (!isOpen || !moleculeData?.smiles) return;
    if (moleculeData.svg_2d) {
      setCustomSvg(moleculeData.svg_2d);
      return;
    }
    // Fetch from backend /api/2d_structure
    setIsLoadingSvg(true);
    const getBackendUrl = () => {
      if (process.env.NEXT_PUBLIC_BACKEND_URL) {
        const raw = process.env.NEXT_PUBLIC_BACKEND_URL.trim();
        if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
        return `https://${raw}`;
      }
      if (typeof window !== 'undefined') {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          return 'http://localhost:8000';
        }
        return 'https://phase-conform-backend.onrender.com';
      }
      return 'https://phase-conform-backend.onrender.com';
    };
    fetch(`${getBackendUrl()}/api/2d_structure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ smiles: moleculeData.smiles, width: 440, height: 320 })
    })
      .then(res => res.json())
      .then(data => {
        if (data.svg) setCustomSvg(data.svg);
      })
      .catch(err => {
        console.warn("Could not fetch 2D SVG from backend:", err);
      })
      .finally(() => {
        setIsLoadingSvg(false);
      });
  }, [isOpen, moleculeData?.smiles, moleculeData?.svg_2d]);

  if (!isOpen || !moleculeData) return null;

  const smiles = moleculeData.smiles || "CCCC";
  const name = moleculeData.name || "Target Molecule";
  const formula = moleculeData.formula || "C4H10";
  const numAtoms = moleculeData.atoms?.length || 0;
  const rotBond = moleculeData.active_bond ? `C${moleculeData.active_bond.a2}-C${moleculeData.active_bond.a3}` : "Active Bond";
  const normAngle = ((Math.round(angle) % 360) + 360) % 360;

  // Conformer classification for Newman
  const isAnti = normAngle >= 170 && normAngle <= 190;
  const isGauche = (normAngle >= 50 && normAngle <= 70) || (normAngle >= 290 && normAngle <= 310);
  const isSyn = normAngle <= 10 || normAngle >= 350;
  const isEclipsed = (normAngle >= 110 && normAngle <= 130) || (normAngle >= 230 && normAngle <= 250);

  let conformerName = "Intermediate Skew";
  let conformerBadge = "bg-amber-500/20 text-amber-300 border-amber-400/40";
  if (isAnti) {
    conformerName = "Anti-periplanar (Staggered)";
    conformerBadge = "bg-emerald-500/20 text-emerald-300 border-emerald-400/40";
  } else if (isGauche) {
    conformerName = "Synclinal Gauche (Staggered)";
    conformerBadge = "bg-indigo-500/20 text-indigo-300 border-indigo-400/40";
  } else if (isSyn) {
    conformerName = "Syn-periplanar (Fully Eclipsed)";
    conformerBadge = "bg-rose-500/20 text-rose-300 border-rose-400/40";
  } else if (isEclipsed) {
    conformerName = "Anticlinal Eclipsed";
    conformerBadge = "bg-pink-500/20 text-pink-300 border-pink-400/40";
  }

  // Substituent labels for Newman projection - dynamically extracted for ANY compound
  const newmanData = extractNewmanSubstituents(moleculeData);
  const frontSubstituents = newmanData.front;
  const backSubstituents = newmanData.back;
  const frontAtomLabel = newmanData.frontAtomName;
  const backAtomLabel = newmanData.backAtomName;

  // Active ring & chirality analyzers
  const ringAnalysis = analyzeCyclohexaneRing(moleculeData);
  const chirality = analyzeFischerChirality(moleculeData);

  const cx = 200;
  const cy = 200;
  const frontRadius = 75;
  const backRingRadius = 45;
  const backSpokeEnd = 95;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const frontAngles = [90, 210, 330];
  const frontLines = frontAngles.map(deg => {
    const r = toRad(deg);
    return {
      x: cx + frontRadius * Math.cos(r),
      y: cy - frontRadius * Math.sin(r),
      angle: deg
    };
  });

  const backAngles = [90 + normAngle, 210 + normAngle, 330 + normAngle];
  const backLines = backAngles.map(deg => {
    const r = toRad(deg);
    const startX = cx + backRingRadius * Math.cos(r);
    const startY = cy - backRingRadius * Math.sin(r);
    const endX = cx + backSpokeEnd * Math.cos(r);
    const endY = cy - backSpokeEnd * Math.sin(r);
    return { startX, startY, endX, endY, angle: deg };
  });

  // Copy structured lab report data to clipboard
  const handleCopyLabData = () => {
    const text = `========================================================
ORGANIC CHEMISTRY LAB NOTEBOOK - COMPLETE MOLECULE CONFORMATION
========================================================
Molecule: ${name}
Chemical Formula: ${formula}
SMILES: ${smiles}
Total Atoms: ${numAtoms}
Active Rotatable Bond: ${rotBond}
Dihedral Torsion Angle: ${normAngle}°
Conformation Type: ${conformerName}
Relative Energy: ${currentEnergy.toFixed(2)} kJ/mol (${(currentEnergy / 4.184).toFixed(2)} kcal/mol)
Net Dipole Moment: ${liveDipole?.magnitude !== undefined ? `${liveDipole.magnitude.toFixed(2)} D` : "N/A"}
Steric Strain Overlap: ${clashData?.overlap > 0 ? `${clashData.overlap.toFixed(2)} Å (${clashData.atom1}···${clashData.atom2})` : "0.00 Å (No steric clash)"}

CONFORMATION & STEREOCENTER SUMMARY:
1. Skeletal Bond-Line: 120° zigzag representation, implicit carbons and hydrogens.
2. Newman Projection (down ${rotBond}): θ = ${normAngle}°. ${isAnti ? "Anti-periplanar (Global Minimum, 0.0 kJ/mol)." : isGauche ? "Synclinal Gauche (+3.8 kJ/mol steric van der Waals strain)." : isSyn ? "Syn-periplanar (+21.0 kJ/mol maximum torsional + steric barrier)." : "Intermediate conformation."}
3. Cyclohexane Ring Conformations:
   - Chair 1: Global minimum (0.0 kJ/mol), all staggered bonds, 109.5° tetrahedral angles.
   - Boat: +30 kJ/mol, flagpole clash (C1-C4) and eclipsing strain (C2-C3 & C5-C6).
   - Twist-Boat: +23 kJ/mol, relieves flagpole overlap.
   - Half-Chair: +45 kJ/mol, maximum transition state barrier.
   - Ring Flip: Inverts all axial <-> equatorial positions (bulky groups favor equatorial).
4. Fischer Configuration:
   - Horizontal bonds = Solid Wedges (pointing forward toward viewer: "Horizontal Hugs You").
   - Vertical bonds = Dashed Hashes (pointing backward into page).
   - Penultimate carbon determines D/L configuration (OH on right = D, OH on left = L).
   - Conversion rule: Right in Fischer = DOWN in Haworth/Chair; Left in Fischer = UP.
========================================================`;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  // Download SVG Helper
  const downloadSvgElement = (svgRef, filename) => {
    if (!svgRef?.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const a = document.createElement("a");
    a.href = svgUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(svgUrl);
  };

  // Copy Image to Clipboard
  const handleCopyImage = async (elementRef, defaultFileName = "structure.png") => {
    try {
      let svgElement = elementRef.current;
      if (!svgElement) return;
      if (svgElement.tagName.toLowerCase() !== 'svg') {
        svgElement = svgElement.querySelector('svg');
      }
      if (!svgElement) return;

      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const URLObj = window.URL || window.webkitURL || window;
      const blobURL = URLObj.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 700;
        canvas.height = 600;
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 50, 50, 600, 500);

        canvas.toBlob((pngBlob) => {
          if (pngBlob && navigator.clipboard && navigator.clipboard.write) {
            navigator.clipboard.write([
              new ClipboardItem({ 'image/png': pngBlob })
            ]).then(() => {
              setCopiedImage(true);
              setTimeout(() => setCopiedImage(false), 2500);
            }).catch(err => {
              console.warn("Direct clipboard image paste failed, downloading instead:", err);
              const a = document.createElement("a");
              a.href = canvas.toDataURL("image/png");
              a.download = defaultFileName;
              a.click();
              setCopiedImage(true);
              setTimeout(() => setCopiedImage(false), 2500);
            });
          }
        }, "image/png");
      };
      image.src = blobURL;
    } catch (err) {
      console.warn("Failed to copy image:", err);
    }
  };

  const pubchemPngUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/PNG`;

  return (
    <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-md flex items-center justify-center p-1.5 sm:p-4 lg:p-6 animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-5xl h-[95dvh] max-h-[96dvh] sm:h-auto sm:max-h-[94vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border transition-all duration-300 relative ${
          isDarkMode ? 'bg-[#181825] border-indigo-500/30 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
        }`}
      >
        {/* Header Bar */}
        <div className={`p-3 sm:p-4 border-b flex items-center justify-between gap-2.5 sm:gap-3 shrink-0 ${
          isDarkMode ? 'bg-[#12121e] border-indigo-500/20' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-md text-white shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base md:text-lg font-bold tracking-tight flex items-center gap-1.5 truncate">
                  2D Chemistry Lab Notebook
                </h2>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 shrink-0">
                  {formula} ({smiles})
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                Publication-grade 2D skeletal formulas, dynamic Newman projections, Chair-Boat conformations, and Fischer configurations.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors shrink-0 ${
              isDarkMode ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Close Notebook Inspector (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls Bar */}
        <div className={`px-2 sm:px-3 py-1.5 sm:py-2 border-b flex items-center justify-between gap-1.5 shrink-0 overflow-x-auto no-scrollbar mobile-touch-scroll ${
          isDarkMode ? 'bg-[#161626] border-white/5' : 'bg-slate-100/70 border-slate-200'
        }`}>
          <div className="flex items-center gap-1 p-0.5 sm:p-1 rounded-xl bg-black/20 border border-white/5 overflow-x-auto no-scrollbar mobile-touch-scroll max-w-full flex-nowrap shrink-0">
            <button
              onClick={() => setActiveTab('skeletal')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'skeletal'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Skeletal
            </button>
            <button
              onClick={() => setActiveTab('newman')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'newman'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Newman ({normAngle}°)
            </button>
            <button
              onClick={() => setActiveTab('chair-boat')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'chair-boat'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Chair-Boat
            </button>
            <button
              onClick={() => setActiveTab('fischer')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'fischer'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <span className="text-xs font-bold">✝</span>
              Fischer
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'guide'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Drawing Rules
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopyLabData}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 border ${
                copiedText
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
              title="Copy complete lab notebook analysis report"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedText ? 'Report Copied!' : 'Copy Lab Data'}</span>
              <span className="sm:hidden">{copiedText ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Modal Main Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar">
          
          {/* TAB 1: 2D SKELETAL BOND-LINE FORMULA */}
          {activeTab === 'skeletal' && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Paper Style:</span>
                  <button
                    onClick={() => setPaperStyle('notebook')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all ${
                      paperStyle === 'notebook'
                        ? 'bg-indigo-500/30 text-indigo-300 border-indigo-400'
                        : 'bg-white/5 text-slate-400 border-transparent hover:bg-white/10'
                    }`}
                  >
                    📓 Ruled Lab Notebook
                  </button>
                  <button
                    onClick={() => setPaperStyle('clean')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all ${
                      paperStyle === 'clean'
                        ? 'bg-indigo-500/30 text-indigo-300 border-indigo-400'
                        : 'bg-white/5 text-slate-400 border-transparent hover:bg-white/10'
                    }`}
                  >
                    ⬜ Clean Card
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode(viewMode === 'rdkit' ? 'pubchem' : 'rdkit')}
                    className="px-2.5 py-1 rounded-md text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3 text-indigo-400" />
                    {viewMode === 'rdkit' ? 'PubChem 2D' : 'Vector SVG'}
                  </button>
                  <button
                    onClick={() => handleCopyImage(skeletalContainerRef, `${smiles}_skeletal.png`)}
                    className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all flex items-center gap-1.5"
                  >
                    {copiedImage ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    {copiedImage ? 'Copied Image!' : 'Copy Image'}
                  </button>
                  <button
                    onClick={() => {
                      if (!customSvg) return;
                      const svgBlob = new Blob([customSvg], { type: "image/svg+xml;charset=utf-8" });
                      const svgUrl = URL.createObjectURL(svgBlob);
                      const a = document.createElement("a");
                      a.href = svgUrl;
                      a.download = `${smiles}_2d_skeletal.svg`;
                      a.click();
                      URL.revokeObjectURL(svgUrl);
                    }}
                    className="px-2.5 py-1 rounded-md text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 transition-all flex items-center gap-1.5"
                  >
                    <Download className="w-3 h-3" />
                    SVG
                  </button>
                </div>
              </div>

              {/* 2D Canvas Display Box */}
              <div 
                ref={skeletalContainerRef}
                className={`w-full min-h-[340px] rounded-2xl border flex flex-col items-center justify-center p-6 relative overflow-hidden transition-all shadow-inner ${
                  paperStyle === 'notebook'
                    ? 'bg-[#fcfaf2] border-amber-300/60 shadow-[inset_0_0_40px_rgba(0,0,0,0.06)]'
                    : isDarkMode ? 'bg-[#12121e] border-indigo-500/20' : 'bg-slate-50 border-slate-300'
                }`}
                style={paperStyle === 'notebook' ? {
                  backgroundImage: `linear-gradient(#e0ded6 1px, transparent 1px), linear-gradient(90deg, #f4a6b2 2px, transparent 2px)`,
                  backgroundSize: `100% 28px, 100% 100%`,
                  backgroundPosition: `0 0, 50px 0`
                } : {}}
              >
                {paperStyle === 'notebook' && (
                  <div className="absolute top-3 left-4 text-[10px] font-mono font-bold text-rose-500/70 select-none">
                    LAB ENTRY #{normAngle}°
                  </div>
                )}

                {isLoadingSvg ? (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                    <span className="text-xs font-bold">Rendering 2D Vector Structure...</span>
                  </div>
                ) : viewMode === 'rdkit' && customSvg ? (
                  <div 
                    className="w-full max-w-[420px] max-h-[300px] flex items-center justify-center drop-shadow-md select-none"
                    dangerouslySetInnerHTML={{ __html: customSvg }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <img 
                      src={pubchemPngUrl} 
                      alt={`2D structure of ${smiles}`} 
                      className="max-w-[320px] max-h-[260px] object-contain drop-shadow-lg filter contrast-125"
                      onError={() => setViewMode('rdkit')}
                    />
                  </div>
                )}

                <div className={`mt-4 px-3 py-1 rounded-full text-xs font-mono font-bold border backdrop-blur-sm shadow-sm ${
                  paperStyle === 'notebook' 
                    ? 'bg-amber-100/90 text-amber-900 border-amber-300' 
                    : isDarkMode ? 'bg-white/10 text-indigo-300 border-white/10' : 'bg-white text-slate-700 border-slate-300'
                }`}>
                  Bond-Line Skeletal Formula • Standard 120° sp³ Zigzag Backbone
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DYNAMIC NEWMAN PROJECTION */}
          {activeTab === 'newman' && (
            <div className="flex flex-col gap-5">
              <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                isDarkMode ? 'bg-[#12121e] border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${conformerBadge}`}>
                    {conformerName}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Dihedral θ = <strong className="text-indigo-400 text-sm">{normAngle}°</strong> ({frontAtomLabel} ➔ {backAtomLabel})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyImage(newmanSvgRef, `${smiles}_newman_${normAngle}deg.png`)}
                    className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-sm transition-all flex items-center gap-1.5"
                  >
                    {copiedImage ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    {copiedImage ? 'Copied Newman!' : 'Copy Newman Image'}
                  </button>
                  <button
                    onClick={() => downloadSvgElement(newmanSvgRef, `${smiles}_newman_${normAngle}deg.svg`)}
                    className="px-2.5 py-1 rounded-md text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 transition-all flex items-center gap-1.5"
                  >
                    <Download className="w-3 h-3" />
                    SVG
                  </button>
                </div>
              </div>

              {/* Newman Projection Diagram SVG Canvas */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                <div 
                  className={`md:col-span-7 flex flex-col items-center justify-center p-6 rounded-2xl border relative overflow-hidden transition-all shadow-inner ${
                    paperStyle === 'notebook'
                      ? 'bg-[#fcfaf2] border-amber-300/60 shadow-[inset_0_0_40px_rgba(0,0,0,0.06)]'
                      : isDarkMode ? 'bg-[#12121e] border-indigo-500/20' : 'bg-slate-50 border-slate-300'
                  }`}
                  style={paperStyle === 'notebook' ? {
                    backgroundImage: `linear-gradient(#e0ded6 1px, transparent 1px), linear-gradient(90deg, #f4a6b2 2px, transparent 2px)`,
                    backgroundSize: `100% 28px, 100% 100%`,
                    backgroundPosition: `0 0, 50px 0`
                  } : {}}
                >
                  <svg
                    ref={newmanSvgRef}
                    viewBox="0 0 400 400"
                    width="100%"
                    height="320"
                    className="max-w-[340px] drop-shadow-md select-none overflow-visible"
                  >
                    <circle cx={cx} cy={cy} r="140" fill="none" stroke={paperStyle === 'notebook' ? "#e5e3dc" : (isDarkMode ? "#232338" : "#e2e8f0")} strokeWidth="1" strokeDasharray="4 4" />

                    {/* Back Carbon Spokes */}
                    {backLines.map((line, idx) => {
                      const label = idx === 0 ? backSubstituents.top : idx === 1 ? backSubstituents.left : backSubstituents.right;
                      const rad = toRad(line.angle);
                      const textX = cx + (backSpokeEnd + 22) * Math.cos(rad);
                      const textY = cy - (backSpokeEnd + 22) * Math.sin(rad) + 4;
                      return (
                        <g key={`back-spoke-${idx}`}>
                          <line
                            x1={line.startX}
                            y1={line.startY}
                            x2={line.endX}
                            y2={line.endY}
                            stroke="#8b5cf6"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />
                          <text
                            x={textX}
                            y={textY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#8b5cf6"
                            fontSize="13"
                            fontWeight="bold"
                            fontFamily="sans-serif"
                          >
                            {label}
                          </text>
                        </g>
                      );
                    })}

                    {/* Back Carbon Ring */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={backRingRadius}
                      fill={paperStyle === 'notebook' ? "#ffffff" : (isDarkMode ? "#181829" : "#ffffff")}
                      stroke="#8b5cf6"
                      strokeWidth="3.5"
                    />

                    {/* Front Carbon Spokes */}
                    {frontLines.map((line, idx) => {
                      const label = idx === 0 ? frontSubstituents.top : idx === 1 ? frontSubstituents.left : frontSubstituents.right;
                      const rad = toRad(line.angle);
                      const textX = cx + (frontRadius + 20) * Math.cos(rad);
                      const textY = cy - (frontRadius + 20) * Math.sin(rad) + 4;
                      return (
                        <g key={`front-spoke-${idx}`}>
                          <line
                            x1={cx}
                            y1={cy}
                            x2={line.x}
                            y2={line.y}
                            stroke="#ec4899"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />
                          <text
                            x={textX}
                            y={textY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#ec4899"
                            fontSize="13"
                            fontWeight="bold"
                            fontFamily="sans-serif"
                          >
                            {label}
                          </text>
                        </g>
                      );
                    })}

                    <circle cx={cx} cy={cy} r="6" fill="#ec4899" stroke="#ffffff" strokeWidth="1.5" />
                    <text x={cx} y={cy - 12} fill="#ec4899" fontSize="9" fontWeight="bold" textAnchor="middle">{frontAtomLabel} (Front)</text>
                    <text x={cx} y={cy + 20} fill="#8b5cf6" fontSize="9" fontWeight="bold" textAnchor="middle">{backAtomLabel} (Back)</text>

                    {normAngle > 8 && normAngle < 352 && (
                      <g>
                        <path
                          d={`M ${cx + 34 * Math.cos(toRad(90))} ${cy - 34 * Math.sin(toRad(90))} A 34 34 0 ${normAngle > 180 ? 1 : 0} 0 ${cx + 34 * Math.cos(toRad(90 + normAngle))} ${cy - 34 * Math.sin(toRad(90 + normAngle))}`}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2"
                          strokeDasharray="2 2"
                        />
                        <text x={cx + 12} y={cy - 44} fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                          θ = {normAngle}°
                        </text>
                      </g>
                    )}
                  </svg>

                  <div className="flex items-center gap-4 mt-2 text-[11px] font-bold">
                    <span className="flex items-center gap-1.5 text-pink-500">
                      <span className="w-3 h-3 rounded-full bg-pink-500"></span>
                      Front Carbon (Center Dot)
                    </span>
                    <span className="flex items-center gap-1.5 text-purple-400">
                      <span className="w-3 h-3 rounded-full border-2 border-purple-500 bg-transparent"></span>
                      Back Carbon (Outer Ring)
                    </span>
                  </div>
                </div>

                {/* Right Column: Presets */}
                <div className="md:col-span-5 flex flex-col gap-4">
                  <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
                    isDarkMode ? 'bg-[#12121e] border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex justify-between">
                      <span>Dihedral Slider:</span>
                      <span className="text-indigo-400 font-mono">{normAngle}°</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="5"
                      value={normAngle}
                      onChange={(e) => setAngle && setAngle(Number(e.target.value))}
                      className="w-full accent-purple-500 cursor-pointer h-2 bg-slate-700 rounded-lg"
                    />

                    <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-white/5">
                      <button
                        onClick={() => setAngle && setAngle(180)}
                        className={`p-2 rounded-lg text-xs font-bold text-left border transition-all ${
                          isAnti ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400' : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>180° Anti</span>
                          <span className="text-[10px] text-emerald-400 font-mono">0.0 kJ</span>
                        </div>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Global Min</span>
                      </button>

                      <button
                        onClick={() => setAngle && setAngle(60)}
                        className={`p-2 rounded-lg text-xs font-bold text-left border transition-all ${
                          isGauche ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400' : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>60° Gauche</span>
                          <span className="text-[10px] text-indigo-400 font-mono">3.8 kJ</span>
                        </div>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Metastable</span>
                      </button>

                      <button
                        onClick={() => setAngle && setAngle(120)}
                        className={`p-2 rounded-lg text-xs font-bold text-left border transition-all ${
                          isEclipsed ? 'bg-pink-500/20 text-pink-300 border-pink-400' : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>120° Eclipsed</span>
                          <span className="text-[10px] text-pink-400 font-mono">16.0 kJ</span>
                        </div>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Barrier</span>
                      </button>

                      <button
                        onClick={() => setAngle && setAngle(0)}
                        className={`p-2 rounded-lg text-xs font-bold text-left border transition-all ${
                          isSyn ? 'bg-rose-500/20 text-rose-300 border-rose-400' : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>0° Syn-periplanar</span>
                          <span className="text-[10px] text-rose-400 font-mono">21.0 kJ</span>
                        </div>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Max Steric Clash</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CHAIR-BOAT CONFORMATIONS */}
          {activeTab === 'chair-boat' && (
            <div className="flex flex-col gap-5">
              {/* Dynamic Ring Status Banner */}
              {ringAnalysis.hasRing ? (
                <div className="p-3.5 rounded-xl bg-pink-500/10 border border-pink-500/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-1 animate-pulse shrink-0"></span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-pink-300">
                          🌟 Active Ring: {ringAnalysis.name} ({name || '6-Membered Ring'})
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          C1: -{ringAnalysis.substituent || 'H'}
                        </span>
                        {ringAnalysis.aValue > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Conformational A-value: ΔG° = {ringAnalysis.aValue} kJ/mol
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        In <strong>Chair 1</strong>, the bulky -{ringAnalysis.substituent || 'H'} adopts the <strong className="text-emerald-300">Equatorial</strong> position (minimum 1,3-diaxial strain). In <strong>Chair 2 (Flipped)</strong>, it flips to <strong className="text-rose-300">Axial</strong>, clashing with syn-axial hydrogens!
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-sky-300">
                        Current Molecule ({name || 'Open-Chain Molecule'}) is Acyclic / Non-Cyclohexyl
                      </span>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Chair and boat conformations apply specifically to 6-membered saturated rings (cyclohexane systems) where chair puckering eliminates ring strain. For open chains like butane, use the <strong>Newman Projection</strong> tab. Quick-load 6-membered rings to study chair ring-flipping:
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <button
                      onClick={() => onLoadMolecule && onLoadMolecule('C1CCCCC1')}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/10 hover:bg-pink-600 hover:text-white text-slate-200 transition-all border border-white/10"
                      title="Load Cyclohexane (SMILES: C1CCCCC1)"
                    >
                      🪑 Cyclohexane
                    </button>
                    <button
                      onClick={() => onLoadMolecule && onLoadMolecule('CC1CCCCC1')}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/10 hover:bg-pink-600 hover:text-white text-slate-200 transition-all border border-white/10"
                      title="Load Methylcyclohexane (SMILES: CC1CCCCC1)"
                    >
                      🧪 Methylcyclohexane
                    </button>
                    <button
                      onClick={() => onLoadMolecule && onLoadMolecule('OC[C@@H]1OC(O)[C@@H](O)[C@H](O)[C@H]1O')}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/10 hover:bg-pink-600 hover:text-white text-slate-200 transition-all border border-white/10"
                      title="Load D-Glucose"
                    >
                      🍬 D-Glucose
                    </button>
                  </div>
                </div>
              )}

              {/* Conformation Selector Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/20 border border-white/5 overflow-x-auto no-scrollbar mobile-touch-scroll max-w-full flex-nowrap shrink-0">
                  {[
                    { id: 'chair1', label: '🪑 Chair 1', deltaE: '0.0 kJ/mol' },
                    { id: 'chair2', label: '🔄 Flipped Chair 2', deltaE: ringAnalysis.aValue > 0 ? `+${ringAnalysis.aValue} kJ/mol` : '0.0 kJ/mol' },
                    { id: 'boat', label: '⛵ Boat Conformation', deltaE: '+30.0 kJ/mol' },
                    { id: 'twist', label: '🌀 Twist-Boat', deltaE: '+23.0 kJ/mol' },
                    { id: 'half', label: '⚡ Half-Chair', deltaE: '+45.0 kJ/mol' },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setChairConformer(item.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                        chairConformer === item.id
                          ? 'bg-pink-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className="text-[10px] opacity-75 font-mono">({item.deltaE})</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAxialEquatorial(!showAxialEquatorial)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all ${
                      showAxialEquatorial
                        ? 'bg-indigo-500/30 text-indigo-300 border-indigo-400'
                        : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    {showAxialEquatorial ? 'Hide Axial/Equatorial' : 'Show Axial/Equatorial'}
                  </button>
                  <button
                    onClick={() => handleCopyImage(chairSvgRef, `cyclohexane_${chairConformer}.png`)}
                    className="px-2.5 py-1 rounded-md text-xs font-bold bg-pink-600 hover:bg-pink-500 text-white shadow-sm transition-all flex items-center gap-1.5"
                  >
                    {copiedImage ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    {copiedImage ? 'Copied Chair!' : 'Copy Image'}
                  </button>
                  <button
                    onClick={() => downloadSvgElement(chairSvgRef, `cyclohexane_${chairConformer}.svg`)}
                    className="px-2.5 py-1 rounded-md text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 transition-all flex items-center gap-1.5"
                  >
                    <Download className="w-3 h-3" />
                    SVG
                  </button>
                </div>
              </div>

              {/* Main Visual Display */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                <div 
                  className={`md:col-span-7 flex flex-col items-center justify-center p-6 rounded-2xl border relative overflow-hidden transition-all shadow-inner min-h-[340px] ${
                    paperStyle === 'notebook'
                      ? 'bg-[#fcfaf2] border-amber-300/60 shadow-[inset_0_0_40px_rgba(0,0,0,0.06)]'
                      : isDarkMode ? 'bg-[#12121e] border-indigo-500/20' : 'bg-slate-50 border-slate-300'
                  }`}
                  style={paperStyle === 'notebook' ? {
                    backgroundImage: `linear-gradient(#e0ded6 1px, transparent 1px), linear-gradient(90deg, #f4a6b2 2px, transparent 2px)`,
                    backgroundSize: `100% 28px, 100% 100%`,
                    backgroundPosition: `0 0, 50px 0`
                  } : {}}
                >
                  <svg
                    ref={chairSvgRef}
                    viewBox="0 0 460 360"
                    width="100%"
                    height="320"
                    className="max-w-[420px] drop-shadow-md select-none overflow-visible"
                  >
                    {/* CHAIR 1 CONFORMATION */}
                    {chairConformer === 'chair1' && (
                      <g>
                        {/* Ring Bonds: C1(320, 160) - C2(260, 240) - C3(160, 240) - C4(120, 170) - C5(180, 90) - C6(280, 90) */}
                        <path
                          d="M 180 90 L 280 90 L 320 160 L 260 240 L 160 240 L 120 170 Z"
                          fill="none"
                          stroke={isDarkMode ? "#cbd5e1" : "#1e293b"}
                          strokeWidth="4.5"
                          strokeLinejoin="round"
                        />

                        {/* Axial & Equatorial Bonds */}
                        {showAxialEquatorial && (
                          <g>
                            {/* C5(180, 90): Vertex UP -> Axial UP (180, 30), Eq down-left (130, 95) */}
                            <line x1="180" y1="90" x2="180" y2="35" stroke="#38bdf8" strokeWidth="3" />
                            <text x="180" y="24" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">a (UP)</text>
                            <line x1="180" y1="90" x2="135" y2="105" stroke="#34d399" strokeWidth="3" />
                            <text x="120" y="110" fill="#34d399" fontSize="11" fontWeight="bold" textAnchor="middle">e</text>

                            {/* C6(280, 90): Vertex DOWN -> Axial DOWN (280, 150) */}
                            <line x1="280" y1="90" x2="280" y2="150" stroke="#38bdf8" strokeWidth="3" />
                            <text x="280" y="165" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">a (DN)</text>
                            <line x1="280" y1="90" x2="325" y2="75" stroke="#34d399" strokeWidth="3" />
                            <text x="340" y="75" fill="#34d399" fontSize="11" fontWeight="bold" textAnchor="middle">e</text>

                            {/* C1(320, 160): Vertex UP -> Axial UP (320, 105) */}
                            <line x1="320" y1="160" x2="320" y2="105" stroke="#38bdf8" strokeWidth="3" />
                            <text x="320" y="95" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">a (UP: -H)</text>
                            <line x1="320" y1="160" x2="375" y2="185" stroke="#10b981" strokeWidth="3.5" />
                            <text x="385" y="190" fill="#10b981" fontSize="12" fontWeight="extrabold">
                              {ringAnalysis.hasRing && ringAnalysis.substituent && ringAnalysis.substituent !== 'H'
                                ? `e: -${ringAnalysis.substituent} (Equatorial ★)`
                                : 'e (Equatorial)'}
                            </text>

                            {/* C2(260, 240): Vertex DOWN -> Axial DOWN (260, 305) */}
                            <line x1="260" y1="240" x2="260" y2="300" stroke="#38bdf8" strokeWidth="3" />
                            <text x="260" y="315" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">a (DN)</text>
                            <line x1="260" y1="240" x2="305" y2="255" stroke="#34d399" strokeWidth="3" />
                            <text x="320" y="260" fill="#34d399" fontSize="11" fontWeight="bold" textAnchor="middle">e</text>

                            {/* C3(160, 240): Vertex UP -> Axial UP (160, 180) */}
                            <line x1="160" y1="240" x2="160" y2="180" stroke="#38bdf8" strokeWidth="3" />
                            <text x="160" y="170" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">a (UP)</text>
                            <line x1="160" y1="240" x2="115" y2="255" stroke="#34d399" strokeWidth="3" />
                            <text x="100" y="260" fill="#34d399" fontSize="11" fontWeight="bold" textAnchor="middle">e</text>

                            {/* C4(120, 170): Vertex DOWN -> Axial DOWN (120, 230) */}
                            <line x1="120" y1="170" x2="120" y2="230" stroke="#38bdf8" strokeWidth="3" />
                            <text x="120" y="245" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">a (DN)</text>
                            <line x1="120" y1="170" x2="70" y2="155" stroke="#34d399" strokeWidth="3" />
                            <text x="55" y="155" fill="#34d399" fontSize="11" fontWeight="bold" textAnchor="middle">e</text>
                          </g>
                        )}

                        {/* Carbon Vertex Nodes */}
                        {[
                          [180, 90, "C5"], [280, 90, "C6"], [320, 160, "C1"],
                          [260, 240, "C2"], [160, 240, "C3"], [120, 170, "C4"]
                        ].map(([x, y, label], i) => (
                          <g key={i}>
                            <circle cx={x} cy={y} r="6" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
                            <text x={x} y={y - 10} fill="#f43f5e" fontSize="9" fontWeight="bold" textAnchor="middle">{label}</text>
                          </g>
                        ))}
                      </g>
                    )}

                    {/* CHAIR 2 (RING FLIPPED) */}
                    {chairConformer === 'chair2' && (
                      <g>
                        {/* Inverted Chair Geometry: C1 moves DOWN, C4 moves UP */}
                        <path
                          d="M 160 90 L 260 90 L 300 170 L 240 240 L 140 240 L 100 160 Z"
                          fill="none"
                          stroke={isDarkMode ? "#cbd5e1" : "#1e293b"}
                          strokeWidth="4.5"
                          strokeLinejoin="round"
                        />

                        {showAxialEquatorial && (
                          <g>
                            <text x="230" y="50" fill="#ec4899" fontSize="12" fontWeight="bold" textAnchor="middle">
                              🔄 Ring-Flipped: All Axial ↔ Equatorial Interchanged!
                            </text>
                            {/* Axial bonds now flipped direction */}
                            <line x1="160" y1="90" x2="160" y2="150" stroke="#38bdf8" strokeWidth="3" />
                            <text x="160" y="165" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">a (DN)</text>
                            <line x1="260" y1="90" x2="260" y2="35" stroke="#38bdf8" strokeWidth="3" />
                            <text x="260" y="25" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">a (UP)</text>
                            
                            {/* C1(300, 170): Flipped to AXIAL DOWN with steric clash */}
                            <line x1="300" y1="170" x2="300" y2="235" stroke="#f43f5e" strokeWidth="3.5" />
                            <text x="300" y="250" fill="#f43f5e" fontSize="11" fontWeight="extrabold" textAnchor="middle">
                              {ringAnalysis.hasRing && ringAnalysis.substituent && ringAnalysis.substituent !== 'H'
                                ? `a: -${ringAnalysis.substituent} (Axial Clash!)`
                                : 'a (DN)'}
                            </text>
                            {/* C1 Equatorial is now -H */}
                            <line x1="300" y1="170" x2="355" y2="150" stroke="#34d399" strokeWidth="2.5" />
                            <text x="365" y="150" fill="#34d399" fontSize="11" fontWeight="bold">e: -H</text>

                            <line x1="240" y1="240" x2="240" y2="180" stroke="#38bdf8" strokeWidth="3" />
                            <text x="240" y="170" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">a (UP)</text>
                            <line x1="140" y1="240" x2="140" y2="300" stroke="#38bdf8" strokeWidth="3" />
                            <text x="140" y="315" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">a (DN)</text>
                            <line x1="100" y1="160" x2="100" y2="105" stroke="#38bdf8" strokeWidth="3" />
                            <text x="100" y="95" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">a (UP)</text>

                            {/* 1,3-Diaxial Steric Clash Repulsion Indicator for Substituted Ring */}
                            {ringAnalysis.hasRing && ringAnalysis.substituent && ringAnalysis.substituent !== 'H' && (
                              <g>
                                <path
                                  d="M 290 230 Q 215 285 150 295"
                                  fill="none"
                                  stroke="#f43f5e"
                                  strokeWidth="2.5"
                                  strokeDasharray="4 4"
                                />
                                <text x="220" y="280" fill="#f43f5e" fontSize="10" fontWeight="extrabold" textAnchor="middle">
                                  ⚡ 1,3-Diaxial Repulsion ({ringAnalysis.aValue > 0 ? `+${ringAnalysis.aValue} kJ/mol` : 'Severe Steric Clash'})
                                </text>
                              </g>
                            )}
                          </g>
                        )}

                        {[
                          [160, 90, "C5"], [260, 90, "C6"], [300, 170, "C1"],
                          [240, 240, "C2"], [140, 240, "C3"], [100, 160, "C4"]
                        ].map(([x, y, label], i) => (
                          <g key={i}>
                            <circle cx={x} cy={y} r="6" fill="#8b5cf6" stroke="#ffffff" strokeWidth="2" />
                            <text x={x} y={y - 10} fill="#8b5cf6" fontSize="9" fontWeight="bold" textAnchor="middle">{label}</text>
                          </g>
                        ))}
                      </g>
                    )}

                    {/* BOAT CONFORMATION */}
                    {chairConformer === 'boat' && (
                      <g>
                        {/* Boat Shape: Both C1 and C4 point UP */}
                        <path
                          d="M 120 120 L 170 210 L 270 210 L 320 120 L 260 140 L 180 140 Z"
                          fill="none"
                          stroke={isDarkMode ? "#cbd5e1" : "#1e293b"}
                          strokeWidth="4.5"
                          strokeLinejoin="round"
                        />

                        {/* Flagpole Hydrogens at C1 and C4 pointing toward center */}
                        <line x1="120" y1="120" x2="175" y2="85" stroke="#ef4444" strokeWidth="3" strokeDasharray="3 3" />
                        <circle cx="175" cy="85" r="7" fill="#ef4444" />
                        <text x="160" y="70" fill="#ef4444" fontSize="12" fontWeight="bold">H (Flagpole)</text>

                        <line x1="320" y1="120" x2="265" y2="85" stroke="#ef4444" strokeWidth="3" strokeDasharray="3 3" />
                        <circle cx="265" cy="85" r="7" fill="#ef4444" />
                        <text x="280" y="70" fill="#ef4444" fontSize="12" fontWeight="bold">H (Flagpole)</text>

                        {/* Steric Overlap Arc between Flagpole Hydrogens */}
                        <path
                          d="M 175 85 Q 220 110 265 85"
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth="2.5"
                          strokeDasharray="4 4"
                        />
                        <text x="220" y="115" fill="#f43f5e" fontSize="11" fontWeight="bold" textAnchor="middle">
                          ⚠️ Severe Flagpole Clash (1.83 Å)
                        </text>

                        {/* Eclipsing Indicators on Bottom parallel bonds */}
                        <text x="220" y="240" fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle">
                          ⚡ Eclipsed C2-C3 & C5-C6 bonds (+30 kJ/mol)
                        </text>

                        {[
                          [120, 120, "C1 (Prow)"], [170, 210, "C2"], [270, 210, "C3"],
                          [320, 120, "C4 (Stern)"], [260, 140, "C5"], [180, 140, "C6"]
                        ].map(([x, y, label], i) => (
                          <g key={i}>
                            <circle cx={x} cy={y} r="6" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                            <text x={x} y={y + 16} fill="#ef4444" fontSize="9" fontWeight="bold" textAnchor="middle">{label}</text>
                          </g>
                        ))}
                      </g>
                    )}

                    {/* TWIST-BOAT CONFORMATION */}
                    {chairConformer === 'twist' && (
                      <g>
                        {/* Skewed Twist Boat */}
                        <path
                          d="M 130 110 L 160 210 L 270 230 L 310 140 L 250 115 L 180 155 Z"
                          fill="none"
                          stroke={isDarkMode ? "#cbd5e1" : "#1e293b"}
                          strokeWidth="4.5"
                          strokeLinejoin="round"
                        />
                        <text x="220" y="70" fill="#10b981" fontSize="12" fontWeight="bold" textAnchor="middle">
                          🌀 Twist-Boat Relieves Flagpole Clash (+23 kJ/mol)
                        </text>
                        <text x="220" y="90" fill="#94a3b8" fontSize="10" textAnchor="middle">
                          Flagpoles twisted away from collinear axis to reduce van der Waals repulsion
                        </text>
                      </g>
                    )}

                    {/* HALF-CHAIR CONFORMATION */}
                    {chairConformer === 'half' && (
                      <g>
                        {/* 4 Planar carbons and 1 puckered */}
                        <path
                          d="M 120 180 L 200 180 L 290 180 L 330 180 L 280 90 L 160 90 Z"
                          fill="none"
                          stroke={isDarkMode ? "#cbd5e1" : "#1e293b"}
                          strokeWidth="4.5"
                          strokeLinejoin="round"
                        />
                        <text x="220" y="60" fill="#ef4444" fontSize="13" fontWeight="bold" textAnchor="middle">
                          ⚡ Half-Chair Transition State Peak (+45 kJ/mol)
                        </text>
                        <text x="220" y="215" fill="#f59e0b" fontSize="10" textAnchor="middle">
                          4 Coplanar Carbons generate extreme angle & torsional strain
                        </text>
                      </g>
                    )}
                  </svg>

                  {/* Legend underneath diagram */}
                  <div className="flex items-center gap-4 mt-2 text-[11px] font-bold">
                    <span className="flex items-center gap-1.5 text-sky-400">
                      <span className="w-3 h-3 rounded-full bg-sky-400"></span>
                      Axial (Vertical, 6 bonds)
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                      Equatorial (Slanted outward, 6 bonds)
                    </span>
                  </div>
                </div>

                {/* Right Column: Energy & Ring-Flip Rules */}
                <div className="md:col-span-5 flex flex-col gap-4">
                  {/* Energy Profile Card */}
                  <div className={`p-4 rounded-xl border flex flex-col gap-2.5 ${
                    isDarkMode ? 'bg-[#12121e] border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Relative Energy Profile:</span>
                      <span className="text-pink-400 font-mono font-bold">ΔE Barrier</span>
                    </h3>
                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between items-center p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <span className="font-bold text-emerald-300">1. Chair Conformation</span>
                        <span className="text-emerald-400 font-bold">0.0 kJ/mol (Min)</span>
                      </div>
                      <div className="flex justify-between items-center p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20">
                        <span className="text-teal-300">2. Twist-Boat</span>
                        <span className="text-teal-400">+23.0 kJ/mol</span>
                      </div>
                      <div className="flex justify-between items-center p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <span className="text-amber-300">3. Boat (Flagpole Clash)</span>
                        <span className="text-amber-400">+30.0 kJ/mol</span>
                      </div>
                      <div className="flex justify-between items-center p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                        <span className="font-bold text-rose-300">4. Half-Chair (Transition Peak)</span>
                        <span className="text-rose-400 font-bold">+45.0 kJ/mol (Max)</span>
                      </div>
                    </div>
                  </div>

                  {/* Ring-Flip Golden Rules */}
                  <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
                    isDarkMode ? 'bg-[#12121e] border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <h3 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                      <RotateCw className="w-3.5 h-3.5" />
                      Ring-Flip Golden Rule for Notebooks:
                    </h3>
                    <ul className="text-xs text-slate-400 flex flex-col gap-1 pl-4 list-disc">
                      <li><strong>Axial ↔ Equatorial:</strong> Every axial bond flips to equatorial, and vice versa.</li>
                      <li><strong>Up Stays Up, Down Stays Down:</strong> A substituent pointing UP in Chair 1 remains pointing UP in Chair 2 (just changes from axial to equatorial).</li>
                      <li><strong>1,3-Diaxial Repulsion:</strong> Bulky groups (e.g. -CH₃, -tBu) strongly prefer <strong>equatorial</strong> to avoid steric crowding with syn-axial hydrogens.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Drawing Guide Box */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className={`p-3 rounded-xl border flex flex-col gap-1 ${
                  isDarkMode ? 'bg-[#12121e] border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-xs font-bold text-indigo-400 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px]">1</span>
                    Parallel Slanted Lines
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Draw two parallel slanted lines of equal length, offset horizontally from each other.
                  </p>
                </div>

                <div className={`p-3 rounded-xl border flex flex-col gap-1 ${
                  isDarkMode ? 'bg-[#12121e] border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-xs font-bold text-purple-400 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px]">2</span>
                    Connect Prow & Stern
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Draw an upward V at the top-left (tail) and a downward V at the bottom-right (nose).
                  </p>
                </div>

                <div className={`p-3 rounded-xl border flex flex-col gap-1 ${
                  isDarkMode ? 'bg-[#12121e] border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-xs font-bold text-sky-400 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-sky-500/20 flex items-center justify-center text-[10px]">3</span>
                    6 Vertical Axials
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Draw 6 vertical axial bonds alternating strictly: UP, DOWN, UP, DOWN, UP, DOWN.
                  </p>
                </div>

                <div className={`p-3 rounded-xl border flex flex-col gap-1 ${
                  isDarkMode ? 'bg-[#12121e] border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">4</span>
                    6 Equatorials
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Draw 6 equatorial bonds pointing slightly outward, parallel to ring bonds one step away.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FISCHER CONFIGURATION */}
          {activeTab === 'fischer' && (
            <div className="flex flex-col gap-5">
              {/* Dynamic Chiral Status Banner */}
              {chirality.isChiral ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 mt-1 animate-pulse shrink-0"></span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-amber-300">
                          🌟 Active Molecule: {chirality.name} ({name || 'Chiral Compound'})
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {chirality.chiralCount} Stereocenter{chirality.chiralCount > 1 ? 's' : ''} • {chirality.cip}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {chirality.dlFamily}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Fischer projection oriented with C1 at the TOP. Horizontal arms project <strong>toward you (wedges)</strong>, vertical backbone projects <strong>away from you (dashes)</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-sky-300">
                        Current Molecule ({name || 'Achiral Compound'}) Has No Asymmetric Chiral Centers
                      </span>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Fischer projections specifically represent stereocenters with sp³ tetrahedral carbons bonded to 4 distinct groups (e.g. amino acids, carbohydrates). Displaying standard chiral reference systems below. Quick-load chiral compounds:
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <button
                      onClick={() => onLoadMolecule && onLoadMolecule('CC(N)C(=O)O')}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/10 hover:bg-amber-600 hover:text-white text-slate-200 transition-all border border-white/10"
                      title="Load L-Alanine (SMILES: CC(N)C(=O)O)"
                    >
                      🧬 L-Alanine
                    </button>
                    <button
                      onClick={() => onLoadMolecule && onLoadMolecule('OCC(O)C=O')}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/10 hover:bg-amber-600 hover:text-white text-slate-200 transition-all border border-white/10"
                      title="Load D-Glyceraldehyde (SMILES: OCC(O)C=O)"
                    >
                      ⭐ D-Glyceraldehyde
                    </button>
                    <button
                      onClick={() => onLoadMolecule && onLoadMolecule('OC[C@@H]1OC(O)[C@@H](O)[C@H](O)[C@H]1O')}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/10 hover:bg-amber-600 hover:text-white text-slate-200 transition-all border border-white/10"
                      title="Load D-Glucose"
                    >
                      🍬 D-Glucose
                    </button>
                  </div>
                </div>
              )}

              {/* Fischer Molecule Presets & Toggle Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/20 border border-white/5 overflow-x-auto no-scrollbar mobile-touch-scroll max-w-full flex-nowrap shrink-0">
                  {chirality.isChiral && (
                    <button
                      onClick={() => setFischerPreset('active')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                        fischerPreset === 'active'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-amber-300 hover:text-white hover:bg-amber-500/20'
                      }`}
                    >
                      <span>🌟 {chirality.name} (Active)</span>
                    </button>
                  )}
                  {[
                    { id: 'glucose', label: '🍬 D-Glucose (Aldohexose)' },
                    { id: 'glyceraldehyde_d', label: '⭐ D-Glyceraldehyde (Reference)' },
                    { id: 'glyceraldehyde_l', label: '⚡ L-Glyceraldehyde' },
                    { id: 'alanine', label: '🧬 L-Alanine (Amino Acid)' },
                    { id: 'tartaric_meso', label: '🪞 meso-Tartaric Acid (Symmetric)' },
                    { id: 'tartaric_rr', label: '🧪 (2R,3R)-Tartaric Acid' },
                  ].map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => setFischerPreset(preset.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                        fischerPreset === preset.id
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFischer3DWedges(!showFischer3DWedges)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all ${
                      showFischer3DWedges
                        ? 'bg-amber-500/30 text-amber-300 border-amber-400'
                        : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    {showFischer3DWedges ? 'Hide 3D Wedges' : 'Show 3D Wedges/Dashes'}
                  </button>
                  <button
                    onClick={() => handleCopyImage(fischerSvgRef, `fischer_${fischerPreset}.png`)}
                    className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition-all flex items-center gap-1.5"
                  >
                    {copiedImage ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    {copiedImage ? 'Copied Fischer!' : 'Copy Image'}
                  </button>
                  <button
                    onClick={() => downloadSvgElement(fischerSvgRef, `fischer_${fischerPreset}.svg`)}
                    className="px-2.5 py-1 rounded-md text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 transition-all flex items-center gap-1.5"
                  >
                    <Download className="w-3 h-3" />
                    SVG
                  </button>
                </div>
              </div>

              {/* Fischer Diagram Canvas */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                <div 
                  className={`md:col-span-6 flex flex-col items-center justify-center p-6 rounded-2xl border relative overflow-hidden transition-all shadow-inner min-h-[380px] ${
                    paperStyle === 'notebook'
                      ? 'bg-[#fcfaf2] border-amber-300/60 shadow-[inset_0_0_40px_rgba(0,0,0,0.06)]'
                      : isDarkMode ? 'bg-[#12121e] border-indigo-500/20' : 'bg-slate-50 border-slate-300'
                  }`}
                  style={paperStyle === 'notebook' ? {
                    backgroundImage: `linear-gradient(#e0ded6 1px, transparent 1px), linear-gradient(90deg, #f4a6b2 2px, transparent 2px)`,
                    backgroundSize: `100% 28px, 100% 100%`,
                    backgroundPosition: `0 0, 50px 0`
                  } : {}}
                >
                  <svg
                    ref={fischerSvgRef}
                    viewBox="0 0 380 440"
                    width="100%"
                    height="380"
                    className="max-w-[340px] drop-shadow-md select-none overflow-visible"
                  >
                    {/* ACTIVE CHIRAL MOLECULE FISCHER */}
                    {fischerPreset === 'active' && (
                      chirality.configType === 'alanine' ? (
                        <g>
                          <line x1="190" y1="80" x2="190" y2="340" stroke={showFischer3DWedges ? "#94a3b8" : (isDarkMode ? "#cbd5e1" : "#1e293b")} strokeWidth="4" strokeDasharray={showFischer3DWedges ? "6 4" : "none"} />
                          <text x="190" y="70" fill="#f43f5e" fontSize="18" fontWeight="bold" textAnchor="middle">COOH (C1)</text>

                          {showFischer3DWedges ? (
                            <>
                              <polygon points="190,210 90,202 90,218" fill="#ec4899" />
                              <polygon points="190,210 290,202 290,218" fill="#ec4899" />
                            </>
                          ) : (
                            <line x1="90" y1="210" x2="290" y2="210" stroke="#ec4899" strokeWidth="4.5" />
                          )}
                          <text x="75" y="216" fill="#ec4899" fontSize="18" fontWeight="extrabold" textAnchor="end">H₂N (Left = L)</text>
                          <circle cx="190" cy="210" r="7" fill="#ec4899" />
                          <text x="190" y="198" fill="#ec4899" fontSize="11" fontWeight="bold" textAnchor="middle">Cα (2S) ★</text>
                          <text x="305" y="216" fill="#38bdf8" fontSize="17" fontWeight="bold">H</text>

                          <text x="190" y="365" fill="#f43f5e" fontSize="18" fontWeight="bold" textAnchor="middle">CH₃ (C3)</text>
                        </g>
                      ) : chirality.configType === 'glyceraldehyde_d' ? (
                        <g>
                          <line x1="190" y1="80" x2="190" y2="340" stroke={showFischer3DWedges ? "#94a3b8" : (isDarkMode ? "#cbd5e1" : "#1e293b")} strokeWidth="4" strokeDasharray={showFischer3DWedges ? "6 4" : "none"} />
                          <text x="190" y="70" fill="#f43f5e" fontSize="18" fontWeight="bold" textAnchor="middle">CHO (C1)</text>

                          {showFischer3DWedges ? (
                            <>
                              <polygon points="190,210 90,202 90,218" fill="#10b981" />
                              <polygon points="190,210 290,202 290,218" fill="#10b981" />
                            </>
                          ) : (
                            <line x1="90" y1="210" x2="290" y2="210" stroke="#10b981" strokeWidth="4.5" />
                          )}
                          <text x="75" y="216" fill="#38bdf8" fontSize="17" fontWeight="bold" textAnchor="end">H</text>
                          <circle cx="190" cy="210" r="7" fill="#10b981" />
                          <text x="190" y="198" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">C2 (2R) ★</text>
                          <text x="305" y="216" fill="#10b981" fontSize="18" fontWeight="extrabold">OH (Right = D)</text>

                          <text x="190" y="365" fill="#f43f5e" fontSize="18" fontWeight="bold" textAnchor="middle">CH₂OH (C3)</text>
                        </g>
                      ) : chirality.configType === 'glyceraldehyde_l' ? (
                        <g>
                          <line x1="190" y1="80" x2="190" y2="340" stroke={showFischer3DWedges ? "#94a3b8" : (isDarkMode ? "#cbd5e1" : "#1e293b")} strokeWidth="4" strokeDasharray={showFischer3DWedges ? "6 4" : "none"} />
                          <text x="190" y="70" fill="#f43f5e" fontSize="18" fontWeight="bold" textAnchor="middle">CHO (C1)</text>

                          {showFischer3DWedges ? (
                            <>
                              <polygon points="190,210 90,202 90,218" fill="#ec4899" />
                              <polygon points="190,210 290,202 290,218" fill="#ec4899" />
                            </>
                          ) : (
                            <line x1="90" y1="210" x2="290" y2="210" stroke="#ec4899" strokeWidth="4.5" />
                          )}
                          <text x="75" y="216" fill="#ec4899" fontSize="18" fontWeight="extrabold" textAnchor="end">HO (Left = L)</text>
                          <circle cx="190" cy="210" r="7" fill="#ec4899" />
                          <text x="190" y="198" fill="#ec4899" fontSize="11" fontWeight="bold" textAnchor="middle">C2 (2S) ★</text>
                          <text x="305" y="216" fill="#38bdf8" fontSize="17" fontWeight="bold">H</text>

                          <text x="190" y="365" fill="#f43f5e" fontSize="18" fontWeight="bold" textAnchor="middle">CH₂OH (C3)</text>
                        </g>
                      ) : chirality.configType === 'glucose' ? (
                        <g>
                          <line x1="190" y1="50" x2="190" y2="390" stroke={showFischer3DWedges ? "#94a3b8" : (isDarkMode ? "#cbd5e1" : "#1e293b")} strokeWidth="4" strokeDasharray={showFischer3DWedges ? "6 4" : "none"} />
                          <text x="190" y="40" fill="#f43f5e" fontSize="16" fontWeight="bold" textAnchor="middle">CHO (C1)</text>

                          {/* C2 */}
                          <line x1="110" y1="110" x2="270" y2="110" stroke={isDarkMode ? "#cbd5e1" : "#1e293b"} strokeWidth="4" />
                          <text x="95" y="115" fill="#38bdf8" fontSize="15" fontWeight="bold" textAnchor="end">H</text>
                          <circle cx="190" cy="110" r="5" fill="#f59e0b" />
                          <text x="190" y="102" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">C2 (R)</text>
                          <text x="285" y="115" fill="#ef4444" fontSize="15" fontWeight="bold">OH</text>

                          {/* C3 */}
                          <line x1="110" y1="170" x2="270" y2="170" stroke={isDarkMode ? "#cbd5e1" : "#1e293b"} strokeWidth="4" />
                          <text x="95" y="175" fill="#ef4444" fontSize="15" fontWeight="bold" textAnchor="end">HO</text>
                          <circle cx="190" cy="170" r="5" fill="#f59e0b" />
                          <text x="190" y="162" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">C3 (S)</text>
                          <text x="285" y="175" fill="#38bdf8" fontSize="15" fontWeight="bold">H</text>

                          {/* C4 */}
                          <line x1="110" y1="230" x2="270" y2="230" stroke={isDarkMode ? "#cbd5e1" : "#1e293b"} strokeWidth="4" />
                          <text x="95" y="235" fill="#38bdf8" fontSize="15" fontWeight="bold" textAnchor="end">H</text>
                          <circle cx="190" cy="230" r="5" fill="#f59e0b" />
                          <text x="190" y="222" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">C4 (R)</text>
                          <text x="285" y="235" fill="#ef4444" fontSize="15" fontWeight="bold">OH</text>

                          {/* C5 */}
                          <line x1="110" y1="290" x2="270" y2="290" stroke="#10b981" strokeWidth="4.5" />
                          <text x="95" y="295" fill="#38bdf8" fontSize="15" fontWeight="bold" textAnchor="end">H</text>
                          <circle cx="190" cy="290" r="7" fill="#10b981" />
                          <text x="190" y="282" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="middle">C5 (R) ★</text>
                          <text x="285" y="295" fill="#10b981" fontSize="16" fontWeight="extrabold">OH (D-Sugar)</text>

                          <text x="190" y="410" fill="#f43f5e" fontSize="16" fontWeight="bold" textAnchor="middle">CH₂OH (C6)</text>
                        </g>
                      ) : chirality.configType === 'tartaric_rr' ? (
                        <g>
                          <line x1="190" y1="70" x2="190" y2="350" stroke={showFischer3DWedges ? "#94a3b8" : (isDarkMode ? "#cbd5e1" : "#1e293b")} strokeWidth="4" strokeDasharray={showFischer3DWedges ? "6 4" : "none"} />
                          <text x="190" y="60" fill="#f43f5e" fontSize="18" fontWeight="bold" textAnchor="middle">COOH (C1)</text>

                          <line x1="100" y1="160" x2="280" y2="160" stroke="#f59e0b" strokeWidth="4" />
                          <text x="85" y="165" fill="#38bdf8" fontSize="16" fontWeight="bold" textAnchor="end">H</text>
                          <circle cx="190" cy="160" r="6" fill="#f59e0b" />
                          <text x="190" y="150" fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle">C2 (2R)</text>
                          <text x="295" y="165" fill="#ef4444" fontSize="16" fontWeight="bold">OH</text>

                          <line x1="100" y1="260" x2="280" y2="260" stroke="#f59e0b" strokeWidth="4" />
                          <text x="85" y="265" fill="#ef4444" fontSize="16" fontWeight="bold" textAnchor="end">HO</text>
                          <circle cx="190" cy="260" r="6" fill="#f59e0b" />
                          <text x="190" y="250" fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle">C3 (3R)</text>
                          <text x="295" y="265" fill="#38bdf8" fontSize="16" fontWeight="bold">H</text>

                          <text x="190" y="375" fill="#f43f5e" fontSize="18" fontWeight="bold" textAnchor="middle">COOH (C4)</text>
                        </g>
                      ) : (
                        <g>
                          <line x1="190" y1="80" x2="190" y2="340" stroke={showFischer3DWedges ? "#94a3b8" : (isDarkMode ? "#cbd5e1" : "#1e293b")} strokeWidth="4" strokeDasharray={showFischer3DWedges ? "6 4" : "none"} />
                          <text x="190" y="70" fill="#f43f5e" fontSize="17" fontWeight="bold" textAnchor="middle">{chirality.top || 'C1 (Top)'}</text>

                          {showFischer3DWedges ? (
                            <>
                              <polygon points="190,210 90,202 90,218" fill="#f59e0b" />
                              <polygon points="190,210 290,202 290,218" fill="#f59e0b" />
                            </>
                          ) : (
                            <line x1="90" y1="210" x2="290" y2="210" stroke="#f59e0b" strokeWidth="4.5" />
                          )}
                          <text x="75" y="216" fill="#ec4899" fontSize="16" fontWeight="bold" textAnchor="end">{chirality.center?.left || 'Left'}</text>
                          <circle cx="190" cy="210" r="7" fill="#f59e0b" />
                          <text x="190" y="198" fill="#f59e0b" fontSize="11" fontWeight="bold" textAnchor="middle">{chirality.center?.name || 'C*'}</text>
                          <text x="305" y="216" fill="#38bdf8" fontSize="16" fontWeight="bold">{chirality.center?.right || 'Right'}</text>

                          <text x="190" y="365" fill="#f43f5e" fontSize="17" fontWeight="bold" textAnchor="middle">{chirality.bottom || 'C3 (Bottom)'}</text>
                        </g>
                      )
                    )}

                    {/* D-GLUCOSE FISCHER */}
                    {fischerPreset === 'glucose' && (
                      <g>
                        {/* Vertical backbone line */}
                        <line x1="190" y1="50" x2="190" y2="390" stroke={showFischer3DWedges ? "#94a3b8" : (isDarkMode ? "#cbd5e1" : "#1e293b")} strokeWidth="4" strokeDasharray={showFischer3DWedges ? "6 4" : "none"} />

                        {/* Top Group C1: CHO */}
                        <text x="190" y="40" fill="#f43f5e" fontSize="16" fontWeight="bold" textAnchor="middle">CHO (C1)</text>

                        {/* C2: H on Left, OH on Right (R) */}
                        {showFischer3DWedges ? (
                          <>
                            <polygon points="190,110 110,105 110,115" fill="#f59e0b" />
                            <polygon points="190,110 270,105 270,115" fill="#f59e0b" />
                          </>
                        ) : (
                          <line x1="110" y1="110" x2="270" y2="110" stroke={isDarkMode ? "#cbd5e1" : "#1e293b"} strokeWidth="4" />
                        )}
                        <text x="95" y="115" fill="#38bdf8" fontSize="15" fontWeight="bold" textAnchor="end">H</text>
                        <circle cx="190" cy="110" r="5" fill="#f59e0b" />
                        <text x="190" y="102" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">C2 (R)</text>
                        <text x="285" y="115" fill="#ef4444" fontSize="15" fontWeight="bold">OH</text>

                        {/* C3: OH on Left, H on Right (S) */}
                        {showFischer3DWedges ? (
                          <>
                            <polygon points="190,170 110,165 110,175" fill="#f59e0b" />
                            <polygon points="190,170 270,165 270,175" fill="#f59e0b" />
                          </>
                        ) : (
                          <line x1="110" y1="170" x2="270" y2="170" stroke={isDarkMode ? "#cbd5e1" : "#1e293b"} strokeWidth="4" />
                        )}
                        <text x="95" y="175" fill="#ef4444" fontSize="15" fontWeight="bold" textAnchor="end">HO</text>
                        <circle cx="190" cy="170" r="5" fill="#f59e0b" />
                        <text x="190" y="162" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">C3 (S)</text>
                        <text x="285" y="175" fill="#38bdf8" fontSize="15" fontWeight="bold">H</text>

                        {/* C4: H on Left, OH on Right (R) */}
                        {showFischer3DWedges ? (
                          <>
                            <polygon points="190,230 110,225 110,235" fill="#f59e0b" />
                            <polygon points="190,230 270,225 270,235" fill="#f59e0b" />
                          </>
                        ) : (
                          <line x1="110" y1="230" x2="270" y2="230" stroke={isDarkMode ? "#cbd5e1" : "#1e293b"} strokeWidth="4" />
                        )}
                        <text x="95" y="235" fill="#38bdf8" fontSize="15" fontWeight="bold" textAnchor="end">H</text>
                        <circle cx="190" cy="230" r="5" fill="#f59e0b" />
                        <text x="190" y="222" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">C4 (R)</text>
                        <text x="285" y="235" fill="#ef4444" fontSize="15" fontWeight="bold">OH</text>

                        {/* C5 (Penultimate): H on Left, OH on Right (D-Sugar!) */}
                        {showFischer3DWedges ? (
                          <>
                            <polygon points="190,290 110,285 110,295" fill="#10b981" />
                            <polygon points="190,290 270,285 270,295" fill="#10b981" />
                          </>
                        ) : (
                          <line x1="110" y1="290" x2="270" y2="290" stroke="#10b981" strokeWidth="4.5" />
                        )}
                        <text x="95" y="295" fill="#38bdf8" fontSize="15" fontWeight="bold" textAnchor="end">H</text>
                        <circle cx="190" cy="290" r="7" fill="#10b981" />
                        <text x="190" y="282" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="middle">C5 (R) ★</text>
                        <text x="285" y="295" fill="#10b981" fontSize="16" fontWeight="extrabold">OH (D-Sugar)</text>

                        {/* Bottom Group C6: CH2OH */}
                        <text x="190" y="410" fill="#f43f5e" fontSize="16" fontWeight="bold" textAnchor="middle">CH₂OH (C6)</text>
                      </g>
                    )}

                    {/* D-GLYCERALDEHYDE */}
                    {fischerPreset === 'glyceraldehyde_d' && (
                      <g>
                        <line x1="190" y1="80" x2="190" y2="340" stroke={showFischer3DWedges ? "#94a3b8" : (isDarkMode ? "#cbd5e1" : "#1e293b")} strokeWidth="4" strokeDasharray={showFischer3DWedges ? "6 4" : "none"} />
                        <text x="190" y="70" fill="#f43f5e" fontSize="18" fontWeight="bold" textAnchor="middle">CHO (C1)</text>

                        {showFischer3DWedges ? (
                          <>
                            <polygon points="190,210 90,202 90,218" fill="#10b981" />
                            <polygon points="190,210 290,202 290,218" fill="#10b981" />
                          </>
                        ) : (
                          <line x1="90" y1="210" x2="290" y2="210" stroke="#10b981" strokeWidth="4.5" />
                        )}
                        <text x="75" y="216" fill="#38bdf8" fontSize="17" fontWeight="bold" textAnchor="end">H</text>
                        <circle cx="190" cy="210" r="7" fill="#10b981" />
                        <text x="190" y="198" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">C2 (2R) ★</text>
                        <text x="305" y="216" fill="#10b981" fontSize="18" fontWeight="extrabold">OH (Right = D)</text>

                        <text x="190" y="365" fill="#f43f5e" fontSize="18" fontWeight="bold" textAnchor="middle">CH₂OH (C3)</text>
                      </g>
                    )}

                    {/* L-GLYCERALDEHYDE */}
                    {fischerPreset === 'glyceraldehyde_l' && (
                      <g>
                        <line x1="190" y1="80" x2="190" y2="340" stroke={showFischer3DWedges ? "#94a3b8" : (isDarkMode ? "#cbd5e1" : "#1e293b")} strokeWidth="4" strokeDasharray={showFischer3DWedges ? "6 4" : "none"} />
                        <text x="190" y="70" fill="#f43f5e" fontSize="18" fontWeight="bold" textAnchor="middle">CHO (C1)</text>

                        {showFischer3DWedges ? (
                          <>
                            <polygon points="190,210 90,202 90,218" fill="#ec4899" />
                            <polygon points="190,210 290,202 290,218" fill="#ec4899" />
                          </>
                        ) : (
                          <line x1="90" y1="210" x2="290" y2="210" stroke="#ec4899" strokeWidth="4.5" />
                        )}
                        <text x="75" y="216" fill="#ec4899" fontSize="18" fontWeight="extrabold" textAnchor="end">HO (Left = L)</text>
                        <circle cx="190" cy="210" r="7" fill="#ec4899" />
                        <text x="190" y="198" fill="#ec4899" fontSize="11" fontWeight="bold" textAnchor="middle">C2 (2S) ★</text>
                        <text x="305" y="216" fill="#38bdf8" fontSize="17" fontWeight="bold">H</text>

                        <text x="190" y="365" fill="#f43f5e" fontSize="18" fontWeight="bold" textAnchor="middle">CH₂OH (C3)</text>
                      </g>
                    )}

                    {/* L-ALANINE */}
                    {fischerPreset === 'alanine' && (
                      <g>
                        <line x1="190" y1="80" x2="190" y2="340" stroke={showFischer3DWedges ? "#94a3b8" : (isDarkMode ? "#cbd5e1" : "#1e293b")} strokeWidth="4" strokeDasharray={showFischer3DWedges ? "6 4" : "none"} />
                        <text x="190" y="70" fill="#f43f5e" fontSize="18" fontWeight="bold" textAnchor="middle">COOH</text>

                        {showFischer3DWedges ? (
                          <>
                            <polygon points="190,210 90,202 90,218" fill="#ec4899" />
                            <polygon points="190,210 290,202 290,218" fill="#ec4899" />
                          </>
                        ) : (
                          <line x1="90" y1="210" x2="290" y2="210" stroke="#ec4899" strokeWidth="4.5" />
                        )}
                        <text x="75" y="216" fill="#ec4899" fontSize="18" fontWeight="extrabold" textAnchor="end">H₂N (Left = L)</text>
                        <circle cx="190" cy="210" r="7" fill="#ec4899" />
                        <text x="190" y="198" fill="#ec4899" fontSize="11" fontWeight="bold" textAnchor="middle">Cα (S)</text>
                        <text x="305" y="216" fill="#38bdf8" fontSize="17" fontWeight="bold">H</text>

                        <text x="190" y="365" fill="#f43f5e" fontSize="18" fontWeight="bold" textAnchor="middle">CH₃</text>
                      </g>
                    )}

                    {/* MESO-TARTARIC ACID */}
                    {fischerPreset === 'tartaric_meso' && (
                      <g>
                        <line x1="190" y1="70" x2="190" y2="350" stroke={showFischer3DWedges ? "#94a3b8" : (isDarkMode ? "#cbd5e1" : "#1e293b")} strokeWidth="4" strokeDasharray={showFischer3DWedges ? "6 4" : "none"} />
                        <text x="190" y="60" fill="#f43f5e" fontSize="18" fontWeight="bold" textAnchor="middle">COOH (C1)</text>

                        {/* C2: H on Left, OH on Right */}
                        <line x1="100" y1="160" x2="280" y2="160" stroke="#f59e0b" strokeWidth="4" />
                        <text x="85" y="165" fill="#38bdf8" fontSize="16" fontWeight="bold" textAnchor="end">H</text>
                        <circle cx="190" cy="160" r="6" fill="#f59e0b" />
                        <text x="190" y="150" fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle">C2 (2R)</text>
                        <text x="295" y="165" fill="#ef4444" fontSize="16" fontWeight="bold">OH</text>

                        {/* Internal Plane of Symmetry Line (Mirror Plane σ) */}
                        <line x1="50" y1="210" x2="330" y2="210" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 4" />
                        <text x="190" y="206" fill="#38bdf8" fontSize="11" fontWeight="extrabold" textAnchor="middle">
                          — Internal Plane of Symmetry (σ Plane) —
                        </text>

                        {/* C3: H on Left, OH on Right (Matching!) */}
                        <line x1="100" y1="260" x2="280" y2="260" stroke="#f59e0b" strokeWidth="4" />
                        <text x="85" y="265" fill="#38bdf8" fontSize="16" fontWeight="bold" textAnchor="end">H</text>
                        <circle cx="190" cy="260" r="6" fill="#f59e0b" />
                        <text x="190" y="250" fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle">C3 (2S)</text>
                        <text x="295" y="265" fill="#ef4444" fontSize="16" fontWeight="bold">OH</text>

                        <text x="190" y="375" fill="#f43f5e" fontSize="18" fontWeight="bold" textAnchor="middle">COOH (C4)</text>
                      </g>
                    )}

                    {/* (2R,3R)-TARTARIC ACID */}
                    {fischerPreset === 'tartaric_rr' && (
                      <g>
                        <line x1="190" y1="70" x2="190" y2="350" stroke={showFischer3DWedges ? "#94a3b8" : (isDarkMode ? "#cbd5e1" : "#1e293b")} strokeWidth="4" strokeDasharray={showFischer3DWedges ? "6 4" : "none"} />
                        <text x="190" y="60" fill="#f43f5e" fontSize="18" fontWeight="bold" textAnchor="middle">COOH (C1)</text>

                        {/* C2: H on Left, OH on Right (2R) */}
                        <line x1="100" y1="160" x2="280" y2="160" stroke="#f59e0b" strokeWidth="4" />
                        <text x="85" y="165" fill="#38bdf8" fontSize="16" fontWeight="bold" textAnchor="end">H</text>
                        <circle cx="190" cy="160" r="6" fill="#f59e0b" />
                        <text x="190" y="150" fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle">C2 (2R)</text>
                        <text x="295" y="165" fill="#ef4444" fontSize="16" fontWeight="bold">OH</text>

                        {/* C3: OH on Left, H on Right (3R) */}
                        <line x1="100" y1="260" x2="280" y2="260" stroke="#f59e0b" strokeWidth="4" />
                        <text x="85" y="265" fill="#ef4444" fontSize="16" fontWeight="bold" textAnchor="end">HO</text>
                        <circle cx="190" cy="260" r="6" fill="#f59e0b" />
                        <text x="190" y="250" fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle">C3 (3R)</text>
                        <text x="295" y="265" fill="#38bdf8" fontSize="16" fontWeight="bold">H</text>

                        <text x="190" y="375" fill="#f43f5e" fontSize="18" fontWeight="bold" textAnchor="middle">COOH (C4)</text>
                      </g>
                    )}
                  </svg>
                </div>

                {/* Right Column: Fischer Rules & Conversion Guide */}
                <div className="md:col-span-6 flex flex-col gap-4">
                  {/* Memory Trick Card */}
                  <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
                    isDarkMode ? 'bg-[#12121e] border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      3D Perspective: "Horizontal Hugs You!"
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      In all Fischer projections:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
                        <strong>Horizontal Lines = Solid Wedges (▲)</strong>
                        <p className="text-[11px] opacity-80 mt-0.5">Point forward out of the notebook page toward you.</p>
                      </div>
                      <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                        <strong>Vertical Lines = Dashed Hashes (⫎)</strong>
                        <p className="text-[11px] opacity-80 mt-0.5">Point backward into the page away from you.</p>
                      </div>
                    </div>
                  </div>

                  {/* Fischer -> Haworth -> Chair Conversion Golden Rule */}
                  <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
                    isDarkMode ? 'bg-[#12121e] border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Fischer ↔ Haworth ↔ Chair Conversion:
                    </h3>
                    <ul className="text-xs text-slate-400 flex flex-col gap-1.5 pl-4 list-disc">
                      <li><strong>Right in Fischer = DOWN in Haworth/Chair:</strong> Any substituent on the RIGHT side of the Fischer vertical backbone points DOWN in the cyclic ring!</li>
                      <li><strong>Left in Fischer = UP in Haworth/Chair:</strong> Any substituent on the LEFT side of the Fischer backbone points UP in the cyclic ring!</li>
                      <li><strong>D-Sugars (C6):</strong> Terminal -CH₂OH on C5 points <strong>UP</strong> in D-sugars.</li>
                      <li><strong>β-D-Glucose Miracle:</strong> In β-D-glucopyranose, all 5 non-hydrogen substituents (OH at C1, C2, C3, C4 and CH₂OH at C5) are completely <strong>EQUATORIAL</strong>!</li>
                    </ul>
                  </div>

                  {/* Allowed vs Forbidden Fischer Moves */}
                  <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
                    isDarkMode ? 'bg-[#12121e] border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <h3 className="text-xs font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <Info className="w-3.5 h-3.5" />
                      Notebook Exam Rules:
                    </h3>
                    <div className="text-xs text-slate-400 space-y-1">
                      <p>✅ <strong>180° In-Plane Rotation:</strong> Allowed! Retains stereochemistry.</p>
                      <p>❌ <strong>90° In-Plane Rotation:</strong> Forbidden! Inverts all stereocenters to enantiomers.</p>
                      <p>❌ <strong>Out-of-Plane Flip:</strong> Forbidden! Flips dashes to wedges.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LAB NOTEBOOK DRAWING RULES & REPORT DATA */}
          {activeTab === 'guide' && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
                  isDarkMode ? 'bg-[#12121e] border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                  <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs">1</span>
                    Standard Skeletal (Bond-Line) Rules
                  </h3>
                  <ul className="text-xs text-slate-400 flex flex-col gap-1.5 pl-6 list-disc">
                    <li>Carbon atoms are at the ends of lines and line intersections.</li>
                    <li>Hydrogens bonded to carbon are implicit and NOT written out unless wedging is required.</li>
                    <li>Always preserve the 120° zigzag angle mimicking tetrahedral sp³ geometry.</li>
                    <li>Heteroatoms (O, N, S, halogens) must always be shown with their attached hydrogens (-OH, -NH₂).</li>
                  </ul>
                </div>

                <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
                  isDarkMode ? 'bg-[#12121e] border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                  <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-xs">2</span>
                    Drawing Newman Projections
                  </h3>
                  <ul className="text-xs text-slate-400 flex flex-col gap-1.5 pl-6 list-disc">
                    <li>Look straight down the C-C single bond axis (e.g. C2-C3).</li>
                    <li>Front carbon is a point with three spokes forming a Y.</li>
                    <li>Back carbon is a circle with three bonds emerging from the perimeter.</li>
                    <li>Rotate the back spokes relative to the front spokes by dihedral angle θ.</li>
                  </ul>
                </div>

                <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
                  isDarkMode ? 'bg-[#12121e] border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                  <h3 className="text-sm font-bold text-pink-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-300 flex items-center justify-center text-xs">3</span>
                    Drawing Cyclohexane Chairs
                  </h3>
                  <ul className="text-xs text-slate-400 flex flex-col gap-1.5 pl-6 list-disc">
                    <li>Draw two parallel slanted lines offset horizontally.</li>
                    <li>Draw upward V at tail and downward V at nose.</li>
                    <li>6 vertical axial bonds alternate strictly UP and DOWN.</li>
                    <li>6 equatorial bonds point slightly outward, parallel to ring bonds one step away.</li>
                  </ul>
                </div>

                <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
                  isDarkMode ? 'bg-[#12121e] border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                  <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs">4</span>
                    Fischer & D/L Stereochemistry
                  </h3>
                  <ul className="text-xs text-slate-400 flex flex-col gap-1.5 pl-6 list-disc">
                    <li>Horizontal bonds = Solid Wedges (pointing forward toward viewer: "Horizontal Hugs You").</li>
                    <li>Vertical bonds = Dashed Hashes (pointing backward into page).</li>
                    <li>Penultimate carbon OH on right = D-sugar; OH on left = L-sugar.</li>
                    <li>Right in Fischer = DOWN in Haworth/Chair; Left in Fischer = UP.</li>
                  </ul>
                </div>
              </div>

              {/* Ready-to-copy Lab Notebook Text Box */}
              <div className={`p-4 rounded-xl border flex flex-col gap-2.5 ${
                isDarkMode ? 'bg-[#12121e] border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    Formatted Lab Report Entry (Ready to Copy)
                  </span>
                  <button
                    onClick={handleCopyLabData}
                    className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all flex items-center gap-1.5"
                  >
                    {copiedText ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    {copiedText ? 'Copied!' : 'Copy to Clipboard'}
                  </button>
                </div>
                <pre className={`p-3 rounded-lg text-[11px] font-mono leading-relaxed overflow-x-auto select-all ${
                  isDarkMode ? 'bg-black/40 text-indigo-200' : 'bg-white text-slate-800 border border-slate-200'
                }`}>
{`Compound: ${name} (${formula}) | SMILES: ${smiles}
Torsion Bond: ${rotBond} | Dihedral Angle: ${normAngle}°
Conformation: ${conformerName}
Potential Energy: ${currentEnergy.toFixed(2)} kJ/mol (${(currentEnergy / 4.184).toFixed(2)} kcal/mol)
Dipole Moment: ${liveDipole?.magnitude !== undefined ? `${liveDipole.magnitude.toFixed(2)} D` : "0.00 D"}
Steric Clash: ${clashData?.overlap > 0 ? `${clashData.overlap.toFixed(2)} Å (${clashData.atom1}···${clashData.atom2})` : "Stable (no overlap)"}
Ring Conformations: Chair (0 kJ/mol) -> Half-Chair (45 kJ/mol) -> Twist-Boat (23 kJ/mol) -> Boat (30 kJ/mol)
Fischer Projection: Horizontal = Wedges (▲), Vertical = Dashes (⫎) | Down-Right, Up-Left Rule`}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Footer Bar */}
        <div className={`p-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 ${
          isDarkMode ? 'bg-[#12121e] border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          <div className="flex items-center gap-3">
            <span>Active: <strong className="text-indigo-400 font-mono">{name} ({formula})</strong></span>
            <span>•</span>
            <span>Dihedral: <strong className="text-purple-400 font-mono">{normAngle}°</strong></span>
            <span>•</span>
            <span>Conformer: <strong className="text-pink-400 font-mono">{conformerName}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all ${
                isDarkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
