// Stable per-tab identity that owns seat locks, persisted across socket
// reconnects. The socket id changes on every reconnection but the
// reservation must not: the lock is stored under this token, not the socket
// id (see architecture.md §3). A brand-new tab gets its own token via
// sessionStorage, so separate tabs can't impersonate each other.
const STORAGE_KEY = 'flight-reservation-client-id';

export function getClientId(): string {
  let clientId = sessionStorage.getItem(STORAGE_KEY);
  if (!clientId) {
    clientId = crypto.randomUUID?.() ?? `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(STORAGE_KEY, clientId);
  }
  return clientId;
}