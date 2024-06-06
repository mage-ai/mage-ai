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
var InlineCompletionsController_1;
import { createStyleSheet2 } from '../../../../base/browser/dom.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { timeout } from '../../../../base/common/async.js';
import { cancelOnDispose } from '../../../../base/common/cancellation.js';
import { itemEquals, itemsEquals } from '../../../../base/common/equals.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, autorunHandleChanges, constObservable, derived, disposableObservableValue, observableFromEvent, observableSignal, observableValue, transaction, waitForState } from '../../../../base/common/observable.js';
import { observableValueOpts } from '../../../../base/common/observableInternal/base.js';
import { mapObservableArrayCached } from '../../../../base/common/observableInternal/utils.js';
import { isUndefined } from '../../../../base/common/types.js';
import { CoreEditingCommands } from '../../../browser/coreCommands.js';
import { Position } from '../../../common/core/position.js';
import { ILanguageFeatureDebounceService } from '../../../common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { inlineSuggestCommitId } from './commandIds.js';
import { GhostTextWidget } from './ghostTextWidget.js';
import { InlineCompletionContextKeys } from './inlineCompletionContextKeys.js';
import { InlineCompletionsHintsWidget, InlineSuggestionHintsContentWidget } from './inlineCompletionsHintsWidget.js';
import { InlineCompletionsModel, VersionIdChangeReason } from './inlineCompletionsModel.js';
import { SuggestWidgetAdaptor } from './suggestWidgetInlineCompletionProvider.js';
import { localize } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
let InlineCompletionsController = InlineCompletionsController_1 = class InlineCompletionsController extends Disposable {
    static get(editor) {
        return editor.getContribution(InlineCompletionsController_1.ID);
    }
    constructor(editor, _instantiationService, _contextKeyService, _configurationService, _commandService, _debounceService, _languageFeaturesService, _accessibilitySignalService, _keybindingService, _accessibilityService) {
        super();
        this.editor = editor;
        this._instantiationService = _instantiationService;
        this._contextKeyService = _contextKeyService;
        this._configurationService = _configurationService;
        this._commandService = _commandService;
        this._debounceService = _debounceService;
        this._languageFeaturesService = _languageFeaturesService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._keybindingService = _keybindingService;
        this._accessibilityService = _accessibilityService;
        this.model = this._register(disposableObservableValue('inlineCompletionModel', undefined));
        this._textModelVersionId = observableValue(this, -1);
        this._positions = observableValueOpts({ owner: this, equalsFn: itemsEquals(itemEquals()) }, [new Position(1, 1)]);
        this._suggestWidgetAdaptor = this._register(new SuggestWidgetAdaptor(this.editor, () => { var _a, _b; return (_b = (_a = this.model.get()) === null || _a === void 0 ? void 0 : _a.selectedInlineCompletion.get()) === null || _b === void 0 ? void 0 : _b.toSingleTextEdit(undefined); }, (tx) => this.updateObservables(tx, VersionIdChangeReason.Other), (item) => {
            transaction(tx => {
                var _a;
                /** @description InlineCompletionsController.handleSuggestAccepted */
                this.updateObservables(tx, VersionIdChangeReason.Other);
                (_a = this.model.get()) === null || _a === void 0 ? void 0 : _a.handleSuggestAccepted(item);
            });
        }));
        this._enabledInConfig = observableFromEvent(this.editor.onDidChangeConfiguration, () => this.editor.getOption(62 /* EditorOption.inlineSuggest */).enabled);
        this._isScreenReaderEnabled = observableFromEvent(this._accessibilityService.onDidChangeScreenReaderOptimized, () => this._accessibilityService.isScreenReaderOptimized());
        this._editorDictationInProgress = observableFromEvent(this._contextKeyService.onDidChangeContext, () => this._contextKeyService.getContext(this.editor.getDomNode()).getValue('editorDictation.inProgress') === true);
        this._enabled = derived(this, reader => this._enabledInConfig.read(reader) && (!this._isScreenReaderEnabled.read(reader) || !this._editorDictationInProgress.read(reader)));
        this._fontFamily = observableFromEvent(this.editor.onDidChangeConfiguration, () => this.editor.getOption(62 /* EditorOption.inlineSuggest */).fontFamily);
        this._ghostTexts = derived(this, (reader) => {
            var _a;
            const model = this.model.read(reader);
            return (_a = model === null || model === void 0 ? void 0 : model.ghostTexts.read(reader)) !== null && _a !== void 0 ? _a : [];
        });
        this._stablizedGhostTexts = convertItemsToStableObservables(this._ghostTexts, this._store);
        this._ghostTextWidgets = mapObservableArrayCached(this, this._stablizedGhostTexts, (ghostText, store) => {
            return store.add(this._instantiationService.createInstance(GhostTextWidget, this.editor, {
                ghostText: ghostText,
                minReservedLineCount: constObservable(0),
                targetTextModel: this.model.map(v => v === null || v === void 0 ? void 0 : v.textModel),
            }));
        }).recomputeInitiallyAndOnChange(this._store);
        this._debounceValue = this._debounceService.for(this._languageFeaturesService.inlineCompletionsProvider, 'InlineCompletionsDebounce', { min: 50, max: 50 });
        this._playAccessibilitySignal = observableSignal(this);
        this._isReadonly = observableFromEvent(this.editor.onDidChangeConfiguration, () => this.editor.getOption(91 /* EditorOption.readOnly */));
        this._textModel = observableFromEvent(this.editor.onDidChangeModel, () => this.editor.getModel());
        this._textModelIfWritable = derived(reader => this._isReadonly.read(reader) ? undefined : this._textModel.read(reader));
        this._register(new InlineCompletionContextKeys(this._contextKeyService, this.model));
        this._register(autorun(reader => {
            /** @description InlineCompletionsController.update model */
            const textModel = this._textModelIfWritable.read(reader);
            transaction(tx => {
                /** @description InlineCompletionsController.onDidChangeModel/readonly */
                this.model.set(undefined, tx);
                this.updateObservables(tx, VersionIdChangeReason.Other);
                if (textModel) {
                    const model = _instantiationService.createInstance(InlineCompletionsModel, textModel, this._suggestWidgetAdaptor.selectedItem, this._textModelVersionId, this._positions, this._debounceValue, observableFromEvent(editor.onDidChangeConfiguration, () => editor.getOption(118 /* EditorOption.suggest */).preview), observableFromEvent(editor.onDidChangeConfiguration, () => editor.getOption(118 /* EditorOption.suggest */).previewMode), observableFromEvent(editor.onDidChangeConfiguration, () => editor.getOption(62 /* EditorOption.inlineSuggest */).mode), this._enabled);
                    this.model.set(model, tx);
                }
            });
        }));
        const styleElement = this._register(createStyleSheet2());
        this._register(autorun(reader => {
            const fontFamily = this._fontFamily.read(reader);
            styleElement.setStyle(fontFamily === '' || fontFamily === 'default' ? `` : `
.monaco-editor .ghost-text-decoration,
.monaco-editor .ghost-text-decoration-preview,
.monaco-editor .ghost-text {
	font-family: ${fontFamily};
}`);
        }));
        const getReason = (e) => {
            var _a;
            if (e.isUndoing) {
                return VersionIdChangeReason.Undo;
            }
            if (e.isRedoing) {
                return VersionIdChangeReason.Redo;
            }
            if ((_a = this.model.get()) === null || _a === void 0 ? void 0 : _a.isAcceptingPartially) {
                return VersionIdChangeReason.AcceptWord;
            }
            return VersionIdChangeReason.Other;
        };
        this._register(editor.onDidChangeModelContent((e) => transaction(tx => 
        /** @description InlineCompletionsController.onDidChangeModelContent */
        this.updateObservables(tx, getReason(e)))));
        this._register(editor.onDidChangeCursorPosition(e => transaction(tx => {
            var _a;
            /** @description InlineCompletionsController.onDidChangeCursorPosition */
            this.updateObservables(tx, VersionIdChangeReason.Other);
            if (e.reason === 3 /* CursorChangeReason.Explicit */ || e.source === 'api') {
                (_a = this.model.get()) === null || _a === void 0 ? void 0 : _a.stop(tx);
            }
        })));
        this._register(editor.onDidType(() => transaction(tx => {
            var _a;
            /** @description InlineCompletionsController.onDidType */
            this.updateObservables(tx, VersionIdChangeReason.Other);
            if (this._enabled.get()) {
                (_a = this.model.get()) === null || _a === void 0 ? void 0 : _a.trigger(tx);
            }
        })));
        this._register(this._commandService.onDidExecuteCommand((e) => {
            // These commands don't trigger onDidType.
            const commands = new Set([
                CoreEditingCommands.Tab.id,
                CoreEditingCommands.DeleteLeft.id,
                CoreEditingCommands.DeleteRight.id,
                inlineSuggestCommitId,
                'acceptSelectedSuggestion',
            ]);
            if (commands.has(e.commandId) && editor.hasTextFocus() && this._enabled.get()) {
                transaction(tx => {
                    var _a;
                    /** @description onDidExecuteCommand */
                    (_a = this.model.get()) === null || _a === void 0 ? void 0 : _a.trigger(tx);
                });
            }
        }));
        this._register(this.editor.onDidBlurEditorWidget(() => {
            // This is a hidden setting very useful for debugging
            if (this._contextKeyService.getContextKeyValue('accessibleViewIsShown') || this._configurationService.getValue('editor.inlineSuggest.keepOnBlur') ||
                editor.getOption(62 /* EditorOption.inlineSuggest */).keepOnBlur) {
                return;
            }
            if (InlineSuggestionHintsContentWidget.dropDownVisible) {
                return;
            }
            transaction(tx => {
                var _a;
                /** @description InlineCompletionsController.onDidBlurEditorWidget */
                (_a = this.model.get()) === null || _a === void 0 ? void 0 : _a.stop(tx);
            });
        }));
        this._register(autorun(reader => {
            var _a;
            /** @description InlineCompletionsController.forceRenderingAbove */
            const state = (_a = this.model.read(reader)) === null || _a === void 0 ? void 0 : _a.state.read(reader);
            if (state === null || state === void 0 ? void 0 : state.suggestItem) {
                if (state.primaryGhostText.lineCount >= 2) {
                    this._suggestWidgetAdaptor.forceRenderingAbove();
                }
            }
            else {
                this._suggestWidgetAdaptor.stopForceRenderingAbove();
            }
        }));
        this._register(toDisposable(() => {
            this._suggestWidgetAdaptor.stopForceRenderingAbove();
        }));
        const cancellationStore = this._register(new DisposableStore());
        let lastInlineCompletionId = undefined;
        this._register(autorunHandleChanges({
            handleChange: (context, changeSummary) => {
                if (context.didChange(this._playAccessibilitySignal)) {
                    lastInlineCompletionId = undefined;
                }
                return true;
            },
        }, async (reader, _) => {
            /** @description InlineCompletionsController.playAccessibilitySignalAndReadSuggestion */
            this._playAccessibilitySignal.read(reader);
            const model = this.model.read(reader);
            const state = model === null || model === void 0 ? void 0 : model.state.read(reader);
            if (!model || !state || !state.inlineCompletion) {
                lastInlineCompletionId = undefined;
                return;
            }
            if (state.inlineCompletion.semanticId !== lastInlineCompletionId) {
                cancellationStore.clear();
                lastInlineCompletionId = state.inlineCompletion.semanticId;
                const lineText = model.textModel.getLineContent(state.primaryGhostText.lineNumber);
                await timeout(50, cancelOnDispose(cancellationStore));
                await waitForState(this._suggestWidgetAdaptor.selectedItem, isUndefined, () => false, cancelOnDispose(cancellationStore));
                await this._accessibilitySignalService.playSignal(AccessibilitySignal.inlineSuggestion);
                if (this.editor.getOption(8 /* EditorOption.screenReaderAnnounceInlineSuggestion */)) {
                    this.provideScreenReaderUpdate(state.primaryGhostText.renderForScreenReader(lineText));
                }
            }
        }));
        this._register(new InlineCompletionsHintsWidget(this.editor, this.model, this._instantiationService));
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('accessibility.verbosity.inlineCompletions')) {
                this.editor.updateOptions({ inlineCompletionsAccessibilityVerbose: this._configurationService.getValue('accessibility.verbosity.inlineCompletions') });
            }
        }));
        this.editor.updateOptions({ inlineCompletionsAccessibilityVerbose: this._configurationService.getValue('accessibility.verbosity.inlineCompletions') });
    }
    playAccessibilitySignal(tx) {
        this._playAccessibilitySignal.trigger(tx);
    }
    provideScreenReaderUpdate(content) {
        const accessibleViewShowing = this._contextKeyService.getContextKeyValue('accessibleViewIsShown');
        const accessibleViewKeybinding = this._keybindingService.lookupKeybinding('editor.action.accessibleView');
        let hint;
        if (!accessibleViewShowing && accessibleViewKeybinding && this.editor.getOption(149 /* EditorOption.inlineCompletionsAccessibilityVerbose */)) {
            hint = localize('showAccessibleViewHint', "Inspect this in the accessible view ({0})", accessibleViewKeybinding.getAriaLabel());
        }
        hint ? alert(content + ', ' + hint) : alert(content);
    }
    /**
     * Copies over the relevant state from the text model to observables.
     * This solves all kind of eventing issues, as we make sure we always operate on the latest state,
     * regardless of who calls into us.
     */
    updateObservables(tx, changeReason) {
        var _a, _b, _c;
        const newModel = this.editor.getModel();
        this._textModelVersionId.set((_a = newModel === null || newModel === void 0 ? void 0 : newModel.getVersionId()) !== null && _a !== void 0 ? _a : -1, tx, changeReason);
        this._positions.set((_c = (_b = this.editor.getSelections()) === null || _b === void 0 ? void 0 : _b.map(selection => selection.getPosition())) !== null && _c !== void 0 ? _c : [new Position(1, 1)], tx);
    }
    shouldShowHoverAt(range) {
        var _a;
        const ghostText = (_a = this.model.get()) === null || _a === void 0 ? void 0 : _a.primaryGhostText.get();
        if (ghostText) {
            return ghostText.parts.some(p => range.containsPosition(new Position(ghostText.lineNumber, p.column)));
        }
        return false;
    }
    shouldShowHoverAtViewZone(viewZoneId) {
        var _a, _b;
        return (_b = (_a = this._ghostTextWidgets.get()[0]) === null || _a === void 0 ? void 0 : _a.ownsViewZone(viewZoneId)) !== null && _b !== void 0 ? _b : false;
    }
};
InlineCompletionsController.ID = 'editor.contrib.inlineCompletionsController';
InlineCompletionsController = InlineCompletionsController_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IContextKeyService),
    __param(3, IConfigurationService),
    __param(4, ICommandService),
    __param(5, ILanguageFeatureDebounceService),
    __param(6, ILanguageFeaturesService),
    __param(7, IAccessibilitySignalService),
    __param(8, IKeybindingService),
    __param(9, IAccessibilityService)
], InlineCompletionsController);
export { InlineCompletionsController };
function convertItemsToStableObservables(items, store) {
    const result = observableValue('result', []);
    const innerObservables = [];
    store.add(autorun(reader => {
        const itemsValue = items.read(reader);
        transaction(tx => {
            if (itemsValue.length !== innerObservables.length) {
                innerObservables.length = itemsValue.length;
                for (let i = 0; i < innerObservables.length; i++) {
                    if (!innerObservables[i]) {
                        innerObservables[i] = observableValue('item', itemsValue[i]);
                    }
                }
                result.set([...innerObservables], tx);
            }
            innerObservables.forEach((o, i) => o.set(itemsValue[i], tx));
        });
    }));
    return result;
}
