import { useCallback, useEffect, useReducer } from "react";
import { deleteImage, fetchImage, fetchImages, uploadImage } from "../api/client";
import type { ServerImage, UploadItem, UploadStatus } from "../types";

const ACCEPTED_EXTENSIONS = /\.(heic|heif|png|jpe?g)$/i;
const ACCEPTED_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/png",
  "image/jpeg",
]);
const POLL_INTERVAL_MS = 1200;
const POLL_TIMEOUT_MS = 60000;

function validateFileType(file: File): string | null {
  const looksAllowed =
    ACCEPTED_MIME_TYPES.has(file.type.toLowerCase()) || ACCEPTED_EXTENSIONS.test(file.name);
  return looksAllowed ? null : "Unsupported file type. Please upload HEIC, PNG, or JPEG.";
}

function mapServerStatus(status: ServerImage["status"]): UploadStatus {
  if (status === "ACCEPTED") return "accepted";
  if (status === "REJECTED") return "rejected";
  return "processing";
}

type Action =
  | { type: "add"; item: UploadItem }
  | { type: "update"; clientId: string; patch: Partial<UploadItem> }
  | { type: "remove"; clientId: string };

function reducer(state: UploadItem[], action: Action): UploadItem[] {
  switch (action.type) {
    case "add":
      return [action.item, ...state];
    case "update":
      return state.map((item) =>
        item.clientId === action.clientId ? { ...item, ...action.patch } : item
      );
    case "remove":
      return state.filter((item) => item.clientId !== action.clientId);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useImageUpload() {
  const [items, dispatch] = useReducer(reducer, []);

  useEffect(() => {
    fetchImages()
      .then((images) => {
        images.forEach((serverImage) => {
          dispatch({
            type: "add",
            item: {
              clientId: serverImage.id,
              fileName: serverImage.originalName,
              localPreviewUrl: serverImage.previewUrl,
              status: mapServerStatus(serverImage.status),
              reasons: serverImage.rejectionReasons,
              serverImage,
            },
          });
        });
      })
      .catch((error) => console.error("Failed to load existing images", error));
  }, []);

  const pollUntilSettled = useCallback(async (clientId: string, imageId: string) => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      const serverImage = await fetchImage(imageId).catch(() => null);
      if (!serverImage) continue;
      if (serverImage.status !== "PROCESSING") {
        dispatch({
          type: "update",
          clientId,
          patch: {
            status: mapServerStatus(serverImage.status),
            reasons: serverImage.rejectionReasons,
            serverImage,
          },
        });
        return;
      }
    }
    dispatch({
      type: "update",
      clientId,
      patch: { status: "rejected", reasons: ["Processing timed out. Please try again."] },
    });
  }, []);

  const uploadOne = useCallback(
    async (clientId: string, file: File) => {
      try {
        const serverImage = await uploadImage(file);
        dispatch({
          type: "update",
          clientId,
          patch: {
            status: mapServerStatus(serverImage.status),
            reasons: serverImage.rejectionReasons,
            serverImage,
          },
        });
        if (serverImage.status === "PROCESSING") {
          await pollUntilSettled(clientId, serverImage.id);
        }
      } catch (error) {
        dispatch({
          type: "update",
          clientId,
          patch: {
            status: "rejected",
            reasons: [error instanceof Error ? error.message : "Upload failed"],
          },
        });
      }
    },
    [pollUntilSettled]
  );

  const addFiles = useCallback(
    (files: File[]) => {
      for (const file of files) {
        const clientId = crypto.randomUUID();
        const localPreviewUrl = URL.createObjectURL(file);
        const typeError = validateFileType(file);

        if (typeError) {
          dispatch({
            type: "add",
            item: {
              clientId,
              fileName: file.name,
              localPreviewUrl,
              status: "rejected",
              reasons: [typeError],
            },
          });
          continue;
        }

        dispatch({
          type: "add",
          item: {
            clientId,
            fileName: file.name,
            localPreviewUrl,
            status: "uploading",
            reasons: [],
          },
        });
        uploadOne(clientId, file);
      }
    },
    [uploadOne]
  );

  const removeItem = useCallback(
    (clientId: string) => {
      const item = items.find((candidate) => candidate.clientId === clientId);
      dispatch({ type: "remove", clientId });
      if (item?.localPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.localPreviewUrl);
      }
      if (item?.serverImage) {
        deleteImage(item.serverImage.id).catch((error) =>
          console.error(`Failed to delete image ${item.serverImage!.id}`, error)
        );
      }
    },
    [items]
  );

  return { items, addFiles, removeItem };
}
