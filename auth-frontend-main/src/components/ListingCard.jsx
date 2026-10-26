import { Link } from "react-router-dom";
import { ImageOff, MapPin } from "lucide-react";
import WishlistButton from "./WishlistButton";
import { formatPrice, timeAgo } from "../utils/format";

export default function ListingCard({ listing }) {
  // List responses only carry the small thumbnail; full photos load on the detail page.
  const photo = listing.thumbnail || listing.images?.[0];
  const href = `/listings/${listing._id}`;

  return (
    <article className="listing-card">
      <Link to={href} className="listing-card__media" aria-label={listing.title}>
        {photo ? (
          <img src={photo} alt={listing.title} loading="lazy" />
        ) : (
          <div className="no-photo">
            <ImageOff size={26} />
            No photo
          </div>
        )}
        {listing.status !== "active" && <span className="badge badge-danger overlay-badge">{listing.status.toUpperCase()}</span>}
      </Link>
      <WishlistButton listingId={listing._id} />
      <Link to={href} className="listing-card__body">
        <div className="listing-price">{formatPrice(listing.price, listing.currency)}</div>
        <div className="listing-title">{listing.title}</div>
        <div className="listing-meta">
          <span>
            <MapPin size={12} />
            {listing.city || listing.category}
          </span>
          <span>{timeAgo(listing.createdAt)}</span>
        </div>
      </Link>
    </article>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton" style={{ aspectRatio: "4 / 3" }} />
      <div style={{ padding: 14 }}>
        <div className="skeleton" style={{ height: 20, width: "45%", marginBottom: 10 }} />
        <div className="skeleton" style={{ height: 14, width: "90%", marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 12, width: "60%" }} />
      </div>
    </div>
  );
}


