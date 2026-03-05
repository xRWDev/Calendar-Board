export const ADMIN_USERNAME = (
  process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL || 'admin'
)
  .trim()
  .toLowerCase();
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
export const ADMIN_COLOR = process.env.ADMIN_COLOR || '#ff6122';
