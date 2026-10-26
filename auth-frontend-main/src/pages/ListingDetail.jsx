import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, CheckCircle2, Eye, ImageOff, MapPin, MessageCircle, Pencil, RotateCcw, Share2, ShieldAlert, Trash2 } from "lucide-react";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import WishlistButton from "../components/WishlistButton";
import { conditionLabel } from "../utils/constants";
import { formatPrice, getErrorMessage, initials, timeAgo } from "../utils/format";

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [listing, setListing] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setListing(null);
    setError("");
    setActiveImg(0);
    API.get(`/listings/${id}`)
      .then((res) => !cancelled && setListing(res.data.listing))
      .catch((err) => !cancelled && setError(getErrorMessage(err, "Listing not found")));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="empty-state">
        <h3>{error}</h3>
        <p>This ad may have been removed or the link is incorrect.</p>
        <Link to="/listings" className="btn">Browse ads</Link>
      </div>
    );
  }
  if (!listing) {
    return (
      <div className="page-loader">
        <span className="spinner" /> Loading ad…
      </div>
    );
  }

  const sellerId = listing.seller?._id || listing.seller;
  const isOwner = !!user && user.id === sellerId;
  const isStaff = user && (user.role === "admin" || user.role === "superadmin");
  const canManage = isOwner || isStaff;
  const images = listing.images?.length ? listing.images : listing.thumbnail ? [listing.thumbnail] : [];

  const contactSeller = async () => {
    if (!user) {
      toast.info("Please log in to contact the seller");
      return navigate("/login", { state: { from: location } });
    }
    setBusy(true);
    try {
      const res = await API.post("/chat/conversations", { listingId: id });
      navigate("/chat", { state: { conversationId: res.data.conversation._id } });
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not start the conversation"));
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  const setStatus = async (status) => {
    setBusy(true);
    try {
      const res = await API.patch(`/listings/${id}/status`, { status });
      setListing((l) => ({ ...l, status: res.data.listing.status }));
      toast.success(status === "sold" ? "Marked as sold" : "Ad is live again");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this ad permanently?")) return;
    setBusy(true);
    try {
      await API.delete(`/listings/${id}`);
      toast.success("Ad deleted");
      navigate(isOwner ? "/my-listings" : "/listings");
    } catch (err) {
      toast.error(getErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/listings">Home</Link>/<Link to={`/listings?category=${encodeURIComponent(listing.category)}`}>{listing.category}</Link>/<span>{listing.title}</span>
      </nav>

      <div className="detail-grid">
        <div className="stack" style={{ gap: 18 }}>
          <div>
            <div className="gallery-main">
              {images[activeImg] ? (
                <img src={images[activeImg]} alt={listing.title} />
              ) : (
                <div className="no-photo" style={{ color: "#64748b" }}>
                  <ImageOff size={36} /> No photos
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="gallery-thumbs">
                {images.map((img, i) => (
                  <button key={i} className={i === activeImg ? "active" : ""} onClick={() => setActiveImg(i)} aria-label={`Show photo ${i + 1}`}>
                    <img src={img} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card card-pad">
            <h3 className="card-title">Description</h3>
            <p className="desc">{listing.description}</p>
          </div>
        </div>

        <aside className="stack" style={{ gap: 16 }}>
          <div className="card card-pad">
            <div className="row between" style={{ alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div className="price-lg">{formatPrice(listing.price, listing.currency)}</div>
                <h1 style={{ fontSize: "1.2rem", margin: "4px 0 0" }}>{listing.title}</h1>
              </div>
              <button className="icon-btn" onClick={share} aria-label="Copy link" title="Copy link">
                <Share2 size={19} />
              </button>
            </div>

            <div className="detail-meta">
              <span className="badge badge-primary">{listing.category}</span>
              <span className="badge">{conditionLabel(listing.condition)}</span>
              {listing.status !== "active" && <span className="badge badge-danger">{listing.status.toUpperCase()}</span>}
            </div>

            <div className="stack small muted" style={{ gap: 6, marginBottom: 18 }}>
              {(listing.city || listing.state) && (
                <span className="row"><MapPin size={14} /> {[listing.city, listing.state].filter(Boolean).join(", ")}</span>
              )}
              <span className="row"><CalendarDays size={14} /> Posted {timeAgo(listing.createdAt)}</span>
              <span className="row"><Eye size={14} /> {listing.views} view{listing.views === 1 ? "" : "s"}</span>
            </div>

            {!isOwner && listing.status === "active" && (
              <div className="detail-actions">
                <button className="btn btn-lg" style={{ flex: 1 }} onClick={contactSeller} disabled={busy}>
                  <MessageCircle size={18} /> {busy ? "Opening chat…" : "Chat with seller"}
                </button>
                <WishlistButton listingId={listing._id} inline />
              </div>
            )}
            {!isOwner && listing.status !== "active" && <div className="alert alert-warn"><p>This ad is no longer available.</p></div>}

            {canManage && (
              <div className="stack" style={{ gap: 10, marginTop: isOwner ? 0 : 16, paddingTop: isOwner ? 0 : 14, borderTop: isOwner ? "none" : "1px solid var(--border)" }}>
                <div className={`badge ${isOwner ? "badge-primary" : "badge-warn"}`} style={{ alignSelf: "flex-start" }}>
                  {isOwner ? "This is your ad" : "Moderator tools"}
                </div>
                <div className="detail-actions">
                  <Link to={`/edit-ad/${listing._id}`} className="btn btn-outline">
                    <Pencil size={16} /> Edit
                  </Link>
                  {listing.status === "active" ? (
                    <button className="btn btn-success" onClick={() => setStatus("sold")} disabled={busy}>
                      <CheckCircle2 size={16} /> Mark sold
                    </button>
                  ) : (
                    <button className="btn btn-outline" onClick={() => setStatus("active")} disabled={busy}>
                      <RotateCcw size={16} /> Reactivate
                    </button>
                  )}
                  <button className="btn btn-danger-outline" onClick={remove} disabled={busy}>
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="card card-pad">
            <h3 className="card-title">Seller</h3>
            <div className="seller-row">
              <span className="avatar lg">{initials(listing.seller?.name)}</span>
              <div>
                <strong>{listing.seller?.name || "Seller"}</strong>
                <div className="small muted">Member since {listing.seller?.createdAt ? new Date(listing.seller.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—"}</div>
              </div>
            </div>
          </div>

          <div className="safety-box">
            <strong className="row"><ShieldAlert size={16} /> Safety tips</strong>
            <ul>
              <li>Meet in a busy public place.</li>
              <li>Check the item before paying.</li>
              <li>Never pay in advance or share OTPs.</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
