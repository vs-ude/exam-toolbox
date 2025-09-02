// executes pdflatex to compile a .tex file and returns the resulting pdf and log file
export async function generateExam(workingDir: string): Promise<{ pdfBytes: Uint8Array, logContent: string }> {
  const examTexPath = `${workingDir}/exam.tex`
  const examPdfPath = `${workingDir}/exam.pdf`
  const examLogPath = `${workingDir}/exam.log`

  try {
    // runs pdflatex three times to ensure all cross-references (like page numbers) are resolved correctly
    for (let i = 0; i < 3; i++) {
      const cmd = new Deno.Command("pdflatex", {
        args: [
          "-interaction=nonstopmode",
          "-halt-on-error",
          "-output-directory",
          workingDir,
          examTexPath,
        ],
        stdout: "piped",
        stderr: "piped",
      })

      const { stdout, stderr } = await cmd.output()
      const stderrStr = new TextDecoder().decode(stderr)

      if (stderrStr) {
        console.error(`pdflatex pass ${i + 1} errors in ${workingDir}:\n${stderrStr}`)
      }
    }

    try {
      await Deno.stat(examPdfPath)
    } catch (err) {
      throw new Error("PDF output file was not generated")
    }

    const pdfBytes = await Deno.readFile(examPdfPath)
    const logContent = await Deno.readTextFile(examLogPath)
    return { pdfBytes, logContent }

  } catch (error) {
    console.error("Error during PDF generation:", error)
    throw new Error("Failed to generate PDF: " + error.message)
  }
}

// reads the latex template and replaces placeholders with dynamic data
export async function updateMetaStudent(options: {
  zeigeloesung?: 'yes' | 'no',
  sprache?: string,
  randomexamnumber?: string,
  sequenznummer?: number,
  vollername?: string,
  matrikelnummer?: number,
  uploadurl?: string,
} = {},
  workingDir: string
) {
  const { zeigeloesung, sprache, randomexamnumber, sequenznummer, vollername, matrikelnummer, uploadurl } = options
  const metaPath = `${workingDir}/meta-exam.tex`

  const metaTemplate = await Deno.readTextFile(metaPath)

  const updatedMeta = metaTemplate
    .replace(/\\newcommand\{\\zeigeloesung\}\{.*?\}/, `\\newcommand{\\zeigeloesung}{${zeigeloesung === 'yes' ? 'yes' : 'no'}}`)
    .replace(/\\newcommand\{\\sprache\}\{.*?\}/, `\\newcommand{\\sprache}{${sprache || 'de'}}`)
    .replace(/\\newcommand\{\\randomexamnumber\}\{.*?\}/, `\\newcommand{\\randomexamnumber}{${randomexamnumber || '7PYT'}}`)
    .replace(/\\newcommand\{\\sequenznummer\}\{.*?\}/, `\\newcommand{\\sequenznummer}{${sequenznummer || '6'}}`)
    .replace(/\\newcommand\{\\vollername\}\{.*?\}/, `\\newcommand{\\vollername}{${vollername ? vollername.replace(/ /g, '\\ ') : 'Tom\ Morello'}}`)
    .replace(/\\newcommand\{\\matrikelnummer\}\{.*?\}/, `\\newcommand{\\matrikelnummer}{${matrikelnummer || '3120434'}}`)
    .replace(/\\newcommand\{\\uploadurl\}\{.*?\}/, `\\newcommand{\\uploadurl}{${uploadurl || 'aklsjdhflkjashdflkjahsdf'}}`)

  await Deno.writeTextFile(metaPath, updatedMeta)
}