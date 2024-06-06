/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce } from '../../../../base/common/arrays.js';
import { AsyncIterableObject } from '../../../../base/common/async.js';
export class ContentHoverComputer {
    get anchor() { return this._anchor; }
    set anchor(value) { this._anchor = value; }
    get shouldFocus() { return this._shouldFocus; }
    set shouldFocus(value) { this._shouldFocus = value; }
    get source() { return this._source; }
    set source(value) { this._source = value; }
    get insistOnKeepingHoverVisible() { return this._insistOnKeepingHoverVisible; }
    set insistOnKeepingHoverVisible(value) { this._insistOnKeepingHoverVisible = value; }
    constructor(_editor, _participants) {
        this._editor = _editor;
        this._participants = _participants;
        this._anchor = null;
        this._shouldFocus = false;
        this._source = 0 /* HoverStartSource.Mouse */;
        this._insistOnKeepingHoverVisible = false;
    }
    static _getLineDecorations(editor, anchor) {
        if (anchor.type !== 1 /* HoverAnchorType.Range */ && !anchor.supportsMarkerHover) {
            return [];
        }
        const model = editor.getModel();
        const lineNumber = anchor.range.startLineNumber;
        if (lineNumber > model.getLineCount()) {
            // invalid line
            return [];
        }
        const maxColumn = model.getLineMaxColumn(lineNumber);
        return editor.getLineDecorations(lineNumber).filter((d) => {
            if (d.options.isWholeLine) {
                return true;
            }
            const startColumn = (d.range.startLineNumber === lineNumber) ? d.range.startColumn : 1;
            const endColumn = (d.range.endLineNumber === lineNumber) ? d.range.endColumn : maxColumn;
            if (d.options.showIfCollapsed) {
                // Relax check around `showIfCollapsed` decorations to also include +/- 1 character
                if (startColumn > anchor.range.startColumn + 1 || anchor.range.endColumn - 1 > endColumn) {
                    return false;
                }
            }
            else {
                if (startColumn > anchor.range.startColumn || anchor.range.endColumn > endColumn) {
                    return false;
                }
            }
            return true;
        });
    }
    computeAsync(token) {
        const anchor = this._anchor;
        if (!this._editor.hasModel() || !anchor) {
            return AsyncIterableObject.EMPTY;
        }
        const lineDecorations = ContentHoverComputer._getLineDecorations(this._editor, anchor);
        return AsyncIterableObject.merge(this._participants.map((participant) => {
            if (!participant.computeAsync) {
                return AsyncIterableObject.EMPTY;
            }
            return participant.computeAsync(anchor, lineDecorations, token);
        }));
    }
    computeSync() {
        if (!this._editor.hasModel() || !this._anchor) {
            return [];
        }
        const lineDecorations = ContentHoverComputer._getLineDecorations(this._editor, this._anchor);
        let result = [];
        for (const participant of this._participants) {
            result = result.concat(participant.computeSync(this._anchor, lineDecorations));
        }
        return coalesce(result);
    }
}
