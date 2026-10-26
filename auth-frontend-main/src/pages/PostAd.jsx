import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import ListingForm from "../components/ListingForm";
import { useToast } from "../context/ToastContext";
import { getErrorMessage } from "../utils/format";

export default function PostAd() {
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (payload) => {
    setError("");
    setBusy(true);
    try {
      const res = await API.post("/listings", payload);
      toast.success("Your ad is live!");
      navigate(`/listings/${res.data.listing._id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to post ad"));
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-title">
        <h1>Post an ad</h1>
      </div>
      <ListingForm mode="create" busy={busy} error={error} onSubmit={handleSubmit} />
    </>
  );
}
