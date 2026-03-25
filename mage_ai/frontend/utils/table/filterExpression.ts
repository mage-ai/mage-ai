export type ColumnDtype = 'string' | 'numeric' | 'datetime' | 'unknown';

export type FilterResult = {
  hint?: string;
  match: boolean;
};

/**
 * Word-alias → canonical operator map.
 * Exact set — no additions, no omissions.
 */
export const OPERATOR_ALIASES: { [alias: string]: string } = {
  eq: '=',
  ge: '>=',
  gt: '>',
  le: '<=',
  lt: '<',
  ne: '!=',
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface ParsedExpression {
  operator: string;
  value: string;
}

/**
 * Resolve the operator and operand value from a raw expression string.
 *
 * Parsing order:
 *   1. Word aliases (whole-word match at start of string, e.g. "gt 500")
 *   2. Word operators: "contains", "datestartswith"
 *   3. Symbol operators, longest-first to avoid partial matches
 *      (>= <= != before > < =)
 *   4. No recognisable operator → operator is '' (caller uses dtype default)
 */
function parseExpression(expression: string): ParsedExpression {
  const trimmed = expression.trim();

  // 1. Word aliases — must be followed by whitespace (whole-word boundary)
  for (const [alias, canonical] of Object.entries(OPERATOR_ALIASES)) {
    const re = new RegExp(`^${alias}(?:\\s+|$)`, 'i');
    if (re.test(trimmed)) {
      return { operator: canonical, value: trimmed.slice(alias.length).trim() };
    }
  }

  // 2. Word operators
  const wordOps = ['datestartswith', 'contains'];
  for (const op of wordOps) {
    const re = new RegExp(`^${op}(?:\\s+|$)`, 'i');
    if (re.test(trimmed)) {
      return { operator: op.toLowerCase(), value: trimmed.slice(op.length).trim() };
    }
  }

  // 3. Symbol operators — longest first to prevent partial matches
  const symbolOps = ['>=', '<=', '!=', '>', '<', '='];
  for (const op of symbolOps) {
    if (trimmed.startsWith(op)) {
      return { operator: op, value: trimmed.slice(op.length).trim() };
    }
  }

  // 4. No operator recognised — plain value, caller applies dtype default
  return { operator: '', value: trimmed };
}

// ---------------------------------------------------------------------------
// Per-dtype filter applicators
// ---------------------------------------------------------------------------

function applyStringFilter(
  cell: string | number | null | undefined,
  operator: string,
  value: string,
): FilterResult {
  // Case-insensitive by design: prioritises exploration UX over strict Dash convention parity.
  // Dash DataTable uses case-sensitive contains/= for string columns; we do not.

  const cellStr = cell == null ? '' : String(cell);

  // None-check mode (all dtypes)
  if (value.toLowerCase() === 'none') {
    // Also treat the string "null" as None — the table renderer displays it as "None".
    const isNone = cell == null || cellStr.trim() === '' || cellStr.toLowerCase() === 'null';
    if (operator === '!=') {
      return { match: !isNone };
    }
    return { match: isNone };
  }

  const cellLower = cellStr.toLowerCase();
  const valueLower = value.toLowerCase();

  switch (operator) {
    case 'contains':
      return { match: cellLower.includes(valueLower) };
    case '=':
      return { match: cellLower === valueLower };
    case '!=':
      return { match: cellLower !== valueLower };
    case '>':
      return { match: cellLower > valueLower };
    case '>=':
      return { match: cellLower >= valueLower };
    case '<':
      return { match: cellLower < valueLower };
    case '<=':
      return { match: cellLower <= valueLower };
    default:
      return { hint: 'Unknown operator. Try: contains, =, >=', match: true };
  }
}

function applyNumericFilter(
  cell: string | number | null | undefined,
  operator: string,
  value: string,
): FilterResult {
  // None-check mode
  if (value.toLowerCase() === 'none') {
    const cellNum = Number(cell);
    const isNone = cell == null || isNaN(cellNum);
    if (operator === '!=') {
      return { match: !isNone };
    }
    return { match: isNone };
  }

  // Disallow text-only operators that make no sense for numeric columns
  if (operator === 'contains' || operator === 'datestartswith') {
    return { hint: 'Invalid for numeric column. Try: > 1000', match: true };
  }

  // Validate that the expression value is actually numeric
  const numValue = Number(value);
  if (value === '' || isNaN(numValue)) {
    if (value === '') {
      return { hint: 'Incomplete expression. Try: > 0', match: true };
    }
    return { hint: 'Invalid for numeric column. Try: > 1000', match: true };
  }

  const cellNum = Number(cell);

  switch (operator) {
    case '=':
      return { match: cellNum === numValue };
    case '!=':
      return { match: cellNum !== numValue };
    case '>':
      return { match: cellNum > numValue };
    case '>=':
      return { match: cellNum >= numValue };
    case '<':
      return { match: cellNum < numValue };
    case '<=':
      return { match: cellNum <= numValue };
    default:
      return { hint: 'Unknown operator. Try: contains, =, >=', match: true };
  }
}

function applyDatetimeFilter(
  cell: string | number | null | undefined,
  operator: string,
  value: string,
): FilterResult {
  // None-check mode
  if (value.toLowerCase() === 'none') {
    const isNone = cell == null || isNaN(new Date(String(cell)).getTime());
    if (operator === '!=') {
      return { match: !isNone };
    }
    return { match: isNone };
  }

  switch (operator) {
    case 'datestartswith':
      return { match: String(cell).startsWith(value) };

    case 'contains':
      // Delegate to string contains — not an error for datetime columns
      return { match: String(cell).toLowerCase().includes(value.toLowerCase()) };

    case '=':
    case '!=':
    case '>':
    case '>=':
    case '<':
    case '<=': {
      const cellDate = new Date(String(cell));
      const valueDate = new Date(value);
      if (isNaN(cellDate.getTime()) || isNaN(valueDate.getTime())) {
        return { hint: 'Invalid date. Try: datestartswith 2023', match: true };
      }
      const cellMs = cellDate.getTime();
      const valueMs = valueDate.getTime();
      switch (operator) {
        case '=':
          return { match: cellMs === valueMs };
        case '!=':
          return { match: cellMs !== valueMs };
        case '>':
          return { match: cellMs > valueMs };
        case '>=':
          return { match: cellMs >= valueMs };
        case '<':
          return { match: cellMs < valueMs };
        case '<=':
          return { match: cellMs <= valueMs };
        default:
          return { match: true };
      }
    }

    default:
      return { hint: 'Unknown operator. Try: contains, =, >=', match: true };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a filter expression string and test it against a single cell value.
 *
 * Never throws — every code path returns a FilterResult.
 * Invalid expressions return { match: true, hint: '...' } so the table stays
 * in its pre-filter state rather than silently removing rows.
 *
 * @param cellValue  The value from the table cell (may be null/undefined).
 * @param expression The raw expression typed by the user.
 * @param dtype      The inferred column data type.
 */
export function parseAndApplyFilter(
  cellValue: string | number | null | undefined,
  expression: string,
  dtype: ColumnDtype,
): FilterResult {
  // Empty / whitespace-only expression → no filter applied
  if (expression.trim() === '') {
    return { match: true };
  }

  const { operator, value } = parseExpression(expression);

  switch (dtype) {
    case 'numeric': {
      // Default operator for numeric columns is '='
      const resolvedOp = operator === '' ? '=' : operator;
      return applyNumericFilter(cellValue, resolvedOp, value);
    }

    case 'datetime': {
      // Default operator for datetime columns is 'datestartswith'
      const resolvedOp = operator === '' ? 'datestartswith' : operator;
      return applyDatetimeFilter(cellValue, resolvedOp, value);
    }

    case 'string':
    case 'unknown':
    default: {
      // Default operator for string (and unknown) columns is 'contains'
      const resolvedOp = operator === '' ? 'contains' : operator;
      return applyStringFilter(cellValue, resolvedOp, value);
    }
  }
}
