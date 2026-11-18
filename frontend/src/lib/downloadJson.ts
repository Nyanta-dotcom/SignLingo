/** Hands the person a JSON file to save. Nothing is uploaded: the file is built and downloaded in the browser. */
export function downloadJson(name: string, data: unknown, pretty = false): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, pretty ? 2 : undefined)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
