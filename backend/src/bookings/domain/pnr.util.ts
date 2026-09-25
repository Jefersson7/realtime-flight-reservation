import { randomInt } from 'crypto';

// Excludes ambiguous characters (0/O, 1/I) so a spoken/read-aloud PNR is
// never misheard between a zero and a letter O, or a one and a letter I.
const PNR_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PNR_LENGTH = 6;

export function generatePnr(): string {
  let code = '';
  for (let i = 0; i < PNR_LENGTH; i++) {
    code += PNR_ALPHABET[randomInt(PNR_ALPHABET.length)];
  }
  return code;
}
