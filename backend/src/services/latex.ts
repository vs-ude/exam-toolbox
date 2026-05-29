import { Eta } from "@bgub/eta";
import { TEMPLATE_BASE_PATH } from "../config/paths.ts";

let cachedEta: Eta;

export function getEta(): Eta {
  if (cachedEta) return cachedEta;

  cachedEta = new Eta({
    autoEscape: false,
    rmWhitespace: false,
    tags: ["<#", "#>"],
    views: TEMPLATE_BASE_PATH,
    defaultExtension: ".template.tex",
    cache: true,
  });
  return cachedEta;
}

export function escapeLatex(text?: string): string {
  if (!text) return "";

  // Escape special LaTeX characters
  text = text.replace(/([&%$#_{}~^\\])/g, "\\$1");

  // Convert basic HTML formatting to LaTeX commands
  text = text
    .replace(/<b>(.*?)<\/b>/g, "\\textbf{$1}")
    .replace(/<i>(.*?)<\/i>/g, "\\textit{$1}")
    .replace(/<br\s*\/?>/g, "\\\\")
    .replace(/<u>(.*?)<\/u>/g, "\\underline{$1}")
    .replace(/<div>([\s\S]*?)<\/div>/g, "\\\\ $1")
    .replace(/\n/g, "\\\\");

  return text;
}
