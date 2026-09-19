import convert from "heic-convert";

const HEIC_MAGIC_OFFSET = 4;
const HEIC_BRANDS = ["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1"];

export function isHeicBuffer(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  const brand = buffer.toString("ascii", HEIC_MAGIC_OFFSET + 4, HEIC_MAGIC_OFFSET + 8);
  return HEIC_BRANDS.includes(brand.toLowerCase());
}

export async function heicToJpeg(buffer: Buffer): Promise<Buffer> {
  const output = await convert({ buffer, format: "JPEG", quality: 0.92 });
  return Buffer.from(output);
}
