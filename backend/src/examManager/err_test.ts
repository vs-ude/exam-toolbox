import { assertEquals } from '@std/assert';
import { LatexCompileError } from './err.ts';

Deno.test('LatexCompileError.parseErrorLog parses marker JSON', () => {
  const msg = 'error in aufgaben.tex:4: undefined control sequence';
  const content = [
    'line 1',
    '%% MARKER: {"group":1,"task":2,"type":"shortAnswer"}',
    'line 3',
    'line 4',
  ].join('\n');

  const err = new LatexCompileError(msg);
  const cause = err.parseErrorLog(msg, content);

  assertEquals(cause, { group: 1, task: 2, type: 'shortAnswer' });
});

Deno.test('LatexCompileError.parseErrorLog reports missing marker', () => {
  const msg = 'error in aufgaben.tex:3: missing $ inserted';
  const content = ['line 1', 'line 2', 'line 3'].join('\n');

  const err = new LatexCompileError(msg);
  const cause = err.parseErrorLog(msg, content);

  assertEquals(cause, {
    info: 'Unable to locate marker before error line',
    line: 3,
  });
});
