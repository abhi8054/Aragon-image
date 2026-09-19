import type { ServerImage } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export class ApiError extends Error {}

export async function uploadImage(file: File): Promise<ServerImage> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/images`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.error ?? `Upload failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchImage(id: string): Promise<ServerImage> {
  const response = await fetch(`${API_BASE}/api/images/${id}`);
  if (!response.ok) throw new ApiError(`Failed to fetch image ${id}`);
  return response.json();
}

export async function fetchImages(status?: "ACCEPTED" | "REJECTED"): Promise<ServerImage[]> {
  const url = new URL(`${API_BASE}/api/images`);
  if (status) url.searchParams.set("status", status);
  url.searchParams.set("limit", "50");

  const response = await fetch(url);
  if (!response.ok) throw new ApiError("Failed to fetch images");
  const body = await response.json();
  return body.images;
}

export async function deleteImage(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/images/${id}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new ApiError(`Failed to delete image ${id}`);
  }
}
