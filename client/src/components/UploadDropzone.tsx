import { useRef, useState } from "react";
import type { DragEvent } from "react";

interface Props {
  onFilesSelected: (files: File[]) => void;
  isBusy: boolean;
}

export function UploadDropzone({ onFilesSelected, isBusy }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setDragActive] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    onFilesSelected(Array.from(event.dataTransfer.files));
  }

  return (
    <div
      className={`dropzone ${isDragActive ? "dropzone--active" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <span className={`dropzone__pill ${isBusy ? "dropzone__pill--busy" : ""}`}>
        {isBusy ? (
          <>
            <span className="dropzone__spinner" aria-hidden /> Uploading…
          </>
        ) : (
          <>&uarr; Upload files</>
        )}
      </span>
      <p className="dropzone__title">Click to upload or drag and drop</p>
      <p className="dropzone__hint">PNG, JPG, HEIC up to 25MB</p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".heic,.heif,.png,.jpg,.jpeg,image/heic,image/heif,image/png,image/jpeg"
        hidden
        onChange={(event) => {
          if (event.target.files) onFilesSelected(Array.from(event.target.files));
          event.target.value = "";
        }}
      />
    </div>
  );
}
