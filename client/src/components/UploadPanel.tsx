import { UploadDropzone } from "./UploadDropzone";
import { PendingFileList } from "./PendingFileList";
import type { UploadItem } from "../types";

interface Props {
  onFilesSelected: (files: File[]) => void;
  pending: UploadItem[];
}

export function UploadPanel({ onFilesSelected, pending }: Props) {
  return (
    <aside className="upload-panel">
      <h2 className="upload-panel__title">Upload photos</h2>
      <p className="upload-panel__description">
        Add a mix of close-ups, selfies, and mid-range shots. Each photo is automatically
        checked for resolution, blur, duplicates, and face visibility.
      </p>
      <UploadDropzone onFilesSelected={onFilesSelected} isBusy={pending.length > 0} />
      <PendingFileList items={pending} />
    </aside>
  );
}
