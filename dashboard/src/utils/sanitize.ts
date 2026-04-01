/** Strip HTML tags en control characters uit user input */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')           // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // strip control chars (behalve \n, \r, \t)
}
