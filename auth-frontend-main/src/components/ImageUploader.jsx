import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { fileToCompressedDataUri } from "../utils/image";

const MAX_IMAGES = 6;

export default function ImageUploader({ images, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/")).slice(0, MAX_IMAGES - images.length);
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    try {
      const compressed = await Promise.all(files.map(fileToCompressedDataUri));
      onChange([...images, ...compressed]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="uploader">
        {images.map((src, idx) => (
          <div key={idx} className="uploader-item">
            <img src={src} alt={`Upload ${idx + 1}`} />
            {idx === 0 && <span className="cover">Cover</span>}
            <button type="button" className="remove" onClick={() => onChange(images.filter((_, i) => i !== idx))} aria-label={`Remove photo ${idx + 1}`}>
              <X size={13} />
            </button>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <button type="button" className="uploader-add" onClick={() => inputRef.current.click()} disabled={busy}>
            {busy ? <span className="spinner" /> : <Camera size={22} />}
            {busy ? "Processing…" : "Add photo"}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: "none" }} />
      <p className="hint" style={{ marginTop: 8 }}>
        {images.length}/{MAX_IMAGES} photos · the first photo is the cover. Photos are resized automatically.
      </p>
    </div>
  );
}
