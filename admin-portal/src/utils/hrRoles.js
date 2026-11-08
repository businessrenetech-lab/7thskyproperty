// HR role rules the screens need (the server stays the authority: backend/utils/hrRoles.js).
export const COMPANY_LEVEL = ['super_admin'];
export const isCompanyLevel = (role) => COMPANY_LEVEL.includes(role);
