const REQUIREMENTS = [
  "At least 400x400px resolution",
  "One clearly visible face, filling a reasonable portion of the frame",
  "In focus, not blurry",
];

const RESTRICTIONS = [
  "Formats other than HEIC, PNG, or JPEG",
  "Files under 15KB or below the minimum resolution",
  "Blurry or out-of-focus shots",
  "No face, or a face that's too small in the frame",
  "Multiple people in the same photo",
  "Near-duplicates of a photo you've already uploaded",
];

export function RequirementsInfo() {
  return (
    <div className="requirements">
      <details className="requirements__section">
        <summary>
          <span className="requirements__icon requirements__icon--ok">&#10003;</span>
          Photo Requirements
        </summary>
        <ul>
          {REQUIREMENTS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
      <details className="requirements__section">
        <summary>
          <span className="requirements__icon requirements__icon--no">&#10005;</span>
          Photo Restrictions
        </summary>
        <ul>
          {RESTRICTIONS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
