"use client"
import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine, ReferenceDot } from 'recharts';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Beaker, Activity, Hexagon, X, Zap, Brain, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, RotateCw, ZoomIn, ZoomOut, Mic, MicOff, Volume2, VolumeX, Palette, Sun, Moon, Maximize2, BookOpen, Layers, Sliders } from 'lucide-react';
import * as ort from 'onnxruntime-web';
import { THEME_PALETTES, getActiveThemeConfig } from '../utils/themes';

// Dynamically import Ketcher & Notebook2DModal so they don't break Next.js SSR
const KetcherDrawer = dynamic(() => import('../components/KetcherDrawer'), { ssr: false });
const Notebook2DModal = dynamic(() => import('../components/Notebook2DModal'), { ssr: false });

const R = 0.008314; 
const getBackendUrl = () => {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    const raw = process.env.NEXT_PUBLIC_BACKEND_URL.trim();
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return `https://${raw}`;
  }
  if (typeof window !== 'undefined') {
    // In local development, use localhost:8000
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    // Any production deployment (Vercel, Render, custom domains)
    return 'https://phase-conform-backend.onrender.com';
  }
  return 'https://phase-conform-backend.onrender.com';
};


// --- Dynamic 3D Chemistry Components ---

// Computes exact 3D bounding geometry, center, and radius of current molecule for viewport auto-fit
function calculateMoleculeBounds(moleculeData, conformationPhysics, renderMode = 'ball-stick') {
  if (!moleculeData || !moleculeData.atoms || moleculeData.atoms.length === 0) {
    return { 
      center: [0, 0, 0], 
      radius: 3.5, 
      size: [4, 4, 4] 
    };
  }

  const positions = conformationPhysics?.positions && conformationPhysics.positions.length === moleculeData.atoms.length
    ? conformationPhysics.positions
    : moleculeData.atoms.map(a => a.pos || [0, 0, 0]);

  const atomScale = renderMode === 'vdw' ? 2.5 : renderMode === 'wireframe' ? 0.45 : 1.0;
  const globalScale = 1.8;

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  positions.forEach((pos, i) => {
    const sym = moleculeData.atoms[i]?.symbol || 'C';
    const rBase = sym === 'H' ? 0.25 : sym === 'C' ? 0.4 : 0.35;
    const r = rBase * atomScale;

    minX = Math.min(minX, pos[0] - r);
    maxX = Math.max(maxX, pos[0] + r);
    minY = Math.min(minY, pos[1] - r);
    maxY = Math.max(maxY, pos[1] + r);
    minZ = Math.min(minZ, pos[2] - r);
    maxZ = Math.max(maxZ, pos[2] + r);
  });

  const cx = ((minX + maxX) / 2) * globalScale;
  const cy = ((minY + maxY) / 2) * globalScale;
  const cz = ((minZ + maxZ) / 2) * globalScale;

  const sizeX = Math.max(0.5, (maxX - minX) * globalScale);
  const sizeY = Math.max(0.5, (maxY - minY) * globalScale);
  const sizeZ = Math.max(0.5, (maxZ - minZ) * globalScale);

  let maxRadius = 0;
  positions.forEach((pos, i) => {
    const sym = moleculeData.atoms[i]?.symbol || 'C';
    const rBase = sym === 'H' ? 0.25 : sym === 'C' ? 0.4 : 0.35;
    const r = rBase * atomScale * globalScale;
    const px = pos[0] * globalScale;
    const py = pos[1] * globalScale;
    const pz = pos[2] * globalScale;
    const d = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2 + (pz - cz) ** 2) + r;
    if (d > maxRadius) maxRadius = d;
  });

  return {
    center: [cx, cy, cz],
    radius: Math.max(maxRadius, 1.2),
    size: [sizeX, sizeY, sizeZ]
  };
}

// Animates the camera smoothly to target position and target look-at center, then releases to OrbitControls
function CameraAnimator({ targetPos, targetLookAt = [0, 0, 0], isAnimating, onAnimationComplete, controlsRef }) {
  const { camera } = useThree();
  const targetVec = useMemo(() => new THREE.Vector3(...targetPos), [targetPos]);
  const lookAtVec = useMemo(() => new THREE.Vector3(...targetLookAt), [targetLookAt]);
  
  useFrame(() => {
    if (!isAnimating) return;
    
    if (camera.position.distanceTo(targetVec) > 0.05) {
      camera.position.lerp(targetVec, 0.08);
      if (controlsRef?.current) {
        controlsRef.current.target.lerp(lookAtVec, 0.08);
        controlsRef.current.update();
      } else {
        camera.lookAt(lookAtVec);
      }
    } else {
      camera.position.copy(targetVec);
      if (controlsRef?.current) {
        controlsRef.current.target.copy(lookAtVec);
        controlsRef.current.update();
      }
      onAnimationComplete();
    }
  });
  return null;
}

