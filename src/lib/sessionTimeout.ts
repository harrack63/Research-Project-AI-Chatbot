const SESSION_TIMEOUT_MS = 2 * 60 * 1000;
const WARNING_BEFORE_MS = 30 * 1000;
const LAST_ACTIVITY_KEY = "healthbot_last_activity";

let timeoutId: ReturnType<typeof setTimeout> | null = null;
let warningId: ReturnType<typeof setTimeout> | null = null;

export function initSessionTimeout(
  onTimeout: () => void,
  onWarning?: () => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const clearTimers = () => {
    if (timeoutId) clearTimeout(timeoutId);
    if (warningId) clearTimeout(warningId);
    timeoutId = null;
    warningId = null;
  };

  const setNewTimeout = () => {
    clearTimers();
    if (onWarning) {
      warningId = setTimeout(() => {
        onWarning();
      }, SESSION_TIMEOUT_MS - WARNING_BEFORE_MS);
    }
    timeoutId = setTimeout(() => {
      onTimeout();
    }, SESSION_TIMEOUT_MS);
  };

  const resetTimeout = () => {
    window.localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    setNewTimeout();
  };

  setNewTimeout();

  const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
  events.forEach((event) => window.addEventListener(event, resetTimeout));

  return () => {
    clearTimers();
    events.forEach((event) => window.removeEventListener(event, resetTimeout));
  };
}

export function getLastActivityTime(): number {
  if (typeof window === "undefined") return 0;
  const stored = window.localStorage.getItem(LAST_ACTIVITY_KEY);
  return stored ? parseInt(stored, 10) : 0;
}
