// Generates a unique id for new records (products, categories, sales, etc).
// Uses the browser's crypto.randomUUID when available (all modern mobile
// browsers support it), with a fallback so the app never hard-crashes on an
// older WebView.
export function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
