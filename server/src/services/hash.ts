import sharp from "sharp";

const HASH_WIDTH = 9;
const HASH_HEIGHT = 8;

/**
 * Difference hash (dHash): downsample to a tiny grayscale grid and record
 * whether each pixel is brighter than its right neighbor. Perceptually
 * similar images produce hashes with a small Hamming distance, so this is
 * a cheap way to flag near-duplicate uploads without full image comparison.
 */
export async function computeDHash(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer)
    .resize(HASH_WIDTH, HASH_HEIGHT, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let bits = "";
  for (let row = 0; row < HASH_HEIGHT; row++) {
    for (let col = 0; col < HASH_WIDTH - 1; col++) {
      const left = data[row * HASH_WIDTH + col];
      const right = data[row * HASH_WIDTH + col + 1];
      bits += left > right ? "1" : "0";
    }
  }

  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8).padEnd(8, "0"), 2));
  }
  return Buffer.from(bytes).toString("hex");
}

export function hammingDistance(hashA: string, hashB: string): number {
  const bufA = Buffer.from(hashA, "hex");
  const bufB = Buffer.from(hashB, "hex");
  const length = Math.min(bufA.length, bufB.length);
  let distance = Math.abs(bufA.length - bufB.length) * 8;
  for (let i = 0; i < length; i++) {
    let xor = bufA[i] ^ bufB[i];
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}
