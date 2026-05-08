import LogType, { LogDataType } from '@interfaces/LogType';

const HIGHLIGHT_STYLE = {
  backgroundColor: 'rgba(255, 199, 0, 0.35)',
  borderRadius: 2,
};

export enum LogSearchFieldEnum {
  ALL = 'all',
  BLOCK_RUN_ID = 'block_run_id',
  BLOCK_UUID = 'block_uuid',
  ERROR = 'error',
  LEVEL = 'level',
  LOG_UUID = 'log_uuid',
  MESSAGE = 'message',
  PIPELINE_RUN_ID = 'pipeline_run_id',
}

export function normalizeSearchQuery(searchQuery: string): string {
  return (searchQuery || '').trim().toLowerCase();
}

// This function is used to serialize different types of values for each field into a string format for search purposes.
function serializeForSearch(value: unknown): string {
  if (value === null || typeof value === 'undefined') {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}
// This function checks if a log matches the search query across all searchable fields, without filtering by a specific field.
export function logMatchesSearch(log: LogType, normalizedSearchQuery: string): boolean {
  if (!normalizedSearchQuery) {
    return true;
  }

  const logData: LogDataType = log?.data || {} as LogDataType;

  // we can probably just use log?.content here instead of all these fields, but to be safe we will include all searchable fields for now
  const allSearchableValues = [
    log?.name,
    log?.path,
    log?.content,
    logData?.block_run_id,
    logData?.block_uuid,
    logData?.error,
    logData?.error_stack,
    logData?.error_stacktrace,
    logData?.level,
    logData?.message,
    logData?.pipeline_run_id,
    logData?.timestamp,
    logData?.uuid,
    logData,
  ];

  const searchableText = allSearchableValues
    .map(serializeForSearch)
    .join(' ')
    .toLowerCase();

  return searchableText.includes(normalizedSearchQuery);
}

/* This function is used when a specific search field is selected,
   to determine if the log matches the search query based on that field.*/
export function logMatchesSearchByField(
  log: LogType,
  normalizedSearchQuery: string,
  searchField: LogSearchFieldEnum,
): boolean {
  if (!normalizedSearchQuery) {
    return true;
  }

  if (!searchField || LogSearchFieldEnum.ALL === searchField) {
    return logMatchesSearch(log, normalizedSearchQuery);
  }
  
  const logData: LogDataType = log?.data || {} as LogDataType;

  const valuesByField = {
    [LogSearchFieldEnum.BLOCK_RUN_ID]: [logData?.block_run_id],
    [LogSearchFieldEnum.BLOCK_UUID]: [logData?.block_uuid, log?.name],
    [LogSearchFieldEnum.ERROR]: [logData?.error, logData?.error_stack, logData?.error_stacktrace],
    [LogSearchFieldEnum.LEVEL]: [logData?.level],
    [LogSearchFieldEnum.LOG_UUID]: [logData?.uuid],
    [LogSearchFieldEnum.MESSAGE]: [logData?.message],
    [LogSearchFieldEnum.PIPELINE_RUN_ID]: [logData?.pipeline_run_id],
  };

  const searchValues = valuesByField?.[searchField] || [];
  const searchableText = searchValues
    .map(serializeForSearch)
    .join(' ')
    .toLowerCase();

  return searchableText.includes(normalizedSearchQuery);
}

export function highlightTextMatches(
  textValue: string,
  searchQuery: string,
  keyPrefix: string,
): string | JSX.Element {
  if (typeof textValue !== 'string') {
    return textValue;
  }

  const normalizedSearchQuery = normalizeSearchQuery(searchQuery);
  if (!normalizedSearchQuery) {
    return textValue;
  }

  const sourceText = textValue;
  const lowerSourceText = sourceText.toLowerCase();

  if (!lowerSourceText.includes(normalizedSearchQuery)) {
    return textValue;
  }

  const pieces = [];
  let index = 0;
  let matchIndex = 0;

  while (index < sourceText.length) {
    const nextMatchIndex = lowerSourceText.indexOf(normalizedSearchQuery, index);
    if (nextMatchIndex === -1) {
      pieces.push(sourceText.slice(index));
      break;
    }

    if (nextMatchIndex > index) {
      pieces.push(sourceText.slice(index, nextMatchIndex));
    }

    const endMatchIndex = nextMatchIndex + normalizedSearchQuery.length;
    pieces.push(
      <span
        key={`${keyPrefix}_match_${matchIndex}`}
        style={HIGHLIGHT_STYLE}
      >
        {sourceText.slice(nextMatchIndex, endMatchIndex)}
      </span>,
    );

    index = endMatchIndex;
    matchIndex += 1;
  }

  return <>{pieces}</>;
}
