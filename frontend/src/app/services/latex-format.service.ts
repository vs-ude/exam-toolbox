export const LATEX_FORMATS = {
  bold: { prefix: '\\textbf{', suffix: '}' },
  italic: { prefix: '\\textit{', suffix: '}' },
  underline: { prefix: '\\underline{', suffix: '}' },
  monospace: { prefix: '\\texttt{', suffix: '}' },
  math: { prefix: '\\(', suffix: '\\)' },
} as const;

export type LatexFormat = keyof typeof LATEX_FORMATS;

export interface FormatResult {
  value: string;
  selStart: number;
  selEnd: number;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatRegex(format: LatexFormat): RegExp {
  const { prefix, suffix } = LATEX_FORMATS[format];
  return new RegExp(
    escapeRegex(prefix) + '([\\s\\S]*?)' + escapeRegex(suffix),
    'g',
  );
}

function wrap(prefix: string, suffix: string, content: string): string {
  return prefix + content + suffix;
}

/**
 * Applies or toggles a LaTeX format command around the current selection.
 *
 * The four cases handled, in priority order:
 *
 * 1. Cursor or selection is fully inside an existing command of this type:
 *    a. No selection, or selection equals the entire command content
 *       → Remove the command wrapper entirely.
 *       `\textit{hello}` + cursor inside  →  `hello`
 *       `\textit{hello}` + select "hello" →  `hello`
 *    b. Partial selection inside the command
 *       → Remove outer wrapper, re-wrap only the selection.
 *       `\textit{italicized text}` + select "text"  →  `italicized \textit{text}`
 *
 * 2. Selection is a superset: one or more existing commands of this type are
 *    fully contained within the selection.
 *    → Strip those inner wrappers and wrap the whole selection instead.
 *    `italicized \textit{text}` + select all  →  `\textit{italicized text}`
 *
 * 3. No relationship to any existing command.
 *    → Wrap the selection.
 *    `italicized text` + select all  →  `\textit{italicized text}`
 */
export function applyLatexFormat(
  value: string,
  selStart: number,
  selEnd: number,
  format: LatexFormat,
): FormatResult {
  const { prefix, suffix } = LATEX_FORMATS[format];
  const regex = () => formatRegex(format);

  // ── Case 1: selection is inside an existing command ──────────────────────
  let match: RegExpExecArray | null;
  const re1 = regex();
  while ((match = re1.exec(value)) !== null) {
    const cmdStart = match.index;
    const contentStart = cmdStart + prefix.length;
    const contentEnd = contentStart + match[1].length;
    const cmdEnd = contentEnd + suffix.length;

    if (selStart >= contentStart && selEnd <= contentEnd) {
      const content = match[1];
      const relStart = selStart - contentStart;
      const relEnd = selEnd - contentStart;
      const selected = content.slice(relStart, relEnd);

      // No selection OR entire content selected → strip the command
      if (selected === '' || (relStart === 0 && relEnd === content.length)) {
        const newValue =
          value.slice(0, cmdStart) + content + value.slice(cmdEnd);
        const newSel = cmdStart + relStart;
        return {
          value: newValue,
          selStart: newSel,
          selEnd: cmdStart + relEnd,
        };
      }

      // Partial selection → split: keep non-selected text outside, re-wrap selection
      const before = content.slice(0, relStart);
      const after = content.slice(relEnd);
      const newMiddle = before + wrap(prefix, suffix, selected) + after;
      const newValue =
        value.slice(0, cmdStart) + newMiddle + value.slice(cmdEnd);
      const newSelStart = cmdStart + before.length + prefix.length;
      return {
        value: newValue,
        selStart: newSelStart,
        selEnd: newSelStart + selected.length,
      };
    }
  }

  // ── Case 2: selection is a superset of one or more commands ──────────────
  const contained: RegExpExecArray[] = [];
  const re2 = regex();
  while ((match = re2.exec(value)) !== null) {
    const cmdStart = match.index;
    const cmdEnd = cmdStart + match[0].length;
    if (cmdStart >= selStart && cmdEnd <= selEnd) {
      contained.push(match);
    }
  }

  if (contained.length > 0) {
    // Strip inner wrappers right-to-left to preserve earlier indices
    let stripped = value;
    let adjustedSelEnd = selEnd;
    for (let i = contained.length - 1; i >= 0; i--) {
      const m = contained[i];
      const mStart = m.index;
      const mEnd = mStart + m[0].length;
      const inner = m[1];
      stripped = stripped.slice(0, mStart) + inner + stripped.slice(mEnd);
      adjustedSelEnd -= m[0].length - inner.length;
    }
    // Wrap the whole (now-stripped) selection
    const selectedText = stripped.slice(selStart, adjustedSelEnd);
    const wrapped = wrap(prefix, suffix, selectedText);
    const newValue =
      stripped.slice(0, selStart) + wrapped + stripped.slice(adjustedSelEnd);
    const newSelStart = selStart + prefix.length;
    return {
      value: newValue,
      selStart: newSelStart,
      selEnd: newSelStart + selectedText.length,
    };
  }

  // ── Case 3: no relationship — simply wrap the selection ──────────────────
  const selected = value.slice(selStart, selEnd);
  const wrapped = wrap(prefix, suffix, selected);
  const newValue = value.slice(0, selStart) + wrapped + value.slice(selEnd);
  const newSelStart = selStart + prefix.length;
  return {
    value: newValue,
    selStart: newSelStart,
    selEnd: newSelStart + selected.length,
  };
}

/**
 * Returns true when the cursor/selection is inside, or the selection contains,
 * a LaTeX command of the given format type — used to light up toolbar buttons.
 */
export function isCursorInFormat(
  value: string,
  selStart: number,
  selEnd: number,
  format: LatexFormat,
): boolean {
  const { prefix, suffix } = LATEX_FORMATS[format];
  const regex = formatRegex(format);

  let match: RegExpExecArray | null;
  while ((match = regex.exec(value)) !== null) {
    const cmdStart = match.index;
    const contentStart = cmdStart + prefix.length;
    const contentEnd = contentStart + match[1].length;
    const cmdEnd = contentEnd + suffix.length;

    // Cursor / selection is inside the command content
    if (selStart >= contentStart && selEnd <= contentEnd) return true;

    // Command is fully inside the selection (superset)
    if (cmdStart >= selStart && cmdEnd <= selEnd) return true;
  }
  return false;
}
