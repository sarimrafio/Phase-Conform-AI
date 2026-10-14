"use client";
import React from 'react';
import { sanitizeScientificText } from '../utils/formatScientific';

/**
 * Parses inline formatting: **bold**, *italic*, `code`, and clean text
 */
function renderInlineFormatted(rawStr, isDarkMode) {
  if (!rawStr) return null;

  // Split tokens by markdown patterns: **bold**, *italic*, `code`
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = rawStr.split(tokenRegex);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className={`font-semibold ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic opacity-90">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className={`font-mono text-[10px] px-1 py-0.5 rounded ${isDarkMode ? 'bg-purple-950/60 text-purple-300 border border-purple-800/40' : 'bg-purple-50 text-purple-800 border border-purple-200'}`}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

/**
 * Main component that renders scientific text with clean Unicode symbols and
 * nicely formatted list structures when numbered items (1. ... 2. ... 3. ...) are detected.
 */
export default function ScientificFormatter({ text, isDarkMode = true, className = "" }) {
  if (!text) return null;

  const cleaned = sanitizeScientificText(text);

  // Check if text contains numbered items like "1. ... 2. ... 3. ..."
  // Even if they are on a single line or separated by newlines
  const numberedPattern = /(?:^|\s+)(\d+)\.\s+/g;
  const matches = [...cleaned.matchAll(numberedPattern)];

  if (matches.length >= 2) {
    // Extract numbered sections
    const items = [];
    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      const nextMatch = matches[i + 1];
      const startIndex = currentMatch.index + currentMatch[0].length;
      const endIndex = nextMatch ? nextMatch.index : cleaned.length;
      const itemText = cleaned.slice(startIndex, endIndex).trim();
      items.push({
        num: currentMatch[1],
        text: itemText
      });
    }

    return (
      <div className={`space-y-2 mt-1.5 ${className}`}>
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2 leading-relaxed">
            <span className={`shrink-0 w-4 h-4 rounded-md font-mono text-[9px] font-bold flex items-center justify-center mt-0.5 border shadow-sm ${
              isDarkMode 
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
                : 'bg-purple-100 text-purple-700 border-purple-300'
            }`}>
              {item.num}
            </span>
            <div className="flex-1">
              {renderInlineFormatted(item.text, isDarkMode)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Handle standard multiline text or bullet points
  const lines = cleaned.split(/\n+/).filter(Boolean);

  if (lines.length > 1) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ');
          const lineContent = isBullet ? trimmed.replace(/^[*•-]\s+/, '') : trimmed;

          return (
            <div key={idx} className={`leading-relaxed ${isBullet ? 'flex items-start gap-2 pl-1' : ''}`}>
              {isBullet && (
                <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isDarkMode ? 'bg-purple-400' : 'bg-purple-600'}`}></span>
              )}
              <div className="flex-1">
                {renderInlineFormatted(lineContent, isDarkMode)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Single paragraph
  return (
    <div className={`leading-relaxed ${className}`}>
      {renderInlineFormatted(cleaned, isDarkMode)}
    </div>
  );
}
