import { ColumnDtype } from './filterExpression';

/**
 * ISO-8601 prefix regex — matches:
 *   YYYY
 *   YYYY-MM
 *   YYYY-MM-DD
 *   YYYY-MM-DDTHH:MM... (any valid datetime suffix)
 *
 * Note: numeric years such as "2023" satisfy this regex, but the numeric check
 * runs first in the detection priority — so ["2023","2022"] → 'numeric', not 'datetime'.
 * This is intentional: numeric detection takes precedence over datetime detection for 4-digit year strings.
 */
const ISO_DATE_RE = /^\d{4}(-\d{2}(-\d{2}([T ][\d:.Z+-]+)?)?)?$/;

/**
 * Infer the data type of a column from a sample of its values.
 *
 * Detection priority (first match wins):
 *   1. All non-null samples parse as finite numbers → 'numeric'
 *   2. All non-null samples match the ISO-8601 prefix AND produce a valid Date → 'datetime'
 *   3. Otherwise → 'string'
 *   4. No non-null samples at all → 'unknown'
 *
 * @param samples  Up to ~20 representative values from the column.
 *                 Null / undefined entries are filtered out before analysis.
 */
export function inferColumnDtype(
  samples: (string | number | null | undefined)[],
): ColumnDtype {
  const nonNull = samples.filter(
    (v): v is string | number => v !== null && v !== undefined,
  );

  if (nonNull.length === 0) {
    return 'unknown';
  }

  // 1. Numeric check
  if (nonNull.every(v => String(v).trim() !== '' && isFinite(Number(v)))) {
    return 'numeric';
  }

  // 2. Datetime check — ISO prefix regex AND valid Date construction
  if (
    nonNull.every(v => {
      const s = String(v);
      return ISO_DATE_RE.test(s) && !isNaN(new Date(s).getTime());
    })
  ) {
    return 'datetime';
  }

  // 3. Fall through → string
  return 'string';
}
