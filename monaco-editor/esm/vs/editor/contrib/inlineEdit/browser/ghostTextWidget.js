/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { derived, observableFromEvent, observableValue } from '../../../../base/common/observable.js';
import './inlineEdit.css';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { InjectedTextCursorStops } from '../../../common/model.js';
import { LineDecoration } from '../../../common/viewLayout/lineDecorations.js';
import { AdditionalLinesWidget } from '../../inlineCompletions/browser/ghostTextWidget.js';
import { ColumnRange, applyObservableDecorations } from '../../inlineCompletions/browser/utils.js';
export const INLINE_EDIT_DESCRIPTION = 'inline-edit';
let GhostTextWidget = class GhostTextWidget extends Disposable {
    constructor(editor, model, languageService) {
        super();
        this.editor = editor;
        this.model = model;
        this.languageService = languageService;
        this.isDisposed = observableValue(this, false);
        this.currentTextModel = observableFromEvent(this.editor.onDidChangeModel, () => /** @description editor.model */ this.editor.getModel());
        this.uiState = derived(this, reader => {
            var _a;
            if (this.isDisposed.read(reader)) {
                return undefined;
            }
            const textModel = this.currentTextModel.read(reader);
            if (textModel !== this.model.targetTextModel.read(reader)) {
                return undefined;
            }
            const ghostText = this.model.ghostText.read(reader);
            if (!ghostText) {
                return undefined;
            }
            let range = (_a = this.model.range) === null || _a === void 0 ? void 0 : _a.read(reader);
            //if range is empty, we want to remove it
            if (range && range.startLineNumber === range.endLineNumber && range.startColumn === range.endColumn) {
                range = undefined;
            }
            //check if both range and text are single line - in this case we want to do inline replacement
            //rather than replacing whole lines
            const isSingleLine = (range ? range.startLineNumber === range.endLineNumber : true) && ghostText.parts.length === 1 && ghostText.parts[0].lines.length === 1;
            //check if we're just removing code
            const isPureRemove = ghostText.parts.length === 1 && ghostText.parts[0].lines.every(l => l.length === 0);
            const inlineTexts = [];
            const additionalLines = [];
            function addToAdditionalLines(lines, className) {
                if (additionalLines.length > 0) {
                    const lastLine = additionalLines[additionalLines.length - 1];
                    if (className) {
                        lastLine.decorations.push(new LineDecoration(lastLine.content.length + 1, lastLine.content.length + 1 + lines[0].length, className, 0 /* InlineDecorationType.Regular */));
                    }
                    lastLine.content += lines[0];
                    lines = lines.slice(1);
                }
                for (const line of lines) {
                    additionalLines.push({
                        content: line,
                        decorations: className ? [new LineDecoration(1, line.length + 1, className, 0 /* InlineDecorationType.Regular */)] : []
                    });
                }
            }
            const textBufferLine = textModel.getLineContent(ghostText.lineNumber);
            let hiddenTextStartColumn = undefined;
            let lastIdx = 0;
            if (!isPureRemove) {
                for (const part of ghostText.parts) {
                    let lines = part.lines;
                    //If remove range is set, we want to push all new liens to virtual area
                    if (range && !isSingleLine) {
                        addToAdditionalLines(lines, INLINE_EDIT_DESCRIPTION);
                        lines = [];
                    }
                    if (hiddenTextStartColumn === undefined) {
                        inlineTexts.push({
                            column: part.column,
                            text: lines[0],
                            preview: part.preview,
                        });
                        lines = lines.slice(1);
                    }
                    else {
                        addToAdditionalLines([textBufferLine.substring(lastIdx, part.column - 1)], undefined);
                    }
                    if (lines.length > 0) {
                        addToAdditionalLines(lines, INLINE_EDIT_DESCRIPTION);
                        if (hiddenTextStartColumn === undefined && part.column <= textBufferLine.length) {
                            hiddenTextStartColumn = part.column;
                        }
                    }
                    lastIdx = part.column - 1;
                }
                if (hiddenTextStartColumn !== undefined) {
                    addToAdditionalLines([textBufferLine.substring(lastIdx)], undefined);
                }
            }
            const hiddenRange = hiddenTextStartColumn !== undefined ? new ColumnRange(hiddenTextStartColumn, textBufferLine.length + 1) : undefined;
            const lineNumber = (isSingleLine || !range) ? ghostText.lineNumber : range.endLineNumber - 1;
            return {
                inlineTexts,
                additionalLines,
                hiddenRange,
                lineNumber,
                additionalReservedLineCount: this.model.minReservedLineCount.read(reader),
                targetTextModel: textModel,
                range,
                isSingleLine,
                isPureRemove,
                backgroundColoring: this.model.backgroundColoring.read(reader)
            };
        });
        this.decorations = derived(this, reader => {
            const uiState = this.uiState.read(reader);
            if (!uiState) {
                return [];
            }
            const decorations = [];
            if (uiState.hiddenRange) {
                decorations.push({
                    range: uiState.hiddenRange.toRange(uiState.lineNumber),
                    options: { inlineClassName: 'inline-edit-hidden', description: 'inline-edit-hidden', }
                });
            }
            if (uiState.range) {
                const ranges = [];
                if (uiState.isSingleLine) {
                    ranges.push(uiState.range);
                }
                else if (uiState.isPureRemove) {
                    const lines = uiState.range.endLineNumber - uiState.range.startLineNumber;
                    for (let i = 0; i < lines; i++) {
                        const line = uiState.range.startLineNumber + i;
                        const firstNonWhitespace = uiState.targetTextModel.getLineFirstNonWhitespaceColumn(line);
                        const lastNonWhitespace = uiState.targetTextModel.getLineLastNonWhitespaceColumn(line);
                        const range = new Range(line, firstNonWhitespace, line, lastNonWhitespace);
                        ranges.push(range);
                    }
                }
                else {
                    const lines = uiState.range.endLineNumber - uiState.range.startLineNumber;
                    for (let i = 0; i < lines; i++) {
                        const line = uiState.range.startLineNumber + i;
                        const firstNonWhitespace = uiState.targetTextModel.getLineFirstNonWhitespaceColumn(line);
                        const lastNonWhitespace = uiState.targetTextModel.getLineLastNonWhitespaceColumn(line);
                        const range = new Range(line, firstNonWhitespace, line, lastNonWhitespace);
                        ranges.push(range);
                    }
                }
                const className = uiState.backgroundColoring ? 'inline-edit-remove backgroundColoring' : 'inline-edit-remove';
                for (const range of ranges) {
                    decorations.push({
                        range,
                        options: { inlineClassName: className, description: 'inline-edit-remove', }
                    });
                }
            }
            for (const p of uiState.inlineTexts) {
                decorations.push({
                    range: Range.fromPositions(new Position(uiState.lineNumber, p.column)),
                    options: {
                        description: INLINE_EDIT_DESCRIPTION,
                        after: { content: p.text, inlineClassName: p.preview ? 'inline-edit-decoration-preview' : 'inline-edit-decoration', cursorStops: InjectedTextCursorStops.Left },
                        showIfCollapsed: true,
                    }
                });
            }
            return decorations;
        });
        this.additionalLinesWidget = this._register(new AdditionalLinesWidget(this.editor, this.languageService.languageIdCodec, derived(reader => {
            /** @description lines */
            const uiState = this.uiState.read(reader);
            return uiState && !uiState.isPureRemove ? {
                lineNumber: uiState.lineNumber,
                additionalLines: uiState.additionalLines,
                minReservedLineCount: uiState.additionalReservedLineCount,
                targetTextModel: uiState.targetTextModel,
            } : undefined;
        })));
        this._register(toDisposable(() => { this.isDisposed.set(true, undefined); }));
        this._register(applyObservableDecorations(this.editor, this.decorations));
    }
    ownsViewZone(viewZoneId) {
        return this.additionalLinesWidget.viewZoneId === viewZoneId;
    }
};
GhostTextWidget = __decorate([
    __param(2, ILanguageService)
], GhostTextWidget);
export { GhostTextWidget };
