// Converts an uploaded image file to a base64 data URL so it can be stored
// directly in IndexedDB and rendered with no network/file-system dependency
// — important for the app's offline-first requirement (PHASE 8).
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}
