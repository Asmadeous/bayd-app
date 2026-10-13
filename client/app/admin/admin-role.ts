// Who BAYD Admin is for: franchise admins and super admins.
export function isAdminRole(role?: string) {
  return role === "admin" || role === "super_admin"
}
