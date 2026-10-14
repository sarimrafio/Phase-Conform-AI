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
      {/* Search Input Bar */}
      <div 
        className={`flex items-center gap-1.5 p-1 rounded-lg border transition-all shadow-sm ${
          isOpen 
            ? 'border-pink-500/80 ring-2 ring-pink-500/20' 
            : 'theme-border hover:border-indigo-400/50'
        } ${isDarkMode ? 'bg-[#181827]' : 'bg-white'}`}
      >
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`p-1 rounded-md transition-colors ${
            isOpen ? 'text-pink-400 bg-pink-500/20' : 'text-slate-400 hover:text-indigo-400'
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
          className={`bg-transparent text-xs px-1 py-1 rounded outline-none w-full min-w-0 ${
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
            className="p-0.5 text-slate-400 hover:text-white rounded"
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
          className="bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white font-bold px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50 shadow-sm"
          title="Search or load molecule"
        >
          {isSearching ? (
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            'Load'
          )}
        </button>
      </div>

      {/* Auto-Correction Floating Notice Badge */}
      {correctionNotice && (
        <div className="absolute -bottom-5 left-1 z-30 flex items-center gap-1 text-[10px] font-bold text-pink-400 animate-in fade-in slide-in-from-top-1 duration-200">
          <span>{correctionNotice}</span>
          <button onClick={() => setCorrectionNotice(null)} className="hover:text-white">
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      )}

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div 
          className={`absolute top-full left-0 mt-1.5 w-full sm:w-[380px] max-w-[95vw] rounded-2xl border shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl ${
            isDarkMode 
              ? 'bg-[#141423]/95 border-indigo-500/30 text-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.6)]' 
              : 'bg-white/95 border-slate-300 text-slate-900 shadow-[0_10px_35px_rgba(0,0,0,0.15)]'
          }`}
        >
          {/* Header & Category Filter Tabs */}
          <div className={`p-2.5 border-b flex flex-col gap-2 ${
            isDarkMode ? 'bg-[#18182b] border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Beaker className="w-3 h-3 text-pink-400" />
                {searchQuery ? 'Matching Molecules' : 'Recommended Compounds'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {suggestions.length} available
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mobile-touch-scroll flex-nowrap py-0.5">
              {COMPOUND_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap transition-all border shrink-0 ${
                    activeCategory === cat.id
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-transparent shadow-sm'
                      : isDarkMode 
                        ? 'bg-white/5 text-slate-400 border-white/5 hover:text-white hover:bg-white/10' 
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
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
              className="p-2.5 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 border-b border-pink-500/30 flex items-center justify-between cursor-pointer hover:opacity-95 transition-all group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="p-1 rounded-md bg-pink-500 text-white shadow-sm shrink-0">
                  <Sparkles className="w-3 h-3 animate-pulse" />
                </span>
                <div className="min-w-0">
                  <span className="text-[10px] text-pink-300 font-bold uppercase tracking-wider block">
                    Did you mean? ({spellCorrection.confidence}% match)
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors">
                      {spellCorrection.correctedName}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-pink-500/20 text-pink-300 border border-pink-500/30">
                      {spellCorrection.formula}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                type="button"
                className="text-[10px] font-bold bg-pink-500 hover:bg-pink-400 text-white px-2 py-1 rounded-md shadow-sm shrink-0 flex items-center gap-1"
              >
                <span>Select</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Curated Suggestions List */}
          <div className="max-h-[260px] overflow-y-auto p-1.5 flex flex-col gap-1 custom-scrollbar">
            {suggestions.length > 0 ? (
              suggestions.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={`${item.name}-${index}`}
                    type="button"
                    onClick={() => handleSelectCompound(item)}
                    className={`w-full text-left p-2 rounded-xl transition-all flex items-start justify-between gap-2 border ${
                      isSelected 
                        ? 'bg-pink-500/20 border-pink-500/50 text-white shadow-sm' 
                        : isDarkMode 
                          ? 'bg-transparent border-transparent hover:bg-white/5 text-slate-200' 
                          : 'bg-transparent border-transparent hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold font-sans">
                          {item.name}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          isDarkMode ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {item.formula}
                        </span>
                        {item.isFuzzyCorrection && (
                          <span className="text-[9px] px-1 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Auto-Corrected
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                        {item.desc}
                      </p>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-slate-400">
                <span>No local match for &ldquo;{searchQuery}&rdquo;.</span>
              </div>
            )}

            {/* PubChem Online Suggestions */}
            {pubchemSuggestions.length > 0 && (
              <div className="mt-1 pt-1 border-t border-white/5">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5 text-indigo-400" />
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
                      className={`w-full text-left p-2 rounded-xl transition-all flex items-center justify-between text-xs font-bold border ${
                        isSelected 
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-white' 
                          : 'hover:bg-white/5 border-transparent text-indigo-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Globe className="w-3 h-3 text-indigo-400 shrink-0" />
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
          <div className={`p-2 border-t flex items-center justify-between text-[10px] text-slate-400 ${
            isDarkMode ? 'bg-[#121220] border-white/5' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-black/40 text-[9px] font-mono border border-white/10">↑↓</kbd> to navigate
              <kbd className="px-1 py-0.5 rounded bg-black/40 text-[9px] font-mono border border-white/10 ml-1">Enter</kbd> to load
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
