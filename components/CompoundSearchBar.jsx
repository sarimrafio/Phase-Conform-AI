"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles, ChevronDown, Check, Beaker, Globe, ArrowRight, Zap } from 'lucide-react';
import { 
  COMPOUND_CATEGORIES, 
  getCompoundSuggestions, 
  findBestSpellCorrection, 
  fetchPubChemAutocomplete 
} from '../utils/compoundCatalog';

export default function CompoundSearchBar({
  searchQuery,
  setSearchQuery,
  onSearch,
  isSearching,
  isDarkMode = true,
  currentTheme = {},
  correctionNotice,
  setCorrectionNotice
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [suggestions, setSuggestions] = useState([]);
  const [pubchemSuggestions, setPubchemSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [spellCorrection, setSpellCorrection] = useState(null);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Update suggestions on query or category change
  useEffect(() => {
    const localMatches = getCompoundSuggestions(searchQuery, activeCategory, 7);
    setSuggestions(localMatches);

    // Check for high-confidence spell correction
    if (searchQuery.trim().length >= 3) {
      const correction = findBestSpellCorrection(searchQuery);
      setSpellCorrection(correction);
    } else {
      setSpellCorrection(null);
    }

    // Debounced PubChem autocomplete query for unlisted compounds
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 3 && localMatches.length < 3) {
        fetchPubChemAutocomplete(searchQuery, 4).then(results => {
          setPubchemSuggestions(results);
        });
      } else {
        setPubchemSuggestions([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, activeCategory]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCompound = (compound) => {
    setSearchQuery(compound.name);
    setIsOpen(false);
    setCorrectionNotice(null);
    if (compound.smiles) {
      onSearch(compound.smiles, compound.name);
    } else {
      onSearch(compound.name);
    }
  };

  const handleApplyCorrection = (correction) => {
    setSearchQuery(correction.correctedName);
    setIsOpen(false);
    setCorrectionNotice(`✨ Auto-corrected to "${correction.correctedName}"`);
    if (correction.smiles) {
      onSearch(correction.smiles, correction.correctedName);
    } else {
      onSearch(correction.correctedName);
    }
  };

  const handleKeyDown = (e) => {
    const totalItems = suggestions.length + pubchemSuggestions.length;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setSelectedIndex(prev => (prev + 1 < totalItems ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && selectedIndex >= 0) {
        if (selectedIndex < suggestions.length) {
          handleSelectCompound(suggestions[selectedIndex]);
        } else {
          const pubIdx = selectedIndex - suggestions.length;
          handleSelectCompound(pubchemSuggestions[pubIdx]);
        }
      } else {
        // If there's an active high-confidence typo and user presses enter directly, auto-apply!
        if (spellCorrection && spellCorrection.confidence >= 80) {
          handleApplyCorrection(spellCorrection);
        } else {
          setIsOpen(false);
          onSearch(searchQuery);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 min-w-[140px] max-w-full">
      {/* Search Input Bar (Neumorphic Inset Well) */}
      <div 
        className={`flex items-center gap-2 p-1.5 rounded-2xl transition-all neu-inset ${
          isOpen ? 'ring-2 ring-pink-500/30' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`p-1.5 rounded-xl transition-all shrink-0 ${
            isOpen ? 'neu-btn-active text-pink-400' : 'neu-btn text-slate-400 hover:text-indigo-400'
          }`}
          title="Browse suggested compounds & formulas"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>

        <input 
          ref={inputRef}
          type="text" 
          value={searchQuery}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Formula (C4H10) or compound name..."
          className={`bg-transparent text-xs px-1.5 py-1 outline-none w-full min-w-0 font-medium ${
            isDarkMode ? 'text-white placeholder-slate-400' : 'text-slate-900 placeholder-slate-400'
          }`}
        />

        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setCorrectionNotice(null);
              inputRef.current?.focus();
            }}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <button 
          type="button"
          onClick={() => {
            setIsOpen(false);
            if (spellCorrection && spellCorrection.confidence >= 80) {
              handleApplyCorrection(spellCorrection);
            } else {
              onSearch(searchQuery);
            }
          }}
          disabled={isSearching || !searchQuery.trim()}
          className="neu-btn text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 text-pink-400 hover:text-pink-300 disabled:opacity-40"
          title="Search or load molecule"
        >
          {isSearching ? (
            <div className="w-3 h-3 border-2 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            'Load'
          )}
        </button>
      </div>

      {/* Auto-Correction Floating Notice Badge */}
      {correctionNotice && (
        <div className="absolute -bottom-6 left-2 z-30 flex items-center gap-1 text-[10px] font-bold text-pink-400 neu-pill-inset px-2.5 py-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <span>{correctionNotice}</span>
          <button onClick={() => setCorrectionNotice(null)} className="hover:text-white ml-1">
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      )}

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-2 w-full sm:w-[390px] max-w-[95vw] rounded-3xl neu-raised-lg overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-2xl"
        >
          {/* Header & Category Filter Tabs */}
          <div className="p-3 border-b border-white/5 neu-inset rounded-t-3xl flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Beaker className="w-3.5 h-3.5 text-pink-400" />
                {searchQuery ? 'Matching Molecules' : 'Recommended Compounds'}
              </span>
              <span className="text-[10px] theme-text-muted font-mono neu-pill-inset px-2 py-0.5">
                {suggestions.length} available
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mobile-touch-scroll flex-nowrap py-0.5">
              {COMPOUND_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`text-[10px] px-2.5 py-1 rounded-full font-bold whitespace-nowrap transition-all shrink-0 ${
                    activeCategory === cat.id
                      ? 'neu-btn-active'
                      : 'neu-btn opacity-70 hover:opacity-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* AI Spell-Correction Suggestion Banner */}
          {spellCorrection && (
            <div 
              onClick={() => handleApplyCorrection(spellCorrection)}
              className="p-3 neu-inset border-b border-pink-500/20 flex items-center justify-between cursor-pointer hover:opacity-95 transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-1.5 rounded-xl neu-card text-pink-400 shadow-sm shrink-0">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                </span>
                <div className="min-w-0">
                  <span className="text-[10px] text-pink-300 font-bold uppercase tracking-wider block">
                    Did you mean? ({spellCorrection.confidence}% match)
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors">
                      {spellCorrection.correctedName}
                    </span>
                    <span className="text-[10px] neu-pill-inset px-2 py-0.2 font-mono text-pink-300">
                      {spellCorrection.formula}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                type="button"
                className="text-[10px] font-bold neu-btn text-pink-400 px-2.5 py-1.5 rounded-xl shrink-0 flex items-center gap-1"
              >
                <span>Select</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Curated Suggestions List */}
          <div className="max-h-[260px] overflow-y-auto p-2 flex flex-col gap-1.5 custom-scrollbar">
            {suggestions.length > 0 ? (
              suggestions.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={`${item.name}-${index}`}
                    type="button"
                    onClick={() => handleSelectCompound(item)}
                    className={`w-full text-left p-2.5 rounded-2xl transition-all flex items-start justify-between gap-2.5 ${
                      isSelected 
                        ? 'neu-btn-active' 
                        : 'neu-card hover:translate-x-0.5'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold font-sans">
                          {item.name}
                        </span>
                        <span className="text-[10px] neu-pill-inset px-2 py-0.5 font-mono font-bold text-indigo-400">
                          {item.formula}
                        </span>
                        {item.isFuzzyCorrection && (
                          <span className="text-[9px] neu-pill-inset px-1.5 py-0.5 font-bold text-amber-400">
                            Auto-Corrected
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                        {item.desc}
                      </p>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                <span>No local match for &ldquo;{searchQuery}&rdquo;.</span>
              </div>
            )}

            {/* PubChem Online Suggestions */}
            {pubchemSuggestions.length > 0 && (
              <div className="mt-1 pt-2 border-t border-white/5">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-indigo-400" />
                  <span>PubChem Online Database:</span>
                </div>
                {pubchemSuggestions.map((pub, pIdx) => {
                  const globalIdx = suggestions.length + pIdx;
                  const isSelected = globalIdx === selectedIndex;
                  return (
                    <button
                      key={`pub-${pIdx}`}
                      type="button"
                      onClick={() => handleSelectCompound(pub)}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between text-xs font-bold ${
                        isSelected 
                          ? 'neu-btn-active' 
                          : 'neu-card text-indigo-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{pub.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-normal shrink-0">PubChem</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Tip & Natural Language AI Assistant Prompt */}
          <div className="p-2.5 border-t border-white/5 neu-inset rounded-b-3xl flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-lg neu-card text-[9px] font-mono">↑↓</kbd> navigate
              <kbd className="px-1.5 py-0.5 rounded-lg neu-card text-[9px] font-mono ml-1">Enter</kbd> load
            </span>
            <span className="text-pink-400 font-medium">
              💡 Supports names, formulas & SMILES
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