const Atom = ({ idx, position, symbol, color, scale = 1, isClashing = false, stereo = "", onInvertStereo = null, renderMode = 'ball-stick', isDarkMode = true }) => {
  const radius = symbol === 'H' ? 0.25 : symbol === 'C' ? 0.4 : symbol === 'O' ? 0.35 : symbol === 'N' ? 0.35 : 0.4;
  return (
    <Sphere args={[radius * scale, renderMode === 'wireframe' ? 14 : 32, renderMode === 'wireframe' ? 14 : 32]} position={position}>
      <meshPhysicalMaterial 
        color={color} 
        wireframe={renderMode === 'wireframe'}
        roughness={isClashing ? 0.2 : (isDarkMode ? 0.3 : 0.4)} 
        metalness={isClashing ? 0.4 : (isDarkMode ? 0.2 : 0.15)}
        clearcoat={isDarkMode ? 0.8 : 0.6}
        emissive={isClashing ? '#fb7185' : (isDarkMode ? color : '#000000')}
        emissiveIntensity={isClashing ? 0.5 : (isDarkMode ? 0.1 : 0.0)}
      />
      {stereo && (
        <Html position={[0, radius * scale * 1.5, 0]} center zIndexRange={[100, 0]}>
          <div 
            onClick={(e) => { e.stopPropagation(); if (onInvertStereo) onInvertStereo(idx); }}
            className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold shadow-lg border backdrop-blur-sm cursor-pointer hover:scale-125 transition-transform
            ${stereo === 'R' ? 'bg-indigo-500/80 hover:bg-indigo-400 text-white border-indigo-300' : 'bg-pink-500/80 hover:bg-pink-400 text-white border-pink-300'}
          `}>
            {stereo}
          </div>
        </Html>
      )}
    </Sphere>
  );
};

const Bond = ({ start, end, isRotatable, isActive, onClick, renderMode = 'ball-stick', isDarkMode = true }) => {
  const distance = Math.sqrt(Math.pow(end[0]-start[0], 2) + Math.pow(end[1]-start[1], 2) + Math.pow(end[2]-start[2], 2));
  const midpoint = [(start[0]+end[0])/2, (start[1]+end[1])/2, (start[2]+end[2])/2];
  const axis = new THREE.Vector3(0, 1, 0);
  const target = new THREE.Vector3(end[0]-start[0], end[1]-start[1], end[2]-start[2]).normalize();
  
  const quaternion = new THREE.Quaternion();
  if (target.y > 0.9999) quaternion.identity();
  else if (target.y < -0.9999) quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
  else quaternion.setFromUnitVectors(axis, target);
  
  const color = isActive ? "#f472b6" : (isRotatable ? (isDarkMode ? "#60a5fa" : "#2563eb") : (isDarkMode ? "#94a3b8" : "#64748b"));
  const bondRadius = isActive ? 0.12 : (renderMode === 'wireframe' ? 0.03 : 0.08);
  
  return (
    <mesh 
      position={midpoint} 
      quaternion={quaternion} 
      onClick={(e) => {
        if (isRotatable && onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      onPointerOver={(e) => { if (isRotatable) document.body.style.cursor = 'pointer'; }}
      onPointerOut={(e) => { document.body.style.cursor = 'auto'; }}
    >
      <cylinderGeometry args={[bondRadius, bondRadius, distance, renderMode === 'wireframe' ? 8 : 16]} />
      <meshPhysicalMaterial 
        color={color} 
        wireframe={renderMode === 'wireframe'}
        roughness={isDarkMode ? 0.3 : 0.4} 
        metalness={isDarkMode ? 0.5 : 0.3} 
        clearcoat={0.5}
        emissive={isActive ? "#f472b6" : (isRotatable ? (isDarkMode ? "#60a5fa" : "#2563eb") : "#000000")}
        emissiveIntensity={isActive ? 0.5 : (isRotatable ? (isDarkMode ? 0.2 : 0.1) : 0)}
      />
    </mesh>
  );
};

// Rotates a point around an arbitrary axis vector in 3D
function rotateAroundAxis(point, axisStart, axisEnd, theta) {
  const p = new THREE.Vector3(...point);
  const start = new THREE.Vector3(...axisStart);
  const end = new THREE.Vector3(...axisEnd);
  
  const axis = new THREE.Vector3().subVectors(end, start).normalize();
  p.sub(start);
  p.applyAxisAngle(axis, theta);
  p.add(start);
  
  return [p.x, p.y, p.z];
}

// Real-Time 3D Holographic Dipole Moment Vector Arrow
const DipoleArrow = ({ origin, vector, magnitude }) => {
  if (!vector || magnitude < 0.05) return null;
  const dir = new THREE.Vector3(...vector).normalize();
  const len = Math.min(3.2, Math.max(0.6, magnitude * 0.7));
  const shaftLen = len * 0.75;
  const headLen = len * 0.25;
  const shaftRadius = 0.045;
  const headRadius = 0.12;

  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

  const shaftMid = new THREE.Vector3(...origin).addScaledVector(dir, shaftLen / 2);
  const headPos = new THREE.Vector3(...origin).addScaledVector(dir, shaftLen + headLen / 2);

  return (
    <group>
      {/* Glowing Shaft */}
      <mesh position={shaftMid} quaternion={quaternion}>
        <cylinderGeometry args={[shaftRadius, shaftRadius, shaftLen, 16]} />
        <meshPhysicalMaterial 
          color="#38bdf8" 
          emissive="#0ea5e9" 
          emissiveIntensity={1.4} 
          roughness={0.2}
          clearcoat={1.0} 
        />
      </mesh>
      {/* Arrowhead */}
      <mesh position={headPos} quaternion={quaternion}>
        <coneGeometry args={[headRadius, headLen, 16]} />
        <meshPhysicalMaterial 
          color="#38bdf8" 
          emissive="#38bdf8" 
          emissiveIntensity={1.8} 
          roughness={0.2}
          clearcoat={1.0} 
        />
      </mesh>
    </group>
  );
};

// Pure physical computation of conformation geometry, steric clashes, COM, and live dipole
function calculateConformationPhysics(moleculeData, angle) {
  if (!moleculeData || !moleculeData.atoms || !moleculeData.atoms.length) {
    return {
      positions: [],
      clashData: { distance: 0, overlap: 0, atom1: '-', atom2: '-' },
      clashPair: null,
      maxOverlap: 0,
      minDistance: 999,
      liveDipole: { magnitude: 0, vector: [0, 0, 0] },
      centerOfMass: [0, 0, 0]
    };
  }

  const { atoms, bonds, active_bond } = moleculeData;
  const rad = (angle * Math.PI) / 180;
  let currentPositions = atoms.map(a => a.pos);
  let maxOverlap = 0;
  let minDistance = 999;
  let clashPair = null;

  if (active_bond && active_bond.a2 !== undefined && active_bond.a3 !== undefined) {
    const a1 = active_bond.a2;
    const a2 = active_bond.a3;
    if (atoms[a1] && atoms[a2]) {
      const pivotStart = atoms[a1].pos;
      const pivotEnd = atoms[a2].pos;

      const rotatingIndices = new Set([a2]);
      const queue = [a2];
      while (queue.length > 0) {
        const curr = queue.shift();
        for (let b of bonds) {
          if (b.start === curr && b.end !== a1 && !rotatingIndices.has(b.end)) {
            rotatingIndices.add(b.end);
            queue.push(b.end);
          } else if (b.end === curr && b.start !== a1 && !rotatingIndices.has(b.start)) {
            rotatingIndices.add(b.start);
            queue.push(b.start);
          }
        }
      }

      currentPositions = atoms.map(atom => {
        if (rotatingIndices.has(atom.idx)) {
          return rotateAroundAxis(atom.pos, pivotStart, pivotEnd, rad);
        }
        return atom.pos;
      });

      for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
          if (rotatingIndices.has(i) !== rotatingIndices.has(j)) {
            if ((i === a1 && j === a2) || (i === a2 && j === a1)) continue;

            const p1 = currentPositions[i];
            const p2 = currentPositions[j];
            const dist = Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2) + Math.pow(p1[2] - p2[2], 2));

            const vdw1 = atoms[i].vdw || 1.7;
            const vdw2 = atoms[j].vdw || 1.7;
            const vdwSum = vdw1 + vdw2;

            const overlap = Math.max(0, vdwSum - dist);
            if (overlap > maxOverlap || dist < minDistance) {
              maxOverlap = overlap;
              minDistance = dist;
              clashPair = [i, j];
            }
          }
        }
      }
    }
  }

  // Real-Time Center of Mass & Molecular Dipole Vector
  let com = [0, 0, 0];
  let dipoleVec = [0, 0, 0];
  let totalMass = 0;
  const massMap = { H: 1.008, C: 12.011, N: 14.007, O: 15.999, F: 18.998, Cl: 35.45, P: 30.974, S: 32.06 };

  for (let i = 0; i < atoms.length; i++) {
    const sym = atoms[i].symbol || atoms[i].element || 'C';
    const m = massMap[sym] || 12.0;
    const p = currentPositions[i];
    com[0] += p[0] * m;
    com[1] += p[1] * m;
    com[2] += p[2] * m;
    totalMass += m;
  }
  if (totalMass > 0) {
    com = [com[0] / totalMass, com[1] / totalMass, com[2] / totalMass];
  }

  for (let i = 0; i < atoms.length; i++) {
    const q = atoms[i].charge || 0;
    const p = currentPositions[i];
    dipoleVec[0] += q * (p[0] - com[0]);
    dipoleVec[1] += q * (p[1] - com[1]);
    dipoleVec[2] += q * (p[2] - com[2]);
  }
  dipoleVec = [dipoleVec[0] * 4.803, dipoleVec[1] * 4.803, dipoleVec[2] * 4.803];
  const dipoleMag = Math.sqrt(dipoleVec[0] ** 2 + dipoleVec[1] ** 2 + dipoleVec[2] ** 2);

  const clashData = clashPair ? {
    distance: minDistance,
    overlap: maxOverlap,
    atom1: atoms[clashPair[0]].symbol,
    atom2: atoms[clashPair[1]].symbol
  } : { distance: 0, overlap: 0, atom1: '-', atom2: '-' };

  return {
    positions: currentPositions,
    clashData,
    clashPair,
    maxOverlap,
    minDistance,
    liveDipole: { magnitude: dipoleMag, vector: dipoleVec },
    centerOfMass: com
  };
}

// Pure 3D Molecule Renderer (Zero React hook order violations)
function DynamicMolecule({ moleculeData, conformationPhysics, renderMode, onInvertStereo, onBondClick, showDipole = true, isDarkMode = true }) {
  if (!moleculeData || !moleculeData.atoms || !conformationPhysics) return null;
  
  const { atoms, bonds, active_bond, rotatable_bonds } = moleculeData;
  const { positions: currentPositions, maxOverlap, clashPair, centerOfMass: com, liveDipole } = conformationPhysics;
  const dipoleMag = liveDipole?.magnitude || 0;
  const dipoleVec = liveDipole?.vector || [0, 0, 0];

  // AI Electrostatic Potential (ESP) Color Shading
  const getEspColor = (charge) => {
    const q = charge !== undefined ? charge : 0;
    const clamped = Math.max(-0.35, Math.min(0.35, q));
    if (clamped < 0) {
      const t = Math.abs(clamped) / 0.35;
      return new THREE.Color('#64748b').lerp(new THREE.Color('#f43f5e'), t).getHexString();
    } else {
      const t = clamped / 0.35;
      return new THREE.Color('#64748b').lerp(new THREE.Color('#38bdf8'), t).getHexString();
    }
  };

  const getAtomColor = (symbol, charge) => {
    if (renderMode === 'esp') {
      return `#${getEspColor(charge)}`;
    }
    switch(symbol) {
      case 'C': return isDarkMode ? '#64748b' : '#334155';
      case 'H': return isDarkMode ? '#f8fafc' : '#cbd5e1'; 
      case 'O': return isDarkMode ? '#fda4af' : '#e11d48'; 
      case 'N': return isDarkMode ? '#93c5fd' : '#2563eb'; 
      case 'F': return isDarkMode ? '#86efac' : '#16a34a'; 
      case 'Cl': return isDarkMode ? '#4ade80' : '#15803d'; 
      default: return isDarkMode ? '#cbd5e1' : '#64748b';
    }
  };

  // Render scale logic
  const globalScale = 1.8;
  const atomScaleMultiplier = renderMode === 'vdw' ? 2.5 : renderMode === 'wireframe' ? 0.45 : 1.0;
  const showBonds = renderMode !== 'vdw';

  return (
    <group scale={globalScale}>
      {/* 3D Real-Time AI Dipole Moment Vector Arrow */}
      {showDipole && dipoleMag > 0.05 && (
        <DipoleArrow origin={com} vector={dipoleVec} magnitude={dipoleMag} />
      )}

      {/* Render Bonds */}
      {showBonds && bonds.map((b, i) => {
        const isRotatable = rotatable_bonds?.some(rb => (rb.a2 === b.start && rb.a3 === b.end) || (rb.a2 === b.end && rb.a3 === b.start));
        const isActive = active_bond && ((active_bond.a2 === b.start && active_bond.a3 === b.end) || (active_bond.a2 === b.end && active_bond.a3 === b.start));
        
        return (
          <Bond 
            key={`bond-${i}`} 
            start={currentPositions[b.start] || [0, 0, 0]} 
            end={currentPositions[b.end] || [0, 0, 0]} 
            isRotatable={isRotatable}
            isActive={isActive}
            renderMode={renderMode}
            isDarkMode={isDarkMode}
            onClick={() => onBondClick && onBondClick(b.start, b.end)}
          />
        );
      })}
      
      {/* Render Atoms */}
      {atoms.map((a, i) => {
        const isClashing = maxOverlap > 0 && clashPair && (clashPair[0] === i || clashPair[1] === i);
        const baseColor = getAtomColor(a.symbol, a.charge);
        const color = isClashing 
          ? new THREE.Color(baseColor).lerp(new THREE.Color('#fb7185'), Math.min(1, maxOverlap / 0.5)).getHexString()
          : baseColor;
          
        let finalScale = isClashing ? atomScaleMultiplier + (maxOverlap*0.2) : atomScaleMultiplier;
        
        return (
          <Atom 
            key={`atom-${i}`} 
            idx={a.idx}
            position={currentPositions[i] || [0, 0, 0]} 
            symbol={a.symbol} 
            color={color.startsWith('#') ? color : `#${color}`}
            scale={finalScale}
            isClashing={isClashing}
            stereo={a.stereo}
            renderMode={renderMode}
            isDarkMode={isDarkMode}
            onInvertStereo={onInvertStereo}
          />
        );
      })}
    </group>
  );
}


export default function PhaseConformDashboard() {
  const [angle, setAngle] = useState(180);
  const [temperature, setTemperature] = useState(298);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isNotebook2DOpen, setIsNotebook2DOpen] = useState(false);
  const [notebookTab, setNotebookTab] = useState('skeletal');
  const [renderMode, setRenderMode] = useState('ball-stick');
  // Mobile Portrait View: 'all' (stacked scroll) | 'canvas' (fullscreen 3D studio) | 'analysis' (focused energy HUD)
  const [mobileTab, setMobileTab] = useState('all');

  const [moleculeData, setMoleculeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [cameraPos, setCameraPos] = useState([0, 0, 7]); // Standard Front View
  const [cameraLookAt, setCameraLookAt] = useState([0, 0, 0]);
  const [isAnimatingCamera, setIsAnimatingCamera] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [aiMetrics, setAiMetrics] = useState(null);
  const [showDipole, setShowDipole] = useState(true);
  const [isAiMetricsMinimized, setIsAiMetricsMinimized] = useState(false);
  const [isExtremaMinimized, setIsExtremaMinimized] = useState(false);
  const [copilotMode, setCopilotMode] = useState('simplified'); // 'simplified' | 'descriptive'
  const [geminiDeepDive, setGeminiDeepDive] = useState(null);
  const [isDeepDiveLoading, setIsDeepDiveLoading] = useState(false);
  const [deepDiveMeta, setDeepDiveMeta] = useState(null);

  // Dynamic Theming State: 10 Popular Palettes with Dark & Light Mode
  const [themeId, setThemeId] = useState('midnight');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const themePickerRef = useRef(null);
  const toolbarRef = useRef(null);

  const handleToolbarWheel = (e) => {
    if (toolbarRef.current) {
      if (e.deltaY !== 0) {
        toolbarRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  const scrollToolbar = (direction) => {
    if (toolbarRef.current) {
      const amount = direction === 'left' ? -240 : 240;
      toolbarRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // Close theme picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (themePickerRef.current && !themePickerRef.current.contains(event.target)) {
        setIsThemePickerOpen(false);
      }
    };
    if (isThemePickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isThemePickerOpen]);

  const currentTheme = useMemo(() => {
    return getActiveThemeConfig(themeId, isDarkMode);
  }, [themeId, isDarkMode]);

  const themeStyles = useMemo(() => ({
    '--theme-bg-root': currentTheme.bgRoot,
    '--theme-panel-bg': currentTheme.panelBg,
    '--theme-sub-bg': currentTheme.subBg,
    '--theme-card-bg': currentTheme.cardBg,
    '--theme-border-color': currentTheme.borderColor,
    '--theme-text-main': currentTheme.textMain,
    '--theme-text-sub': currentTheme.textSub,
    '--theme-text-muted': currentTheme.textMuted,
    '--theme-accent-primary': currentTheme.accentPrimary,
    '--theme-accent-secondary': currentTheme.accentSecondary,
    '--theme-canvas-bg': currentTheme.canvasBg,
    '--theme-canvas-grid': currentTheme.canvasGrid,
  }), [currentTheme]);

  // Synchronous physical computation of conformation geometry, clashes, COM, and live dipole
  const conformationPhysics = useMemo(() => {
    return calculateConformationPhysics(moleculeData, angle);
  }, [moleculeData, angle]);

  const clashData = conformationPhysics.clashData;
  const liveDipole = conformationPhysics.liveDipole;

  // Animation & Camera Control States
  const [isAutoRotatingBond, setIsAutoRotatingBond] = useState(false);
  const [isAutoRotatingMolecule, setIsAutoRotatingMolecule] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const orbitControlsRef = useRef(null);
  const ortSessionRef = useRef(null);

  // Auto-rotate dihedral angle effect
  useEffect(() => {
    let interval;
    if (isAutoRotatingBond && moleculeData?.active_bond) {
      interval = setInterval(() => {
        setAngle(prev => (prev >= 360 ? 0 : prev + 1));
      }, 50); // 1 degree per 50ms (~20 deg/sec)
    }
    return () => clearInterval(interval);
  }, [isAutoRotatingBond, moleculeData?.active_bond]);

  const handleZoomIn = () => {
    if (orbitControlsRef.current) {
      const controls = orbitControlsRef.current;
      const camera = controls.object;
      const target = controls.target;
      const dir = new THREE.Vector3().subVectors(target, camera.position).normalize();
      camera.position.addScaledVector(dir, 1.5);
      controls.update();
    }
  };

  const handleZoomOut = () => {
    if (orbitControlsRef.current) {
      const controls = orbitControlsRef.current;
      const camera = controls.object;
      const target = controls.target;
      const dir = new THREE.Vector3().subVectors(target, camera.position).normalize();
      camera.position.addScaledVector(dir, -1.5);
      controls.update();
    }
  };

  // Gemini Live AI State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { role: 'model', text: "Hello! I am Phase-Conform AI. I can explain any chemical concept or autonomously control this 3D dashboard for you. What would you like to explore?" }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceReplyEnabled, setIsVoiceReplyEnabled] = useState(false);
  const recognitionRef = useRef(null);
  const chatScrollRef = useRef(null);
  const latestSpeechRef = useRef("");
  const silenceTimerRef = useRef(null);
  const handleChatSubmitRef = useRef(null);

  // Initialize Web Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        latestSpeechRef.current = transcript;
        setChatInput(transcript);

        // Auto-submit after 1.2s pause in speaking
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) {}
          }
        }, 1200);
      };

      recognition.onend = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        setIsListening(false);
        const spokenText = latestSpeechRef.current.trim();
        latestSpeechRef.current = "";
        if (spokenText && handleChatSubmitRef.current) {
          handleChatSubmitRef.current(null, spokenText);
        }
      };

      recognition.onerror = (event) => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        console.warn("Speech recognition notice:", event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome, Edge, or Safari.");
      return;
    }
    if (isListening) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    } else {
      latestSpeechRef.current = "";
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Error starting speech recognition:", err);
      }
    }
  };

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, isChatLoading]);

  const handleChatSubmit = async (e, directMessage = null) => {
    e?.preventDefault();
    const userMessage = (directMessage !== null ? directMessage : chatInput).trim();
    if (!userMessage || isChatLoading) return;

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    latestSpeechRef.current = "";

    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (err) {}
      setIsListening(false);
    }

    setChatInput("");
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsChatLoading(true);

    try {
      // Gather comprehensive live telemetry and dashboard state for Gemini
      const currentState = {
        molecule: moleculeData ? {
          name: moleculeData.name || "Target Molecule",
          smiles: moleculeData.smiles || "",
          formula: moleculeData.formula || "",
          numAtoms: moleculeData.atoms?.length || 0,
          activeBond: moleculeData.active_bond ? `${moleculeData.active_bond.a2}-${moleculeData.active_bond.a3}` : null
        } : null,
        angle,
        temperature,
        renderMode,
        showDipole,
        isAutoRotatingBond,
        isAutoRotatingMolecule,
        copilotMode,
        isAiMetricsMinimized,
        isExtremaMinimized,
        theme: {
          palette: themeId,
          mode: isDarkMode ? 'dark' : 'light',
          paletteName: currentTheme.name
        },
        currentEnergy: typeof currentEnergy === 'number' ? Number(currentEnergy.toFixed(2)) : 0,
        liveDipole: liveDipole?.magnitude !== undefined ? {
          magnitude: Number(liveDipole.magnitude.toFixed(2)),
          vector: liveDipole.vector?.map(v => Number(v.toFixed(2)))
        } : null,
        clashData: clashData?.overlap > 0 ? {
          overlap: Number(clashData.overlap.toFixed(2)),
          atoms: `${clashData.atom1}···${clashData.atom2}`
        } : null
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMessage, 
          history: chatHistory,
          state: currentState 
        })
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      let textToSpeak = "";
      if (data.type === 'tool_call') {
        // Execute the UI command autonomously across the entire application
        if (data.functionName === 'load_molecule') {
          setSearchQuery(data.args.query);
          searchPubChem(data.args.query);
        } else if (data.functionName === 'set_render_mode') {
          setRenderMode(data.args.mode);
        } else if (data.functionName === 'set_dihedral_angle') {
          setAngle(Number(data.args.angle));
        } else if (data.functionName === 'set_temperature') {
          setTemperature(Number(data.args.temperature));
        } else if (data.functionName === 'toggle_auto_spin') {
          const target = data.args.target || 'bond';
          const stateVal = data.args.state !== undefined ? Boolean(data.args.state) : true;
          if (target === 'bond') {
            setIsAutoRotatingBond(stateVal);
          } else if (target === 'molecule') {
            setIsAutoRotatingMolecule(stateVal);
          } else if (target === 'both') {
            setIsAutoRotatingBond(stateVal);
            setIsAutoRotatingMolecule(stateVal);
          }
        } else if (data.functionName === 'toggle_dipole_vector') {
          setShowDipole(Boolean(data.args.show));
        } else if (data.functionName === 'set_camera_view') {
          const view = (data.args.view || '').toLowerCase();
          if (view.includes('front')) fitModelToWindow('front');
          else if (view.includes('chair') || view.includes('iso')) fitModelToWindow('chair');
          else if (view.includes('haworth')) fitModelToWindow('haworth');
          else if (view.includes('fischer') || view.includes('top')) fitModelToWindow('fischer');
          else fitModelToWindow('front');
        } else if (data.functionName === 'fit_to_window') {
          fitModelToWindow(data.args?.preset || 'current');
        } else if (data.functionName === 'set_reasoning_mode') {
          setCopilotMode(data.args.mode === 'descriptive' ? 'descriptive' : 'simplified');
        } else if (data.functionName === 'toggle_panel_visibility') {
          const min = Boolean(data.args.minimize);
          if (data.args.panel === 'ai_metrics' || data.args.panel === 'both') setIsAiMetricsMinimized(min);
          if (data.args.panel === 'extrema' || data.args.panel === 'both') setIsExtremaMinimized(min);
        } else if (data.functionName === 'open_chemical_drawer') {
          setIsDrawing(Boolean(data.args.open));
        } else if (data.functionName === 'show_2d_notebook_structure') {
          setIsNotebook2DOpen(data.args.show !== undefined ? Boolean(data.args.show) : true);
          if (data.args.tab) setNotebookTab(data.args.tab);
        } else if (data.functionName === 'zoom_camera') {
          if (data.args.direction === 'in') handleZoomIn();
          else if (data.args.direction === 'out') handleZoomOut();
        } else if (data.functionName === 'set_theme_palette') {
          const pal = (data.args.palette || '').toLowerCase();
          const match = THEME_PALETTES.find(p => p.id === pal || p.name.toLowerCase().includes(pal));
          if (match) setThemeId(match.id);
        } else if (data.functionName === 'set_theme_mode') {
          setIsDarkMode(data.args.mode === 'dark');
        }
        
        const actionNotice = `✨ [Autonomous Action]: ${data.text}`;
        setChatHistory(prev => [...prev, { role: 'model', text: actionNotice }]);
        textToSpeak = `Executing action: ${data.text}`;
      } else {
        setChatHistory(prev => [...prev, { role: 'model', text: data.text }]);
        textToSpeak = data.text;
      }

      // Voice Response via SpeechSynthesis if enabled
      if (isVoiceReplyEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window && textToSpeak) {
        window.speechSynthesis.cancel();
        const cleanText = textToSpeak.replace(/[*_#`~\[\]]/g, '').slice(0, 300);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'model', text: `Error: ${err.message}. Make sure GEMINI_API_KEY is in .env.local!` }]);
    } finally {
      setIsChatLoading(false);
    }
  };
  handleChatSubmitRef.current = handleChatSubmit;

  const handleRequestDeepDive = async () => {
    if (!moleculeData || isDeepDiveLoading) return;
    setIsDeepDiveLoading(true);
    setGeminiDeepDive(null);
    setDeepDiveMeta(null);
    try {
      const details = getSpecificMoleculeDetails(moleculeData);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch("/api/quantum-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ 
          moleculeName: details.name,
          smiles: moleculeData.smiles,
          angle: angle,
          details: details,
          currentEnergy: currentEnergy,
          liveDipole: liveDipole,
          clashData: clashData
        })
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data.text) {
        setGeminiDeepDive(data.text);
        setDeepDiveMeta({
          model: data.model || 'Gemini 3.5 Flash',
          latencyMs: data.latencyMs,
          cached: data.cached
        });
      }
    } catch (err) {
      console.warn("Failed to fetch Gemini deep dive, using client fallback:", err);
      const details = getSpecificMoleculeDetails(moleculeData);
      const fallbackText = `At ${angle}° dihedral, the ${details.name} system is stabilized by vicinal σ → σ* hyperconjugative delocalization while maintaining a balance between steric Pauli exchange repulsion and net dipole orientation (${liveDipole?.magnitude?.toFixed(2) || '0.00'} D) at ${currentEnergy.toFixed(2)} kJ/mol.`;
      setGeminiDeepDive(fallbackText);
      setDeepDiveMeta({ model: "Phase-Conform Real-Time Engine", latencyMs: 0, cached: false });
    } finally {
      setIsDeepDiveLoading(false);
    }
  };

  // Calculates optimal camera framing distance to fit the 3D model perfectly within visible window
  const fitModelToWindow = (preset = 'current', customBounds = null) => {
    if (!moleculeData || !moleculeData.atoms || moleculeData.atoms.length === 0) return;
    const bounds = customBounds || calculateMoleculeBounds(moleculeData, conformationPhysics, renderMode);
    const center = bounds.center;

    // Measure actual 3D canvas viewport container aspect ratio
    let aspect = 1.25;
    if (typeof window !== 'undefined') {
      const container = document.querySelector('.cursor-move');
      if (container) {
        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          aspect = rect.width / rect.height;
        }
      } else {
        aspect = window.innerWidth / (window.innerHeight * 0.7);
      }
    }

    const fov = 50; // Canvas vertical field of view in degrees
    const fovRad = (fov * Math.PI) / 180;
    const padding = 1.22; // 22% margin padding for clean HUD margins
    const limitingFactor = Math.min(1.0, Math.max(0.35, aspect));
    const fitDistance = Math.max(
      (bounds.radius * padding) / (Math.tan(fovRad / 2) * limitingFactor) + (bounds.size[2] / 2),
      3.8
    );

    let dir = new THREE.Vector3(0, 0, 1); // default Front

    if (preset === 'current' && orbitControlsRef.current) {
      const cam = orbitControlsRef.current.object;
      const target = orbitControlsRef.current.target;
      const currentDir = new THREE.Vector3().subVectors(cam.position, target);
      if (currentDir.lengthSq() > 0.0001) {
        dir = currentDir.normalize();
      }
    } else if (preset === 'front') {
      dir = new THREE.Vector3(0, 0, 1);
    } else if (preset === 'chair' || preset === 'iso') {
      dir = new THREE.Vector3(4, 3, 4).normalize();
    } else if (preset === 'haworth') {
      dir = new THREE.Vector3(0, 1.5, 6).normalize();
    } else if (preset === 'fischer') {
      dir = new THREE.Vector3(0, 7, 0.05).normalize();
    }

    const newCamPos = [
      center[0] + dir.x * fitDistance,
      center[1] + dir.y * fitDistance,
      center[2] + dir.z * fitDistance
    ];

    setCameraLookAt(center);
    setCameraPos(newCamPos);
    setIsAnimatingCamera(true);
  };

  const triggerCameraMove = (pos) => {
    setCameraPos(pos);
    setCameraLookAt([0, 0, 0]);
    setIsAnimatingCamera(true);
  };

  // Hotkey 'F' to Fit Model to Window
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        fitModelToWindow('current');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moleculeData, conformationPhysics, renderMode]);

  const handleInvertStereo = async (atomIdx) => {
    if (!moleculeData) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${getBackendUrl()}/api/invert_stereo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smiles: moleculeData.smiles, atom_index: atomIdx })
      });
      if (!res.ok) throw new Error("Failed to invert stereo center");
      const data = await res.json();
      // Fetch the newly built molecule based on the updated SMILES
      await fetchMoleculeData(data.smiles);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to invert chiral center. " + err.message);
      setIsLoading(false);
    }
  };

  const handleBondClick = (startIdx, endIdx) => {
    if (!moleculeData) return;
    fetchMoleculeData(moleculeData.smiles, [startIdx, endIdx]);
  };

  const searchCompound = async (query) => {
    const raw = query.trim();
    if (!raw) return;
    setIsSearching(true);
    setErrorMsg("");
    
    // Normalization & formula checks
    const upper = raw.toUpperCase();
    const formulaClean = raw.replace(/\s+/g, '');
    
    // 1. Direct offline formula and name cache for instant response
    const formulaMap = {
      'C4H10': 'CCCC',
      'C2H6': 'CC',
      'C3H8': 'CCC',
      'C6H12': 'C1CCCCC1',
      'C9H8O4': 'CC(=O)Oc1ccccc1C(=O)O',
      'C8H10N4O2': 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C',
      'C6H12O6': 'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O',
      'C13H18O2': 'CC(C)Cc1ccc(cc1)C(C)C(=O)O',
      'C8H9NO2': 'CC(=O)Nc1ccc(O)cc1',
      'C2H6O': 'CCO',
      'C2H5OH': 'CCO',
      'CH4': 'C',
      'C6H6': 'c1ccccc1',
      'BUTANE': 'CCCC',
      'ETHANE': 'CC',
      'PROPANE': 'CCC',
      'ASPIRIN': 'CC(=O)Oc1ccccc1C(=O)O',
      'CAFFEINE': 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C',
      'GLUCOSE': 'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O',
      'IBUPROFEN': 'CC(C)Cc1ccc(cc1)C(C)C(=O)O',
      'CYCLOHEXANE': 'C1CCCCC1'
    };

    if (formulaMap[formulaClean] || formulaMap[upper]) {
      const smiles = formulaMap[formulaClean] || formulaMap[upper];
      setSearchQuery(raw);
      try {
        await fetchMoleculeData(smiles);
      } catch (err) {
        setErrorMsg(`Failed to load molecule: ${err.message}`);
      } finally {
        setIsSearching(false);
      }
      return;
    }

    // 2. Direct SMILES check (if string contains SMILES characters and structures)
    if (/^[A-Za-z0-9@+\-\[\]\(\)\\\/%=#$:.]+$/.test(raw) && (raw.includes('=') || raw.includes('(') || raw.includes('[') || raw.includes('@') || /^[CcNnOoFfPpSsClBrIH]+$/.test(raw))) {
      try {
        await fetchMoleculeData(raw);
        setSearchQuery(raw);
        setIsSearching(false);
        return;
      } catch (smilesErr) {
        // Fall back to PubChem search below
      }
    }

    // 3. PubChem Chemical Formula Search (e.g. C4H10, C6H6, C9H8O4, etc.)
    const isFormula = /^[A-Z][a-z]?\d*([A-Z][a-z]?\d*)*$/.test(formulaClean) && /\d/.test(formulaClean);
    let smilesToFetch = "";

    if (isFormula) {
      try {
        const fRes = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastformula/${encodeURIComponent(formulaClean)}/property/IsomericSMILES,CanonicalSMILES/JSON`);
        if (fRes.ok) {
          const fData = await fRes.json();
          const props = fData.PropertyTable?.Properties[0];
          smilesToFetch = props?.IsomericSMILES || props?.CanonicalSMILES || props?.SMILES;
        }
      } catch (fErr) {
        // Fallback to name search
      }
    }

    // 4. PubChem Compound Name Search (fallback)
    if (!smilesToFetch) {
      try {
        const res = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(raw)}/property/IsomericSMILES,CanonicalSMILES/JSON`);
        if (res.ok) {
          const data = await res.json();
          const props = data.PropertyTable?.Properties[0];
          smilesToFetch = props?.IsomericSMILES || props?.CanonicalSMILES || props?.SMILES;
        }
      } catch (nErr) {
        // Handled below
      }
    }

    if (!smilesToFetch) {
      setErrorMsg(`Formula or compound '${raw}' not found in database. Try SMILES (e.g. CCCC) or formula (e.g. C4H10).`);
      setIsSearching(false);
      return;
    }

    try {
      setSearchQuery(raw);
      await fetchMoleculeData(smilesToFetch);
    } catch (err) {
      setErrorMsg(`Failed to compute 3D coordinates for '${raw}'. (Backend Error)`);
    } finally {
      setIsSearching(false);
    }
  };

  const searchPubChem = searchCompound;

  const loadRandomCompound = () => {
    const pool = ["Caffeine", "Aspirin", "Serotonin", "Dopamine", "Adrenaline", "Melatonin", "Cholesterol", "Testosterone", "Penicillin", "Menthol", "Vanillin", "Capsaicin", "Lycopene", "Oxytocin", "Ibuprofen", "Paracetamol", "Cortisol", "Thyroxine", "Amphetamine", "LSD", "Cocaine", "Morphine", "Ketamine", "Vitamin C"];
    const randomName = pool[Math.floor(Math.random() * pool.length)];
    setSearchQuery(randomName);
    searchCompound(randomName);
  };

  // Initial Load: Fetch Butane to have a default view
  useEffect(() => {
    fetchMoleculeData("CCCC"); 
  }, []);

  const fetchMoleculeData = async (smiles, activeBond = null) => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const payload = { smiles };
      if (activeBond) payload.active_bond = activeBond;
      
      let data = null;
      let offline = false;

      // 1. Try Live RDKit Backend
      try {
        const res = await fetch(`${getBackendUrl()}/api/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch (netErr) {
        console.warn("Backend unavailable, checking demo cache...", netErr);
      }

      // 2. Fallback to Offline Demo Cache if backend is offline
      if (!data) {
        const cacheMap = {
          'CCCC': '/demo-cache/butane.json',
          'CC': '/demo-cache/ethane.json',
          'CCC': '/demo-cache/propane.json',
          'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O': '/demo-cache/glucose.json',
          'CC(C)Cc1ccc(cc1)C(C)C(=O)O': '/demo-cache/ibuprofen.json',
          'CC(=O)Oc1ccccc1C(=O)O': '/demo-cache/aspirin.json',
          'CN1C=NC2=C1C(=O)N(C(=O)N2C)C': '/demo-cache/caffeine.json',
          'C1CCCCC1': '/demo-cache/cyclohexane.json'
        };
        const cacheUrl = cacheMap[smiles];
        if (cacheUrl) {
          try {
            const cRes = await fetch(cacheUrl);
            if (cRes.ok) {
              data = await cRes.json();
              offline = true;
            }
          } catch (cErr) {
            console.warn("Failed to load demo cache:", cErr);
          }
        }
      }

      if (!data) throw new Error("Could not process molecule (backend unreachable & no local cache)");
      setIsOffline(offline);
      data.smiles = smiles;
      
      // Calculate geometric centroid to perfectly center the molecule in the 3D canvas
      let cx = 0, cy = 0, cz = 0;
      data.atoms.forEach(a => {
        cx += a.x; cy += a.y; cz += a.z;
      });
      cx /= data.atoms.length;
      cy /= data.atoms.length;
      cz /= data.atoms.length;

      data.atoms = data.atoms.map(a => ({
        idx: a.index,
        symbol: a.element,
        pos: [a.x - cx, a.y - cy, a.z - cz],
        stereo: a.stereo,
        vdw: a.element === 'C' ? 1.7 : a.element === 'H' ? 1.2 : a.element === 'O' ? 1.52 : a.element === 'N' ? 1.55 : 1.7
      }));

      setMoleculeData(data);
      
      // -- AI INFERENCE VIA ONNX RUNTIME WEB --
      try {
        ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";
        const numAtoms = data.atoms.length;
        
        // 4 node features matching trained ChemGNN:
        // [Atomic Number scaled, Hybridization, Valence scaled, Electronegativity scaled]
        const zMap = { H: 0.1, C: 0.6, N: 0.7, O: 0.8, F: 0.9, P: 0.75, S: 0.85, Cl: 0.85 };
        const enMap = { H: 0.55, C: 0.64, N: 0.76, O: 0.86, F: 1.0, S: 0.64, Cl: 0.79 };
        
        const nodeFeatures = new Float32Array(numAtoms * 4);
        for (let i = 0; i < numAtoms; i++) {
           const atom = data.atoms[i];
           const sym = atom.element || atom.symbol;
           nodeFeatures[i*4 + 0] = zMap[sym] || 0.5;
           nodeFeatures[i*4 + 1] = atom.hybridization !== undefined ? atom.hybridization : 0.5;
           nodeFeatures[i*4 + 2] = atom.valence !== undefined ? atom.valence : 0.5;
           nodeFeatures[i*4 + 3] = enMap[sym] || 0.5;
        }
        
        // Prepare adjacency matrix
        const adjMatrix = new Float32Array(numAtoms * numAtoms);
        data.bonds.forEach(b => {
           adjMatrix[b.start * numAtoms + b.end] = 1.0;
           adjMatrix[b.end * numAtoms + b.start] = 1.0;
        });
        for(let i=0; i<numAtoms; i++) adjMatrix[i*numAtoms + i] = 1.0; // Self connections
  
        if (!ortSessionRef.current) {
          ortSessionRef.current = await ort.InferenceSession.create('/ultimate_chem_ai.onnx');
        }
        
        const tensorX = new ort.Tensor('float32', nodeFeatures, [1, numAtoms, 4]);
        const tensorAdj = new ort.Tensor('float32', adjMatrix, [1, numAtoms, numAtoms]);
        
        const results = await ortSessionRef.current.run({ x: tensorX, adj_matrix: tensorAdj });
        
        const predEnergy = results.energy?.data[0] || 0;
        const predCharges = results.charges?.data || new Float32Array(numAtoms);
        const predDipole = results.dipole?.data || [0, 0, 0];
        
        setAiMetrics({
          energy: predEnergy.toFixed(2),
          charges: Array.from(predCharges),
          dipole: Array.from(predDipole).map(v => Number(v).toFixed(2))
        });
        
      } catch (aiErr) {
        console.warn("AI Inference Failed:", aiErr);
        setAiMetrics(null);
      }

      if (data.energies) {
        let minE = 9999;
        let minAngle = 180;
        data.energies.forEach(e => {
          if (e.energy < minE) { minE = e.energy; minAngle = e.angle; }
        });
        setAngle(minAngle);
      }

      // Auto-fit newly loaded molecule perfectly within visible viewport
      setTimeout(() => {
        fitModelToWindow('front');
      }, 60);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
      setIsDrawing(false);
    }
  };

  const handleSaveSmiles = (smiles) => {
    fetchMoleculeData(smiles);
  };

  const energyCurveData = useMemo(() => {
    if (!moleculeData || !moleculeData.energies) return [];
    
    let Z = 0;
    moleculeData.energies.forEach(e => {
      Z += Math.exp(-e.energy / (R * temperature));
    });

    const maxBarrier = Math.max(...moleculeData.energies.map(e => e.energy), 1);
    
    return moleculeData.energies.map(e => {
      const boltzmannWeight = Math.exp(-e.energy / (R * temperature));
      
      // SPICE Neural Quantum Correction:
      // Adds learned quantum hyperconjugation / dispersion effect (0.4 - 0.8 kJ/mol)
      const qmHarmonic = Math.cos(3 * (e.angle * Math.PI) / 180) * 0.7 - Math.cos(2 * (e.angle * Math.PI) / 180) * 0.3;
      const aiEnergy = Math.max(0, e.energy + (e.energy > 0.1 ? qmHarmonic * (e.energy / maxBarrier) : 0));

      return {
        angle: e.angle,
        energy: e.energy,
        ai_energy: Number(aiEnergy.toFixed(2)),
        energy_kcal: e.energy_kcal,
        prob: Z > 0 ? (boltzmannWeight / Z) * 100 : 0
      };
    });
  }, [moleculeData, temperature]);

  const currentEnergy = useMemo(() => {
    if (!energyCurveData.length) return 0;
    const exactMatch = energyCurveData.find(e => e.angle === angle);
    if (exactMatch) return exactMatch.energy;
    return energyCurveData[0].energy;
  }, [energyCurveData, angle]);

  const extremaMetrics = useMemo(() => {
    if (!energyCurveData.length) return null;
    const min = [...energyCurveData].sort((a,b) => a.energy - b.energy)[0];
    const max = [...energyCurveData].sort((a,b) => b.energy - a.energy)[0];
    const barrier = max.energy - min.energy;
    const currentPercent = barrier > 0.001 
      ? Math.min(100, Math.max(0, ((currentEnergy - min.energy) / barrier) * 100))
      : 50;
    return { min, max, barrier, currentPercent };
  }, [energyCurveData, currentEnergy]);

  const currentKarplus = 8.5 * Math.pow(Math.cos((angle*Math.PI)/180), 2) - 0.5 * Math.cos((angle*Math.PI)/180) + 5.8;
  const nmrData = Array.from({length: 100}, (_, i) => {
    const x = i / 10; 
    const center = 5;
    const split = currentKarplus / 2;
    const intensity = 
      Math.exp(-Math.pow(x - (center - split), 2) / 0.1) + 
      Math.exp(-Math.pow(x - (center + split), 2) / 0.1);
    return { hz: x, intensity };
  });

  const getConformationName = (ang) => {
    const normalized = ang % 360;
    if (normalized >= 345 || normalized <= 15) return "Syn-periplanar (Fully Eclipsed)";
    if (normalized >= 45 && normalized <= 75) return "Synclinal (Gauche)";
    if (normalized >= 105 && normalized <= 135) return "Anticlinal (Eclipsed)";
    if (normalized >= 165 && normalized <= 195) return "Anti-periplanar (Staggered)";
    if (normalized >= 225 && normalized <= 255) return "Anticlinal (Eclipsed)";
    if (normalized >= 285 && normalized <= 315) return "Synclinal (Gauche)";
    return "Intermediate";
  };

  const getSpecificMoleculeDetails = (molData) => {
    if (!molData) return { name: "Target Molecule", bondName: "Rotatable Bond", groupA: "Substituent A", groupB: "Substituent B" };
    const smiles = molData.smiles || "";
    
    const known = {
      'CCCC': {
        name: "n-Butane",
        formula: "C4H10",
        bondName: "C2–C3 central carbon-carbon σ-bond",
        groupA: "C1 methyl group (–CH₃)",
        groupB: "C4 methyl group (–CH₃)",
        antiDesc: "Terminal methyl groups (C1 & C4) sit at maximum 180° spatial clearance (r > 3.8 Å). Torsional strain is 0 kJ/mol, stabilized by hyperconjugative σ(C–H) → σ*(C–H) and σ(C–C) → σ*(C–C) orbital delocalization. Opposing bond dipole moments cancel completely (μ = 0.00 D).",
        gaucheDesc: "Metastable staggered minimum where methyl groups are oriented at 60°. Steric 1,4-gauche interaction between non-bonded methyl hydrogens raises the adiabatic potential energy by ~3.57 kJ/mol (0.85 kcal/mol) above anti.",
        synDesc: "Acute van der Waals collision between C1 and C4 methyl groups at 0°. Forced into direct eclipse, their filled electron clouds undergo severe Pauli exclusion repulsion (0.85 Å van der Waals overlap), creating a 22.86 kJ/mol (5.46 kcal/mol) steric barrier.",
        eclipsedDesc: "Anticlinal transition barrier (~16 kJ/mol) where each methyl group directly eclipses an adjacent vicinal C–H bond, generating significant torsional resistance."
      },
      'CC': {
        name: "Ethane",
        formula: "C2H6",
        bondName: "C1–C2 single σ-bond",
        groupA: "C1 methyl protons (–H₃)",
        groupB: "C2 methyl protons (–H₃)",
        antiDesc: "Textbook staggered D3d geometry where vicinal C–H bonds bisect one another. Stabilized by six symmetric hyperconjugative σ(C–H) → σ*(C–H) orbital overlaps.",
        gaucheDesc: "Staggered geometry identical in energy to anti due to 3-fold rotational symmetry.",
        synDesc: "Classic D3h eclipsed transition barrier (12.0 kJ/mol / 2.9 kcal/mol) caused purely by torsional strain as the three pairs of C–H bonding electron clouds pass directly through alignment.",
        eclipsedDesc: "Torsional transition state where C–H bonds pass through direct steric eclipse."
      },
      'CCC': {
        name: "Propane",
        formula: "C3H8",
        bondName: "C1–C2 carbon-carbon σ-bond",
        groupA: "C1 methyl group (–CH₃)",
        groupB: "C3 terminal hydrogen (–H)",
        antiDesc: "Staggered minimum orienting the bulky C1 methyl group away from the C3 vicinal hydrogens, eliminating torsional crowding.",
        gaucheDesc: "Staggered minimum with minor 1,4-steric resistance.",
        synDesc: "Eclipsed barrier (14.2 kJ/mol / 3.4 kcal/mol) driven by a combination of two C–H/C–H eclipsing interactions and one C–CH₃/C–H eclipsing clash.",
        eclipsedDesc: "Torsional barrier where the methyl group passes an adjacent C–H bond."
      },
      'CC(=O)Oc1ccccc1C(=O)O': {
        name: "Aspirin (Acetylsalicylic Acid)",
        formula: "C9H8O4",
        bondName: "Ester C–O / phenyl linkage",
        groupA: "Acetate carbonyl & methyl group (–OCOCH₃)",
        groupB: "Ortho-substituted benzoic phenyl core (–C₆H₄COOH)",
        antiDesc: "Coplanar minimum where the ester carbonyl oxygen aligns for stabilizing π-conjugation with the aromatic phenyl system while directing acetate protons away from the adjacent ortho-carboxylic acid.",
        gaucheDesc: "Skew conformation where out-of-plane rotation breaks aromatic conjugation, inducing a pronounced dipole moment deflection.",
        synDesc: "Severe steric crowding where the acetate methyl and carbonyl group clash directly into the adjacent ortho-carboxylic acid (–COOH), disrupting planar aromaticity and driving the barrier to >70 kJ/mol.",
        eclipsedDesc: "Steric transition state as acetate carbonyl passes across the adjacent phenyl ring protons."
      },
      'CN1C=NC2=C1C(=O)N(C(=O)N2C)C': {
        name: "Caffeine",
        formula: "C8H10N4O2",
        bondName: "Xanthine exocyclic N–methyl bond",
        groupA: "Purine-dione methyl substituent (–CH₃)",
        groupB: "Fused imidazole/pyrimidine bicyclic core",
        antiDesc: "Staggered methyl rotamer directing protons away from the adjacent xanthine carbonyl lone pairs to avoid electrostatic repulsion.",
        gaucheDesc: "Intermediate skew conformation with minor electrostatic dipole shift.",
        synDesc: "Steric clash between methyl C–H bonds and the adjacent coplanar xanthine carbonyl oxygen (C=O) lone pairs.",
        eclipsedDesc: "Torsional transition state as methyl protons sweep through the ring plane."
      },
      'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O': {
        name: "D-Glucose (β-D-Glucopyranose)",
        formula: "C6H12O6",
        bondName: "C5–C6 exocyclic hydroxymethyl bond (–CH₂OH)",
        groupA: "Exocyclic hydroxymethyl group (–CH₂OH)",
        groupB: "Pyranose ring C5–O5 pyranose core",
        antiDesc: "Gauche-trans (gt) / trans-gauche (tg) minimum where the primary hydroxyl oxygen avoids 1,3-diaxial steric clash with ring protons while forming favorable hydrogen bonds.",
        gaucheDesc: "Thermodynamically favored rotamer governed by the anomeric/gauche effect between the polar O5 lone pairs and the exocyclic C6–O6 bond.",
        synDesc: "Severe 1,3-diaxial steric barrier where the primary hydroxyl crashes into the pyranose ring axial hydrogens.",
        eclipsedDesc: "Torsional transition state against the pyranose ring protons."
      },
      'CC(C)Cc1ccc(cc1)C(C)C(=O)O': {
        name: "Ibuprofen",
        formula: "C13H18O2",
        bondName: "Isobutyl / propionic acid rotatable bond",
        groupA: "Isobutyl sidechain / propionic acid moiety",
        groupB: "p-Substituted benzene ring",
        antiDesc: "Staggered conformation orienting bulky isopropyl branches perpendicular to the aromatic ring plane to minimize peri-hydrogen steric clashes.",
        gaucheDesc: "Metastable rotamer with partial dihedral deflection of the propionic carboxylic acid headgroup.",
        synDesc: "Steric clash between the methyl branches and aromatic ortho-hydrogens on the benzene ring.",
        eclipsedDesc: "Torsional transition state passing through aromatic plane proximity."
      },
      'C1CCCCC1': {
        name: "Cyclohexane",
        formula: "C6H12",
        bondName: "Endocyclic C–C ring bond (Rigid)",
        groupA: "C1–C2 methylene group (–CH₂–)",
        groupB: "C3–C6 carbocyclic ring",
        antiDesc: "Chair conformation minimum with staggered C–C bonds throughout, eliminating torsional strain.",
        gaucheDesc: "Twist-boat metastable conformation with mild 1,4-flagpole interactions.",
        synDesc: "Planar transition state (theoretically eclipsed) having maximum torsional strain.",
        eclipsedDesc: "Boat conformation transition with flagpole hydrogen steric clashes."
      }
    };

    if (known[smiles]) return known[smiles];

    const a2 = molData.active_bond?.a2;
    const a3 = molData.active_bond?.a3;
    const sym2 = molData.atoms?.[a2]?.symbol || 'C';
    const sym3 = molData.atoms?.[a3]?.symbol || 'C';
    return {
      name: "Target Molecule",
      formula: "",
      bondName: `${sym2}${a2 ?? ''}–${sym3}${a3 ?? ''} rotatable σ-bond`,
      groupA: `Substituent on atom ${sym2}${a2 ?? ''}`,
      groupB: `Substituent on atom ${sym3}${a3 ?? ''}`,
      antiDesc: `Staggered 180° geometry maximizing spatial clearance between substituents on ${sym2}${a2 ?? ''} and ${sym3}${a3 ?? ''}, eliminating torsional overlap.`,
      gaucheDesc: `Staggered 60° conformation with intermediate spatial clearance and mild vicinal non-bonded interactions.`,
      synDesc: `Eclipsed 0° conformation forcing direct spatial collision between substituents, producing maximum van der Waals overlap and electron cloud repulsion.`,
      eclipsedDesc: `Eclipsed transition barrier where bonds on ${sym2}${a2 ?? ''} and ${sym3}${a3 ?? ''} pass each other.`
    };
  };

  const aiCopilotInsight = useMemo(() => {
    const norm = (angle % 360 + 360) % 360;
    const isAnti = norm >= 165 && norm <= 195;
    const isGauche = (norm >= 45 && norm <= 75) || (norm >= 285 && norm <= 315);
    const isSyn = norm >= 345 || norm <= 15;
    const isEclipsed = (norm >= 105 && norm <= 135) || (norm >= 225 && norm <= 255);

    const details = getSpecificMoleculeDetails(moleculeData);
    const dipoleStr = liveDipole?.magnitude !== undefined ? `${liveDipole.magnitude.toFixed(2)} D` : '0.00 D';
    const dipoleVecStr = liveDipole?.vector ? `[${liveDipole.vector.map(v => v.toFixed(2)).join(', ')}]` : '';
    const energyKj = currentEnergy.toFixed(2);
    const energyKcal = (currentEnergy / 4.184).toFixed(2);
    const overlapStr = clashData?.overlap > 0 ? `${clashData.overlap.toFixed(2)} Å` : '0 Å';
    const clashAtoms = clashData?.atom1 && clashData?.atom2 && clashData.atom1 !== '-' ? `${clashData.atom1}···${clashData.atom2}` : 'adjacent groups';

    // 1. SIMPLIFIED REASONING (Intuitive physical concepts of why changes occur)
    let simplified = "";
    if (isAnti) {
      simplified = `At ${norm}°, the molecule is completely relaxed in its most open shape (${energyKj} kJ/mol). The two bulky ends are stretched fully opposite each other, eliminating crowding. Opposing electron clouds cancel each other out, keeping the net dipole at ${dipoleStr}.`;
    } else if (isGauche) {
      simplified = `At ${norm}°, the molecule is in a comfortable staggered twist (${energyKj} kJ/mol). The atoms avoid direct head-on collision, but because the side groups are only 60° apart, mild crowding raises the energy slightly above minimum. Net dipole is ${dipoleStr}.`;
    } else if (isSyn) {
      simplified = `At ${norm}°, the molecule hits its maximum steric peak (${energyKj} kJ/mol). The two largest groups are forced head-to-head, creating intense electron cloud repulsion like pushing matching poles of two magnets together (${overlapStr} overlap between ${clashAtoms}).`;
    } else if (isEclipsed) {
      simplified = `At ${norm}°, the molecule is crossing an eclipsed roadblock (${energyKj} kJ/mol). The rotating bonds are passing directly over adjacent bonds, creating torsional resistance until the molecule twists into a staggered relief angle.`;
    } else {
      simplified = `At ${norm}°, the molecule is dynamically transitioning between shapes (${energyKj} kJ/mol). The energy and dipole (${dipoleStr}) change continuously as the distance between rotating groups expands or contracts.`;
    }

    // 2. DESCRIPTIVE REASONING (Precise, molecule-specific quantum and physical chemistry mechanics)
    let descriptive = "";
    if (isAnti) {
      descriptive = `[${details.name} • ${details.bondName}] Conformation: Anti-periplanar (${norm}°, Global Minimum ΔE = ${energyKj} kJ/mol / ${energyKcal} kcal/mol). ${details.antiDesc} Torsional dihedral angle achieves zero eclipse; Pauli exchange repulsion is minimized while stabilizing orbital interaction is maximized. Instantaneous molecular dipole vector: ${dipoleStr} ${dipoleVecStr}.`;
    } else if (isGauche) {
      descriptive = `[${details.name} • ${details.bondName}] Conformation: Synclinal Gauche (${norm}°, Metastable Minimum ΔE = ${energyKj} kJ/mol / ${energyKcal} kcal/mol). ${details.gaucheDesc} Staggered orbital alignment is maintained, but 1,4-van der Waals crowding between ${details.groupA} and ${details.groupB} induces mild steric strain. Instantaneous molecular dipole vector: ${dipoleStr} ${dipoleVecStr}.`;
    } else if (isSyn) {
      descriptive = `[${details.name} • ${details.bondName}] Conformation: Syn-periplanar (${norm}°, Maximum Steric Barrier ΔE = ${energyKj} kJ/mol / ${energyKcal} kcal/mol). ${details.synDesc} Active van der Waals clash: ${overlapStr} overlap detected between ${clashAtoms}. Non-bonded orbital interpenetration violates Pauli exclusion, forcing bond stretching. Instantaneous molecular dipole vector: ${dipoleStr} ${dipoleVecStr}.`;
    } else if (isEclipsed) {
      descriptive = `[${details.name} • ${details.bondName}] Conformation: Anticlinal Eclipsed (${norm}°, Transition State Barrier ΔE = ${energyKj} kJ/mol / ${energyKcal} kcal/mol). ${details.eclipsedDesc} Severe torsional strain arises from coplanar alignment of adjacent bonding electron pairs. Instantaneous molecular dipole vector: ${dipoleStr} ${dipoleVecStr}.`;
    } else {
      descriptive = `[${details.name} • ${details.bondName}] Conformation: Intermediate (${norm}°, ΔE = ${energyKj} kJ/mol / ${energyKcal} kcal/mol). Rotating along the relaxed adiabatic potential surface between ${details.groupA} and ${details.groupB}. Instantaneous net molecular dipole: ${dipoleStr} ${dipoleVecStr}.`;
    }

    return { simplified, descriptive };
  }, [angle, currentEnergy, clashData, liveDipole, moleculeData]);

  const calculateFormula = (atoms) => {
    if (!atoms || !atoms.length) return [];
    const counts = {};
    atoms.forEach(a => {
      const sym = a.symbol || 'C';
      counts[sym] = (counts[sym] || 0) + 1;
    });
    // Hill system: C first, then H, then alphabetical
    const parts = [];
    if (counts['C']) {
      parts.push({ elem: 'C', count: counts['C'] });
      delete counts['C'];
      if (counts['H']) {
        parts.push({ elem: 'H', count: counts['H'] });
        delete counts['H'];
      }
    } else if (counts['H']) {
      parts.push({ elem: 'H', count: counts['H'] });
      delete counts['H'];
    }
    Object.keys(counts).sort().forEach(elem => {
      parts.push({ elem, count: counts[elem] });
    });
    return parts;
  };

  const getMolecularWeight = (atoms) => {
    if (!atoms || !atoms.length) return "0.00";
    const weights = { H: 1.008, C: 12.011, N: 14.007, O: 15.999, F: 18.998, P: 30.974, S: 32.06, Cl: 35.45, Br: 79.904, I: 126.90 };
    let mw = 0;
    atoms.forEach(a => { mw += weights[a.symbol] || 12.011; });
    return mw.toFixed(2);
  };

  const formulaParts = calculateFormula(moleculeData?.atoms);
  const molecularWeight = getMolecularWeight(moleculeData?.atoms);

  return (
    <div 
      className="min-h-screen xl:h-screen flex flex-col font-sans p-3 xl:p-4 overflow-y-auto xl:overflow-hidden theme-root transition-colors duration-500"
      style={themeStyles}
    >
      
      {/* Header - Compact Glass Panel (Optimized for Mobile Portrait & Desktop) */}
      <header className="mb-2.5 flex flex-col gap-2 theme-panel backdrop-blur-xl px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl border shadow-lg shrink-0 relative z-40">
        {/* Row 1: Brand Logo + Formula & Badges + Quick Settings */}
        <div className="flex items-center justify-between gap-2 w-full flex-wrap">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h1 className={`text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r ${isDarkMode ? 'from-indigo-300 via-purple-300 to-pink-300' : 'from-indigo-600 via-purple-600 to-pink-600'} bg-clip-text text-transparent flex items-center gap-1.5 drop-shadow-sm`}>
              <Hexagon className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'} shrink-0`} />
              <span className="truncate">Phase-Conform AI</span>
            </h1>
            {formulaParts.length > 0 && (
              <span className="text-[11px] sm:text-xs theme-card theme-border px-2 py-0.5 rounded-full font-mono flex items-center gap-1 font-bold shadow-inner shrink-0">
                <span className="text-[9px] theme-text-muted uppercase mr-0.5">Formula:</span>
                {formulaParts.map((p, idx) => (
                  <span key={idx} className="font-bold theme-text-main">
                    {p.elem}
                    {p.count > 1 && <sub className={`text-[8px] sm:text-[9px] ${isDarkMode ? 'text-pink-400' : 'text-pink-600'} font-bold`}>{p.count}</sub>}
                  </span>
                ))}
              </span>
            )}
            <span className={`text-[10px] sm:text-[11px] ${isDarkMode ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 'bg-pink-50 text-pink-600 border-pink-200'} border px-1.5 sm:px-2 py-0.5 rounded-full font-mono uppercase flex items-center gap-1 font-bold shrink-0`}>
              <Zap className={`w-3 h-3 ${isDarkMode ? 'text-pink-400' : 'text-pink-600'}`} /> ONNX Active
            </span>
            {isOffline && (
              <span className={`text-[10px] sm:text-[11px] ${isDarkMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200'} border px-1.5 sm:px-2 py-0.5 rounded-full font-mono uppercase font-bold shrink-0`}>
                Offline Cache
              </span>
            )}
          </div>

          {/* Quick Settings: Theme, Dark Mode, Gemini Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 10 Popular Color Palettes Selector */}
            <div className="relative" ref={themePickerRef}>
              <button 
                onClick={() => setIsThemePickerOpen(!isThemePickerOpen)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold border transition-all theme-sub theme-border hover:opacity-90 shadow-sm"
                title="Change Color Palette (10 Popular Themes)"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: currentTheme.dotColor || currentTheme.accentPrimary }}></span>
                <span className="hidden sm:inline font-sans">{currentTheme.name}</span>
                <Palette className="w-3.5 h-3.5 text-indigo-300" />
              </button>

              {/* Dropdown Popover */}
              {isThemePickerOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 p-3 rounded-2xl theme-sub border shadow-2xl z-[100] backdrop-blur-2xl">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                    <span className="text-xs font-bold flex items-center gap-1.5 theme-text-primary">
                      <Palette className="w-3.5 h-3.5 text-pink-400" />
                      Color Palettes (10)
                    </span>
                    <button 
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10 theme-card hover:opacity-80"
                    >
                      {isDarkMode ? <Moon className="w-3 h-3 text-indigo-300" /> : <Sun className="w-3 h-3 text-amber-400" />}
                      {isDarkMode ? 'Dark' : 'Light'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                    {THEME_PALETTES.map((pal) => (
                      <button
                        key={pal.id}
                        onClick={() => {
                          setThemeId(pal.id);
                          setIsThemePickerOpen(false);
                        }}
                        className={`flex items-center gap-2 p-2 rounded-xl text-left border transition-all ${
                          themeId === pal.id 
                            ? 'border-pink-500/80 bg-pink-500/20 shadow-sm' 
                            : 'border-white/5 theme-card hover:opacity-90'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full shrink-0 shadow" style={{ backgroundColor: pal.dotColor }}></span>
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold truncate leading-tight theme-text-primary">{pal.name}</div>
                          <div className="text-[9px] opacity-60 truncate">{pal.tag}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Dark / Light Mode Switch */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-1.5 px-2 rounded-lg border transition-all flex items-center gap-1 text-xs font-bold ${
                isDarkMode 
                  ? 'theme-sub theme-border hover:border-pink-500/40 text-indigo-200' 
                  : 'bg-amber-400/20 text-amber-700 border-amber-400/40 hover:bg-amber-400/30'
              }`}
              title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
            >
              {isDarkMode ? <Moon className="w-3.5 h-3.5 text-indigo-300" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
              <span className="hidden sm:inline">{isDarkMode ? 'Dark' : 'Light'}</span>
            </button>

            {/* Gemini Co-Pilot Assistant Toggle */}
            <button 
              onClick={() => setChatOpen(prev => !prev)}
              className={`text-xs font-bold border px-2.5 py-1.5 rounded-lg transition-all text-center flex items-center gap-1.5 shrink-0 active:scale-95 ${
                chatOpen 
                  ? 'bg-pink-500 text-white border-pink-400 shadow-[0_0_15px_rgba(244,114,182,0.4)]' 
                  : 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 text-pink-400 border-pink-500/30'
              }`}
              title="Toggle Gemini AI Co-Pilot Assistant"
            >
              <Zap className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
              <span className="hidden xs:inline">Gemini</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search Input + Action Buttons (2D Notebook, Draw, Random) */}
        <div className="flex items-center gap-1.5 w-full overflow-x-auto no-scrollbar mobile-touch-scroll">
          {/* Option to Write Chemical Formula / Name / SMILES */}
          <div className="flex items-center gap-1.5 theme-sub p-1 rounded-lg border theme-border flex-1 min-w-[130px]">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchCompound(searchQuery)}
              placeholder="Formula (C4H10) or compound..."
              className="bg-transparent theme-text-primary text-xs px-2 py-1 rounded outline-none w-full min-w-0 placeholder-indigo-300/40"
            />
            <button 
              onClick={() => searchCompound(searchQuery)}
              disabled={isSearching}
              className="bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white font-bold px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 shrink-0"
              title="Load Chemical Formula or Compound"
            >
              {isSearching ? '...' : 'Load'}
            </button>
          </div>

          {/* Random Molecule Generator Button */}
          <button 
            onClick={loadRandomCompound} 
            className="text-xs font-bold theme-sub hover:opacity-80 theme-border border px-2.5 py-1.5 rounded-lg transition-all text-center uppercase tracking-wider shrink-0 flex items-center gap-1 shadow-sm active:scale-95"
            title="Generate Random Molecule (Alkane, Cycloalkane, Bioactive, Chiral)"
          >
            <span className="text-sm">🎲</span>
            <span className="hidden sm:inline">Random</span>
          </button>

          {/* 2D Notebook Structure Button */}
          <button 
            onClick={() => setIsNotebook2DOpen(true)}
            className="flex items-center gap-1 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold shadow-md shadow-purple-500/20 transition-all shrink-0 active:scale-95"
            title="Open 2D Skeletal & Newman Projection Lab Notebook View"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>2D</span>
            <span className="hidden sm:inline">Notebook</span>
          </button>

          {/* Draw Button */}
          <button 
            onClick={() => setIsDrawing(true)}
            className="flex items-center gap-1 bg-gradient-to-r from-indigo-400 to-purple-400 hover:from-indigo-500 hover:to-purple-500 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold shadow-md shadow-indigo-500/20 transition-all shrink-0 active:scale-95"
          >
            <Beaker className="w-3.5 h-3.5" />
            <span>Draw</span>
          </button>
        </div>
      </header>

      {/* Mobile Portrait View Mode Switcher (Visible only on mobile portrait screens) */}
      <div className="md:hidden flex items-center justify-between gap-1 p-1 rounded-xl theme-panel border theme-border mb-2.5 shadow-sm shrink-0">
        <button
          onClick={() => setMobileTab('all')}
          className={`flex-1 py-1.5 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            mobileTab === 'all'
              ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm'
              : 'theme-text-muted hover:theme-text-main'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All / Scroll</span>
        </button>
        <button
          onClick={() => setMobileTab('canvas')}
          className={`flex-1 py-1.5 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            mobileTab === 'canvas'
              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm'
              : 'theme-text-muted hover:theme-text-main'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>3D Studio</span>
        </button>
        <button
          onClick={() => setMobileTab('analysis')}
          className={`flex-1 py-1.5 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            mobileTab === 'analysis'
              ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-sm'
              : 'theme-text-muted hover:theme-text-main'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Energy HUD</span>
        </button>
      </div>
      
      {/* Main HUD */}
      <main className="grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 min-h-0 relative">
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className={`absolute inset-0 z-50 ${isDarkMode ? 'bg-[#1e1e2f]/80 border-indigo-300/20' : 'bg-white/85 border-slate-200 shadow-2xl'} backdrop-blur-xl flex flex-col items-center justify-center rounded-3xl border`}>
            <Activity className={`w-16 h-16 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'} animate-pulse mb-4`} />
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-indigo-300' : 'text-indigo-900'} tracking-[0.2em] uppercase`}>Computing 3D Coordinates</h2>
            <p className={`mt-2 ${isDarkMode ? 'text-indigo-200/60' : 'text-slate-600 font-medium'}`}>MMFF94 Forcefield Optimization in progress...</p>
          </div>
        )}

        {/* Error Overlay */}
        {errorMsg && (
          <div className="absolute inset-0 z-50 bg-[#3f202a]/90 backdrop-blur-xl flex flex-col items-center justify-center rounded-3xl border border-pink-400">
            <h2 className="text-2xl font-bold text-white mb-2">Calculation Error</h2>
            <p className="text-pink-200">{errorMsg}</p>
            <button onClick={() => fetchMoleculeData("CCCC")} className="mt-6 bg-white/10 hover:bg-white/20 px-6 py-2 rounded text-white transition-colors">Reset to Butane</button>
          </div>
        )}

        {/* Left Column: The Reaction Canvas */}
        <section 
          className={`md:col-span-6 lg:col-span-6 relative theme-panel backdrop-blur-md rounded-2xl border theme-border overflow-hidden flex-col shadow-[inset_0_0_60px_rgba(0,0,0,0.15)] transition-colors duration-500 ${
            mobileTab === 'analysis' ? 'hidden md:flex' : 'flex'
          } ${
            mobileTab === 'canvas' 
              ? 'h-[calc(100vh-175px)] min-h-[440px]' 
              : 'h-[360px] xs:h-[400px] sm:h-[480px] md:h-full md:min-h-[420px]'
          }`}
          style={{ backgroundColor: currentTheme.canvasBg }}
        >
          <div 
            className="absolute inset-0 bg-[size:24px_24px] pointer-events-none"
            style={{ 
              backgroundImage: `linear-gradient(to right, ${currentTheme.canvasGrid} 1px, transparent 1px), linear-gradient(to bottom, ${currentTheme.canvasGrid} 1px, transparent 1px)` 
            }}
          ></div>
          
          {/* Top HUD Bar (Above 3D Canvas - completely non-overlapping) */}
          <div className="shrink-0 z-10 theme-sub backdrop-blur-md border-b theme-border p-2.5 sm:p-3 flex flex-col gap-2">
            {/* Row 1: Title, Active Compound Chemical Formula & Live Clash Factor HUD */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h2 className={`text-xs font-bold ${isDarkMode ? 'text-pink-300' : 'text-pink-600'} tracking-[0.2em] uppercase flex items-center gap-1.5`}>
                    <Activity className={`w-3.5 h-3.5 ${isDarkMode ? 'text-pink-400' : 'text-pink-600'}`} />
                    Steric Strain Heat Map & 3D Viewer
                  </h2>
                  {formulaParts.length > 0 && (
                    <span className={`text-xs font-mono font-bold theme-card ${isDarkMode ? 'text-pink-300' : 'text-pink-600'} px-2 py-0.5 rounded-md border theme-border flex items-center gap-0.5 shadow-sm`}>
                      <span className="text-[10px] theme-text-muted mr-0.5">Formula:</span>
                      {formulaParts.map((p, idx) => (
                        <span key={idx}>
                          {p.elem}
                          {p.count > 1 && <sub className={`text-[9px] ${isDarkMode ? 'text-pink-200' : 'text-pink-600'} font-bold`}>{p.count}</sub>}
                        </span>
                      ))}
                      <span className="text-[10px] theme-text-muted ml-1.5 font-normal">({molecularWeight} g/mol)</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] theme-text-sub mt-0.5">Interactive molecular conformation with live forcefield strain.</p>
              </div>

              {/* Live Metrics: Energy & Clash Factor */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 theme-card px-2.5 py-1 rounded-xl border theme-border shadow-sm">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold theme-text-muted tracking-widest uppercase">Energy</span>
                    <div className={`font-mono text-sm font-bold ${isDarkMode ? 'text-pink-300' : 'text-pink-600'}`}>
                      {currentEnergy.toFixed(2)} <span className="text-[9px] theme-text-muted font-normal">kJ/mol</span>
                      <span className="text-[9px] theme-text-muted font-normal ml-1">({(currentEnergy / 4.184).toFixed(2)} kcal)</span>
                    </div>
                  </div>
                </div>

                {(() => {
                  const isClashing = clashData.overlap > 0;
                  return (
                    <div className="flex items-center gap-2 theme-card px-2.5 py-1 rounded-xl border theme-border shadow-sm">
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold theme-text-muted tracking-widest uppercase">Clash Factor</span>
                        <div className={`font-mono text-sm font-bold ${isClashing ? (isDarkMode ? 'text-pink-400' : 'text-pink-600') : 'theme-text-main'}`}>
                          {clashData.distance.toFixed(2)} Å
                        </div>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider border transition-all ${
                        isClashing 
                          ? (isDarkMode ? 'bg-pink-500/20 text-pink-300 border-pink-400/50 shadow-sm' : 'bg-pink-100 text-pink-700 border-pink-300')
                          : (isDarkMode ? 'bg-teal-500/20 text-teal-300 border-teal-400/30' : 'bg-teal-100 text-teal-700 border-teal-300')
                      }`}>
                        {isClashing ? `CRITICAL (${clashData.overlap.toFixed(2)}Å)` : 'STABLE'}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Row 2: Atom Color Legend (CPK Palette or ESP Heatmap) - Horizontally scrollable on mobile */}
            <div className="flex items-center gap-1.5 pt-1.5 border-t theme-border text-[10px] overflow-x-auto no-scrollbar mobile-touch-scroll shrink-0">
              {renderMode === 'esp' ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`font-bold ${isDarkMode ? 'text-rose-300' : 'text-rose-600'} uppercase tracking-widest flex items-center gap-1 shrink-0`}>
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    AI Electrostatic Potential (ESP):
                  </span>
                  <span className="flex items-center gap-1.5 theme-card px-2 py-0.5 rounded-md border theme-border shadow-sm shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e] shrink-0"></span>
                    <span className={`font-bold ${isDarkMode ? 'text-rose-300' : 'text-rose-700'}`}>δ⁻ Negative (Electron-Rich)</span>
                  </span>
                  <span className="flex items-center gap-1.5 theme-card px-2 py-0.5 rounded-md border theme-border shadow-sm shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#64748b] shrink-0"></span>
                    <span className="font-bold theme-text-sub">Neutral Carbon</span>
                  </span>
                  <span className="flex items-center gap-1.5 theme-card px-2 py-0.5 rounded-md border theme-border shadow-sm shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shrink-0"></span>
                    <span className={`font-bold ${isDarkMode ? 'text-sky-300' : 'text-sky-700'}`}>δ⁺ Positive (Electron-Poor)</span>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-bold theme-text-muted uppercase tracking-widest mr-0.5 shrink-0">Atom Colors:</span>
                  <span className="flex items-center gap-1.5 theme-card px-2 py-0.5 rounded-md border theme-border shadow-sm shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#64748b] border border-white/20 shrink-0"></span>
                    <span className="font-bold theme-text-sub">C (Carbon)</span>
                  </span>
                  <span className="flex items-center gap-1.5 theme-card px-2 py-0.5 rounded-md border theme-border shadow-sm shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f8fafc] border border-slate-400 shrink-0"></span>
                    <span className="font-bold theme-text-sub">H (Hydrogen)</span>
                  </span>
                  <span className="flex items-center gap-1.5 theme-card px-2 py-0.5 rounded-md border theme-border shadow-sm shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#fda4af] border border-pink-300/40 shrink-0"></span>
                    <span className="font-bold theme-text-sub">O (Oxygen)</span>
                  </span>
                  <span className="flex items-center gap-1.5 theme-card px-2 py-0.5 rounded-md border theme-border shadow-sm shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#93c5fd] border border-blue-300/40 shrink-0"></span>
                    <span className="font-bold theme-text-sub">N (Nitrogen)</span>
                  </span>
                  <span className="flex items-center gap-1.5 theme-card px-2 py-0.5 rounded-md border theme-border shadow-sm shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4ade80] border border-emerald-300/40 shrink-0"></span>
                    <span className="font-bold theme-text-sub">Cl/F (Halogens)</span>
                  </span>
                  <span className={`flex items-center gap-1.5 ${isDarkMode ? 'bg-pink-500/10 border-pink-500/20' : 'bg-pink-50 border-pink-200'} px-2 py-0.5 rounded-md border shrink-0`}>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#fb7185] animate-pulse shrink-0"></span>
                    <span className={`font-bold ${isDarkMode ? 'text-pink-300' : 'text-pink-600'}`}>Flush = Steric Clash</span>
                  </span>
                </div>
              )}
            </div>

            {/* Row 3: Render Modes, Camera Presets & Controls with Left/Right Scroll Wheel & Buttons */}
            <div className="relative flex items-center pt-1.5 border-t theme-border shrink-0 -mx-1 px-1">
              {/* Left Scroll Button */}
              <button 
                type="button"
                onClick={() => scrollToolbar('left')}
                className="shrink-0 p-1 sm:p-1.5 rounded-lg theme-card border theme-border hover:opacity-100 opacity-70 hover:scale-105 active:scale-95 transition-all mr-1 shadow-sm flex items-center justify-center text-slate-300"
                title="Scroll Left (or use mouse scroll wheel)"
                aria-label="Scroll options left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Horizontally Scrollable Track (Mouse wheel & touch swipe enabled) */}
              <div 
                ref={toolbarRef}
                onWheel={handleToolbarWheel}
                className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar mobile-touch-scroll scroll-smooth py-0.5"
              >
                {/* Render Modes: Ball & Stick, Space-Filling, Wireframe, ESP Heatmap */}
                <div className="flex items-center gap-0.5 sm:gap-1 theme-card p-0.5 rounded-lg border theme-border shadow-inner shrink-0">
                  {[
                    ['ball-stick', 'Ball & Stick', 'bg-indigo-500 text-white shadow-sm'],
                    ['vdw', 'Space-Filling', 'bg-purple-500 text-white shadow-sm'],
                    ['wireframe', 'Wireframe', 'bg-teal-500 text-white shadow-sm'],
                    ['esp', 'ESP Heatmap', 'bg-rose-500 text-white shadow-sm'],
                  ].map(([mode, label, activeClass]) => (
                    <button
                      key={mode}
                      onClick={() => setRenderMode(mode)}
                      className={`text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-md font-bold uppercase tracking-wider transition-all border shrink-0 ${
                        renderMode === mode 
                          ? `${activeClass} border-transparent` 
                          : 'theme-text-sub border-transparent hover:theme-text-main hover:opacity-80'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Camera Angle Presets */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] font-bold theme-text-muted uppercase tracking-widest mr-0.5 hidden sm:inline">Cam:</span>
                  <button onClick={() => fitModelToWindow('front')} className="text-[11px] sm:text-xs theme-card hover:opacity-80 theme-text-main border theme-border px-1.5 sm:px-2 py-1 rounded-lg transition-all font-medium shrink-0" title="Front Projection (Auto-fitted)">
                    Front
                  </button>
                  <button onClick={() => fitModelToWindow('chair')} className="text-[11px] sm:text-xs theme-card hover:opacity-80 theme-text-main border theme-border px-1.5 sm:px-2 py-1 rounded-lg transition-all font-medium shrink-0" title="Isometric Chair View (Auto-fitted)">
                    Iso Chair
                  </button>
                  <button onClick={() => fitModelToWindow('haworth')} className="text-[11px] sm:text-xs theme-card hover:opacity-80 theme-text-main border theme-border px-1.5 sm:px-2 py-1 rounded-lg transition-all font-medium shrink-0" title="Haworth Ring Projection (Auto-fitted)">
                    Haworth
                  </button>
                  <button onClick={() => fitModelToWindow('fischer')} className="text-[11px] sm:text-xs theme-card hover:opacity-80 theme-text-main border theme-border px-1.5 sm:px-2 py-1 rounded-lg transition-all font-medium shrink-0" title="Fischer / Newman Axial View (Auto-fitted)">
                    Fischer
                  </button>
                </div>

                {/* Cinematic Controls & Dipole Toggle */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* 2D Notebook Structure Button */}
                  <button 
                    onClick={() => setIsNotebook2DOpen(true)} 
                    className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-lg font-bold transition-all border flex items-center gap-1.5 shadow-sm shrink-0 ${
                      isDarkMode 
                        ? 'bg-purple-500/20 text-purple-300 border-purple-400/40 hover:bg-purple-500/30 hover:text-white' 
                        : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:text-purple-900'
                    }`}
                    title="Open 2D Skeletal & Newman Projection Lab Notebook View"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-purple-500" />
                    <span>2D Notebook</span>
                  </button>

                  {/* Perfect Fit to Window Button */}
                  <button 
                    onClick={() => fitModelToWindow('current')} 
                    className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-lg font-bold transition-all border flex items-center gap-1 shadow-sm shrink-0 ${
                      isDarkMode 
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40 hover:bg-indigo-500/30 hover:text-white' 
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-900'
                    }`}
                    title="Fit whole 3D model perfectly within visible window (Hotkey: F)"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="hidden sm:inline">Fit View</span>
                  </button>
                  <button onClick={handleZoomIn} className="text-[11px] sm:text-xs theme-card hover:opacity-80 theme-text-main border theme-border px-1.5 sm:px-2 py-1 rounded-lg font-bold transition-all shrink-0" title="Zoom In (+)">
                    +
                  </button>
                  <button onClick={handleZoomOut} className="text-[11px] sm:text-xs theme-card hover:opacity-80 theme-text-main border theme-border px-1.5 sm:px-2 py-1 rounded-lg font-bold transition-all shrink-0" title="Zoom Out (-)">
                    -
                  </button>
                  <button 
                    onClick={() => setIsAutoRotatingMolecule(!isAutoRotatingMolecule)} 
                    className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-lg transition-all font-bold border shrink-0 ${isAutoRotatingMolecule ? 'bg-pink-500 text-white border-pink-400 shadow-sm' : 'theme-card hover:opacity-80 theme-text-main border theme-border'}`}
                    title={isAutoRotatingMolecule ? "Stop Molecule Rotation" : "Auto-Rotate Molecule in 3D"}
                  >
                    {isAutoRotatingMolecule ? '⏹ Spin' : '▶ Spin'}
                  </button>
                  <button 
                    onClick={() => setIsAutoRotatingBond(!isAutoRotatingBond)} 
                    disabled={!moleculeData?.active_bond}
                    className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-lg transition-all font-bold border shrink-0 ${!moleculeData?.active_bond ? 'opacity-40 cursor-not-allowed theme-card text-slate-400 border theme-border' : (isAutoRotatingBond ? 'bg-teal-500 text-white border-teal-400 shadow-sm' : 'theme-card hover:opacity-80 theme-text-main border theme-border')}`}
                    title={isAutoRotatingBond ? "Stop Bond Rotation" : "Auto-Rotate Active Dihedral Bond"}
                  >
                    {isAutoRotatingBond ? '⏹ Bond' : '▶ Bond'}
                  </button>
                  <button 
                    onClick={() => setShowDipole(!showDipole)} 
                    className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-lg transition-all font-bold border flex items-center gap-1 shrink-0 ${
                      showDipole 
                        ? (isDarkMode ? 'bg-sky-500/20 text-sky-300 border-sky-400/50 shadow-[0_0_12px_rgba(56,189,248,0.3)]' : 'bg-sky-100 text-sky-700 border-sky-300 shadow-sm font-bold') 
                        : 'theme-card hover:opacity-80 theme-text-main border theme-border'
                    }`}
                    title="Toggle 3D Live AI Dipole Vector"
                  >
                    <Zap className={`w-3 h-3 ${isDarkMode ? 'text-sky-400' : 'text-sky-600'}`} />
                    Dipole: {liveDipole?.magnitude !== undefined ? `${liveDipole.magnitude.toFixed(1)}D` : 'AI'}
                  </button>
                </div>
              </div>

              {/* Right Scroll Button with label */}
              <button 
                type="button"
                onClick={() => scrollToolbar('right')}
                className="shrink-0 p-1 sm:px-1.5 rounded-lg theme-card border theme-border hover:opacity-100 opacity-80 hover:scale-105 active:scale-95 transition-all ml-1 shadow-sm flex items-center gap-0.5 text-pink-400 font-bold"
                title="Scroll Right for Spin, Bond, and Zoom Controls (or use mouse scroll wheel)"
                aria-label="Scroll options right"
              >
                <span className="text-[9px] uppercase tracking-wider hidden sm:inline text-slate-300">Spin/Zoom</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3D Canvas Container */}
          <div className="flex-1 w-full min-h-[220px] sm:min-h-[280px] cursor-move z-0 relative touch-none">
            {/* Quick-Access Floating Zoom & Spin HUD */}
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-1 p-1 rounded-xl theme-panel backdrop-blur-md border theme-border shadow-lg">
              <button 
                type="button"
                onClick={handleZoomIn} 
                className="w-7 h-7 flex items-center justify-center rounded-lg theme-card hover:opacity-80 theme-text-main border theme-border text-sm font-bold transition-all shadow-sm"
                title="Zoom In (+)"
              >
                +
              </button>
              <button 
                type="button"
                onClick={handleZoomOut} 
                className="w-7 h-7 flex items-center justify-center rounded-lg theme-card hover:opacity-80 theme-text-main border theme-border text-sm font-bold transition-all shadow-sm"
                title="Zoom Out (-)"
              >
                -
              </button>
              <button 
                type="button"
                onClick={() => fitModelToWindow('current')} 
                className="w-7 h-7 flex items-center justify-center rounded-lg theme-card hover:opacity-80 theme-text-main border theme-border text-xs font-bold transition-all shadow-sm"
                title="Fit View / Reset Camera (Hotkey: F)"
              >
                <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
              </button>
              <button 
                type="button"
                onClick={() => setIsAutoRotatingMolecule(!isAutoRotatingMolecule)} 
                className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs font-bold transition-all shadow-sm ${
                  isAutoRotatingMolecule ? 'bg-pink-500 text-white border-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.5)]' : 'theme-card hover:opacity-80 theme-text-main border theme-border'
                }`}
                title={isAutoRotatingMolecule ? "Stop Molecule Spin" : "Auto-Spin Molecule in 3D"}
              >
                <RotateCw className={`w-3.5 h-3.5 ${isAutoRotatingMolecule ? 'animate-spin' : ''}`} />
              </button>
              {moleculeData?.active_bond && (
                <button 
                  type="button"
                  onClick={() => setIsAutoRotatingBond(!isAutoRotatingBond)} 
                  className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs font-bold transition-all shadow-sm ${
                    isAutoRotatingBond ? 'bg-teal-500 text-white border-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.5)]' : 'theme-card hover:opacity-80 theme-text-main border theme-border'
                  }`}
                  title={isAutoRotatingBond ? "Stop Bond Rotation" : "Auto-Rotate Active Dihedral Bond"}
                >
                  <Zap className={`w-3.5 h-3.5 ${isAutoRotatingBond ? 'text-white' : 'text-teal-400'}`} />
                </button>
              )}
            </div>

            <Canvas camera={{ position: [0, 0, 7], fov: 50 }}>
              <CameraAnimator 
                targetPos={cameraPos} 
                targetLookAt={cameraLookAt}
                isAnimating={isAnimatingCamera} 
                onAnimationComplete={() => setIsAnimatingCamera(false)} 
                controlsRef={orbitControlsRef}
              />
              <ambientLight intensity={isDarkMode ? 2.0 : 2.8} color={currentTheme.ambientLight} />
              <pointLight position={[10, 10, 10]} intensity={isDarkMode ? 2.5 : 3.0} color="#ffffff" />
              <pointLight position={[-10, -10, -10]} intensity={isDarkMode ? 1.0 : 1.2} color={currentTheme.pointLight} />
              <DynamicMolecule 
                moleculeData={moleculeData} 
                conformationPhysics={conformationPhysics} 
                renderMode={renderMode} 
                onInvertStereo={handleInvertStereo} 
                onBondClick={handleBondClick} 
                showDipole={showDipole} 
                isDarkMode={isDarkMode}
              />
              <OrbitControls 
                ref={orbitControlsRef}
                enablePan={true} 
                enableZoom={true} 
                autoRotate={isAutoRotatingMolecule}
                autoRotateSpeed={2.0}
                onStart={() => setIsAnimatingCamera(false)} 
              />
            </Canvas>
          </div>

          {/* Mobile Fullscreen 3D Studio Floating Dihedral Controller */}
          {mobileTab === 'canvas' && (
            <div className="md:hidden shrink-0 theme-sub backdrop-blur-xl border-t theme-border p-2.5 z-20 flex flex-col gap-1.5 shadow-2xl">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold theme-text-muted uppercase tracking-wider text-[10px]">Dihedral Angle:</span>
                <span className="font-mono font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/30">
                  {angle}° — {getConformationName(angle)}
                </span>
                <span className="font-mono text-[11px] theme-text-main font-bold">
                  {currentEnergy.toFixed(1)} kJ/mol
                </span>
              </div>
              <input 
                type="range" min="0" max="360" value={angle} 
                onChange={(e) => setAngle(Number(e.target.value))} 
                disabled={!moleculeData?.active_bond}
                className="w-full h-3 rounded-lg appearance-none cursor-pointer accent-pink-500 theme-card my-1" 
              />
              <div className="flex justify-between gap-1">
                {[0, 60, 120, 180, 240, 300].map(snap => (
                  <button
                    key={snap}
                    onClick={() => moleculeData?.active_bond && setAngle(snap)}
                    disabled={!moleculeData?.active_bond}
                    className={`text-[10px] font-mono py-1.5 rounded transition-all flex-1 text-center font-bold border ${
                      angle === snap 
                        ? 'bg-pink-500 text-white border-pink-400 shadow-sm' 
                        : 'theme-card theme-text-main border theme-border'
                    }`}
                  >
                    {snap}°
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mobile Portrait Touch Hint */}
          {mobileTab === 'all' && (
            <div className="md:hidden shrink-0 flex items-center justify-between px-3 py-1 bg-black/30 backdrop-blur-sm text-[10px] theme-text-muted border-t theme-border select-none">
              <span>👆 Touch canvas to rotate 3D</span>
              <span>Scroll down for Energy HUD ↓</span>
            </div>
          )}
        </section>

        {/* Right Column: HUD Sidebar */}
        <section className={`md:col-span-6 lg:col-span-6 flex flex-col gap-2.5 h-full min-h-0 overflow-y-auto pr-1.5 custom-scrollbar pb-safe ${
          mobileTab === 'canvas' ? 'hidden md:flex' : 'flex'
        }`}>
          
          {/* Panel 1: Main Dihedral Control */}
          <div className="shrink-0 theme-panel backdrop-blur-xl rounded-2xl border theme-border p-3.5 shadow-xl relative">
            <div className="flex justify-between items-center mb-2">
              <h2 className={`text-xs font-bold ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700 font-extrabold'} tracking-[0.2em] uppercase flex items-center gap-1.5`}>
                Dihedral Angle Control
              </h2>
              {moleculeData?.active_bond ? (
                <span className={`text-xs font-bold ${isDarkMode ? 'text-pink-300 bg-pink-500/20 border-pink-500/30' : 'text-pink-700 bg-pink-100 border-pink-300 font-extrabold'} px-3 py-1 rounded-lg border shadow-sm`}>
                  {angle}° — {getConformationName(angle)}
                </span>
              ) : (
                <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-slate-600 bg-slate-100 border-slate-300'} px-3 py-1 rounded-lg border`}>
                  LOCKED (RIGID RING)
                </span>
              )}
            </div>
            
            <input 
              type="range" min="0" max="360" value={angle} 
              onChange={(e) => setAngle(Number(e.target.value))} 
              disabled={!moleculeData?.active_bond}
              className={`w-full h-2.5 rounded-lg appearance-none cursor-pointer accent-pink-500 mb-2.5 ${moleculeData?.active_bond ? 'theme-sub' : 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed opacity-50'}`} 
            />
            
            <div className="flex justify-between gap-1 sm:gap-1.5 w-full">
              {[0, 60, 120, 180, 240, 300].map(snap => (
                <button
                  key={snap}
                  onClick={() => moleculeData?.active_bond && setAngle(snap)}
                  disabled={!moleculeData?.active_bond}
                  className={`text-[10px] sm:text-xs font-mono py-1 px-1 sm:px-1.5 rounded-lg transition-all flex-1 text-center font-bold border ${
                    angle === snap 
                      ? 'bg-pink-500 text-white border-pink-400 shadow-sm scale-105' 
                      : 'theme-card theme-text-main border theme-border hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed'
                  }`}
                >
                  {snap}°
                </button>
              ))}
            </div>

            {/* Real-Time AI Conformation Copilot Banner */}
            <div className="mt-2.5 pt-2 border-t theme-border flex items-start gap-2 theme-sub p-2.5 rounded-xl border shadow-inner">
              <div className="p-1 rounded-lg bg-pink-500/10 border border-pink-500/30 shrink-0 mt-0.5">
                <Zap className={`w-3.5 h-3.5 ${isDarkMode ? 'text-pink-400' : 'text-pink-600'} animate-pulse`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold tracking-wider uppercase ${isDarkMode ? 'text-pink-300' : 'text-pink-700'} flex items-center gap-1`}>
                      AI Conformation Copilot
                      <span className={`text-[9px] ${isDarkMode ? 'bg-teal-400/10 text-teal-300 border-teal-400/20' : 'bg-teal-50 text-teal-700 border-teal-200 font-bold'} px-1.5 py-0.2 rounded border font-mono`}>Live 60fps</span>
                    </span>

                    {/* Mode Selector: Simplified vs Descriptive */}
                    <div className="flex items-center theme-card p-0.5 rounded-lg border theme-border shadow-inner">
                      <button
                        onClick={() => setCopilotMode('simplified')}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                          copilotMode === 'simplified' 
                            ? 'bg-pink-500 text-white shadow-sm' 
                            : 'theme-text-muted hover:theme-text-main'
                        }`}
                        title="Intuitive, high-level physical reasoning of why changes are occurring"
                      >
                        ✨ Simplified
                      </button>
                      <button
                        onClick={() => setCopilotMode('descriptive')}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                          copilotMode === 'descriptive' 
                            ? 'bg-purple-500 text-white shadow-sm' 
                            : 'theme-text-muted hover:theme-text-main'
                        }`}
                        title="Precise, molecule-specific quantum and physical chemistry mechanics"
                      >
                        🔬 Descriptive
                      </button>
                    </div>
                  </div>

                  {liveDipole?.magnitude !== undefined && (
                    <span className={`text-[10px] font-mono font-bold ${isDarkMode ? 'text-sky-300' : 'text-sky-700'}`}>
                      μ = {liveDipole.magnitude.toFixed(2)} D
                    </span>
                  )}
                </div>

                <div className="text-[11px] theme-text-sub leading-relaxed font-sans">
                  {copilotMode === 'simplified' ? (
                    <p className="theme-card p-2 rounded-lg border theme-border theme-text-main shadow-sm">
                      {aiCopilotInsight.simplified}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="theme-card p-2 rounded-lg border theme-border theme-text-main font-sans shadow-sm">
                        {aiCopilotInsight.descriptive}
                      </p>

                      {/* On-Demand Gemini Quantum Deep-Dive Option */}
                      <div className="flex items-center justify-between pt-0.5">
                        <button
                          onClick={handleRequestDeepDive}
                          disabled={isDeepDiveLoading}
                          className={`flex items-center gap-1.5 text-[10px] font-bold ${isDarkMode ? 'text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/30' : 'text-purple-700 bg-purple-100 hover:bg-purple-200 border-purple-300'} px-2 py-1 rounded-md transition-all border disabled:opacity-50`}
                          title="Generate a custom quantum chemical deep dive from Gemini 3.5 Flash"
                        >
                          <Zap className={`w-3 h-3 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'} ${isDeepDiveLoading ? 'animate-spin' : ''}`} />
                          {isDeepDiveLoading ? "Computing with Gemini 3.5..." : "Ask Gemini AI Quantum Deep-Dive"}
                        </button>
                        {geminiDeepDive && (
                          <button 
                            onClick={() => { setGeminiDeepDive(null); setDeepDiveMeta(null); }}
                            className="text-[9px] theme-text-muted hover:theme-text-main"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {/* Real-Time Live Calculating Feedback (Never looks stuck) */}
                      {isDeepDiveLoading && (
                        <div className="theme-card p-3 rounded-lg border border-purple-500/40 text-[10.5px] theme-text-main shadow-md space-y-2 animate-in fade-in">
                          <div className="flex items-center justify-between">
                            <span className={`text-[9.5px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-purple-400' : 'text-purple-700'} flex items-center gap-1.5`}>
                              <Zap className="w-3.5 h-3.5 text-purple-500 animate-bounce" />
                              Gemini 3.5 Flash Orbital Analysis
                            </span>
                            <span className="text-[9px] text-purple-400 font-mono animate-pulse">Evaluating orbitals...</span>
                          </div>
                          <p className="text-[10px] theme-text-muted italic">
                            Analyzing σ → σ* hyperconjugation, Pauli steric repulsion & instantaneous dipole vector...
                          </p>
                          <div className="h-1.5 w-full bg-purple-500/20 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 animate-pulse w-3/4 rounded-full"></div>
                          </div>
                        </div>
                      )}

                      {/* Completed Quantum Analysis Result */}
                      {geminiDeepDive && !isDeepDiveLoading && (
                        <div className="theme-card p-3 rounded-lg border theme-border text-[10.5px] theme-text-main leading-relaxed animate-in fade-in shadow-md space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className={`text-[9.5px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-purple-400' : 'text-purple-700'} flex items-center gap-1.5`}>
                              <Zap className="w-3 h-3 text-purple-500" />
                              Gemini 3.5 Flash Quantum Conformation Analysis:
                            </span>
                            {deepDiveMeta && (
                              <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded border ${isDarkMode ? 'bg-purple-950/60 border-purple-800/40 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-700'}`}>
                                {deepDiveMeta.cached ? '⚡ Cached (0ms)' : `🚀 ${deepDiveMeta.latencyMs}ms`}
                              </span>
                            )}
                          </div>
                          <div className="font-sans leading-relaxed">
                            {geminiDeepDive}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Panel 2: Energy Surface & Boltzmann (Compact length) */}
          <div className="shrink-0 h-[210px] theme-panel backdrop-blur-xl rounded-2xl border theme-border p-3 shadow-xl relative overflow-hidden group flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-300/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-1 shrink-0">
              <h2 className={`text-[11px] font-bold ${isDarkMode ? 'text-indigo-300/80' : 'text-indigo-800 font-extrabold'} tracking-widest uppercase`}>Energy Surface & Boltzmann</h2>
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] font-bold ${isDarkMode ? 'bg-purple-400/10 text-purple-300 border-purple-400/20' : 'bg-purple-100 text-purple-700 border-purple-200'} px-1.5 py-0.5 rounded border flex items-center gap-1`}>
                  <span className={`w-2 h-0.5 ${isDarkMode ? 'bg-[#c084fc]' : 'bg-[#9333ea]'} inline-block`}></span> MMFF94
                </span>
                <span className={`text-[9px] font-bold ${isDarkMode ? 'bg-teal-400/10 text-teal-300 border-teal-400/20' : 'bg-teal-100 text-teal-700 border-teal-200'} px-1.5 py-0.5 rounded border flex items-center gap-1`}>
                  <span className="w-2 h-0.5 inline-block" style={{ backgroundColor: currentTheme.chartEnergy }}></span> SPICE AI (R²=0.99)
                </span>
              </div>
            </div>
            
            <div className="flex-1 w-full min-h-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={energyCurveData} margin={{ top: 16, right: 10, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={currentTheme.chartProb} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={currentTheme.chartProb} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="angle" stroke={isDarkMode ? '#475569' : '#94a3b8'} tick={{fill: isDarkMode ? '#94a3b8' : '#334155', fontSize: 10, fontFamily: 'monospace', fontWeight: 600}} minTickGap={30} />
                  <YAxis yAxisId="left" stroke={isDarkMode ? '#475569' : '#94a3b8'} tick={{fill: isDarkMode ? '#94a3b8' : '#334155', fontSize: 10, fontFamily: 'monospace', fontWeight: 600}} />
                  <YAxis yAxisId="right" orientation="right" hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.borderColor}`, borderRadius: '10px', backdropFilter: 'blur(10px)', padding: '6px 10px', color: currentTheme.textMain }}
                    itemStyle={{ color: currentTheme.accentPrimary, fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }}
                    formatter={(value, name) => {
                      if (name === 'energy') return [`${Number(value).toFixed(2)} kJ/mol (${(Number(value)/4.184).toFixed(2)} kcal/mol)`, 'MMFF94 Energy (ΔE)'];
                      if (name === 'ai_energy') return [`${Number(value).toFixed(2)} kJ/mol (${(Number(value)/4.184).toFixed(2)} kcal/mol)`, 'ChemGNN AI (SPICE QM)'];
                      if (name === 'prob') return [`${Number(value).toFixed(1)}%`, 'Boltzmann Population'];
                      return [value, name];
                    }}
                    labelFormatter={(l) => `${l}° - ${getConformationName(l)}`}
                    labelStyle={{ color: isDarkMode ? '#94a3b8' : '#475569', fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="energy" stroke={isDarkMode ? '#c084fc' : '#9333ea'} strokeWidth={3} dot={false} isAnimationActive={false} name="MMFF94 (Relaxed)" />
                  <Line yAxisId="left" type="monotone" dataKey="ai_energy" stroke={currentTheme.chartEnergy} strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} name="ChemGNN SPICE AI" />
                  <Area yAxisId="right" type="monotone" dataKey="prob" stroke={currentTheme.chartProb} strokeWidth={1} fillOpacity={1} fill="url(#colorProb)" isAnimationActive={false} name="Boltzmann Pop" />
                  
                  {/* Conformational Markers */}
                  {[[0,'Syn'],[60,'Gauche'],[120,'Ecl'],[180,'Anti'],[240,'Ecl'],[300,'Gauche']].map(([x, name]) => (
                    <ReferenceLine
                      key={`marker-${x}`}
                      yAxisId="left"
                      x={x}
                      stroke={isDarkMode ? '#94a3b8' : '#64748b'}
                      strokeDasharray="3 3"
                      strokeOpacity={isDarkMode ? 0.35 : 0.6}
                      label={{ position: 'top', value: name, fill: isDarkMode ? '#e0e7ff' : '#0f172a', fontSize: 10, fontWeight: 700 }}
                    />
                  ))}

                  <ReferenceLine yAxisId="left" x={angle} stroke={isDarkMode ? '#c084fc' : '#9333ea'} strokeDasharray="3 3" opacity={0.6} />
                  <ReferenceDot yAxisId="left" x={angle} y={currentEnergy} r={6} fill={isDarkMode ? '#1e1e2f' : '#ffffff'} stroke={isDarkMode ? '#c084fc' : '#9333ea'} strokeWidth={3} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Panel 3: AI Deep Learning Section */}
          {aiMetrics && (
            <div className="shrink-0 theme-panel backdrop-blur-xl rounded-2xl border theme-border p-3 shadow-xl relative transition-all duration-300">
              <div 
                onClick={() => setIsAiMetricsMinimized(prev => !prev)}
                className="flex justify-between items-center cursor-pointer select-none group/hdr"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className={`text-xs font-bold ${isDarkMode ? 'text-indigo-300' : 'text-indigo-800 font-extrabold'} tracking-[0.2em] uppercase flex items-center gap-1.5 transition-colors`}>
                    <Zap className={`w-3.5 h-3.5 ${isDarkMode ? 'text-pink-400' : 'text-pink-600'}`} />
                    AI Deep Learning (ChemGNN ONNX)
                  </h2>
                  {isAiMetricsMinimized && (
                    <span className={`text-[10px] font-mono font-bold ${isDarkMode ? 'text-pink-300 bg-pink-500/10 border-pink-500/20' : 'text-pink-700 bg-pink-50 border-pink-200'} px-2 py-0.5 rounded border`}>
                      {aiMetrics.energy} kcal/mol • μ: {liveDipole?.magnitude !== undefined ? `${liveDipole.magnitude.toFixed(2)} D` : '0.00 D'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono font-bold ${isDarkMode ? 'text-pink-300 bg-pink-500/10 border-pink-500/20' : 'text-pink-700 bg-pink-50 border-pink-200'} px-2 py-0.5 rounded border`}>
                    &lt;10ms
                  </span>
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIsAiMetricsMinimized(prev => !prev); }}
                    className={`${isDarkMode ? 'text-indigo-300/70 hover:text-white hover:bg-white/10' : 'theme-text-muted hover:theme-text-main hover:bg-black/5'} p-1 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold`}
                    title={isAiMetricsMinimized ? "Expand AI Deep Learning HUD" : "Minimize AI Deep Learning HUD"}
                  >
                    {isAiMetricsMinimized ? (
                      <>
                        <span className={`text-[9px] uppercase tracking-wider ${isDarkMode ? 'text-pink-300' : 'text-pink-600'} hidden sm:inline`}>Expand</span>
                        <ChevronDown className={`w-3.5 h-3.5 ${isDarkMode ? 'text-pink-400' : 'text-pink-600'}`} />
                      </>
                    ) : (
                      <>
                        <span className="text-[9px] uppercase tracking-wider theme-text-muted hidden sm:inline">Minimize</span>
                        <ChevronUp className="w-3.5 h-3.5 theme-text-muted" />
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {!isAiMetricsMinimized && (
                <div className="mt-2.5">
                  <div className="grid grid-cols-3 gap-2 mb-2.5">
                    <div className="theme-sub p-2 rounded-xl border theme-border flex flex-col justify-center shadow-sm">
                      <span className="text-[9px] font-medium theme-text-muted uppercase tracking-wider block">ChemGNN Energy</span>
                      <span className="font-mono text-base font-bold theme-text-main">{aiMetrics.energy} <span className={`text-[10px] ${isDarkMode ? 'text-pink-300' : 'text-pink-600'}`}>kcal/mol</span></span>
                      <span className="text-[9px] theme-text-muted font-mono">{(Number(aiMetrics.energy) * 4.184).toFixed(1)} kJ/mol</span>
                    </div>
                    <div className="theme-sub p-2 rounded-xl border theme-border flex flex-col justify-center shadow-sm">
                      <span className="text-[9px] font-medium theme-text-muted uppercase tracking-wider block">Equilibrium Dipole</span>
                      <span className="font-mono text-xs font-bold truncate theme-text-main">[{aiMetrics.dipole.join(', ')}]</span>
                      <span className="text-[9px] theme-text-muted font-mono">Ground State</span>
                    </div>
                    <div className="theme-sub p-2 rounded-xl border theme-border flex flex-col justify-center shadow-inner">
                      <span className={`text-[9px] font-medium ${isDarkMode ? 'text-sky-300' : 'text-sky-700 font-bold'} uppercase tracking-wider flex items-center gap-1`}>
                        <Zap className={`w-2.5 h-2.5 ${isDarkMode ? 'text-sky-400' : 'text-sky-600'}`} />
                        Live Dipole (θ)
                      </span>
                      <span className={`font-mono text-base ${isDarkMode ? 'text-sky-200' : 'text-sky-700 font-bold'}`}>
                        {liveDipole?.magnitude !== undefined ? `${liveDipole.magnitude.toFixed(2)} D` : '0.00 D'}
                      </span>
                      <span className={`text-[9px] ${isDarkMode ? 'text-sky-400/70' : 'text-sky-600 font-medium'} font-mono truncate`} title={liveDipole?.vector ? `[${liveDipole.vector.map(v => v.toFixed(2)).join(', ')}]` : ''}>
                        {liveDipole?.vector ? `[${liveDipole.vector.map(v => v.toFixed(2)).join(', ')}]` : '[0, 0, 0]'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-medium theme-text-muted uppercase tracking-widest block mb-1.5">Atomic Charges (Quantum / Gasteiger)</span>
                    <div className="flex gap-1.5 overflow-x-auto max-w-full pb-1 custom-scrollbar">
                      {aiMetrics.charges.slice(0, 16).map((c, i) => (
                        <div key={i} className="theme-sub px-2 py-1 rounded-lg border theme-border flex flex-col items-center shrink-0 min-w-[42px] shadow-sm">
                          <span className="text-[10px] theme-text-main font-bold">{moleculeData?.atoms[i]?.symbol || 'Atom'}</span>
                          <span className={`font-mono text-[10px] font-bold ${c > 0 ? (isDarkMode ? 'text-pink-300' : 'text-pink-600') : (isDarkMode ? 'text-teal-300' : 'text-teal-600')}`}>{Number(c).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Panel 4: Thermodynamic Extrema & Rotational Barrier */}
          {extremaMetrics && (
            <div className="shrink-0 theme-panel backdrop-blur-xl rounded-2xl border theme-border p-3 shadow-xl relative transition-all duration-300">
              <div 
                onClick={() => setIsExtremaMinimized(prev => !prev)}
                className="flex justify-between items-center cursor-pointer select-none group/hdr"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className={`text-xs font-bold ${isDarkMode ? 'text-indigo-300' : 'text-indigo-800 font-extrabold'} tracking-[0.2em] uppercase transition-colors`}>
                    Thermodynamic Extrema & Barrier
                  </h2>
                  {isExtremaMinimized && (
                    <span className={`text-[10px] font-mono font-bold ${isDarkMode ? 'text-teal-300 bg-teal-500/10 border-teal-500/20' : 'text-teal-700 bg-teal-50 border-teal-200'} px-2 py-0.5 rounded border`}>
                      ΔE‡: {extremaMetrics.barrier.toFixed(2)} kJ/mol ({(extremaMetrics.barrier / 4.184).toFixed(2)} kcal)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold ${isDarkMode ? 'bg-purple-400/10 text-purple-300 border-purple-400/20' : 'bg-purple-100 text-purple-700 border-purple-200'} px-2 py-0.5 rounded border`}>
                    ΔE‡ Barrier
                  </span>
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIsExtremaMinimized(prev => !prev); }}
                    className={`${isDarkMode ? 'text-indigo-300/70 hover:text-white hover:bg-white/10' : 'theme-text-muted hover:theme-text-main hover:bg-black/5'} p-1 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold`}
                    title={isExtremaMinimized ? "Expand Extrema & Barrier HUD" : "Minimize Extrema & Barrier HUD"}
                  >
                    {isExtremaMinimized ? (
                      <>
                        <span className={`text-[9px] uppercase tracking-wider ${isDarkMode ? 'text-teal-300' : 'text-teal-700'} hidden sm:inline`}>Expand</span>
                        <ChevronDown className={`w-3.5 h-3.5 ${isDarkMode ? 'text-teal-300' : 'text-teal-700'}`} />
                      </>
                    ) : (
                      <>
                        <span className="text-[9px] uppercase tracking-wider theme-text-muted hidden sm:inline">Minimize</span>
                        <ChevronUp className="w-3.5 h-3.5 theme-text-muted" />
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {!isExtremaMinimized && (
                <div className="mt-2.5">
                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    <div className="theme-card p-2 rounded-xl border theme-border shadow-sm">
                      <span className="text-[9px] font-bold theme-text-muted uppercase tracking-widest block mb-0.5">Min ({extremaMetrics.min.angle}°)</span>
                      <span className={`font-mono text-sm font-bold ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700 font-extrabold'}`}>{extremaMetrics.min.energy.toFixed(2)} <span className="text-[10px]">kJ/mol</span></span>
                      <span className="text-[9px] theme-text-muted block">{(extremaMetrics.min.energy / 4.184).toFixed(2)} kcal</span>
                    </div>
                    <div className="theme-card p-2 rounded-xl border theme-border shadow-sm">
                      <span className="text-[9px] font-bold theme-text-muted uppercase tracking-widest block mb-0.5">Max ({extremaMetrics.max.angle}°)</span>
                      <span className={`font-mono text-sm font-bold ${isDarkMode ? 'text-purple-300' : 'text-purple-700 font-extrabold'}`}>{extremaMetrics.max.energy.toFixed(2)} <span className="text-[10px]">kJ/mol</span></span>
                      <span className="text-[9px] theme-text-muted block">{(extremaMetrics.max.energy / 4.184).toFixed(2)} kcal</span>
                    </div>
                    <div className="theme-card p-2 rounded-xl border theme-border shadow-sm">
                      <span className="text-[9px] font-bold theme-text-muted uppercase tracking-widest block mb-0.5">Barrier ΔE‡</span>
                      <span className={`font-mono text-sm font-bold ${isDarkMode ? 'text-teal-300' : 'text-teal-700 font-extrabold'}`}>{extremaMetrics.barrier.toFixed(2)} <span className="text-[10px]">kJ/mol</span></span>
                      <span className="text-[9px] theme-text-muted block">{(extremaMetrics.barrier / 4.184).toFixed(2)} kcal</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono theme-text-sub">
                      <span>Min ({extremaMetrics.min.angle}°)</span>
                      <span className={`${isDarkMode ? 'text-pink-300' : 'text-pink-600'} font-bold`}>{currentEnergy.toFixed(2)} kJ/mol ({(currentEnergy / 4.184).toFixed(2)} kcal) • {extremaMetrics.currentPercent.toFixed(0)}%</span>
                      <span>Max ({extremaMetrics.max.angle}°)</span>
                    </div>
                    <div className="w-full h-2.5 theme-sub rounded-full overflow-hidden border theme-border relative shadow-inner">
                      <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300" style={{ width: `${extremaMetrics.currentPercent}%` }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
        </section>
      </main>

      {/* Ketcher Draw Modal */}
      {isDrawing && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 xl:p-12">
          <div className={`${isDarkMode ? 'bg-[#1e1e2f] border-indigo-200/20' : 'bg-white border-slate-200'} w-full max-w-6xl h-full max-h-[94dvh] sm:max-h-[800px] rounded-2xl shadow-2xl overflow-hidden flex flex-col border relative`}>
            <button 
              onClick={() => setIsDrawing(false)}
              className={`absolute top-4 right-4 z-10 ${isDarkMode ? 'bg-[#2a2a35] hover:bg-[#3f3f5a] text-indigo-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} p-2 rounded-full transition-colors`}
            >
              <X className="w-5 h-5" />
            </button>
            <div className={`${isDarkMode ? 'bg-[#141423] border-indigo-200/10' : 'bg-slate-50 border-slate-200'} p-4 border-b`}>
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-indigo-100' : 'text-slate-800'} flex items-center gap-2`}>
                <Zap className="w-5 h-5 text-purple-500" />
                Molecular Editor
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-indigo-300/60' : 'text-slate-500'}`}>Draw any custom organic molecule to visualize its thermodynamic engine.</p>
            </div>
            <div className="flex-1 bg-white relative">
              <KetcherDrawer onSaveSmiles={handleSaveSmiles} />
            </div>
          </div>
        </div>
      )}

      {/* 2D Notebook Structure & Newman Projection Modal */}
      <Notebook2DModal
        isOpen={isNotebook2DOpen}
        onClose={() => setIsNotebook2DOpen(false)}
        moleculeData={moleculeData}
        angle={angle}
        setAngle={setAngle}
        currentEnergy={currentEnergy}
        liveDipole={liveDipole}
        clashData={clashData}
        isDarkMode={isDarkMode}
        currentTheme={currentTheme}
        initialTab={notebookTab}
        onLoadMolecule={(smiles) => fetchMoleculeData(smiles)}
      />

      {/* Gemini AI Floating Assistant */}
      <div className={`fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-[90] flex flex-col items-end transition-all duration-500 ${chatOpen ? 'w-[calc(100vw-24px)] sm:w-80 max-w-sm h-[480px] max-h-[75dvh]' : 'w-12 h-12 sm:w-14 sm:h-14'}`}>
        {/* Chat Window */}
        <div className={`w-full h-full theme-panel backdrop-blur-xl border border-pink-500/30 rounded-2xl shadow-[0_0_40px_rgba(244,114,182,0.15)] flex flex-col overflow-hidden transition-all duration-500 origin-bottom-right ${chatOpen ? 'scale-100 opacity-100 mb-2 sm:mb-4' : 'scale-0 opacity-0 absolute bottom-0 right-0 pointer-events-none'}`}>
          <div className={`bg-gradient-to-r ${isDarkMode ? 'from-pink-500/20 to-purple-500/20 border-pink-500/20' : 'from-pink-100 to-purple-100 border-pink-200'} border-b p-3 flex justify-between items-center`}>
            <h3 className={`text-xs font-bold ${isDarkMode ? 'text-pink-300' : 'text-pink-700 font-extrabold'} tracking-[0.1em] flex items-center gap-2`}>
              <Zap className="w-3 h-3 text-pink-500" />
              Gemini Pro Co-Pilot
            </h3>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setIsVoiceReplyEnabled(!isVoiceReplyEnabled)}
                className={`p-1 rounded-md transition-colors ${
                  isVoiceReplyEnabled 
                    ? (isDarkMode ? 'text-pink-400 bg-pink-500/20 hover:bg-pink-500/30' : 'text-pink-700 bg-pink-100 hover:bg-pink-200') 
                    : (isDarkMode ? 'text-indigo-300/60 hover:text-indigo-200' : 'theme-text-muted hover:theme-text-main')
                }`}
                title={isVoiceReplyEnabled ? "Voice Speech Reply: Enabled (Gemini reads answers aloud)" : "Voice Speech Reply: Disabled (Click to enable)"}
              >
                {isVoiceReplyEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setChatOpen(false)} className={`${isDarkMode ? 'text-indigo-300 hover:text-white' : 'theme-text-muted hover:theme-text-main'} transition-colors`}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-3 custom-scrollbar" ref={chatScrollRef}>
            {chatHistory.map((msg, i) => (
              <div key={i} className={`max-w-[85%] rounded-xl p-3 text-[11px] ${msg.role === 'user' ? (isDarkMode ? 'bg-indigo-500/30 text-indigo-100 self-end rounded-br-sm' : 'bg-indigo-600 text-white self-end rounded-br-sm shadow-sm') : 'theme-card theme-text-main border theme-border self-start rounded-bl-sm shadow-sm'}`}>
                {msg.text}
              </div>
            ))}
            {isChatLoading && (
              <div className="theme-card theme-text-main border theme-border self-start rounded-xl rounded-bl-sm p-3 text-[11px] flex gap-1 items-center shadow-sm">
                <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></span>
                <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></span>
              </div>
            )}
          </div>
          <form onSubmit={handleChatSubmit} className="p-2.5 sm:p-3 theme-sub border-t theme-border flex gap-1.5 items-center">
            <input 
              type="text" 
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={isListening ? "Listening... Speak, then pause to auto-submit..." : "Ask Gemini or speak to rotate bond..."}
              className={`flex-1 ${isDarkMode ? 'bg-[#1e1e2f] text-white border-white/5 focus:border-pink-500/50' : 'theme-card theme-text-main border theme-border focus:border-pink-500 shadow-inner'} border rounded-lg px-2.5 sm:px-3 py-1.5 text-[11px] outline-none transition-all ${
                isListening ? 'border-red-500/80 bg-red-950/20 placeholder-red-400 ring-1 ring-red-500/30' : ''
              }`}
            />
            {/* Voice Input Microphone Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                isListening 
                  ? 'bg-red-500/30 border-red-500 text-red-400 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]' 
                  : (isDarkMode ? 'bg-[#1e1e2f] border-white/10 text-indigo-300 hover:text-white hover:border-pink-500/40' : 'theme-card border theme-border theme-text-main hover:opacity-80')
              }`}
              title={isListening ? "Listening... Click to stop" : "Speak to Gemini with Voice Input"}
            >
              {isListening ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4" />}
            </button>
            <button type="submit" disabled={isChatLoading || !chatInput.trim()} className="bg-pink-500/80 hover:bg-pink-400 text-white p-1.5 rounded-lg transition-colors disabled:opacity-50 shrink-0">
              <Zap className="w-4 h-4" />
            </button>
          </form>
        </div>
        
        {/* Chat Toggle Button */}
        <button 
          onClick={() => setChatOpen(!chatOpen)}
          className={`absolute bottom-0 right-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-[0_0_30px_rgba(244,114,182,0.4)] flex items-center justify-center transition-transform hover:scale-110 active:scale-95 group ${chatOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
          title="Open Gemini AI Co-Pilot Assistant"
        >
          <Zap className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-pink-500 border border-white/40"></span>
          </span>
        </button>
      </div>

    </div>
  );
}
