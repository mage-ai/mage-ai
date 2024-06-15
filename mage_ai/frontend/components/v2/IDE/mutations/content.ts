interface Range {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

interface Change {
  range: Range;
  rangeLength: number;
  text: string;
  rangeOffset: number;
  forceMoveMarkers: boolean;
}

interface ChangeObject {
  changes: Change[];
  eol: string;
  isEolChange: boolean;
  versionId: number;
  isUndoing: boolean;
  isRedoing: boolean;
  isFlush: boolean;
}

export function updateContent(baseText: string, changeObject: ChangeObject): string {
  const lines = baseText.split('\n');

  for (const change of changeObject.changes) {
    const { range, text } = change;

    // Extract and modify the appropriate line
    const lineIndex = range.startLineNumber - 1;
    const line = lines[lineIndex];
    const startCol = range.startColumn - 1;
    const endCol = range.endColumn - 1;

    const newLine = line.slice(0, startCol) + text + line.slice(endCol);
    lines[lineIndex] = newLine;
  }

  return lines.join(changeObject.eol);
}
