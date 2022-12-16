export const MAX_LINES_ACTIONS = 25;
export const MIN_LINES_ACTIONS = 6;
export const MAX_LINES_EXPORT_1 = 6;
export const MAX_LINES_EXPORT_2 = 8;
export const MIN_LINES_LAUNCH = 9;
export const MAX_LINES_LAUNCH = 10;
export const MIN_LINES_USE = 9;
export const MAX_LINES_USE = 10;

export const READ_ONLY: any = {
  cursorStyle: 'slim',
  highlightActiveLine: false,
  highlightGutterLine: false,
  readOnly: true,
  tabSize: 4,
  useWorker: false,
};

export const EDIT_ONLY: any = {
  highlightActiveLine: true,
  showGutter: true,
  showLineNumbers: true,
  showPrintMargin: true,
  tabSize: 4,
  useWorker: false,
};