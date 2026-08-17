"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";

export default function ShortStayImage({ src, alt, className = "", eager = false }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950 ${className}`}
        role="img"
        aria-label={alt || "Property image unavailable"}
      >
        <div className="text-center text-slate-400">
          <Building2 className="mx-auto mb-2 text-blue-400/70" size={36} aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">Image coming soon</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || "Short-stay property"}
      className={`h-full w-full object-cover ${className}`}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      onError={() => setFailed(true)}
    />
  );
}
