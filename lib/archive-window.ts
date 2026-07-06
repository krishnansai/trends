export const ARCHIVE_END_YEAR = 2026;
export const ARCHIVE_START_YEAR = ARCHIVE_END_YEAR - 4;
export const ARCHIVE_YEAR_LABEL = `${ARCHIVE_START_YEAR}-${ARCHIVE_END_YEAR}`;

export function isInArchiveWindow(year: number) {
  return year >= ARCHIVE_START_YEAR && year <= ARCHIVE_END_YEAR;
}
