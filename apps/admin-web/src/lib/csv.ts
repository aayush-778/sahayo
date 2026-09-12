/**
 * CSV export.
 *
 * Builds a real file from the data on screen and hands it to the browser. No
 * server round trip, because there is no server — and because an export that
 * matches exactly what the operator has filtered to is more useful than one that
 * re-queries and might not.
 */

/**
 * Quotes one field for CSV.
 *
 * A field is quoted if it contains a comma, a quote, or a newline, and inner
 * quotes are doubled. A leading `=`, `+`, `-` or `@` is additionally prefixed
 * with an apostrophe: spreadsheet applications treat those as formula starts, so
 * a worker named "-Anita" or a note beginning "=" would otherwise execute as a
 * formula when the file is opened. That is CSV injection, and an export of
 * user-supplied names is exactly where it lands.
 */
function escapeField(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (/[",\n\r]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

/** Builds a CSV document from rows and a column definition. */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((column) => escapeField(column.header)).join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => escapeField(column.value(row))).join(','));
  }
  /* CRLF, which is what every spreadsheet application expects. */
  return lines.join('\r\n');
}

/**
 * Hands a CSV document to the browser as a download.
 *
 * A BOM is prepended so Excel on Windows reads the file as UTF-8. Without it, ₹
 * and any non-Latin character in a name arrive mojibake'd, and this export exists
 * partly to be opened in Excel by someone filing a CRCS return.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  /* Release the blob once the click has been handled. */
  URL.revokeObjectURL(url);
}
