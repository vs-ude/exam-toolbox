# Plan: LaTeX generation overhaul

## Goals
- Make LaTeX generation in `backend/src/examManager/generation.ts` less brittle and more template-driven.
- Improve maintainability of template assets in `backend/template/`.
- Move QR code generation out of LaTeX and into TypeScript.

## Scope
1. **Robust image cleanup**: `clearLatexIMGFolder` should preserve only files that exist in the original template `img` directory rather than relying on a hard-coded list.
2. **Template-driven meta generation**: `updateMetaStudent` and `updateMetaTemplate` should render `meta-exam.tex` via a template file rather than regex-based replacements.
3. **Task template extraction**: simplify `vs-exams.tex` by splitting task type snippets into dedicated template files, and move point aggregation logic to TypeScript.
4. **TypeScript QR generation**: generate per-exam QR codes in TypeScript, include them as images in LaTeX, and remove `qrcodes.sty` from templates.

## Proposed approach

### 1) Image cleanup from template directory
- Use the runtime template root path (configured via variable in deployment) instead of a hard-coded `backend/template` path.
- Update `clearLatexIMGFolder` to:
  - Read file names from `${templateRoot}/img` as the canonical list to keep.
  - Remove any files from `${workingDir}/img` that are not in that list.
  - Handle missing directories gracefully and log actionable errors.
- Preload the template image file list once (at startup or job creation) and pass it to workers so they can reuse it without re-reading the filesystem.
- Add tests or a small validation script if feasible.

### 2) Template-driven `meta-exam.tex`
- Create a new template file copied from `${templateRoot}/meta-exam.tex` (e.g., `${templateRoot}/meta-exam.template.tex`).
- Choose a templating library compatible with Deno (e.g., `nunjucks` via npm, `eta`, or `mustache`).
- Replace `updateMetaStudent` and `updateMetaTemplate` with a single renderer that:
  - Loads the template file.
  - Injects all meta values in one render pass.
  - Performs LaTeX escaping in a central helper (including spaces).
- Keep `meta-exam.tex` as the output file written into the working directory.

### 3) Task templates for `vs-exams.tex`
- Inspect `${templateRoot}/vs-exams.tex` to locate sections for task types:
  - `multipleChoice`
  - `shortAnswer`
  - `latex`
  - `pictureTask`
  - `table`
  - `manualText`
  - page breaks / section starts
- Extract each type into a separate template file, e.g.:
  - `${templateRoot}/tasks/multipleChoice.tex`
  - `${templateRoot}/tasks/shortAnswer.tex`
  - `${templateRoot}/tasks/pictureTask.tex`
  - etc.
- Update `generation.ts` to:
  - Compute all points and totals in TypeScript.
  - Render each task template with computed values and LaTeX-escaped text.
  - Write each rendered snippet to its own `.tex` file.
  - Emit `\input{...}` lines (or a small include list file) so LaTeX assembles the final document.
- Simplify `vs-exams.tex` by removing the now-unused LaTeX logic and keeping only global styles/macros.

### 4) QR code generation in TypeScript
- Pick a QR library with Deno compatibility (likely `qrcode` via npm).
- For each exam (or per task/participant, as needed), generate a set of QR codes in TypeScript and store them in `${workingDir}/img`.
- Update the LaTeX templates to include the generated QR image files directly.
- Remove `qrcodes.sty` references from the LaTeX templates and any related package usage.

## Deliverables
- `PLAN.md` (this document) committed.
- Template files added/updated under the runtime `${templateRoot}` directory (path resolved from configuration).
- Updated `backend/src/examManager/generation.ts` using templates and QR assets.
- Updated LaTeX templates that no longer depend on `qrcodes.sty`.

## Validation checklist
- Generation still produces valid PDFs for existing exams.
- No missing images or missing LaTeX commands during generation.
- QR code images appear correctly in generated PDFs.
- `clearLatexIMGFolder` only preserves template-origin images.

## Open questions
- Exact list/structure of template images in `${templateRoot}/img`.
- Where the template root variable is configured and how to pass the preloaded image list to workers.
- How many QR codes per exam and their naming scheme.
- Whether per-task point totals are needed in LaTeX or only overall totals.
