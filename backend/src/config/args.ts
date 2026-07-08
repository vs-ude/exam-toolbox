import { parseArgs } from '@std/cli/parse-args';
export const flags = parseArgs(Deno.args, {
  boolean: ['help'],
  string: ['conf'],
  default: { conf: '' },
  negatable: [],
});
