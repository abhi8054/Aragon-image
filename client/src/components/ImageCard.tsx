import type { UploadItem } from "../types";

const STATUS_LABEL: Record<UploadItem["status"], string> = {
  uploading: "Uploading…",
  processing: "Validating…",
  accepted: "Accepted",
  rejected: "Rejected",
};

// Browsers can't render HEIC in an <img> tag, so until the server hands back a
// converted JPEG preview, show a placeholder instead of a broken image icon.
const HEIC_NAME_PATTERN = /\.hei[cf]$/i;

export function ImageCard({ item, onRemove }: { item: UploadItem; onRemove: (clientId: string) => void }) {
  const isBusy = item.status === "uploading" || item.status === "processing";
  const previewUrl = item.serverImage?.previewUrl ?? item.localPreviewUrl;
  const showPlaceholder = isBusy && !item.serverImage?.previewUrl && HEIC_NAME_PATTERN.test(item.fileName);
  const [primaryReason, ...otherReasons] = item.reasons;

  return (
    <div className={`image-card image-card--${item.status}`}>
      <div className={`image-card__preview ${isBusy ? "image-card__preview--busy" : ""}`}>
        {showPlaceholder ? (
          <div className="image-card__placeholder">HEIC</div>
        ) : (
          <img src={previewUrl} alt={item.fileName} loading="lazy" />
        )}
        {!isBusy && (
          <button
            type="button"
            className="image-card__remove"
            aria-label={`Remove ${item.fileName}`}
            onClick={() => onRemove(item.clientId)}
          >
            &times;
          </button>
        )}
      </div>
      <div className="image-card__body">
        <p className="image-card__name" title={item.fileName}>
          {item.fileName}
        </p>
        <span className={`status-badge status-badge--${item.status}`}>
          {STATUS_LABEL[item.status]}
        </span>
        {primaryReason && (
          <p
            className="image-card__reason"
            title={otherReasons.length ? item.reasons.join("; ") : undefined}
          >
            {primaryReason}
            {otherReasons.length > 0 && ` (+${otherReasons.length} more)`}
          </p>
        )}
      </div>
    </div>
  );
}
