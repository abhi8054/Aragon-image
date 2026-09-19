import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { deleteObject, getSignedPreviewUrl } from "../s3";
import { upload } from "../middleware/upload";
import { asyncHandler } from "../middleware/asyncHandler";
import { createProcessingRecord, runValidationPipeline } from "../services/processImage";

export const imagesRouter = Router();

const listQuerySchema = z.object({
  status: z.enum(["PROCESSING", "ACCEPTED", "REJECTED"]).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(30),
});

imagesRouter.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const record = await createProcessingRecord({
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
    });

    // Processing runs asynchronously so the upload request returns immediately;
    // the client polls (or refetches) the record to observe the status transition.
    runValidationPipeline(record.id).catch((error) => {
      console.error(`Unhandled error processing image ${record.id}:`, error);
    });

    res.status(202).json(await serializeImage(record));
  })
);

imagesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);

    const images = await prisma.image.findMany({
      where: query.status ? { status: query.status } : undefined,
      orderBy: { createdAt: "desc" },
      take: query.limit,
      ...(query.cursor && {
        cursor: { id: query.cursor },
        skip: 1,
      }),
    });

    const serialized = await Promise.all(images.map(serializeImage));
    const nextCursor = images.length === query.limit ? images[images.length - 1].id : null;

    res.json({ images: serialized, nextCursor });
  })
);

imagesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const record = await prisma.image.findUnique({ where: { id: req.params.id } });
    if (!record) return res.status(404).json({ error: "Image not found" });
    res.json(await serializeImage(record));
  })
);

imagesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const record = await prisma.image.findUnique({ where: { id: req.params.id } });
    if (!record) return res.status(404).json({ error: "Image not found" });

    await deleteObject(record.storageKeyOriginal);
    if (record.storageKeyProcessed) await deleteObject(record.storageKeyProcessed);
    await prisma.image.delete({ where: { id: record.id } });

    res.status(204).send();
  })
);

async function serializeImage(record: Awaited<ReturnType<typeof prisma.image.findUniqueOrThrow>>) {
  const previewKey = record.storageKeyProcessed ?? record.storageKeyOriginal;
  const previewUrl = await getSignedPreviewUrl(previewKey);

  return {
    id: record.id,
    originalName: record.originalName,
    mimeType: record.mimeType,
    fileSize: record.fileSize,
    width: record.width,
    height: record.height,
    status: record.status,
    rejectionReasons: record.rejectionReasons,
    previewUrl,
    createdAt: record.createdAt,
  };
}
