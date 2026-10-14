/**
 * Utility to convert raw LaTeX math expressions and escape sequences into standard Unicode
 * scientific notation (e.g. $0^\circ$ -> 0°, \text{\AA} -> Å, \sigma \to \sigma^* -> σ → σ*).
 */
export function sanitizeScientificText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText;

  // 1. Remove block and inline math delimiters like \[...\], \(...\), $$, $
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, '$1');
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, '$1');
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, '$1');

  // 2. Specific unit and symbol LaTeX patterns
  // Angstrom: \text{\AA}, \text{ \AA}, \AA, \text{Å}
  text = text.replace(/\\text\{\s*\\AA\s*\}|\\text\{\s*Å\s*\}|\\AA\b/g, 'Å');
  
  // Degrees: 0^\circ, 0^{\circ}, ^\circ, ^{\circ}, \circ
  text = text.replace(/\^\{\s*\\circ\s*\}|\^\\circ\b|\\circ\b/g, '°');

  // Greek letters & orbital designations
  text = text.replace(/\\sigma\s*\^\s*\{?\*\}?|\\sigma\*/g, 'σ*');
  text = text.replace(/\\sigma\b/g, 'σ');
  text = text.replace(/\\pi\s*\^\s*\{?\*\}?|\\pi\*/g, 'π*');
  text = text.replace(/\\pi\b/g, 'π');
  text = text.replace(/\\Delta\b/g, 'Δ');
  text = text.replace(/\\mu\b/g, 'μ');
  text = text.replace(/\\theta\b/g, 'θ');
  text = text.replace(/\\phi\b/g, 'ϕ');
  text = text.replace(/\\psi\b/g, 'ψ');
  text = text.replace(/\\omega\b/g, 'ω');
  text = text.replace(/\\alpha\b/g, 'α');
  text = text.replace(/\\beta\b/g, 'β');
  text = text.replace(/\\gamma\b/g, 'γ');
  text = text.replace(/\\lambda\b/g, 'λ');

  // Arrows & reactions
  text = text.replace(/\\to\b|\\rightarrow\b/g, '→');
  text = text.replace(/\\leftarrow\b/g, '←');
  text = text.replace(/\\leftrightarrow\b/g, '↔');
  text = text.replace(/\\rightleftharpoons\b/g, '⇌');

  // Mathematical & comparison operators
  text = text.replace(/\\approx\b/g, '≈');
  text = text.replace(/\\neq\b/g, '≠');
  text = text.replace(/\\leq\b|\\le\b/g, '≤');
  text = text.replace(/\\geq\b|\\ge\b/g, '≥');
  text = text.replace(/\\pm\b/g, '±');
  text = text.replace(/\\times\b/g, '×');
  text = text.replace(/\\cdot\b/g, '·');
  text = text.replace(/\\infty\b/g, '∞');

  // Unpack \text{...}, \mathrm{...}, \mathbf{...}, \mathit{...}
  text = text.replace(/\\(?:text|mathrm|mathbf|mathit)\{([^}]+)\}/g, '$1');

  // Common chemical bond hyphens (e.g. C-C, C-H, O-H, N-H -> C–C en-dash)
  text = text.replace(/\b([CNOPSFH]|Cl|Br)-([CNOPSFH]|Cl|Br)\b/g, '$1–$2');

  // Strip remaining single '$' math markers, but keep content
  text = text.replace(/\$([^$]+)\$/g, '$1');
  text = text.replace(/\$/g, '');

  // Common superscripts and subscripts
  text = text.replace(/\^2\b/g, '²');
  text = text.replace(/\^3\b/g, '³');
  text = text.replace(/\^0\b/g, '⁰');
  text = text.replace(/\^1\b/g, '¹');
  text = text.replace(/_2\b/g, '₂');
  text = text.replace(/_3\b/g, '₃');
  text = text.replace(/_4\b/g, '₄');

  // Separate compressed numbered points like "...clouds. 2. While..." -> "...clouds.\n\n2. While..."
  text = text.replace(/([.?!])\s+(\d+\.)\s+/g, '$1\n\n$2 ');

  // Clean up any double spaces or spacing artifacts
  text = text.replace(/\s+([.,;:!?)°])/g, '$1');
  text = text.replace(/\(\s+/g, '(');
  text = text.replace(/[ \t]{2,}/g, ' ');

  return text.trim();
}
