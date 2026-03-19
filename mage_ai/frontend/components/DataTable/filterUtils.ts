type Operator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'blank' | 'notblank';

type ParsedFilter = {
  filterType: 'contains' | 'string' | 'numeric' | 'date' | 'blank';
  operator: Operator;
  value: string;
  valueLower?: string;
  numericValue?: number;
  dateValue?: number;
};

const OPERATOR_REGEX = /^(>=|<=|!=|>|<|=)\s*(.*)$/;
const STRICT_NUMBER_REGEX = /^-?\d+(\.\d+)?$/;
const DATE_SEPARATOR_REGEX = /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/;
const DATE_PREFIX_REGEX = /^date\s+(>=|<=|!=|>|<|=)\s*(.*)$/i;

function tryParseDate(s: string): number | undefined {
  if (!s || !DATE_SEPARATOR_REGEX.test(s)) {
    return undefined;
  }
  const t = new Date(s).getTime();
  return isNaN(t) ? undefined : t;
}

function isBlankValue(cellValue: any): boolean {
  return cellValue === null || cellValue === undefined || cellValue === 'null' || cellValue === '';
}

function compareNumbers(a: number, b: number, operator: Operator): boolean {
  switch (operator) {
    case '=':
      return a === b;
    case '!=':
      return a !== b;
    case '>':
      return a > b;
    case '<':
      return a < b;
    case '>=':
      return a >= b;
    case '<=':
      return a <= b;
    default:
      return false;
  }
}

export function parseFilterExpression(expr: string): ParsedFilter | null {
  const trimmed = expr.trim();
  if (!trimmed) {
    return null;
  }

  const trimmedLower = trimmed.toLowerCase();
  if (trimmedLower === 'is blank') {
    return { filterType: 'blank', operator: 'blank', value: '' };
  }
  if (trimmedLower === 'is not blank') {
    return { filterType: 'blank', operator: 'notblank', value: '' };
  }

  // date prefix: "date >= 2024-01-01"
  const dateMatch = trimmed.match(DATE_PREFIX_REGEX);
  if (dateMatch) {
    const operator = dateMatch[1] as Operator;
    const valueTrimmed = dateMatch[2].trim();
    const dateValue = tryParseDate(valueTrimmed);
    if (dateValue === undefined) {
      return null;
    }
    return {
      dateValue,
      filterType: 'date',
      operator,
      value: valueTrimmed,
    };
  }

  // operator match: >, <, >=, <=, =, !=
  const match = trimmed.match(OPERATOR_REGEX);
  if (match) {
    const operator = match[1] as Operator;
    const valueTrimmed = match[2].trim();
    const isNumeric = STRICT_NUMBER_REGEX.test(valueTrimmed);

    // Numeric value → numeric filter for all operators
    if (isNumeric) {
      return {
        filterType: 'numeric',
        numericValue: parseFloat(valueTrimmed),
        operator,
        value: valueTrimmed,
      };
    }

    // Non-numeric value with >, <, >=, <= → invalid (these are always numeric)
    if (operator !== '=' && operator !== '!=') {
      return null;
    }

    return {
      filterType: 'string',
      operator,
      value: valueTrimmed,
      valueLower: valueTrimmed.toLowerCase(),
    };
  }

  // No operator → contains
  return {
    filterType: 'contains',
    operator: 'contains',
    value: trimmed,
    valueLower: trimmedLower,
  };
}

export function matchesFilter(cellValue: any, parsed: ParsedFilter): boolean {
  const { filterType, operator } = parsed;

  if (filterType === 'blank') {
    return operator === 'blank' ? isBlankValue(cellValue) : !isBlankValue(cellValue);
  }

  let displayValue: string;
  if (isBlankValue(cellValue)) {
    displayValue = 'None';
  } else if (cellValue === true) {
    displayValue = 'True';
  } else if (cellValue === false) {
    displayValue = 'False';
  } else {
    displayValue = String(cellValue);
  }

  if (filterType === 'contains') {
    return displayValue.toLowerCase().includes(parsed.valueLower ?? '');
  }

  if (filterType === 'string') {
    const displayLower = displayValue.toLowerCase();
    if (operator === '=') {
      return displayLower === (parsed.valueLower ?? '');
    }
    // !=
    return displayLower !== (parsed.valueLower ?? '');
  }

  if (filterType === 'numeric') {
    const cellNumeric = parseFloat(displayValue);
    if (isNaN(cellNumeric)) {
      return false;
    }
    return compareNumbers(cellNumeric, parsed.numericValue ?? 0, operator);
  }

  if (filterType === 'date') {
    const cellDate = tryParseDate(displayValue);
    if (cellDate === undefined) {
      return false;
    }
    return compareNumbers(cellDate, parsed.dateValue ?? 0, operator);
  }

  return false;
}

export function filterRows(
  rows: any[][],
  filters: Record<number, string>,
): {
  filteredRows: any[][];
  originalIndices: number[];
} {
  const activeFilters: { colIndex: number; parsed: ParsedFilter }[] = [];

  Object.entries(filters).forEach(([key, expr]) => {
    const parsed = parseFilterExpression(expr);
    if (parsed) {
      activeFilters.push({ colIndex: Number(key), parsed });
    }
  });

  if (activeFilters.length === 0) {
    return {
      filteredRows: rows,
      originalIndices: rows.map((_, i) => i),
    };
  }

  const filteredRows: any[][] = [];
  const originalIndices: number[] = [];
  const filterCount = activeFilters.length;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    let matches = true;
    for (let f = 0; f < filterCount; f++) {
      if (!matchesFilter(row[activeFilters[f].colIndex], activeFilters[f].parsed)) {
        matches = false;
        break;
      }
    }
    if (matches) {
      filteredRows.push(row);
      originalIndices.push(rowIndex);
    }
  }

  return { filteredRows, originalIndices };
}
