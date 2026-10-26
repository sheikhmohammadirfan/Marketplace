import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "../utils/api";
import ListingForm from "../components/ListingForm";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getErrorMessage } from "../utils/format";

export default function EditAd() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [listing, setListing] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    API.get(`/listings/${id}`)
      .then((res) => setListing(res.data.listing))
      .catch((err) => setLoadError(getErrorMessage(err, "Listing not found")));
  }, [id]);

  if (loadError) {
    return (
      <div className="empty-state">
        <h3>{loadError}</h3>
        <Link to="/my-listings" className="btn">Back to my ads</Link>
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
  const allowed = user && (user.id === sellerId || user.role === "admin" || user.role === "superadmin");
  if (!allowed) {
    return (
      <div className="empty-state">
        <h3>You can only edit your own ads</h3>
        <Link to={`/listings/${id}`} className="btn">View ad</Link>
      </div>
    );
  }

  const handleSubmit = async (payload) => {
    setError("");
    setBusy(true);
    try {
      await API.patch(`/listings/${id}`, payload);
      toast.success("Ad updated");
      navigate(`/listings/${id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save changes"));
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-title">
        <h1>Edit ad</h1>
        <Link to={`/listings/${id}`} className="btn btn-outline btn-sm">Cancel</Link>
      </div>
      <ListingForm mode="edit" initial={listing} busy={busy} error={error} onSubmit={handleSubmit} />
    </>
  );
}
