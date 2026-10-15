"use client";
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Compass, 
  CheckCircle2, 
  X, 
  ArrowRight, 
  ArrowLeft, 
  GraduationCap, 
  Zap, 
  RotateCw, 
  Activity, 
  BookOpen, 
  Search, 
  HelpCircle,
  Eye,
  Sliders
} from 'lucide-react';

const STORAGE_KEY = 'phase_conform_onboarding_choice';

export default function OnboardingTutorial({
  isOpen,
  onClose,
  isDarkMode = true,
  currentTheme = {},
  onSelectAngle,
  onOpenNotebook,
  onOpenChat
}) {
  const [showModal, setShowModal] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Check on mount if user has already made an onboarding choice
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedChoice = localStorage.getItem(STORAGE_KEY);
      if (!savedChoice) {
        // Small delay so the 3D canvas and theme mount gracefully first
        const timer = setTimeout(() => {
          setShowModal(true);
        }, 650);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // When isOpen prop changes from parent (e.g. user clicked Guide/Tour button in header)
  useEffect(() => {
    if (isOpen) {
      setShowModal(true);
    }
  }, [isOpen]);

  const handleChooseNewUser = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'new_user');
    }
    setShowModal(false);
    setCurrentStep(0);
    setIsTourActive(true);
  };

  const handleChooseExperiencedUser = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'experienced');
    }
    setShowModal(false);
    setIsTourActive(false);
    onClose?.();
  };

  const handleSkipTour = () => {
    setIsTourActive(false);
    onClose?.();
  };

  const handleNextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsTourActive(false);
      onClose?.();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // The 7 Hands-On Tour Steps
  const tourSteps = [
    {
      id: 'canvas',
      targetAttr: '[data-tour="canvas"]',
      title: "1. The 3D Molecular Canvas",
      icon: <Eye className="w-4 h-4 text-pink-400" />,
      content: "This is your real-time 3D molecular stage. Left-click & drag to tumble in 3D, right-click to pan, and scroll to zoom. The neon magenta cylinder is the active rotatable bond!",
      tip: "💡 Pro Tip: Press 'F' on your keyboard anytime to auto-fit and center any molecule perfectly in the screen."
    },
    {
      id: 'dihedral-controls',
      targetAttr: '[data-tour="dihedral-controls"]',
      title: "2. Twisting Bonds & Conformations",
      icon: <Sliders className="w-4 h-4 text-purple-400" />,
      content: "Drag the Dihedral Angle slider from 0° to 360° to twist the molecule around its bond. Click quick presets like 180° Anti (most relaxed) or 0° Syn (maximum steric clash).",
      actionText: "Try 180° Anti",
      onAction: () => onSelectAngle?.(180),
      tip: "⚠️ Steric Warning: When atoms bump too close to each other, they glow bright coral-red to warn of Pauli electron cloud repulsion."
    },
    {
      id: 'energy-chart',
      targetAttr: '[data-tour="energy-chart"]',
      title: "3. Energy Surface & Boltzmann Populations",
      icon: <Activity className="w-4 h-4 text-teal-400" />,
      content: "This chart plots conformational potential energy in real time. Low dips are stable conformations; high peaks are barriers. The blue shaded area is the Boltzmann population—the exact percentage probability this shape exists in real life at this temperature!",
      tip: "🔬 Watch the red tracking dot slide across the energy surface as you rotate the bond."
    },
    {
      id: 'quantum-copilot',
      targetAttr: '[data-tour="quantum-copilot"]',
      title: "4. Gemini 3.8 Flash Quantum Deep-Dive",
      icon: <Zap className="w-4 h-4 text-purple-400" />,
      content: "Click 'Ask Gemini 3.8 Flash Quantum Deep-Dive' in Panel 1 to generate an elite, real-time computational frontier molecular orbital analysis explaining σ → σ* hyperconjugation, Pauli repulsion, and dipole vector sums.",
      tip: "✨ All calculations and explanations are rendered in clean scientific Unicode (Å, °, σ, π) with structured numbered points."
    },
    {
      id: 'search-bar',
      targetAttr: '[data-tour="search-bar"]',
      title: "5. Search with AI Typo-Correction",
      icon: <Search className="w-4 h-4 text-indigo-400" />,
      content: "Search any compound by common name (Caffeine, Aspirin, Dopamine), formula (C4H10), or SMILES. Made a spelling mistake like 'caffiene' or 'asprin'? Our fuzzy AI auto-detects and corrects typos with zero latency!",
      tip: "🔍 Focus the search bar anytime to view popular suggested molecules and category filter pills."
    },
    {
      id: 'notebook-draw',
      targetAttr: '[data-tour="notebook-draw"]',
      title: "6. 2D Lab Notebook & Ketcher Draw",
      icon: <BookOpen className="w-4 h-4 text-purple-400" />,
      content: "Click '2D Notebook' to inspect dynamic Newman projections, cyclohexane Chair-Boat ring flips, and Fischer configurations. Want to sketch custom chemicals? Click 'Draw' to use the Ketcher molecular editor.",
      actionText: "Open 2D Notebook Preview",
      onAction: () => onOpenNotebook?.(),
      tip: "📖 Inside the 2D Notebook, you can click '🔄 Ring-Flip' to watch axial and equatorial bonds invert!"
    },
    {
      id: 'gemini-copilot',
      targetAttr: '[data-tour="gemini-copilot"]',
      title: "7. Autonomous Gemini 3.8 Flash Co-Pilot",
      icon: <Sparkles className="w-4 h-4 text-pink-400" />,
      content: "Your AI paired lab partner can autonomously control the website! Ask Gemini by voice or text: 'load ibuprofen', 'rotate to anti', 'switch to wireframe', or 'explain hyperconjugation'.",
      actionText: "Open Co-Pilot Chat",
      onAction: () => onOpenChat?.(),
      tip: "🎙️ Tap the microphone icon inside the chat to command the entire application hands-free!"
    }
  ];

  const currentStepData = tourSteps[currentStep];

  return (
    <>
      {/* 1. INITIAL WELCOME MODAL: Choose New User vs Old User */}
      {showModal && (
        <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl neu-raised-lg overflow-hidden flex flex-col relative">
            
            {/* Header Glow Banner */}
            <div className="p-5 sm:p-6 border-b border-white/5 neu-inset rounded-t-3xl relative overflow-hidden">
              <button 
                onClick={handleChooseExperiencedUser}
                className="absolute top-4 right-4 p-2 rounded-xl neu-btn text-slate-400 hover:text-white transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="p-2 rounded-xl neu-card text-pink-400 shadow-sm">
                  <Compass className="w-5 h-5 animate-spin-slow" />
                </span>
                <span className="text-[11px] font-bold tracking-widest uppercase font-mono text-pink-400">
                  Interactive Laboratory Tour
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Welcome to Phase-Conform AI
              </h2>
              <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Interactive 3D molecular conformations, real-time potential energy surfaces, and Gemini 3.8 Flash AI. Select your experience level:
              </p>
            </div>

            {/* Selection Options Grid */}
            <div className="p-4 sm:p-6 flex flex-col gap-3.5">
              
              {/* Option 1: New User / Student (Recommended) */}
              <div 
                onClick={handleChooseNewUser}
                className="p-4 sm:p-5 rounded-2xl neu-card hover:scale-[1.01] transition-all cursor-pointer flex flex-col gap-2.5 relative border border-pink-500/40 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-pink-500 text-white shadow-sm">
                      <GraduationCap className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-extrabold flex items-center gap-1.5">
                      1. I'm a New User / Student
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-pink-500 text-white shadow-sm">
                    Recommended
                  </span>
                </div>

                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Give me the step-by-step hands-on tour! Learn how to rotate bonds, read the energy chart, use the 2D lab notebook, and command Gemini 3.8 Flash.
                </p>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-bold text-pink-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Start Interactive Tour <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[10px] opacity-60 font-mono">~90 seconds</span>
                </div>
              </div>

              {/* Option 2: Experienced User / Researcher */}
              <div 
                onClick={handleChooseExperiencedUser}
                className="p-4 sm:p-5 rounded-2xl neu-card hover:scale-[1.01] transition-all cursor-pointer flex flex-col gap-2 relative group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg neu-inset text-indigo-400">
                      <Zap className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-bold">
                      2. I'm an Experienced User
                    </span>
                  </div>
                  <span className="text-[10px] opacity-60 font-mono">
                    Skip Directly
                  </span>
                </div>

                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  I already know conformational analysis. Take me straight to the 3D studio with zero interruptions.
                </p>

                <div className="flex items-center justify-between pt-1">
                  <span className={`text-[11px] font-bold flex items-center gap-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} group-hover:translate-x-0.5 transition-transform`}>
                    Enter 3D Studio Directly <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-3.5 px-6 border-t border-white/5 neu-inset rounded-b-3xl flex items-center justify-between text-[11px] opacity-75">
              <span>Preference saved in local browser.</span>
              <button 
                onClick={handleChooseExperiencedUser}
                className="hover:underline font-bold text-pink-400"
              >
                Proceed Without Tour
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. HANDS-ON INTERACTIVE TOUR OVERLAY */}
      {isTourActive && (
        <div className="fixed inset-0 z-[115] pointer-events-none">
          {/* Subtle dimming backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto transition-opacity" onClick={handleSkipTour} />

          {/* Floating Tour Guide Dialog Card */}
          <div className="absolute bottom-5 sm:bottom-10 left-1/2 -translate-x-1/2 w-[92vw] sm:w-[460px] pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="rounded-3xl neu-raised-lg p-5 flex flex-col gap-3 relative backdrop-blur-xl">
              
              {/* Header: Step counter + Title + Close */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-xl neu-card text-pink-400">
                    {currentStepData.icon}
                  </span>
                  <div>
                    <span className="text-[9.5px] font-mono uppercase tracking-wider font-bold text-pink-400 block">
                      Tour Step {currentStep + 1} of {tourSteps.length}
                    </span>
                    <h3 className="text-sm sm:text-base font-extrabold leading-tight">
                      {currentStepData.title}
                    </h3>
                  </div>
                </div>

                <button 
                  onClick={handleSkipTour}
                  className="p-1.5 rounded-xl neu-btn text-slate-400 hover:text-white transition-colors"
                  title="Exit Tour"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Dots */}
              <div className="flex items-center gap-1.5 w-full neu-inset p-1 rounded-full">
                {tourSteps.map((step, idx) => (
                  <div 
                    key={step.id}
                    onClick={() => setCurrentStep(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer flex-1 ${
                      idx === currentStep 
                        ? 'bg-gradient-to-r from-indigo-500 to-pink-500 shadow-sm' 
                        : idx < currentStep 
                        ? 'bg-pink-500/50' 
                        : 'bg-white/10 dark:bg-white/10'
                    }`}
                    title={step.title}
                  />
                ))}
              </div>

              {/* Step Main Explanation */}
              <p className={`text-xs sm:text-[12.5px] leading-relaxed ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                {currentStepData.content}
              </p>

              {/* Interactive Action Button (if any) */}
              {currentStepData.actionText && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={currentStepData.onAction}
                    className="text-[11px] font-bold px-3.5 py-1.5 rounded-xl neu-btn text-pink-400 hover:text-pink-300 transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                    <span>{currentStepData.actionText}</span>
                  </button>
                </div>
              )}

              {/* Pro Tip Box */}
              {currentStepData.tip && (
                <div className="p-3 rounded-2xl text-[11px] leading-relaxed neu-inset text-indigo-300">
                  {currentStepData.tip}
                </div>
              )}

              {/* Navigation Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-1">
                <button
                  onClick={handleSkipTour}
                  className="text-[11px] font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Exit Tour
                </button>

                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <button
                      onClick={handlePrevStep}
                      className="text-xs font-bold px-3.5 py-1.5 rounded-xl neu-btn transition-colors flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                  )}

                  <button
                    onClick={handleNextStep}
                    className="text-xs font-bold px-4 py-1.5 rounded-xl neu-btn text-pink-400 font-bold transition-all flex items-center gap-1 active:scale-95"
                  >
                    <span>{currentStep === tourSteps.length - 1 ? 'Finish Tour 🎉' : 'Next Step'}</span>
                    {currentStep !== tourSteps.length - 1 && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
