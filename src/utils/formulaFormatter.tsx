import React from 'react';

/**
 * Maps standard characters to their Unicode superscript equivalents.
 */
export const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
  'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ',
  'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'j': 'ʲ', 'k': 'ᵏ',
  'l': 'ˡ', 'm': 'ᵐ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ',
  's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ',
  'A': 'ᴬ', 'B': 'ᴮ', 'D': 'ᴰ', 'E': 'ᴱ', 'G': 'ᴳ',
  'H': 'ᴴ', 'I': 'ᴵ', 'J': 'ᴶ', 'K': 'ᴷ', 'L': 'ᴸ',
  'M': 'ᴹ', 'N': 'ᴺ', 'O': 'ᴼ', 'P': 'ᴾ', 'R': 'ᴿ',
  'T': 'ᵀ', 'U': 'ᵁ', 'W': 'ᵂ',
};

/**
 * Maps standard characters to their Unicode subscript equivalents.
 */
export const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
  'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
  'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
  'v': 'ᵥ', 'x': 'ₓ',
};

/**
 * LaTeX and Ascii symbols to Unicode conversion dictionary.
 */
export const SYMBOL_REPLACEMENTS: [RegExp, string][] = [
  // Chemical / Physical Reactions & Arrows
  [/\\rightleftharpoons|\\leftrightharpoons|<=>|<==>/g, '⇄'],
  [/\\rightarrow|\\to|-->|->/g, '→'],
  [/\\leftarrow|<--|<-/g, '←'],
  [/\\leftrightarrow|<->/g, '↔'],
  [/\\downarrow|\\down/g, '↓'], // Precipitate (Niederschlag)
  [/\\uparrow|\\up/g, '↑'],     // Gas release (Gasentstehung)
  [/\\Longrightarrow|\\implies|==>/g, '⇒'],
  [/\\Longleftrightarrow|\\iff|<=>/g, '⇔'],

  // Greek Letters (Physics, Chemistry, Math)
  [/\\alpha/g, 'α'],
  [/\\beta/g, 'β'],
  [/\\gamma/g, 'γ'],
  [/\\Gamma/g, 'Γ'],
  [/\\delta/g, 'δ'],
  [/\\Delta/g, 'Δ'],
  [/\\varepsilon|\\epsilon/g, 'ε'],
  [/\\zeta/g, 'ζ'],
  [/\\eta/g, 'η'],
  [/\\theta|\\vartheta/g, 'θ'],
  [/\\Theta/g, 'Θ'],
  [/\\iota/g, 'ι'],
  [/\\kappa/g, 'κ'],
  [/\\lambda/g, 'λ'],
  [/\\Lambda/g, 'Λ'],
  [/\\mu/g, 'μ'],
  [/\\nu/g, 'ν'],
  [/\\xi/g, 'ξ'],
  [/\\Xi/g, 'Ξ'],
  [/\\pi/g, 'π'],
  [/\\Pi/g, 'Π'],
  [/\\rho|\\varrho/g, 'ρ'],
  [/\\sigma/g, 'σ'],
  [/\\Sigma/g, 'Σ'],
  [/\\tau/g, 'τ'],
  [/\\upsilon/g, 'υ'],
  [/\\Upsilon/g, 'Υ'],
  [/\\phi|\\varphi/g, 'φ'],
  [/\\Phi/g, 'Φ'],
  [/\\chi/g, 'χ'],
  [/\\psi/g, 'ψ'],
  [/\\Psi/g, 'Ψ'],
  [/\\omega/g, 'ω'],
  [/\\Omega/g, 'Ω'],

  // Math Operators & Relations
  [/\\pm|\+\/-/g, '±'],
  [/\\mp/g, '∓'],
  [/\\approx|~=/g, '≈'],
  [/\\neq|!=|\\ne/g, '≠'],
  [/\\leq|<=|\\le/g, '≤'],
  [/\\geq|>=|\\ge/g, '≥'],
  [/\\ll/g, '≪'],
  [/\\gg/g, '≫'],
  [/\\times/g, '×'],
  [/\\cdot|\*/g, '·'],
  [/\\div/g, '÷'],
  [/\\degree|\^\\circ/g, '°'],
  [/\\infty/g, '∞'],
  [/\\partial/g, '∂'],
  [/\\nabla/g, '∇'],
  [/\\int/g, '∫'],
  [/\\iint/g, '∬'],
  [/\\sum/g, '∑'],
  [/\\prod/g, '∏'],
  [/\\in/g, '∈'],
  [/\\notin/g, '∉'],
  [/\\subset/g, '⊂'],
  [/\\subseteq/g, '⊆'],
  [/\\cup/g, '∪'],
  [/\\cap/g, '∩'],
  [/\\angle/g, '∠'],
  [/\\perp/g, '⊥'],
  [/\\sim/g, '∼'],
];

