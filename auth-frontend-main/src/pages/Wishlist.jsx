import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import API from "../utils/api";
import ListingCard, { ListingCardSkeleton } from "../components/ListingCard";
import { useWishlist } from "../context/WishlistContext";
import { getErrorMessage } from "../utils/format";

export default function Wishlist() {
  const { ids } = useWishlist();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    API.get("/wishlist")
      .then((res) => setListings(res.data.listings))
      .catch((err) => setError(getErrorMessage(err, "Failed to load your wishlist")))
      .finally(() => setLoading(false));
  }, []);

  // Un-hearting a card removes it from this page straight away.
  const visible = listings.filter((l) => ids.has(String(l._id)));

  return (
    <>
      <div className="page-title">
        <h1>My wishlist</h1>
        {!loading && <span className="muted">{visible.length} saved ad{visible.length === 1 ? "" : "s"}</span>}
      </div>

      {error && <div className="alert alert-error"><p>{error}</p></div>}

      {loading ? (
        <div className="listing-grid">
          {Array.from({ length: 4 }, (_, i) => <ListingCardSkeleton key={i} />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon"><Heart size={28} /></span>
          <h3>Nothing saved yet</h3>
          <p>Tap the heart on any ad to keep it here so you can find it again later.</p>
          <Link to="/listings" className="btn">Browse ads</Link>
        </div>
      ) : (
        <div className="listing-grid">
          {visible.map((l) => <ListingCard key={l._id} listing={l} />)}
        </div>
      )}
    </>
  );
}
