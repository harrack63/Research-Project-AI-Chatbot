const KEY_PREFIX = "healthbot_pending_first_message:";

export function setPendingFirstMessage(chatId: string, message: string) {
if (typeof window === "undefined") return;
try {
    window.sessionStorage.setItem(`${KEY_PREFIX}${chatId}`, message);
} catch {
    // ignore storage errors
}
}

export function popPendingFirstMessage(chatId: string): string | null {
if (typeof window === "undefined") return null;
const key = `${KEY_PREFIX}${chatId}`;
try {
    const msg = window.sessionStorage.getItem(key);
    if (msg) window.sessionStorage.removeItem(key);
    return msg;
} catch {
    return null;
}
}