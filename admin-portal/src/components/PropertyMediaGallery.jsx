import React, { useRef, useState } from "react";
import { Plus, Trash2, Star, Film } from "lucide-react";
import api from "../services/api";

/* Photo/video gallery for a property. Uploads to POST /properties/:id/media
   (public assets folder — used for website listings). Reused by the property
   wizard Media step and the property detail overview. */
export default function PropertyMediaGallery({
  propertyId,
  media = [],
  featuredUrl,
  onChange,
  imagesOnly = false,
}) {
  const fileRef = useRef();
  const [busy, setBusy] = useState(false);

  const upload = async (files) => {
    if (!files?.length || !propertyId) return;
    setBusy(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        await api.post(`/properties/${propertyId}/media`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      await onChange?.();
    } catch (e) {
      alert(e.response?.data?.error || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (m) => {
    if (!window.confirm("Remove this media?")) return;
    try {
      await api.delete(`/properties/${propertyId}/media/${m.id}`);
      await onChange?.();
    } catch (e) {
      alert(e.response?.data?.error || "Could not remove.");
    }
  };

  const setFeatured = async (m) => {
    try {
      await api.patch(`/properties/${propertyId}/media/${m.id}`, {
        set_featured: true,
      });
      await onChange?.();
    } catch {
      /* non-fatal */
    }
  };

  return (
    <div>
      <div className="pm-media-grid">
        {media.map((m) => (
          <div key={m.id} className="pm-media-tile">
            {m.media_type === "video" ? (
              <video src={m.file_url} muted playsInline />
            ) : (
              <img
                src={m.file_url}
                alt={m.caption || "property media"}
                loading="lazy"
              />
            )}
            {m.media_type === "video" && (
              <span className="star" style={{ color: "#0f172a" }}>
                <Film size={11} />
              </span>
            )}
            {featuredUrl && m.file_url === featuredUrl && (
              <span className="star">
                <Star size={11} fill="#eab308" /> Cover
              </span>
            )}
            <div className="acts">
              {m.media_type === "image" && m.file_url !== featuredUrl && (
                <button
                  type="button"
                  title="Set as cover photo"
                  onClick={() => setFeatured(m)}
                >
                  <Star size={13} />
                </button>
              )}
              <button type="button" title="Remove" onClick={() => remove(m)}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="pm-media-add"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          <span style={{ textAlign: "center", fontSize: 13 }}>
            <Plus
              size={20}
              style={{ display: "block", margin: "0 auto 4px" }}
            />
            {busy
              ? "Uploading…"
              : imagesOnly
                ? "Add photos"
                : "Add photos / videos"}
          </span>
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        hidden
        multiple
        accept={
          imagesOnly
            ? ".jpg,.jpeg,.png,.webp,.gif,.heic"
            : ".jpg,.jpeg,.png,.webp,.gif,.heic,.mp4,.mov,.webm,.m4v"
        }
        onChange={(e) => {
          upload(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      <p style={{ fontSize: 12, color: "var(--muted,#94a3b8)", marginTop: 8 }}>
        {imagesOnly
          ? "Website photos up to 15 MB each. The first photo becomes the cover; use the star to change it. Add the property video using its YouTube URL below."
          : "Photos and short video clips up to 15 MB each. The first photo becomes the cover; use the star to change it. For longer videos, paste a link in the property video tour field."}
      </p>
    </div>
  );
}