/**
 * Converts a string of characters to superscripts.
 */
export function toSuperscript(str: string): string {
  return str
    .split('')
    .map((char) => SUPERSCRIPT_MAP[char] || char)
    .join('');
}

/**
 * Converts a string of characters to subscripts.
 */
export function toSubscript(str: string): string {
  return str
    .split('')
    .map((char) => SUBSCRIPT_MAP[char] || char)
    .join('');
}

/**
 * Converts LaTeX/AsciiMath/Chemical formula code into clear, human-readable Unicode text.
 * E.g.: "HA \\rightarrow H^+ + A^-" -> "HA → H⁺ + A⁻"
 * E.g.: "Ag^+ + Cl^- \\rightarrow AgCl \\downarrow" -> "Ag⁺ + Cl⁻ → AgCl ↓"
 * E.g.: "Pb^{2+} + 2 Cl^- \\rightarrow PbCl_2 \\downarrow" -> "Pb²⁺ + 2 Cl⁻ → PbCl₂ ↓"
 */
export function formatFormulaToReadableText(rawFormula: string): string {
  if (!rawFormula) return '';

  let formula = rawFormula.trim();

  // Strip wrapping delimiters if present ($...$, ($...$), $$...$$, \(...\), \[...\])
  if (formula.startsWith('($') && formula.endsWith('$)')) {
    formula = formula.slice(2, -2).trim();
  } else if (formula.startsWith('$$') && formula.endsWith('$$')) {
    formula = formula.slice(2, -2).trim();
  } else if (formula.startsWith('$') && formula.endsWith('$')) {
    formula = formula.slice(1, -1).trim();
  } else if (formula.startsWith('\\(') && formula.endsWith('\\)')) {
    formula = formula.slice(2, -2).trim();
  } else if (formula.startsWith('\\[') && formula.endsWith('\\]')) {
    formula = formula.slice(2, -2).trim();
  }

  // 1. Remove LaTeX text wrappers: \text{...}, \mathrm{...}, \mathbf{...}
  formula = formula.replace(/\\(text|mathrm|mathbf|mathit)\{([^}]+)\}/g, '$2');

  // 2. Square roots: \sqrt{...} -> √( ... )
  formula = formula.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '$1√($2)');
  formula = formula.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');

  // 3. Fractions: \frac{a}{b} -> (a / b) or a / b
  formula = formula.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (_m, num, den) => {
    const cleanNum = formatFormulaToReadableText(num);
    const cleanDen = formatFormulaToReadableText(den);
    // If simple single tokens, write directly as num / den, else with parentheses
    const needsNumParen = cleanNum.includes(' ') || cleanNum.includes('+') || cleanNum.includes('-');
    const needsDenParen = cleanDen.includes(' ') || cleanDen.includes('+') || cleanDen.includes('-');
    const formattedNum = needsNumParen ? `(${cleanNum})` : cleanNum;
    const formattedDen = needsDenParen ? `(${cleanDen})` : cleanDen;
    return `${formattedNum} / ${formattedDen}`;
  });

  // 4. Superscripts with curly braces: ^{...}
  formula = formula.replace(/\^\{([^}]+)\}/g, (_m, p1) => toSuperscript(p1));
  // Superscripts single char/sign: ^+, ^-, ^2, ^3, ^x, etc.
  formula = formula.replace(/\^([0-9+\-nixyz])/g, (_m, p1) => toSuperscript(p1));

  // 5. Subscripts with curly braces: _{...}
  formula = formula.replace(/_\{([^}]+)\}/g, (_m, p1) => toSubscript(p1));
  // Subscripts single char: _2, _3, _s, _0, etc.
  formula = formula.replace(/_([0-9a-z])/g, (_m, p1) => toSubscript(p1));

  // 6. Apply symbol replacements (Greek letters, arrows, relations)
  for (const [regex, replacement] of SYMBOL_REPLACEMENTS) {
    formula = formula.replace(regex, replacement);
  }

  // 7. Clean up remaining LaTeX commands and braces
  formula = formula.replace(/\\[a-zA-Z]+/g, (match) => {
    // If standard math func, keep as name
    const stripped = match.slice(1);
    if (/^(ln|lg|log|exp|sin|cos|tan|cot|lim|max|min|det)$/i.test(stripped)) {
      return stripped;
    }
    return '';
  });

  // Clean double spaces or rogue backslashes
  formula = formula.replace(/\\/g, '');
  formula = formula.replace(/\s+/g, ' ').trim();

  return formula;
}

