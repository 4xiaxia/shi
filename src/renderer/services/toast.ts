export function showGlobalToast(message: string): void {
  if (!message) return;
  window.dispatchEvent(new CustomEvent('app:showToast', { detail: message }));
}
