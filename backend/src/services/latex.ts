import { Eta } from '@bgub/eta';

let cachedEta: Eta;

export function getEta(path: string): Eta {
  if (cachedEta) return cachedEta;

  cachedEta = new Eta({
    autoEscape: false,
    rmWhitespace: false,
    tags: ['<#', '#>'],
    views: path,
    defaultExtension: '.template.tex',
    cache: true,
  });
  return cachedEta;
}

export function preprocessLatex(text?: string): string {
  if (!text) return '';
  text = text
    .replace(/<br\s*\/?>/g, '\\\\') // Newline
    .replace(/\n/g, '\\\\') // Newline
    .replace(/\.\.\./g, '\\ldots'); // Ellipsis

  return text;
}