/**
 * Scans a full text and replaces all math/chemistry codes embedded in
 * ($...$), $$...$$, $...$, \(...\), \[...\] with readable, formatted plain text.
 */
export function convertAllFormulaCodesToReadableText(fullText: string): string {
  if (!fullText) return '';

  let result = fullText;

  // 1. Enclosed ($...$) formulas
  result = result.replace(/\(\$([^$]+)\$\)/g, (_match, p1) => {
    return `(${formatFormulaToReadableText(p1)})`;
  });

  // 2. Block equations $$...$$
  result = result.replace(/\$\$([^$]+)\$\$/g, (_match, p1) => {
    return `\n${formatFormulaToReadableText(p1)}\n`;
  });

  // 3. Inline equations $...$ (avoiding empty or single spaces)
  result = result.replace(/\$([^$\n]+)\$/g, (_match, p1) => {
    return formatFormulaToReadableText(p1);
  });

  // 4. LaTeX delimiters \(...\) and \[...\]
  result = result.replace(/\\\(([\s\S]+?)\\\)/g, (_match, p1) => {
    return formatFormulaToReadableText(p1);
  });
  result = result.replace(/\\\[([\s\S]+?)\\\]/g, (_match, p1) => {
    return `\n${formatFormulaToReadableText(p1)}\n`;
  });

  return result;
}

/**
 * A styled component that renders an inline or block formula nicely.
 */
