import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import API from "../utils/api";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

const WishlistContext = createContext(null);

// Keeps the set of saved listing ids in memory so every heart icon on the site
// knows instantly whether it is filled, and toggling feels instant (optimistic update).
export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [ids, setIds] = useState(() => new Set());

  useEffect(() => {
    if (!user) {
      setIds(new Set());
      return;
    }
    let cancelled = false;
    API.get("/wishlist/ids")
      .then((res) => !cancelled && setIds(new Set(res.data.ids)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  const has = useCallback((id) => ids.has(String(id)), [ids]);

  const toggle = useCallback(
    async (id) => {
      const key = String(id);
      const wasSaved = ids.has(key);
      const apply = (saved) =>
        setIds((prev) => {
          const next = new Set(prev);
          if (saved) next.add(key);
          else next.delete(key);
          return next;
        });

      apply(!wasSaved); // optimistic
      try {
        if (wasSaved) await API.delete(`/wishlist/${key}`);
        else await API.post(`/wishlist/${key}`);
        toast.success(wasSaved ? "Removed from wishlist" : "Saved to wishlist");
      } catch (err) {
        apply(wasSaved); // roll back
        toast.error(err.response?.data?.message || "Couldn't update your wishlist");
      }
    },
    [ids, toast]
  );

  const value = useMemo(() => ({ ids, has, toggle, count: ids.size }), [ids, has, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
