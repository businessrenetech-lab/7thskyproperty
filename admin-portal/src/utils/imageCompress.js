// admin-portal/src/utils/imageCompress.js
//
// Client-side image compression for field uploads. Bangladeshi technicians
// shoot 10–15 MB tank photos on phones and upload over 3G/4G, where large
// multipart posts time out and are lost. This shrinks a photo to a sane
// dimension + JPEG quality (typically well under ~500 KB) in the browser BEFORE
// it is sent, so the upload is fast and reliable.
//
// Dependency-free (canvas + createImageBitmap), and defensive: anything that
// isn't a compressible raster image, or any failure, returns the ORIGINAL file
// untouched — compression must never block an upload.

const DEFAULTS = {
  maxDimension: 1600,      // longest edge, px — plenty for evidence photos
  targetBytes: 450 * 1024, // aim under ~450 KB
  minQuality: 0.5,
  startQuality: 0.82,
};

// Formats worth compressing. PNG screenshots also benefit but are re-encoded to
// JPEG only when clearly photographic (large); we keep it simple and compress
// jpeg/png/webp, and pass everything else (gif, svg, heic we can't decode) through.
const COMPRESSIBLE = /^image\/(jpe?g|png|webp)$/i;

async function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file); } catch { /* fall through */ }
  }
  // Fallback for browsers without createImageBitmap.
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

/**
 * Compress one image File. Returns a new (usually smaller) JPEG File, or the
 * original file if it can't/shouldn't be compressed.
 * @param {File} file
 * @param {object} [opts] overrides for DEFAULTS
 * @returns {Promise<File>}
 */
export async function compressImage(file, opts = {}) {
  const cfg = { ...DEFAULTS, ...opts };
  try {
    if (!file || !COMPRESSIBLE.test(file.type)) return file;
    // Already small enough: don't waste work or risk quality loss.
    if (file.size <= cfg.targetBytes) return file;

    const bmp = await loadBitmap(file);
    const w = bmp.width;
    const h = bmp.height;
    if (!w || !h) return file;

    const scale = Math.min(1, cfg.maxDimension / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, cw, ch);
    if (bmp.close) bmp.close();

    const toBlob = (quality) => new Promise((resolve) => {
      if (canvas.toBlob) canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
      else resolve(null);
    });

    // Step quality down until under target or we hit the floor.
    let quality = cfg.startQuality;
    let blob = await toBlob(quality);
    while (blob && blob.size > cfg.targetBytes && quality > cfg.minQuality) {
      quality = Math.max(cfg.minQuality, quality - 0.12);
      blob = await toBlob(quality); // eslint-disable-line no-await-in-loop
    }
    if (!blob || blob.size >= file.size) return file; // no gain → keep original

    const base = (file.name || 'photo').replace(/\.[^.]+$/, '');
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file; // never let compression block an upload
  }
}
