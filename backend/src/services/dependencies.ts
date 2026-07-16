interface DependencyResult {
  cmd: string;
  args: string[];
  success: boolean;
  code: number;
  stderr: string;
}

export async function checkDependencies(): Promise<boolean> {
  console.info('Checking dependencies...');
  const dependencies = [
    { cmd: 'tectonic', args: ['--version'] },
    { cmd: 'qrencode', args: ['--version'] },
    { cmd: 'zbarimg', args: ['--version'] },
    { cmd: 'magick', args: ['--version'] },
    { cmd: 'gs', args: ['--version'] },
    { cmd: 'zip', args: ['--version'] },
  ];

  const results: DependencyResult[] = [];

  for (const dep of dependencies) {
    const { cmd, args } = dep;
    try {
      const command = new Deno.Command(cmd, {
        args,
        stdout: 'piped',
        stderr: 'piped',
      });
      const child = command.spawn();
      const stderrStr = await new Response(child.stderr).text();

      const status = await child.status;
      if (!status.success) {
        results.push({
          cmd,
          args,
          success: false,
          code: status.code,
          stderr: stderrStr.split('\n', 2)[0],
        });
      } else {
        results.push({
          cmd,
          args,
          success: true,
          code: status.code,
          stderr: stderrStr.split('\n', 2)[0],
        });
      }
    } catch (err) {
      results.push({
        cmd,
        args,
        success: false,
        code: -1,
        stderr: err instanceof Error ? err.message : String(err),
      });
      continue;
    }
  }

  for (const result of results) {
    if (!result.success) {
      console.error('Error during dependency check:', result);
    }
  }

  if (results.some(r => !r.success)) {
    return false;
  }
  return true;
}
