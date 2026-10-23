/** Avoid full-list skeleton when scope is ready and cached queue data exists. */
export function shouldShowDoctorQueueLoading(
  isScopeReady: boolean,
  isLoading: boolean,
  itemCount: number,
): boolean {
  if (!isScopeReady) return true;
  if (itemCount > 0) return false;
  return isLoading;
}
