import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Eye, ImageOff, LayoutList, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import API from "../utils/api";
import { useToast } from "../context/ToastContext";
import { formatPrice, getErrorMessage, timeAgo } from "../utils/format";

const TABS = [
  ["all", "All"],
  ["active", "Active"],
  ["sold", "Sold"],
];

export default function MyListings() {
  const toast = useToast();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState("all");

  const fetchMine = async () => {
    try {
      const res = await API.get("/listings/mine/all");
      setListings(res.data.listings);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load your ads"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStatus = async (id, status) => {
    setBusyId(id);
    try {
      await API.patch(`/listings/${id}/status`, { status });
      toast.success(status === "sold" ? "Marked as sold" : "Ad is live again");
      await fetchMine();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this ad permanently?")) return;
    setBusyId(id);
    try {
      await API.delete(`/listings/${id}`);
      toast.success("Ad deleted");
      await fetchMine();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const count = (s) => (s === "all" ? listings.length : listings.filter((l) => l.status === s).length);
  const visible = tab === "all" ? listings : listings.filter((l) => l.status === tab);

  return (
    <>
      <div className="page-title">
        <h1>My ads</h1>
        <Link to="/post-ad" className="btn">
          <Plus size={16} /> Post new ad
        </Link>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={`tab${tab === key ? " active" : ""}`} onClick={() => setTab(key)}>
            {label} <span className="tab-count">{count(key)}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loader"><span className="spinner" /> Loading…</div>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon"><LayoutList size={28} /></span>
          <h3>{listings.length === 0 ? "You haven't posted anything yet" : "No ads in this tab"}</h3>
          <p>Turn things you no longer need into cash — it only takes a couple of minutes.</p>
          <Link to="/post-ad" className="btn">Post your first ad</Link>
        </div>
      ) : (
        <div className="card">
          {visible.map((l) => (
            <div key={l._id} className="my-ad">
              {l.thumbnail ? (
                <img src={l.thumbnail} alt="" />
              ) : (
                <span className="thumb-ph"><ImageOff size={20} /></span>
              )}
              <div className="my-ad-info">
                <Link to={`/listings/${l._id}`}>{l.title}</Link>
                <div className="row wrap small muted" style={{ gap: 8, marginTop: 4 }}>
                  <strong style={{ color: "var(--text)" }}>{formatPrice(l.price, l.currency)}</strong>
                  <span className={`badge ${l.status === "active" ? "badge-success" : l.status === "sold" ? "badge-purple" : "badge-danger"}`}>{l.status}</span>
                  <span className="row" style={{ gap: 4 }}><Eye size={13} /> {l.views}</span>
                  <span>{timeAgo(l.createdAt)}</span>
                </div>
              </div>
              <div className="my-ad-actions">
                <Link to={`/edit-ad/${l._id}`} className="btn btn-outline btn-sm"><Pencil size={14} /> Edit</Link>
                {l.status === "active" && (
                  <button className="btn btn-success btn-sm" disabled={busyId === l._id} onClick={() => setStatus(l._id, "sold")}>
                    <CheckCircle2 size={14} /> Mark sold
                  </button>
                )}
                {l.status === "sold" && (
                  <button className="btn btn-outline btn-sm" disabled={busyId === l._id} onClick={() => setStatus(l._id, "active")}>
                    <RotateCcw size={14} /> Reactivate
                  </button>
                )}
                <button className="btn btn-danger-outline btn-sm" disabled={busyId === l._id} onClick={() => remove(l._id)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
