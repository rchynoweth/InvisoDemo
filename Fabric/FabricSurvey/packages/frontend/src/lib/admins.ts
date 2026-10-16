import { isAnalyticsAdmin, parseAdmins } from '@rayfin-app/shared';

/** Whether to offer Analytics and Settings. The server policies enforce the same list. */
export function isAdmin(email: string | null | undefined): boolean {
  return isAnalyticsAdmin(email, parseAdmins(import.meta.env.VITE_RAYFIN_ANALYTICS_ADMINS));
}
