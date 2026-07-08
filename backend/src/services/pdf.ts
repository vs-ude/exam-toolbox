export async function mergePdfs(
  files: string[],
  output: string,
): Promise<void> {
  if (files.length === 0) return;

  // Ghostscript arguments:
  // -q: quiet mode
  // -dNOPAUSE -dBATCH: process all files and exit
  // -sDEVICE=pdfwrite: write merged PDF output
  const args = [
    '-q',
    '-dNOPAUSE',
    '-dBATCH',
    '-sDEVICE=pdfwrite',
    `-sOutputFile=${output}`,
    ...files,
  ];

  const cmd = new Deno.Command('gs', { args });
  const { success, stderr } = await cmd.output();

  if (!success) {
    throw new Error(
      `Ghostscript merge failed: ${new TextDecoder().decode(stderr)}`,
    );
  }
}
