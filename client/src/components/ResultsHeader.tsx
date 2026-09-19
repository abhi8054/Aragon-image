interface Props {
  acceptedCount: number;
  totalCount: number;
}

export function ResultsHeader({ acceptedCount, totalCount }: Props) {
  const progress = totalCount === 0 ? 0 : Math.round((acceptedCount / totalCount) * 100);

  return (
    <div className="results-header">
      <div className="results-header__row">
        <h2>Uploaded Images</h2>
        <span className="results-header__count">
          {acceptedCount} of {totalCount} accepted
        </span>
      </div>
      <div className="results-header__bar">
        <div className="results-header__bar-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