export const FormattedFormulaView: React.FC<{
  raw: string;
  isBlock?: boolean;
  className?: string;
}> = ({ raw, isBlock = false, className = '' }) => {
  const readable = formatFormulaToReadableText(raw);

  if (isBlock) {
    return (
      <div
        className={`my-2 px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-teal-500/30 text-teal-200 font-mono text-xs flex items-center justify-center gap-3 shadow-inner group ${className}`}
        title={raw}
      >
        <span className="font-semibold text-sm tracking-wide text-teal-300 select-all text-center">
          {readable}
        </span>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-[11px] font-semibold bg-teal-950/60 text-teal-300 border border-teal-500/30 shadow-2xs select-all transition-all hover:border-teal-400 ${className}`}
      title={raw}
    >
      {readable}
    </span>
  );
};

/**
 * Parses and renders any formula codes inside a text segment into clean readable components.
 */
export function renderFormulasInText(
  rawText: string,
  keyPrefix = 'formula'
): React.ReactNode {
  if (!rawText) return null;

  // Formula patterns:
  // 1. Enclosed ($...$)
  // 2. Block $$...$$ or \[...\]
  // 3. Inline $...$ or \(...\)
  const regex = /(\(\$[^$]+\$\)|\$\$[^$]+\$\$|\$[^$\n]+\$|\\\(.+?\\\)|\\\[.+?\\\])/g;

  let lastIdx = 0;
  const elements: React.ReactNode[] = [];
  let match: RegExpExecArray | null;
  let counter = 0;

  // Clean residual latex codes in plain text chunks
  const cleanPlainText = (txt: string) => {
    return txt
      .replace(/\\rightarrow|-->/g, '→')
      .replace(/\\rightleftharpoons|<=>/g, '⇄')
      .replace(/\\downarrow/g, '↓')
      .replace(/\\uparrow/g, '↑')
      .replace(/\\leftarrow|<--/g, '←');
  };

  while ((match = regex.exec(rawText)) !== null) {
    const start = match.index;
    const matchedStr = match[0];

    if (start > lastIdx) {
      elements.push(cleanPlainText(rawText.substring(lastIdx, start)));
    }

    const itemKey = `${keyPrefix}-${start}-${counter++}`;

    if (matchedStr.startsWith('($') && matchedStr.endsWith('$)')) {
      const inner = matchedStr.slice(2, -2);
      elements.push(
        <span key={itemKey} className="inline-flex items-center">
          <span className="text-slate-400 font-sans">(</span>
          <FormattedFormulaView raw={inner} isBlock={false} />
          <span className="text-slate-400 font-sans">)</span>
        </span>
      );
    } else if (
      (matchedStr.startsWith('$$') && matchedStr.endsWith('$$')) ||
      (matchedStr.startsWith('\\[') && matchedStr.endsWith('\\]'))
    ) {
      const inner = matchedStr.slice(2, -2);
      elements.push(<FormattedFormulaView key={itemKey} raw={inner} isBlock={true} />);
    } else if (
      (matchedStr.startsWith('$') && matchedStr.endsWith('$')) ||
      (matchedStr.startsWith('\\(') && matchedStr.endsWith('\\)'))
    ) {
      const inner = matchedStr.slice(1, -1);
      elements.push(<FormattedFormulaView key={itemKey} raw={inner} isBlock={false} />);
    }

    lastIdx = start + matchedStr.length;
  }

  if (lastIdx < rawText.length) {
    elements.push(cleanPlainText(rawText.substring(lastIdx)));
  }

  if (elements.length === 0) {
    return cleanPlainText(rawText);
  }

  return <>{elements}</>;
}

/**
 * Comprehensive Cheat Sheet & Reference for Chemistry, Math, and Physics formula codes.
 */
export interface FormulaCheatSheetSection {
  category: 'chemistry' | 'math' | 'physics' | 'general';
  title: string;
  description: string;
  items: Array<{
    code: string;
    rendered: string;
    description: string;
    example?: string;
  }>;
}

export const FORMULA_GUIDE_DATA: FormulaCheatSheetSection[] = [
  {
    category: 'general',
    title: 'Allgemeine Formatierung & Delimiter',
    description: 'Wie du Formel-Codes in deine Mitschriften einbettest:',
    items: [
      {
        code: '($HA \\rightarrow H^+ + A^-$)',
        rendered: '(HA → H⁺ + A⁻)',
        description: 'Eingeklammerte Inline-Formel – wird sofort in lesbaren Text mit Pfeilen & Ladungen formatiert.',
        example: 'Säure-Base-Reaktion ($HA \\rightarrow H^+ + A^-$)',
      },
      {
        code: '$E = m \\cdot c^2$',
        rendered: 'E = m · c²',
        description: 'Standard Inline-Formel mit $...$. Ideal im Fließtext.',
        example: 'Einstein bewies $E = m \\cdot c^2$',
      },
      {
        code: '$$\\text{pH} = \\text{p}K_s + \\lg \\frac{[A^-]}{[HA]}$$',
        rendered: 'pH = pKₛ + lg ([A⁻] / [HA])',
        description: 'Block-Gleichung mit $$...$$. Wird als hervorgehobener Kasten dargestellt.',
        example: 'Zentrale Puffergleichung:',
      },
    ],
  },
  {
    category: 'chemistry',
    title: 'Chemische Codes (Reaktionen, Ionen & Komplexe)',
    description: 'Reaktionsgleichungen, Ionenladungen, Fällungen und Komplexe:',
    items: [
      {
        code: '\\rightarrow  oder  ->',
        rendered: '→',
        description: 'Reaktionspfeil nach rechts.',
        example: '$2 H_2 + O_2 \\rightarrow 2 H_2O$',
      },
      {
        code: '\\rightleftharpoons  oder  <=>',
        rendered: '⇄',
        description: 'Chemischer Gleichgewichtspfeil (Hin- & Rückreaktion).',
        example: '$2 H_2O \\rightleftharpoons H_3O^+ + OH^-$',
      },
      {
        code: '\\downarrow',
        rendered: '↓',
        description: 'Niederschlag / Fällung eines schwerlöslichen Salzes.',
        example: '$Ag^+ + Cl^- \\rightarrow AgCl \\downarrow$',
      },
      {
        code: '\\uparrow',
        rendered: '↑',
        description: 'Entweichendes Gas (z.B. CO₂, H₂S).',
        example: '$CaCO_3 + 2 HCl \\rightarrow CaCl_2 + H_2O + CO_2 \\uparrow$',
      },
      {
        code: 'H^+  /  A^-  /  Pb^{2+}  /  CrO_4^{2-}',
        rendered: 'H⁺ / A⁻ / Pb²⁺ / CrO₄²⁻',
        description: 'Ionenladungen & Wertigkeiten als Hochstellung (^).',
        example: '$Pb^{2+} + CrO_4^{2-} \\rightarrow PbCrO_4 \\downarrow$',
      },
      {
        code: 'H_2O  /  PbCl_2  /  H_3O^+',
        rendered: 'H₂O / PbCl₂ / H₃O⁺',
        description: 'Stöchiometrische Indizes als Tiefstellung (_).',
        example: '$Hg_2^{2+} + 2 Cl^- \\rightarrow Hg_2Cl_2 \\downarrow$',
      },
      {
        code: '[Ag(NH_3)_2]^+',
        rendered: '[Ag(NH₃)₂]⁺',
        description: 'Komplexverbindungen (Diamminsilber(I)-Komplex).',
        example: 'Löslicher Komplex $[Ag(NH_3)_2]^+$',
      },
    ],
  },
  {
    category: 'math',
    title: 'Mathematische Codes (Brüche, Potenzen, Wurzeln)',
    description: 'Mathematische Formeln, Vergleichszeichen und Analysis:',
    items: [
      {
        code: '\\frac{Zähler}{Nenner}',
        rendered: 'Zähler / Nenner',
        description: 'Brüche (automatisch lesbar formatiert).',
        example: '$$K_s = \\frac{[H_3O^+][A^-]}{[HA]}$$',
      },
      {
        code: 'x^2  /  10^{-14}  /  e^{-k \\cdot t}',
        rendered: 'x² / 10⁻¹⁴ / e⁻ᵏ·ᵗ',
        description: 'Potenzen und Exponenten.',
        example: '$K_W = 10^{-14} \\text{ mol}^2/\\text{L}^2$',
      },
      {
        code: '\\sqrt{x}  /  \\sqrt[3]{V}',
        rendered: '√(x) / ³√(V)',
        description: 'Quadrat- und n-te Wurzeln.',
        example: 'Standardabweichung $\\sigma = \\sqrt{s^2}$',
      },
      {
        code: '\\cdot  /  \\times  /  \\pm',
        rendered: '· / × / ±',
        description: 'Multiplikationspunkte und Plus-Minus-Zeichen.',
        example: '$c = 2.5 \\pm 0.1 \\text{ mg/mL}$',
      },
      {
        code: '\\approx  /  \\neq  /  \\leq  /  \\geq',
        rendered: '≈ / ≠ / ≤ / ≥',
        description: 'Vergleichs- und Näherungsoperatoren.',
        example: '$\\text{pH} \\approx 7.4$',
      },
      {
        code: '\\infty  /  \\sum  /  \\int  /  \\partial',
        rendered: '∞ / ∑ / ∫ / ∂',
        description: 'Unendlich, Summenzeichen, Integrale und partielle Ableitung.',
        example: '$$\\beta = \\frac{\\partial c_B}{\\partial \\text{pH}}$$',
      },
    ],
  },
  {
    category: 'physics',
    title: 'Physikalische Codes (Griechische Buchstaben & Einheiten)',
    description: 'Physikalische Größen, Wellenlängen, Dichte, Thermodynamik:',
    items: [
      {
        code: '\\Delta  (z.B. \\Delta T, \\Delta H, \\Delta G)',
        rendered: 'Δ (z.B. ΔT, ΔH, ΔG)',
        description: 'Differenz / Änderung (Enthalpie, freie Enthalpie, Temperatur).',
        example: 'Gibbs-Helmholtz: $\\Delta G = \\Delta H - T \\cdot \\Delta S$',
      },
      {
        code: '\\lambda  /  \\nu  /  \\omega  /  \\Omega',
        rendered: 'λ / ν / ω / Ω',
        description: 'Wellenlänge, Frequenz, Kreisfrequenz, Widerstand (Ohm).',
        example: 'Wellenlänge $\\lambda = 540 \\text{ nm}$',
      },
      {
        code: '\\mu  /  \\rho  /  \\eta  /  \\sigma',
        rendered: 'μ / ρ / η / σ',
        description: 'Mikro / chemisches Potential, Dichte, dynamische Viskosität, Oberflächenspannung.',
        example: 'Viskosität $\\eta = 1.002 \\text{ mPa} \\cdot \\text{s}$',
      },
      {
        code: '\\alpha  /  \\beta  /  \\gamma',
        rendered: 'α / β / γ',
        description: 'Strahlungsarten, Dissoziationsgrad, Pufferkapazität.',
        example: 'Pufferkapazität $\\beta$',
      },
      {
        code: 'm/s^2  /  ^{\\circ}C  /  J/(mol \\cdot K)',
        rendered: 'm/s² / °C / J/(mol·K)',
        description: 'Physikalische und thermodynamische Einheiten.',
        example: 'Temperatur $T = 25^{\\circ}\\text{C}$',
      },
      {
        code: 'E = \\varepsilon \\cdot c \\cdot d',
        rendered: 'E = ε · c · d',
        description: 'Lambert-Beer-Gesetz (Photometrie / Arzneibuch-Analytik).',
        example: '$E = \\varepsilon \\cdot c \\cdot d$',
      },
    ],
  },
];
