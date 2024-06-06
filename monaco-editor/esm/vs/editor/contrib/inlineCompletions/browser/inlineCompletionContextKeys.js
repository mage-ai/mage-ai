/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { autorun } from '../../../../base/common/observable.js';
import { firstNonWhitespaceIndex } from '../../../../base/common/strings.js';
import { CursorColumns } from '../../../common/core/cursorColumns.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
export class InlineCompletionContextKeys extends Disposable {
    constructor(contextKeyService, model) {
        super();
        this.contextKeyService = contextKeyService;
        this.model = model;
        this.inlineCompletionVisible = InlineCompletionContextKeys.inlineSuggestionVisible.bindTo(this.contextKeyService);
        this.inlineCompletionSuggestsIndentation = InlineCompletionContextKeys.inlineSuggestionHasIndentation.bindTo(this.contextKeyService);
        this.inlineCompletionSuggestsIndentationLessThanTabSize = InlineCompletionContextKeys.inlineSuggestionHasIndentationLessThanTabSize.bindTo(this.contextKeyService);
        this.suppressSuggestions = InlineCompletionContextKeys.suppressSuggestions.bindTo(this.contextKeyService);
        this._register(autorun(reader => {
            /** @description update context key: inlineCompletionVisible, suppressSuggestions */
            const model = this.model.read(reader);
            const state = model === null || model === void 0 ? void 0 : model.state.read(reader);
            const isInlineCompletionVisible = !!(state === null || state === void 0 ? void 0 : state.inlineCompletion) && (state === null || state === void 0 ? void 0 : state.primaryGhostText) !== undefined && !(state === null || state === void 0 ? void 0 : state.primaryGhostText.isEmpty());
            this.inlineCompletionVisible.set(isInlineCompletionVisible);
            if ((state === null || state === void 0 ? void 0 : state.primaryGhostText) && (state === null || state === void 0 ? void 0 : state.inlineCompletion)) {
                this.suppressSuggestions.set(state.inlineCompletion.inlineCompletion.source.inlineCompletions.suppressSuggestions);
            }
        }));
        this._register(autorun(reader => {
            /** @description update context key: inlineCompletionSuggestsIndentation, inlineCompletionSuggestsIndentationLessThanTabSize */
            const model = this.model.read(reader);
            let startsWithIndentation = false;
            let startsWithIndentationLessThanTabSize = true;
            const ghostText = model === null || model === void 0 ? void 0 : model.primaryGhostText.read(reader);
            if (!!(model === null || model === void 0 ? void 0 : model.selectedSuggestItem) && ghostText && ghostText.parts.length > 0) {
                const { column, lines } = ghostText.parts[0];
                const firstLine = lines[0];
                const indentationEndColumn = model.textModel.getLineIndentColumn(ghostText.lineNumber);
                const inIndentation = column <= indentationEndColumn;
                if (inIndentation) {
                    let firstNonWsIdx = firstNonWhitespaceIndex(firstLine);
                    if (firstNonWsIdx === -1) {
                        firstNonWsIdx = firstLine.length - 1;
                    }
                    startsWithIndentation = firstNonWsIdx > 0;
                    const tabSize = model.textModel.getOptions().tabSize;
                    const visibleColumnIndentation = CursorColumns.visibleColumnFromColumn(firstLine, firstNonWsIdx + 1, tabSize);
                    startsWithIndentationLessThanTabSize = visibleColumnIndentation < tabSize;
                }
            }
            this.inlineCompletionSuggestsIndentation.set(startsWithIndentation);
            this.inlineCompletionSuggestsIndentationLessThanTabSize.set(startsWithIndentationLessThanTabSize);
        }));
    }
}
InlineCompletionContextKeys.inlineSuggestionVisible = new RawContextKey('inlineSuggestionVisible', false, localize('inlineSuggestionVisible', "Whether an inline suggestion is visible"));
InlineCompletionContextKeys.inlineSuggestionHasIndentation = new RawContextKey('inlineSuggestionHasIndentation', false, localize('inlineSuggestionHasIndentation', "Whether the inline suggestion starts with whitespace"));
InlineCompletionContextKeys.inlineSuggestionHasIndentationLessThanTabSize = new RawContextKey('inlineSuggestionHasIndentationLessThanTabSize', true, localize('inlineSuggestionHasIndentationLessThanTabSize', "Whether the inline suggestion starts with whitespace that is less than what would be inserted by tab"));
InlineCompletionContextKeys.suppressSuggestions = new RawContextKey('inlineSuggestionSuppressSuggestions', undefined, localize('suppressSuggestions', "Whether suggestions should be suppressed for the current suggestion"));
