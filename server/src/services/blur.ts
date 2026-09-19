import sharp from "sharp";

const LAPLACIAN_KERNEL = {
  width: 3,
  height: 3,
  kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0],
};

/**
 * Sharpness proxy: variance of the Laplacian of the grayscale image.
 * Low variance means few sharp edges, i.e. a blurry photo.
 */
export async function computeBlurScore(buffer: Buffer): Promise<number> {
  const { data, info } = await sharp(buffer)
    .resize(600, 600, { fit: "inside", withoutEnlargement: true })
    .grayscale()
    .convolve(LAPLACIAN_KERNEL)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelCount = info.width * info.height;
  let sum = 0;
  let sumSquares = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    sumSquares += data[i] * data[i];
  }
  const mean = sum / pixelCount;
  const variance = sumSquares / pixelCount - mean * mean;
  return variance;
}
