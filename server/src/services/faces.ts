import { DetectFacesCommand, RekognitionClient } from "@aws-sdk/client-rekognition";
import { env } from "../env";

const rekognition = new RekognitionClient({
  region: env.REKOGNITION_REGION || env.AWS_REGION,
  credentials:
    env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

export interface FaceDetectionResult {
  faceCount: number;
  largestFaceAreaRatio: number;
}

export async function detectFaces(jpegBuffer: Buffer): Promise<FaceDetectionResult> {
  const response = await rekognition.send(
    new DetectFacesCommand({
      Image: { Bytes: jpegBuffer },
      Attributes: [],
    })
  );

  const faces = response.FaceDetails ?? [];
  const areaRatios = faces.map((face) => {
    const box = face.BoundingBox;
    if (!box || box.Width == null || box.Height == null) return 0;
    return box.Width * box.Height;
  });

  return {
    faceCount: faces.length,
    largestFaceAreaRatio: areaRatios.length ? Math.max(...areaRatios) : 0,
  };
}
