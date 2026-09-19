import type { UploadItem } from "../types";

export function PendingFileList({ items }: { items: UploadItem[] }) {
  if (items.length === 0) return null;

  return (
    <>
      <p className="pending-list__hint">It can take up to a minute to validate each photo</p>
      <ul className="pending-list">
        {items.map((item) => (
          <li key={item.clientId} className="pending-list__row">
            <img
              className="pending-list__thumb"
              src={item.serverImage?.previewUrl ?? item.localPreviewUrl}
              alt=""
              onError={(event) => {
                event.currentTarget.style.visibility = "hidden";
              }}
            />
            <span className="pending-list__name" title={item.fileName}>
              {item.fileName}
            </span>
            <span className="pending-list__spinner" aria-hidden />
          </li>
        ))}
      </ul>
    </>
  );
}
