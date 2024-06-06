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
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { equalsIfDefined, itemEquals } from '../../../../base/common/equals.js';
import { matchesSubString } from '../../../../base/common/filters.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { derivedOpts, disposableObservableValue, transaction } from '../../../../base/common/observable.js';
import { Range } from '../../../common/core/range.js';
import { SingleTextEdit } from '../../../common/core/textEdit.js';
import { TextLength } from '../../../common/core/textLength.js';
import { InlineCompletionTriggerKind } from '../../../common/languages.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { provideInlineCompletions } from './provideInlineCompletions.js';
import { singleTextRemoveCommonPrefix } from './singleTextEdit.js';
let InlineCompletionsSource = class InlineCompletionsSource extends Disposable {
    constructor(textModel, versionId, _debounceValue, languageFeaturesService, languageConfigurationService) {
        super();
        this.textModel = textModel;
        this.versionId = versionId;
        this._debounceValue = _debounceValue;
        this.languageFeaturesService = languageFeaturesService;
        this.languageConfigurationService = languageConfigurationService;
        this._updateOperation = this._register(new MutableDisposable());
        this.inlineCompletions = disposableObservableValue('inlineCompletions', undefined);
        this.suggestWidgetInlineCompletions = disposableObservableValue('suggestWidgetInlineCompletions', undefined);
        this._register(this.textModel.onDidChangeContent(() => {
            this._updateOperation.clear();
        }));
    }
    fetch(position, context, activeInlineCompletion) {
        var _a, _b;
        const request = new UpdateRequest(position, context, this.textModel.getVersionId());
        const target = context.selectedSuggestionInfo ? this.suggestWidgetInlineCompletions : this.inlineCompletions;
        if ((_a = this._updateOperation.value) === null || _a === void 0 ? void 0 : _a.request.satisfies(request)) {
            return this._updateOperation.value.promise;
        }
        else if ((_b = target.get()) === null || _b === void 0 ? void 0 : _b.request.satisfies(request)) {
            return Promise.resolve(true);
        }
        const updateOngoing = !!this._updateOperation.value;
        this._updateOperation.clear();
        const source = new CancellationTokenSource();
        const promise = (async () => {
            const shouldDebounce = updateOngoing || context.triggerKind === InlineCompletionTriggerKind.Automatic;
            if (shouldDebounce) {
                // This debounces the operation
                await wait(this._debounceValue.get(this.textModel), source.token);
            }
            if (source.token.isCancellationRequested || this.textModel.getVersionId() !== request.versionId) {
                return false;
            }
            const startTime = new Date();
            const updatedCompletions = await provideInlineCompletions(this.languageFeaturesService.inlineCompletionsProvider, position, this.textModel, context, source.token, this.languageConfigurationService);
            if (source.token.isCancellationRequested || this.textModel.getVersionId() !== request.versionId) {
                return false;
            }
            const endTime = new Date();
            this._debounceValue.update(this.textModel, endTime.getTime() - startTime.getTime());
            const completions = new UpToDateInlineCompletions(updatedCompletions, request, this.textModel, this.versionId);
            if (activeInlineCompletion) {
                const asInlineCompletion = activeInlineCompletion.toInlineCompletion(undefined);
                if (activeInlineCompletion.canBeReused(this.textModel, position) && !updatedCompletions.has(asInlineCompletion)) {
                    completions.prepend(activeInlineCompletion.inlineCompletion, asInlineCompletion.range, true);
                }
            }
            this._updateOperation.clear();
            transaction(tx => {
                /** @description Update completions with provider result */
                target.set(completions, tx);
            });
            return true;
        })();
        const updateOperation = new UpdateOperation(request, source, promise);
        this._updateOperation.value = updateOperation;
        return promise;
    }
    clear(tx) {
        this._updateOperation.clear();
        this.inlineCompletions.set(undefined, tx);
        this.suggestWidgetInlineCompletions.set(undefined, tx);
    }
    clearSuggestWidgetInlineCompletions(tx) {
        var _a;
        if ((_a = this._updateOperation.value) === null || _a === void 0 ? void 0 : _a.request.context.selectedSuggestionInfo) {
            this._updateOperation.clear();
        }
        this.suggestWidgetInlineCompletions.set(undefined, tx);
    }
    cancelUpdate() {
        this._updateOperation.clear();
    }
};
InlineCompletionsSource = __decorate([
    __param(3, ILanguageFeaturesService),
    __param(4, ILanguageConfigurationService)
], InlineCompletionsSource);
export { InlineCompletionsSource };
function wait(ms, cancellationToken) {
    return new Promise(resolve => {
        let d = undefined;
        const handle = setTimeout(() => {
            if (d) {
                d.dispose();
            }
            resolve();
        }, ms);
        if (cancellationToken) {
            d = cancellationToken.onCancellationRequested(() => {
                clearTimeout(handle);
                if (d) {
                    d.dispose();
                }
                resolve();
            });
        }
    });
}
class UpdateRequest {
    constructor(position, context, versionId) {
        this.position = position;
        this.context = context;
        this.versionId = versionId;
    }
    satisfies(other) {
        return this.position.equals(other.position)
            && equalsIfDefined(this.context.selectedSuggestionInfo, other.context.selectedSuggestionInfo, itemEquals())
            && (other.context.triggerKind === InlineCompletionTriggerKind.Automatic
                || this.context.triggerKind === InlineCompletionTriggerKind.Explicit)
            && this.versionId === other.versionId;
    }
}
class UpdateOperation {
    constructor(request, cancellationTokenSource, promise) {
        this.request = request;
        this.cancellationTokenSource = cancellationTokenSource;
        this.promise = promise;
    }
    dispose() {
        this.cancellationTokenSource.cancel();
    }
}
export class UpToDateInlineCompletions {
    get inlineCompletions() { return this._inlineCompletions; }
    constructor(inlineCompletionProviderResult, request, _textModel, _versionId) {
        this.inlineCompletionProviderResult = inlineCompletionProviderResult;
        this.request = request;
        this._textModel = _textModel;
        this._versionId = _versionId;
        this._refCount = 1;
        this._prependedInlineCompletionItems = [];
        const ids = _textModel.deltaDecorations([], inlineCompletionProviderResult.completions.map(i => ({
            range: i.range,
            options: {
                description: 'inline-completion-tracking-range'
            },
        })));
        this._inlineCompletions = inlineCompletionProviderResult.completions.map((i, index) => new InlineCompletionWithUpdatedRange(i, ids[index], this._textModel, this._versionId));
    }
    clone() {
        this._refCount++;
        return this;
    }
    dispose() {
        this._refCount--;
        if (this._refCount === 0) {
            setTimeout(() => {
                // To fix https://github.com/microsoft/vscode/issues/188348
                if (!this._textModel.isDisposed()) {
                    // This is just cleanup. It's ok if it happens with a delay.
                    this._textModel.deltaDecorations(this._inlineCompletions.map(i => i.decorationId), []);
                }
            }, 0);
            this.inlineCompletionProviderResult.dispose();
            for (const i of this._prependedInlineCompletionItems) {
                i.source.removeRef();
            }
        }
    }
    prepend(inlineCompletion, range, addRefToSource) {
        if (addRefToSource) {
            inlineCompletion.source.addRef();
        }
        const id = this._textModel.deltaDecorations([], [{
                range,
                options: {
                    description: 'inline-completion-tracking-range'
                },
            }])[0];
        this._inlineCompletions.unshift(new InlineCompletionWithUpdatedRange(inlineCompletion, id, this._textModel, this._versionId));
        this._prependedInlineCompletionItems.push(inlineCompletion);
    }
}
export class InlineCompletionWithUpdatedRange {
    get forwardStable() {
        var _a;
        return (_a = this.inlineCompletion.source.inlineCompletions.enableForwardStability) !== null && _a !== void 0 ? _a : false;
    }
    constructor(inlineCompletion, decorationId, _textModel, _modelVersion) {
        this.inlineCompletion = inlineCompletion;
        this.decorationId = decorationId;
        this._textModel = _textModel;
        this._modelVersion = _modelVersion;
        this.semanticId = JSON.stringify([
            this.inlineCompletion.filterText,
            this.inlineCompletion.insertText,
            this.inlineCompletion.range.getStartPosition().toString()
        ]);
        this._updatedRange = derivedOpts({ owner: this, equalsFn: Range.equalsRange }, reader => {
            this._modelVersion.read(reader);
            return this._textModel.getDecorationRange(this.decorationId);
        });
    }
    toInlineCompletion(reader) {
        var _a;
        return this.inlineCompletion.withRange((_a = this._updatedRange.read(reader)) !== null && _a !== void 0 ? _a : emptyRange);
    }
    toSingleTextEdit(reader) {
        var _a;
        return new SingleTextEdit((_a = this._updatedRange.read(reader)) !== null && _a !== void 0 ? _a : emptyRange, this.inlineCompletion.insertText);
    }
    isVisible(model, cursorPosition, reader) {
        const minimizedReplacement = singleTextRemoveCommonPrefix(this._toFilterTextReplacement(reader), model);
        const updatedRange = this._updatedRange.read(reader);
        if (!updatedRange
            || !this.inlineCompletion.range.getStartPosition().equals(updatedRange.getStartPosition())
            || cursorPosition.lineNumber !== minimizedReplacement.range.startLineNumber) {
            return false;
        }
        // We might consider comparing by .toLowerText, but this requires GhostTextReplacement
        const originalValue = model.getValueInRange(minimizedReplacement.range, 1 /* EndOfLinePreference.LF */);
        const filterText = minimizedReplacement.text;
        const cursorPosIndex = Math.max(0, cursorPosition.column - minimizedReplacement.range.startColumn);
        let filterTextBefore = filterText.substring(0, cursorPosIndex);
        let filterTextAfter = filterText.substring(cursorPosIndex);
        let originalValueBefore = originalValue.substring(0, cursorPosIndex);
        let originalValueAfter = originalValue.substring(cursorPosIndex);
        const originalValueIndent = model.getLineIndentColumn(minimizedReplacement.range.startLineNumber);
        if (minimizedReplacement.range.startColumn <= originalValueIndent) {
            // Remove indentation
            originalValueBefore = originalValueBefore.trimStart();
            if (originalValueBefore.length === 0) {
                originalValueAfter = originalValueAfter.trimStart();
            }
            filterTextBefore = filterTextBefore.trimStart();
            if (filterTextBefore.length === 0) {
                filterTextAfter = filterTextAfter.trimStart();
            }
        }
        return filterTextBefore.startsWith(originalValueBefore)
            && !!matchesSubString(originalValueAfter, filterTextAfter);
    }
    canBeReused(model, position) {
        const updatedRange = this._updatedRange.read(undefined);
        const result = !!updatedRange
            && updatedRange.containsPosition(position)
            && this.isVisible(model, position, undefined)
            && TextLength.ofRange(updatedRange).isGreaterThanOrEqualTo(TextLength.ofRange(this.inlineCompletion.range));
        return result;
    }
    _toFilterTextReplacement(reader) {
        var _a;
        return new SingleTextEdit((_a = this._updatedRange.read(reader)) !== null && _a !== void 0 ? _a : emptyRange, this.inlineCompletion.filterText);
    }
}
const emptyRange = new Range(1, 1, 1, 1);
