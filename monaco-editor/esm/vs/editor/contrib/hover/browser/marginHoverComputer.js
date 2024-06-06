/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { asArray } from '../../../../base/common/arrays.js';
import { isEmptyMarkdownString } from '../../../../base/common/htmlContent.js';
import { GlyphMarginLane } from '../../../common/model.js';
export class MarginHoverComputer {
    get lineNumber() {
        return this._lineNumber;
    }
    set lineNumber(value) {
        this._lineNumber = value;
    }
    get lane() {
        return this._laneOrLine;
    }
    set lane(value) {
        this._laneOrLine = value;
    }
    constructor(_editor) {
        this._editor = _editor;
        this._lineNumber = -1;
        this._laneOrLine = GlyphMarginLane.Center;
    }
    computeSync() {
        var _a, _b;
        const toHoverMessage = (contents) => {
            return {
                value: contents
            };
        };
        const lineDecorations = this._editor.getLineDecorations(this._lineNumber);
        const result = [];
        const isLineHover = this._laneOrLine === 'lineNo';
        if (!lineDecorations) {
            return result;
        }
        for (const d of lineDecorations) {
            const lane = (_b = (_a = d.options.glyphMargin) === null || _a === void 0 ? void 0 : _a.position) !== null && _b !== void 0 ? _b : GlyphMarginLane.Center;
            if (!isLineHover && lane !== this._laneOrLine) {
                continue;
            }
            const hoverMessage = isLineHover ? d.options.lineNumberHoverMessage : d.options.glyphMarginHoverMessage;
            if (!hoverMessage || isEmptyMarkdownString(hoverMessage)) {
                continue;
            }
            result.push(...asArray(hoverMessage).map(toHoverMessage));
        }
        return result;
    }
}
