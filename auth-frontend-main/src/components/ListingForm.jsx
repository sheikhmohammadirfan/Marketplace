import { useState } from "react";
import { AlertTriangle, Lightbulb, Sparkles, Wand2 } from "lucide-react";
import API from "../utils/api";
import ImageUploader from "./ImageUploader";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { CATEGORIES, CONDITIONS, conditionLabel } from "../utils/constants";
import { formatPrice, getErrorMessage } from "../utils/format";
import { makeThumbnail } from "../utils/image";

const EMPTY = { title: "", description: "", price: "", category: "", condition: "good", city: "", state: "" };

// One form for both "Post an ad" and "Edit ad".
export default function ListingForm({ initial, mode = "create", busy, error, onSubmit }) {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(() => (initial ? { ...EMPTY, ...pick(initial) } : EMPTY));
  const [images, setImages] = useState(() => initial?.images || []);
  const [aiBusy, setAiBusy] = useState(false);
  const [priceBusy, setPriceBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [priceSuggestion, setPriceSuggestion] = useState(null);
  const [resending, setResending] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const needsVerification = mode === "create" && user && !user.isVerified;

  const handleDraft = async () => {
    if (!images[0]) return setAiError("Add a photo first, then I can draft the ad from it.");
    setAiBusy(true);
    setAiError("");
    try {
      const { data } = await API.post("/ai/generate-listing", { imageBase64: images[0] });
      const d = data.draft;
      setForm((f) => ({
        ...f,
        title: d.title || f.title,
        description: d.description || f.description,
        category: d.category || f.category,
        condition: d.condition || f.condition,
      }));
      toast.success("Draft ready — review and edit it before posting");
    } catch (err) {
      setAiError(getErrorMessage(err, "Couldn't generate a draft right now."));
    } finally {
      setAiBusy(false);
    }
  };

  const handlePrice = async () => {
    if (!form.title || !form.category) return setAiError("Fill in a title and category first so the AI has something to estimate from.");
    setPriceBusy(true);
    setAiError("");
    setPriceSuggestion(null);
    try {
      const { data } = await API.post("/ai/suggest-price", {
        title: form.title,
        description: form.description,
        category: form.category,
        condition: form.condition,
        city: form.city,
      });
      setPriceSuggestion(data.suggestion);
    } catch (err) {
      setAiError(getErrorMessage(err, "Couldn't suggest a price right now."));
    } finally {
      setPriceBusy(false);
    }
  };

  const resendVerification = async () => {
    setResending(true);
    try {
      await API.post("/auth/resend-verification", { email: user.email });
      toast.success("Verification email sent — check your inbox");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const thumbnail = images[0] ? await makeThumbnail(images[0]) : "";
    onSubmit({ ...form, price: Number(form.price), images, thumbnail });
  };

  return (
    <form className="form-layout" onSubmit={handleSubmit}>
      <div className="form-sections">
        {needsVerification && (
          <div className="alert alert-warn">
            <AlertTriangle size={18} />
            <div>
              <strong>Verify your email to post ads.</strong>
              <p>We sent a link to {user.email}. Didn't get it?</p>
              <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={resendVerification} disabled={resending}>
                {resending ? "Sending…" : "Resend verification email"}
              </button>
            </div>
          </div>
        )}

        <div className="card card-pad">
          <h3 className="card-title">Photos</h3>
          <ImageUploader images={images} onChange={setImages} />
        </div>

        <div className="card card-pad stack">
          <h3 className="card-title">Details</h3>
          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" className="input" value={form.title} onChange={update("title")} required maxLength={120} placeholder="e.g. Hero Sprint cycle, 21 gears" />
            <span className="hint">{form.title.length}/120</span>
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" className="textarea" rows={6} value={form.description} onChange={update("description")} required maxLength={3000} placeholder="Describe the item, its age, any defects, what's included…" />
            <span className="hint">{form.description.length}/3000</span>
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="category">Category</label>
              <select id="category" className="select" value={form.category} onChange={update("category")} required>
                <option value="">Select category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="condition">Condition</label>
              <select id="condition" className="select" value={form.condition} onChange={update("condition")}>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>{conditionLabel(c)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card card-pad stack">
          <h3 className="card-title">Price &amp; location</h3>
          <div className="grid-3">
            <div className="field">
              <label htmlFor="price">Price (₹)</label>
              <input id="price" className="input" type="number" min={0} value={form.price} onChange={update("price")} required placeholder="0" />
            </div>
            <div className="field">
              <label htmlFor="city">City</label>
              <input id="city" className="input" value={form.city} onChange={update("city")} placeholder="e.g. Mumbai" />
            </div>
            <div className="field">
              <label htmlFor="state">State</label>
              <input id="state" className="input" value={form.state} onChange={update("state")} placeholder="e.g. Maharashtra" />
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertTriangle size={18} />
            <p>{error}</p>
          </div>
        )}

        <div className="row">
          <button type="submit" className="btn btn-lg" disabled={busy || needsVerification}>
            {busy ? "Saving…" : mode === "edit" ? "Save changes" : "Post ad"}
          </button>
        </div>
      </div>

      <aside className="side-sticky">
        <div className="ai-helper">
          <h3>
            <Sparkles size={18} /> AI writing helper
          </h3>
          <p className="small">Let AI do the typing. You can always edit what it writes.</p>
          <div className="stack" style={{ gap: 8 }}>
            <button type="button" className="btn btn-block" onClick={handleDraft} disabled={aiBusy}>
              <Wand2 size={16} /> {aiBusy ? "Writing draft…" : "Draft from photo"}
            </button>
            <button type="button" className="btn btn-outline btn-block" onClick={handlePrice} disabled={priceBusy}>
              {priceBusy ? "Estimating…" : "Suggest a price"}
            </button>
          </div>
          {aiError && <div className="alert alert-error" style={{ marginTop: 10, padding: "8px 10px", fontSize: 13 }}><p>{aiError}</p></div>}
          {priceSuggestion && (
            <div className="ai-result">
              <strong>
                {formatPrice(priceSuggestion.minPrice)} – {formatPrice(priceSuggestion.maxPrice)}
              </strong>
              <p style={{ margin: "4px 0" }}>{priceSuggestion.rationale}</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm((f) => ({ ...f, price: String(Math.round((priceSuggestion.minPrice + priceSuggestion.maxPrice) / 2)) }))}>
                Use midpoint
              </button>
              <p className="hint" style={{ margin: 0 }}>{priceSuggestion.disclaimer}</p>
            </div>
          )}
        </div>

        <div className="card card-pad">
          <h3 className="card-title">
            <Lightbulb size={16} /> Tips for a great ad
          </h3>
          <ul className="tips">
            <li>Use bright, clear photos from several angles.</li>
            <li>Be honest about condition and any defects.</li>
            <li>Mention age, brand, model and what's included.</li>
            <li>Price fairly — similar ads show what buyers pay.</li>
          </ul>
        </div>
      </aside>
    </form>
  );
}

function pick(l) {
  return {
    title: l.title || "",
    description: l.description || "",
    price: l.price ?? "",
    category: l.category || "",
    condition: l.condition || "good",
    city: l.city || "",
    state: l.state || "",
  };
}
