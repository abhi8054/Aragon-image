import sharp from "sharp";
import { v4 as uuid } from "uuid";
import { env } from "../env";
import { prisma } from "../prisma";
import { getObject, putObject } from "../s3";
import { heicToJpeg, isHeicBuffer } from "./heic";
import { computeBlurScore } from "./blur";
import { computeDHash, hammingDistance } from "./hash";
import { detectFaces } from "./faces";

export interface UploadedFile {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
]);

export function isAllowedMimeType(mimeType: string, fileName: string): boolean {
  if (ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) return true;
  // Browsers/OSes are inconsistent about the HEIC mime type, so fall back to extension.
  return /\.(heic|heif)$/i.test(fileName);
}

export async function createProcessingRecord(file: UploadedFile) {
  const id = uuid();
  const extension = file.originalName.split(".").pop()?.toLowerCase() || "bin";
  const storageKeyOriginal = `incoming/${id}.${extension}`;

  await putObject(storageKeyOriginal, file.buffer, file.mimeType);

  return prisma.image.create({
    data: {
      id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      fileSize: file.buffer.length,
      storageKeyOriginal,
      status: "PROCESSING",
    },
  });
}

export async function runValidationPipeline(imageId: string): Promise<void> {
  const record = await prisma.image.findUniqueOrThrow({ where: { id: imageId } });
  const reasons: string[] = [];

  try {
    const originalBuffer = await getObject(record.storageKeyOriginal);
    const wasHeic = isHeicBuffer(originalBuffer) || record.mimeType.toLowerCase().includes("hei");
    const jpegBuffer = wasHeic ? await heicToJpeg(originalBuffer) : originalBuffer;

    const normalized = await sharp(jpegBuffer).jpeg({ quality: 92 }).toBuffer();
    const metadata = await sharp(normalized).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    const storageKeyProcessed = `processed/${record.id}.jpg`;
    await putObject(storageKeyProcessed, normalized, "image/jpeg");

    if (record.fileSize < env.MIN_FILE_SIZE_BYTES) {
      reasons.push("File size is too small");
    }
    if (width < env.MIN_IMAGE_DIMENSION_PX || height < env.MIN_IMAGE_DIMENSION_PX) {
      reasons.push(
        `Resolution ${width}x${height} is below the minimum ${env.MIN_IMAGE_DIMENSION_PX}px`
      );
    }

    const blurScore = await computeBlurScore(normalized);
    if (blurScore < env.BLUR_VARIANCE_THRESHOLD) {
      reasons.push("Image is too blurry");
    }

    const perceptualHash = await computeDHash(normalized);
    const isDuplicate = await isTooSimilarToExisting(perceptualHash, record.id);
    if (isDuplicate) {
      reasons.push("Too similar to an existing uploaded image");
    }

    const { faceCount, largestFaceAreaRatio } = await detectFaces(normalized);
    if (faceCount === 0) {
      reasons.push("No face detected");
    } else if (faceCount > 1) {
      reasons.push(`Multiple faces detected (${faceCount})`);
    } else if (largestFaceAreaRatio < env.MIN_FACE_AREA_RATIO) {
      reasons.push("Detected face is too small");
    }

    await prisma.image.update({
      where: { id: record.id },
      data: {
        status: reasons.length ? "REJECTED" : "ACCEPTED",
        rejectionReasons: reasons,
        width,
        height,
        storageKeyProcessed,
        perceptualHash,
        blurScore,
        faceCount,
        faceAreaRatio: largestFaceAreaRatio,
      },
    });
  } catch (error) {
    console.error(`Validation pipeline failed for image ${imageId}:`, error);
    await prisma.image.update({
      where: { id: record.id },
      data: {
        status: "REJECTED",
        rejectionReasons: ["Image could not be processed"],
      },
    });
  }
}

async function isTooSimilarToExisting(hash: string, excludeId: string): Promise<boolean> {
  const existing = await prisma.image.findMany({
    where: {
      id: { not: excludeId },
      status: "ACCEPTED",
      perceptualHash: { not: null },
    },
    select: { perceptualHash: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return existing.some(
    (image) =>
      image.perceptualHash &&
      hammingDistance(hash, image.perceptualHash) <= env.SIMILARITY_HAMMING_THRESHOLD
  );
}
