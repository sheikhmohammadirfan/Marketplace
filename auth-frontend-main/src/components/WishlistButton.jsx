import { Heart } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useWishlist } from "../context/WishlistContext";

export default function WishlistButton({ listingId, inline = false }) {
  const { user } = useAuth();
  const { has, toggle } = useWishlist();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const saved = has(listingId);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info("Please log in to save ads to your wishlist");
      navigate("/login", { state: { from: location } });
      return;
    }
    toggle(listingId);
  };

  return (
    <button
      type="button"
      className={`heart-btn${saved ? " active" : ""}${inline ? " inline" : ""}`}
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      title={saved ? "Remove from wishlist" : "Save to wishlist"}
    >
      <Heart size={inline ? 20 : 18} />
    </button>
  );
}
