type ParsedFilter = {
  operator: string;
  value: string;
  valueLower: string;
  numericValue?: number;
  dateValue?: number;
};

const OPERATOR_REGEX = /^(>=|<=|!=|>|<|=)\s*(.*)$/;
const STRICT_NUMBER_REGEX = /^-?\d+(\.\d+)?$/;
const DATE_SEPARATOR_REGEX = /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/;

function tryParseDate(s: string): number | undefined {
  if (!s || !DATE_SEPARATOR_REGEX.test(s)) {
    return undefined;
  }
  const t = new Date(s).getTime();
  return isNaN(t) ? undefined : t;
}

export function parseFilterExpression(expr: string): ParsedFilter | null {
  const trimmed = expr.trim();
  if (!trimmed) {
    return null;
  }

  const trimmedLower = trimmed.toLowerCase();
  if (trimmedLower === 'is blank') {
    return { operator: 'blank', value: '', valueLower: '' };
  }
  if (trimmedLower === 'is not blank') {
    return { operator: 'notblank', value: '', valueLower: '' };
  }

  const match = trimmed.match(OPERATOR_REGEX);
  if (match) {
    const operator = match[1];
    const value = match[2];
    const valueTrimmed = value.trim();
    const isStrictNumber = STRICT_NUMBER_REGEX.test(valueTrimmed);
    const numericValue = isStrictNumber ? parseFloat(value) : undefined;
    const dateValue = tryParseDate(valueTrimmed);
    return {
      dateValue,
      numericValue,
      operator,
      value,
      valueLower: valueTrimmed.toLowerCase(),
    };
  }

  return {
    operator: 'contains',
    value: trimmed,
    valueLower: trimmedLower,
  };
}

export function matchesFilter(cellValue: any, parsed: ParsedFilter): boolean {
  const { operator } = parsed;

  if (operator === 'blank') {
    return cellValue === null || cellValue === undefined || cellValue === 'null' || cellValue === '';
  }
  if (operator === 'notblank') {
    return cellValue !== null && cellValue !== undefined && cellValue !== 'null' && cellValue !== '';
  }

  let displayValue: string;
  if (cellValue === null || cellValue === undefined || cellValue === 'null') {
    displayValue = 'None';
  } else if (cellValue === true) {
    displayValue = 'True';
  } else if (cellValue === false) {
    displayValue = 'False';
  } else {
    displayValue = String(cellValue);
  }

  const { valueLower, numericValue, dateValue } = parsed;

  if (operator === 'contains') {
    return displayValue.toLowerCase().includes(valueLower);
  }

  // Date comparison takes priority over numeric — skip when filter isn't a date
  if (dateValue !== undefined) {
    const cellDate = tryParseDate(displayValue);
    if (cellDate !== undefined) {
      switch (operator) {
        case '=':
          return cellDate === dateValue;
        case '!=':
          return cellDate !== dateValue;
        case '>':
          return cellDate > dateValue;
        case '<':
          return cellDate < dateValue;
        case '>=':
          return cellDate >= dateValue;
        case '<=':
          return cellDate <= dateValue;
      }
    }
  }

  // Numeric comparison — skip regex when filter isn't numeric
  if (numericValue !== undefined) {
    const isStrictCellNumber = STRICT_NUMBER_REGEX.test(displayValue);
    if (isStrictCellNumber) {
      const cellNumeric = parseFloat(displayValue);
      switch (operator) {
        case '=':
          return cellNumeric === numericValue;
        case '!=':
          return cellNumeric !== numericValue;
        case '>':
          return cellNumeric > numericValue;
        case '<':
          return cellNumeric < numericValue;
        case '>=':
          return cellNumeric >= numericValue;
        case '<=':
          return cellNumeric <= numericValue;
      }
    }
  }

  // String fallback
  const displayLower = displayValue.toLowerCase();
  if (operator === '=') {
    return displayLower === valueLower;
  }
  if (operator === '!=') {
    return displayLower !== valueLower;
  }

  const cmp = displayLower.localeCompare(valueLower);
  switch (operator) {
    case '>':
      return cmp > 0;
    case '<':
      return cmp < 0;
    case '>=':
      return cmp >= 0;
    case '<=':
      return cmp <= 0;
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
