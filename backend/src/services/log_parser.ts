export interface LogInfo {
  page: number;
  logFileBoundaryError: boolean;
}

/**
 * Parse LaTeX log output and extract subtask page metadata.
 *
 * Expected markers:
 * - Aufgabe start: `VSEXAM: {'Typ':'AufgabeStart'`
 * - Subtask line:  `VSEXAM: {'Typ':'AufgabenTeil' ... 'Seite':'<n>' ... }`
 * - Boundary err:  `VSEXAM: {'Typ':'edgeStart' ... 'X': '0' ... }`
 */
export function parseLogFileForSubtaskInfo(logContent: string): LogInfo[] {
  const lines = logContent.split('\n');
  const pages: LogInfo[] = [];

  for (const line of lines) {
    if (line.includes("VSEXAM: {'Typ':'AufgabenTeil'")) {
      const pageMatch = line.match(/'Seite':'(\d+)'/);
      pages.push({
        page: pageMatch ? parseInt(pageMatch[1], 10) : 0,
        logFileBoundaryError: false,
      });
    }

    if (
      line.includes("VSEXAM: {'Typ':'edgeStart'") &&
      line.includes("'X': '0'")
    ) {
      if (pages.length > 0) {
        pages[pages.length - 1].logFileBoundaryError = true;
      }
    }
  }
  return pages;
}
