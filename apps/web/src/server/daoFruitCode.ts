// 道果码（设定·二十章三）：8 位，字符集去 0/O/1/I/L，末位校验
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // 31 字符（去 0,1,I,L,O）

export function generateDaoFruitCode(rng: () => number): string {
  const body = Array.from({ length: 7 }, () => ALPHABET[Math.floor(rng() * ALPHABET.length)]).join("");
  const check = checksum(body);
  return `${body}${check}`;
}

export function checksum(body: string): string {
  if (body.length !== 7) throw new Error("道果码主体必须为 7 位");
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    sum += ALPHABET.indexOf(body[i]!) * (i + 3);
  }
  return ALPHABET[sum % ALPHABET.length]!;
}

export function isValidDaoFruitCode(code: string): boolean {
  const clean = code.replace("-", "").toUpperCase();
  if (clean.length !== 8) return false;
  const body = clean.slice(0, 7);
  if (![...body].every((c) => ALPHABET.includes(c))) return false;
  return clean[7] === checksum(body);
}

export function normalizeDaoFruitCode(code: string): string | null {
  const clean = code.replace(/[^2-9A-Za-z]/g, "").toUpperCase();
  return isValidDaoFruitCode(clean) ? clean : null;
}
