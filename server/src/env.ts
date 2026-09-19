import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),

  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().default(""),
  AWS_SECRET_ACCESS_KEY: z.string().default(""),
  S3_BUCKET: z.string().min(1),
  S3_ENDPOINT: z.string().optional().default(""),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),
  // Amazon Rekognition isn't available in every region (e.g. eu-north-1), so its
  // region can be set independently of the S3 bucket's region.
  REKOGNITION_REGION: z.string().optional(),

  MIN_FILE_SIZE_BYTES: z.coerce.number().default(15000),
  MIN_IMAGE_DIMENSION_PX: z.coerce.number().default(400),
  BLUR_VARIANCE_THRESHOLD: z.coerce.number().default(80),
  MIN_FACE_AREA_RATIO: z.coerce.number().default(0.03),
  SIMILARITY_HAMMING_THRESHOLD: z.coerce.number().default(6),
});

export const env = schema.parse(process.env);
