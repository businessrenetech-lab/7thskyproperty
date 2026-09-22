// Which sales category a console locks its shared screens to, from the URL.
// Only Business locks: Commercial/Residential keep showing every category, as
// before. /business-rent and /business-registration are other products.
export function lockedCategoryForPath(pathname) {
  return /^\/business(\/|$)/.test(String(pathname || '')) ? 'business' : null;
}
