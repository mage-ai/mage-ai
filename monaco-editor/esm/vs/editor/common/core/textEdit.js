/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertFn, checkAdjacentItems } from '../../../base/common/assert.js';
import { BugIndicatingError } from '../../../base/common/errors.js';
import { Position } from './position.js';
import { PositionOffsetTransformer } from './positionToOffset.js';
import { Range } from './range.js';
import { TextLength } from './textLength.js';
export class TextEdit {
    constructor(edits) {
        this.edits = edits;
        assertFn(() => checkAdjacentItems(edits, (a, b) => a.range.getEndPosition().isBeforeOrEqual(b.range.getStartPosition())));
    }
    apply(text) {
        let result = '';
        let lastEditEnd = new Position(1, 1);
        for (const edit of this.edits) {
            const editRange = edit.range;
            const editStart = editRange.getStartPosition();
            const editEnd = editRange.getEndPosition();
            const r = rangeFromPositions(lastEditEnd, editStart);
            if (!r.isEmpty()) {
                result += text.getValueOfRange(r);
            }
            result += edit.text;
            lastEditEnd = editEnd;
        }
        const r = rangeFromPositions(lastEditEnd, text.endPositionExclusive);
        if (!r.isEmpty()) {
            result += text.getValueOfRange(r);
        }
        return result;
    }
    applyToString(str) {
        const strText = new StringText(str);
        return this.apply(strText);
    }
    getNewRanges() {
        const newRanges = [];
        let previousEditEndLineNumber = 0;
        let lineOffset = 0;
        let columnOffset = 0;
        for (const edit of this.edits) {
            const textLength = TextLength.ofText(edit.text);
            const newRangeStart = Position.lift({
                lineNumber: edit.range.startLineNumber + lineOffset,
                column: edit.range.startColumn + (edit.range.startLineNumber === previousEditEndLineNumber ? columnOffset : 0)
            });
            const newRange = textLength.createRange(newRangeStart);
            newRanges.push(newRange);
            lineOffset = newRange.endLineNumber - edit.range.endLineNumber;
            columnOffset = newRange.endColumn - edit.range.endColumn;
            previousEditEndLineNumber = edit.range.endLineNumber;
        }
        return newRanges;
    }
}
export class SingleTextEdit {
    constructor(range, text) {
        this.range = range;
        this.text = text;
    }
}
function rangeFromPositions(start, end) {
    if (start.lineNumber === end.lineNumber && start.column === Number.MAX_SAFE_INTEGER) {
        return Range.fromPositions(end, end);
    }
    else if (!start.isBeforeOrEqual(end)) {
        throw new BugIndicatingError('start must be before end');
    }
    return new Range(start.lineNumber, start.column, end.lineNumber, end.column);
}
export class AbstractText {
    get endPositionExclusive() {
        return this.length.addToPosition(new Position(1, 1));
    }
}
export class StringText extends AbstractText {
    constructor(value) {
        super();
        this.value = value;
        this._t = new PositionOffsetTransformer(this.value);
    }
    getValueOfRange(range) {
        return this._t.getOffsetRange(range).substring(this.value);
    }
    get length() {
        return this._t.textLength;
    }
}
