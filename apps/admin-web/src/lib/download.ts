/**
 * Hands the browser a file to save.
 *
 * Built entirely in the page from a Blob, so an export works with the network off —
 * there is no server to fetch it from. CSV gets a byte-order mark because Excel on
 * Windows otherwise opens UTF-8 as the local code page and mangles every name that is
 * not plain ASCII.
 */
export function downloadFile(filename: string, mimeType: string, content: string): void {
  const body = mimeType === 'text/csv' ? `﻿${content}` : content;
  const url = URL.createObjectURL(new Blob([body], { type: `${mimeType};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  /* Revoked on the next tick: revoking synchronously can cancel the save in Safari. */
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
