const PUBLIC_ASSET_BASE = process.env.NEXT_PUBLIC_UPLOADS_BASE_URL || process.env.NEXT_PUBLIC_API_URL || '';

export function getPublicImageUrl(value, fallback = '/hero_banner.png') {
  const imageUrl = String(value || '').trim();
  if (!imageUrl) return fallback;
  if (/^(https?:)?\/\//i.test(imageUrl) || imageUrl.startsWith('data:')) return imageUrl;
  if (imageUrl.startsWith('/uploads') && PUBLIC_ASSET_BASE) {
    return `${PUBLIC_ASSET_BASE.replace(/\/$/, '')}${imageUrl}`;
  }
  return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
}

export function getAbsolutePublicImageUrl(value, fallback = 'https://languageacademy.com.bd/hero_banner.png') {
  const imageUrl = getPublicImageUrl(value, fallback);
  if (/^(https?:)?\/\//i.test(imageUrl) || imageUrl.startsWith('data:')) return imageUrl;
  return `https://languageacademy.com.bd${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}
