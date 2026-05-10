"use client";
import React from "react";
import { Share2, CheckCheck } from "lucide-react";

const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
);
const TwitterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
);
const LinkedInIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z"/></svg>
);

export default function ShareButtons() {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (typeof window !== 'undefined') {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentUrl = typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : '';

  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
      <p className="text-sm font-semibold text-slate-700">Share this article</p>
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center justify-center h-11 w-11 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-all"
          aria-label="Copy link"
        >
          {copied ? <CheckCheck size={18} className="text-green-500" /> : <Share2 size={18} />}
        </button>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${currentUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center h-11 w-11 rounded-full bg-[#1877F2] text-white hover:opacity-90 transition-opacity"
          aria-label="Share on Facebook"
        >
          <FacebookIcon />
        </a>
        <a
          href={`https://twitter.com/intent/tweet?url=${currentUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center h-11 w-11 rounded-full bg-[#1DA1F2] text-white hover:opacity-90 transition-opacity"
          aria-label="Share on Twitter"
        >
          <TwitterIcon />
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${currentUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center h-11 w-11 rounded-full bg-[#0A66C2] text-white hover:opacity-90 transition-opacity"
          aria-label="Share on LinkedIn"
        >
          <LinkedInIcon />
        </a>
      </div>
    </div>
  );
}
