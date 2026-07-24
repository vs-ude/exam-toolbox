export function stripHTML(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

export function truncateString(input: string, max: number): string {
  if (input.length > max) {
    return input.substring(0, max) + '…';
  }
  return input;
}
