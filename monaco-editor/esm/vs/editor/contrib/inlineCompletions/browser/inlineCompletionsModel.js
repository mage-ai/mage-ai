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
import { Permutation } from '../../../../base/common/arrays.js';
import { mapFindFirst } from '../../../../base/common/arraysFind.js';
import { itemsEquals } from '../../../../base/common/equals.js';
import { BugIndicatingError, onUnexpectedError, onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { autorun, derived, derivedHandleChanges, derivedOpts, observableSignal, observableValue, recomputeInitiallyAndOnChange, subtransaction, transaction } from '../../../../base/common/observable.js';
import { commonPrefixLength, splitLinesIncludeSeparators } from '../../../../base/common/strings.js';
import { isDefined } from '../../../../base/common/types.js';
import { EditOperation } from '../../../common/core/editOperation.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { SingleTextEdit, TextEdit } from '../../../common/core/textEdit.js';
import { TextLength } from '../../../common/core/textLength.js';
import { InlineCompletionTriggerKind } from '../../../common/languages.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { GhostText, ghostTextOrReplacementEquals, ghostTextsOrReplacementsEqual } from './ghostText.js';
import { InlineCompletionsSource } from './inlineCompletionsSource.js';
import { computeGhostText, singleTextEditAugments, singleTextRemoveCommonPrefix } from './singleTextEdit.js';
import { addPositions, subtractPositions } from './utils.js';
import { SnippetController2 } from '../../snippet/browser/snippetController2.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
export var VersionIdChangeReason;
(function (VersionIdChangeReason) {
    VersionIdChangeReason[VersionIdChangeReason["Undo"] = 0] = "Undo";
    VersionIdChangeReason[VersionIdChangeReason["Redo"] = 1] = "Redo";
    VersionIdChangeReason[VersionIdChangeReason["AcceptWord"] = 2] = "AcceptWord";
    VersionIdChangeReason[VersionIdChangeReason["Other"] = 3] = "Other";
})(VersionIdChangeReason || (VersionIdChangeReason = {}));
let InlineCompletionsModel = class InlineCompletionsModel extends Disposable {
    get isAcceptingPartially() { return this._isAcceptingPartially; }
    constructor(textModel, selectedSuggestItem, textModelVersionId, _positions, _debounceValue, _suggestPreviewEnabled, _suggestPreviewMode, _inlineSuggestMode, _enabled, _instantiationService, _commandService, _languageConfigurationService) {
        super();
        this.textModel = textModel;
        this.selectedSuggestItem = selectedSuggestItem;
        this.textModelVersionId = textModelVersionId;
        this._positions = _positions;
        this._debounceValue = _debounceValue;
        this._suggestPreviewEnabled = _suggestPreviewEnabled;
        this._suggestPreviewMode = _suggestPreviewMode;
        this._inlineSuggestMode = _inlineSuggestMode;
        this._enabled = _enabled;
        this._instantiationService = _instantiationService;
        this._commandService = _commandService;
        this._languageConfigurationService = _languageConfigurationService;
        this._source = this._register(this._instantiationService.createInstance(InlineCompletionsSource, this.textModel, this.textModelVersionId, this._debounceValue));
        this._isActive = observableValue(this, false);
        this._forceUpdateExplicitlySignal = observableSignal(this);
        // We use a semantic id to keep the same inline completion selected even if the provider reorders the completions.
        this._selectedInlineCompletionId = observableValue(this, undefined);
        this._primaryPosition = derived(this, reader => { var _a; return (_a = this._positions.read(reader)[0]) !== null && _a !== void 0 ? _a : new Position(1, 1); });
        this._isAcceptingPartially = false;
        this._preserveCurrentCompletionReasons = new Set([
            VersionIdChangeReason.Redo,
            VersionIdChangeReason.Undo,
            VersionIdChangeReason.AcceptWord,
        ]);
        this._fetchInlineCompletionsPromise = derivedHandleChanges({
            owner: this,
            createEmptyChangeSummary: () => ({
                preserveCurrentCompletion: false,
                inlineCompletionTriggerKind: InlineCompletionTriggerKind.Automatic
            }),
            handleChange: (ctx, changeSummary) => {
                /** @description fetch inline completions */
                if (ctx.didChange(this.textModelVersionId) && this._preserveCurrentCompletionReasons.has(ctx.change)) {
                    changeSummary.preserveCurrentCompletion = true;
                }
                else if (ctx.didChange(this._forceUpdateExplicitlySignal)) {
                    changeSummary.inlineCompletionTriggerKind = InlineCompletionTriggerKind.Explicit;
                }
                return true;
            },
        }, (reader, changeSummary) => {
            this._forceUpdateExplicitlySignal.read(reader);
            const shouldUpdate = (this._enabled.read(reader) && this.selectedSuggestItem.read(reader)) || this._isActive.read(reader);
            if (!shouldUpdate) {
                this._source.cancelUpdate();
                return undefined;
            }
            this.textModelVersionId.read(reader); // Refetch on text change
            const suggestWidgetInlineCompletions = this._source.suggestWidgetInlineCompletions.get();
            const suggestItem = this.selectedSuggestItem.read(reader);
            if (suggestWidgetInlineCompletions && !suggestItem) {
                const inlineCompletions = this._source.inlineCompletions.get();
                transaction(tx => {
                    /** @description Seed inline completions with (newer) suggest widget inline completions */
                    if (!inlineCompletions || suggestWidgetInlineCompletions.request.versionId > inlineCompletions.request.versionId) {
                        this._source.inlineCompletions.set(suggestWidgetInlineCompletions.clone(), tx);
                    }
                    this._source.clearSuggestWidgetInlineCompletions(tx);
                });
            }
            const cursorPosition = this._primaryPosition.read(reader);
            const context = {
                triggerKind: changeSummary.inlineCompletionTriggerKind,
                selectedSuggestionInfo: suggestItem === null || suggestItem === void 0 ? void 0 : suggestItem.toSelectedSuggestionInfo(),
            };
            const itemToPreserveCandidate = this.selectedInlineCompletion.get();
            const itemToPreserve = changeSummary.preserveCurrentCompletion || (itemToPreserveCandidate === null || itemToPreserveCandidate === void 0 ? void 0 : itemToPreserveCandidate.forwardStable)
                ? itemToPreserveCandidate : undefined;
            return this._source.fetch(cursorPosition, context, itemToPreserve);
        });
        this._filteredInlineCompletionItems = derivedOpts({ owner: this, equalsFn: itemsEquals() }, reader => {
            const c = this._source.inlineCompletions.read(reader);
            if (!c) {
                return [];
            }
            const cursorPosition = this._primaryPosition.read(reader);
            const filteredCompletions = c.inlineCompletions.filter(c => c.isVisible(this.textModel, cursorPosition, reader));
            return filteredCompletions;
        });
        this.selectedInlineCompletionIndex = derived(this, (reader) => {
            const selectedInlineCompletionId = this._selectedInlineCompletionId.read(reader);
            const filteredCompletions = this._filteredInlineCompletionItems.read(reader);
            const idx = this._selectedInlineCompletionId === undefined ? -1
                : filteredCompletions.findIndex(v => v.semanticId === selectedInlineCompletionId);
            if (idx === -1) {
                // Reset the selection so that the selection does not jump back when it appears again
                this._selectedInlineCompletionId.set(undefined, undefined);
                return 0;
            }
            return idx;
        });
        this.selectedInlineCompletion = derived(this, (reader) => {
            const filteredCompletions = this._filteredInlineCompletionItems.read(reader);
            const idx = this.selectedInlineCompletionIndex.read(reader);
            return filteredCompletions[idx];
        });
        this.activeCommands = derivedOpts({ owner: this, equalsFn: itemsEquals() }, r => { var _a, _b; return (_b = (_a = this.selectedInlineCompletion.read(r)) === null || _a === void 0 ? void 0 : _a.inlineCompletion.source.inlineCompletions.commands) !== null && _b !== void 0 ? _b : []; });
        this.lastTriggerKind = this._source.inlineCompletions.map(this, v => v === null || v === void 0 ? void 0 : v.request.context.triggerKind);
        this.inlineCompletionsCount = derived(this, reader => {
            if (this.lastTriggerKind.read(reader) === InlineCompletionTriggerKind.Explicit) {
                return this._filteredInlineCompletionItems.read(reader).length;
            }
            else {
                return undefined;
            }
        });
        this.state = derivedOpts({
            owner: this,
            equalsFn: (a, b) => {
                if (!a || !b) {
                    return a === b;
                }
                return ghostTextsOrReplacementsEqual(a.ghostTexts, b.ghostTexts)
                    && a.inlineCompletion === b.inlineCompletion
                    && a.suggestItem === b.suggestItem;
            }
        }, (reader) => {
            var _a, _b;
            const model = this.textModel;
            const suggestItem = this.selectedSuggestItem.read(reader);
            if (suggestItem) {
                const suggestCompletionEdit = singleTextRemoveCommonPrefix(suggestItem.toSingleTextEdit(), model);
                const augmentation = this._computeAugmentation(suggestCompletionEdit, reader);
                const isSuggestionPreviewEnabled = this._suggestPreviewEnabled.read(reader);
                if (!isSuggestionPreviewEnabled && !augmentation) {
                    return undefined;
                }
                const fullEdit = (_a = augmentation === null || augmentation === void 0 ? void 0 : augmentation.edit) !== null && _a !== void 0 ? _a : suggestCompletionEdit;
                const fullEditPreviewLength = augmentation ? augmentation.edit.text.length - suggestCompletionEdit.text.length : 0;
                const mode = this._suggestPreviewMode.read(reader);
                const positions = this._positions.read(reader);
                const edits = [fullEdit, ...getSecondaryEdits(this.textModel, positions, fullEdit)];
                const ghostTexts = edits
                    .map((edit, idx) => computeGhostText(edit, model, mode, positions[idx], fullEditPreviewLength))
                    .filter(isDefined);
                const primaryGhostText = (_b = ghostTexts[0]) !== null && _b !== void 0 ? _b : new GhostText(fullEdit.range.endLineNumber, []);
                return { edits, primaryGhostText, ghostTexts, inlineCompletion: augmentation === null || augmentation === void 0 ? void 0 : augmentation.completion, suggestItem };
            }
            else {
                if (!this._isActive.read(reader)) {
                    return undefined;
                }
                const inlineCompletion = this.selectedInlineCompletion.read(reader);
                if (!inlineCompletion) {
                    return undefined;
                }
                const replacement = inlineCompletion.toSingleTextEdit(reader);
                const mode = this._inlineSuggestMode.read(reader);
                const positions = this._positions.read(reader);
                const edits = [replacement, ...getSecondaryEdits(this.textModel, positions, replacement)];
                const ghostTexts = edits
                    .map((edit, idx) => computeGhostText(edit, model, mode, positions[idx], 0))
                    .filter(isDefined);
                if (!ghostTexts[0]) {
                    return undefined;
                }
                return { edits, primaryGhostText: ghostTexts[0], ghostTexts, inlineCompletion, suggestItem: undefined };
            }
        });
        this.ghostTexts = derivedOpts({
            owner: this,
            equalsFn: ghostTextsOrReplacementsEqual
        }, reader => {
            const v = this.state.read(reader);
            if (!v) {
                return undefined;
            }
            return v.ghostTexts;
        });
        this.primaryGhostText = derivedOpts({
            owner: this,
            equalsFn: ghostTextOrReplacementEquals
        }, reader => {
            const v = this.state.read(reader);
            if (!v) {
                return undefined;
            }
            return v === null || v === void 0 ? void 0 : v.primaryGhostText;
        });
        this._register(recomputeInitiallyAndOnChange(this._fetchInlineCompletionsPromise));
        let lastItem = undefined;
        this._register(autorun(reader => {
            var _a, _b;
            /** @description call handleItemDidShow */
            const item = this.state.read(reader);
            const completion = item === null || item === void 0 ? void 0 : item.inlineCompletion;
            if ((completion === null || completion === void 0 ? void 0 : completion.semanticId) !== (lastItem === null || lastItem === void 0 ? void 0 : lastItem.semanticId)) {
                lastItem = completion;
                if (completion) {
                    const i = completion.inlineCompletion;
                    const src = i.source;
                    (_b = (_a = src.provider).handleItemDidShow) === null || _b === void 0 ? void 0 : _b.call(_a, src.inlineCompletions, i.sourceInlineCompletion, i.insertText);
                }
            }
        }));
    }
    async trigger(tx) {
        this._isActive.set(true, tx);
        await this._fetchInlineCompletionsPromise.get();
    }
    async triggerExplicitly(tx) {
        subtransaction(tx, tx => {
            this._isActive.set(true, tx);
            this._forceUpdateExplicitlySignal.trigger(tx);
        });
        await this._fetchInlineCompletionsPromise.get();
    }
    stop(tx) {
        subtransaction(tx, tx => {
            this._isActive.set(false, tx);
            this._source.clear(tx);
        });
    }
    _computeAugmentation(suggestCompletion, reader) {
        const model = this.textModel;
        const suggestWidgetInlineCompletions = this._source.suggestWidgetInlineCompletions.read(reader);
        const candidateInlineCompletions = suggestWidgetInlineCompletions
            ? suggestWidgetInlineCompletions.inlineCompletions
            : [this.selectedInlineCompletion.read(reader)].filter(isDefined);
        const augmentedCompletion = mapFindFirst(candidateInlineCompletions, completion => {
            let r = completion.toSingleTextEdit(reader);
            r = singleTextRemoveCommonPrefix(r, model, Range.fromPositions(r.range.getStartPosition(), suggestCompletion.range.getEndPosition()));
            return singleTextEditAugments(r, suggestCompletion) ? { completion, edit: r } : undefined;
        });
        return augmentedCompletion;
    }
    async _deltaSelectedInlineCompletionIndex(delta) {
        await this.triggerExplicitly();
        const completions = this._filteredInlineCompletionItems.get() || [];
        if (completions.length > 0) {
            const newIdx = (this.selectedInlineCompletionIndex.get() + delta + completions.length) % completions.length;
            this._selectedInlineCompletionId.set(completions[newIdx].semanticId, undefined);
        }
        else {
            this._selectedInlineCompletionId.set(undefined, undefined);
        }
    }
    async next() {
        await this._deltaSelectedInlineCompletionIndex(1);
    }
    async previous() {
        await this._deltaSelectedInlineCompletionIndex(-1);
    }
    async accept(editor) {
        var _a;
        if (editor.getModel() !== this.textModel) {
            throw new BugIndicatingError();
        }
        const state = this.state.get();
        if (!state || state.primaryGhostText.isEmpty() || !state.inlineCompletion) {
            return;
        }
        const completion = state.inlineCompletion.toInlineCompletion(undefined);
        editor.pushUndoStop();
        if (completion.snippetInfo) {
            editor.executeEdits('inlineSuggestion.accept', [
                EditOperation.replace(completion.range, ''),
                ...completion.additionalTextEdits
            ]);
            editor.setPosition(completion.snippetInfo.range.getStartPosition(), 'inlineCompletionAccept');
            (_a = SnippetController2.get(editor)) === null || _a === void 0 ? void 0 : _a.insert(completion.snippetInfo.snippet, { undoStopBefore: false });
        }
        else {
            const edits = state.edits;
            const selections = getEndPositionsAfterApplying(edits).map(p => Selection.fromPositions(p));
            editor.executeEdits('inlineSuggestion.accept', [
                ...edits.map(edit => EditOperation.replace(edit.range, edit.text)),
                ...completion.additionalTextEdits
            ]);
            editor.setSelections(selections, 'inlineCompletionAccept');
        }
        if (completion.command) {
            // Make sure the completion list will not be disposed.
            completion.source.addRef();
        }
        // Reset before invoking the command, since the command might cause a follow up trigger.
        transaction(tx => {
            this._source.clear(tx);
            // Potentially, isActive will get set back to true by the typing or accept inline suggest event
            // if automatic inline suggestions are enabled.
            this._isActive.set(false, tx);
        });
        if (completion.command) {
            await this._commandService
                .executeCommand(completion.command.id, ...(completion.command.arguments || []))
                .then(undefined, onUnexpectedExternalError);
            completion.source.removeRef();
        }
    }
    async acceptNextWord(editor) {
        await this._acceptNext(editor, (pos, text) => {
            const langId = this.textModel.getLanguageIdAtPosition(pos.lineNumber, pos.column);
            const config = this._languageConfigurationService.getLanguageConfiguration(langId);
            const wordRegExp = new RegExp(config.wordDefinition.source, config.wordDefinition.flags.replace('g', ''));
            const m1 = text.match(wordRegExp);
            let acceptUntilIndexExclusive = 0;
            if (m1 && m1.index !== undefined) {
                if (m1.index === 0) {
                    acceptUntilIndexExclusive = m1[0].length;
                }
                else {
                    acceptUntilIndexExclusive = m1.index;
                }
            }
            else {
                acceptUntilIndexExclusive = text.length;
            }
            const wsRegExp = /\s+/g;
            const m2 = wsRegExp.exec(text);
            if (m2 && m2.index !== undefined) {
                if (m2.index + m2[0].length < acceptUntilIndexExclusive) {
                    acceptUntilIndexExclusive = m2.index + m2[0].length;
                }
            }
            return acceptUntilIndexExclusive;
        }, 0 /* PartialAcceptTriggerKind.Word */);
    }
    async acceptNextLine(editor) {
        await this._acceptNext(editor, (pos, text) => {
            const m = text.match(/\n/);
            if (m && m.index !== undefined) {
                return m.index + 1;
            }
            return text.length;
        }, 1 /* PartialAcceptTriggerKind.Line */);
    }
    async _acceptNext(editor, getAcceptUntilIndex, kind) {
        if (editor.getModel() !== this.textModel) {
            throw new BugIndicatingError();
        }
        const state = this.state.get();
        if (!state || state.primaryGhostText.isEmpty() || !state.inlineCompletion) {
            return;
        }
        const ghostText = state.primaryGhostText;
        const completion = state.inlineCompletion.toInlineCompletion(undefined);
        if (completion.snippetInfo || completion.filterText !== completion.insertText) {
            // not in WYSIWYG mode, partial commit might change completion, thus it is not supported
            await this.accept(editor);
            return;
        }
        const firstPart = ghostText.parts[0];
        const ghostTextPos = new Position(ghostText.lineNumber, firstPart.column);
        const ghostTextVal = firstPart.text;
        const acceptUntilIndexExclusive = getAcceptUntilIndex(ghostTextPos, ghostTextVal);
        if (acceptUntilIndexExclusive === ghostTextVal.length && ghostText.parts.length === 1) {
            this.accept(editor);
            return;
        }
        const partialGhostTextVal = ghostTextVal.substring(0, acceptUntilIndexExclusive);
        const positions = this._positions.get();
        const cursorPosition = positions[0];
        // Executing the edit might free the completion, so we have to hold a reference on it.
        completion.source.addRef();
        try {
            this._isAcceptingPartially = true;
            try {
                editor.pushUndoStop();
                const replaceRange = Range.fromPositions(cursorPosition, ghostTextPos);
                const newText = editor.getModel().getValueInRange(replaceRange) + partialGhostTextVal;
                const primaryEdit = new SingleTextEdit(replaceRange, newText);
                const edits = [primaryEdit, ...getSecondaryEdits(this.textModel, positions, primaryEdit)];
                const selections = getEndPositionsAfterApplying(edits).map(p => Selection.fromPositions(p));
                editor.executeEdits('inlineSuggestion.accept', edits.map(edit => EditOperation.replace(edit.range, edit.text)));
                editor.setSelections(selections, 'inlineCompletionPartialAccept');
            }
            finally {
                this._isAcceptingPartially = false;
            }
            if (completion.source.provider.handlePartialAccept) {
                const acceptedRange = Range.fromPositions(completion.range.getStartPosition(), TextLength.ofText(partialGhostTextVal).addToPosition(ghostTextPos));
                // This assumes that the inline completion and the model use the same EOL style.
                const text = editor.getModel().getValueInRange(acceptedRange, 1 /* EndOfLinePreference.LF */);
                completion.source.provider.handlePartialAccept(completion.source.inlineCompletions, completion.sourceInlineCompletion, text.length, {
                    kind,
                });
            }
        }
        finally {
            completion.source.removeRef();
        }
    }
    handleSuggestAccepted(item) {
        var _a, _b;
        const itemEdit = singleTextRemoveCommonPrefix(item.toSingleTextEdit(), this.textModel);
        const augmentedCompletion = this._computeAugmentation(itemEdit, undefined);
        if (!augmentedCompletion) {
            return;
        }
        const inlineCompletion = augmentedCompletion.completion.inlineCompletion;
        (_b = (_a = inlineCompletion.source.provider).handlePartialAccept) === null || _b === void 0 ? void 0 : _b.call(_a, inlineCompletion.source.inlineCompletions, inlineCompletion.sourceInlineCompletion, itemEdit.text.length, {
            kind: 2 /* PartialAcceptTriggerKind.Suggest */,
        });
    }
};
InlineCompletionsModel = __decorate([
    __param(9, IInstantiationService),
    __param(10, ICommandService),
    __param(11, ILanguageConfigurationService)
], InlineCompletionsModel);
export { InlineCompletionsModel };
export function getSecondaryEdits(textModel, positions, primaryEdit) {
    if (positions.length === 1) {
        // No secondary cursor positions
        return [];
    }
    const primaryPosition = positions[0];
    const secondaryPositions = positions.slice(1);
    const primaryEditStartPosition = primaryEdit.range.getStartPosition();
    const primaryEditEndPosition = primaryEdit.range.getEndPosition();
    const replacedTextAfterPrimaryCursor = textModel.getValueInRange(Range.fromPositions(primaryPosition, primaryEditEndPosition));
    const positionWithinTextEdit = subtractPositions(primaryPosition, primaryEditStartPosition);
    if (positionWithinTextEdit.lineNumber < 1) {
        onUnexpectedError(new BugIndicatingError(`positionWithinTextEdit line number should be bigger than 0.
			Invalid subtraction between ${primaryPosition.toString()} and ${primaryEditStartPosition.toString()}`));
        return [];
    }
    const secondaryEditText = substringPos(primaryEdit.text, positionWithinTextEdit);
    return secondaryPositions.map(pos => {
        const posEnd = addPositions(subtractPositions(pos, primaryEditStartPosition), primaryEditEndPosition);
        const textAfterSecondaryCursor = textModel.getValueInRange(Range.fromPositions(pos, posEnd));
        const l = commonPrefixLength(replacedTextAfterPrimaryCursor, textAfterSecondaryCursor);
        const range = Range.fromPositions(pos, pos.delta(0, l));
        return new SingleTextEdit(range, secondaryEditText);
    });
}
function substringPos(text, pos) {
    let subtext = '';
    const lines = splitLinesIncludeSeparators(text);
    for (let i = pos.lineNumber - 1; i < lines.length; i++) {
        subtext += lines[i].substring(i === pos.lineNumber - 1 ? pos.column - 1 : 0);
    }
    return subtext;
}
function getEndPositionsAfterApplying(edits) {
    const sortPerm = Permutation.createSortPermutation(edits, (edit1, edit2) => Range.compareRangesUsingStarts(edit1.range, edit2.range));
    const edit = new TextEdit(sortPerm.apply(edits));
    const sortedNewRanges = edit.getNewRanges();
    const newRanges = sortPerm.inverse().apply(sortedNewRanges);
    return newRanges.map(range => range.getEndPosition());
}
