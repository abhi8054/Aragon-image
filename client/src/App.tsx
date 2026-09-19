import { useMemo } from "react";
import { UploadPanel } from "./components/UploadPanel";
import { ResultsHeader } from "./components/ResultsHeader";
import { RequirementsInfo } from "./components/RequirementsInfo";
import { ImageGrid } from "./components/ImageGrid";
import { useImageUpload } from "./hooks/useImageUpload";

export default function App() {
  const { items, addFiles, removeItem } = useImageUpload();

  const pending = useMemo(
    () => items.filter((item) => item.status === "uploading" || item.status === "processing"),
    [items]
  );
  const accepted = useMemo(() => items.filter((item) => item.status === "accepted"), [items]);
  const rejected = useMemo(() => items.filter((item) => item.status === "rejected"), [items]);

  return (
    <div className="app">
      <header className="app__header">
        <h1>Aragon Image Review</h1>
      </header>

      <div className="app__layout">
        <UploadPanel onFilesSelected={addFiles} pending={pending} />

        <main className="app__results">
          <ResultsHeader acceptedCount={accepted.length} totalCount={items.length} />
          <RequirementsInfo />

          <ImageGrid
            title="Accepted Photos"
            subtitle="These images passed every automated check."
            items={accepted}
            onRemove={removeItem}
          />

          <ImageGrid
            title="Didn't Meet Our Guidelines"
            subtitle="Each photo below lists the specific reason it was rejected."
            items={rejected}
            onRemove={removeItem}
          />
        </main>
      </div>
    </div>
  );
}
