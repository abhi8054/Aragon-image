import type { UploadItem } from "../types";
import { ImageCard } from "./ImageCard";

interface Props {
  title: string;
  subtitle?: string;
  items: UploadItem[];
  onRemove: (clientId: string) => void;
}

export function ImageGrid({ title, subtitle, items, onRemove }: Props) {
  return (
    <section className="image-grid">
      <h2>
        {title} <span className="image-grid__count">{items.length}</span>
      </h2>
      {subtitle && <p className="image-grid__subtitle">{subtitle}</p>}
      {items.length === 0 ? (
        <p className="image-grid__empty">Nothing here yet</p>
      ) : (
        <div className="image-grid__cards">
          {items.map((item) => (
            <ImageCard key={item.clientId} item={item} onRemove={onRemove} />
          ))}
        </div>
      )}
    </section>
  );
}
