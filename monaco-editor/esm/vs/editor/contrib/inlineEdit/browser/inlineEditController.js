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
var InlineEditController_1;
import { Disposable } from '../../../../base/common/lifecycle.js';
import { autorun, constObservable, disposableObservableValue, observableFromEvent, observableSignalFromEvent, observableValue, transaction } from '../../../../base/common/observable.js';
import { EditOperation } from '../../../common/core/editOperation.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { GhostTextWidget } from './ghostTextWidget.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { InlineEditTriggerKind } from '../../../common/languages.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { GhostText, GhostTextPart } from '../../inlineCompletions/browser/ghostText.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { InlineEditHintsWidget } from './inlineEditHintsWidget.js';
import { createStyleSheet2 } from '../../../../base/browser/dom.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
export class InlineEditWidget {
    constructor(widget, edit) {
        this.widget = widget;
        this.edit = edit;
    }
    dispose() {
        this.widget.dispose();
    }
}
let InlineEditController = InlineEditController_1 = class InlineEditController extends Disposable {
    static get(editor) {
        return editor.getContribution(InlineEditController_1.ID);
    }
    constructor(editor, instantiationService, contextKeyService, languageFeaturesService, _commandService, _configurationService) {
        super();
        this.editor = editor;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.languageFeaturesService = languageFeaturesService;
        this._commandService = _commandService;
        this._configurationService = _configurationService;
        this._isVisibleContext = InlineEditController_1.inlineEditVisibleContext.bindTo(this.contextKeyService);
        this._isCursorAtInlineEditContext = InlineEditController_1.cursorAtInlineEditContext.bindTo(this.contextKeyService);
        this._currentEdit = this._register(disposableObservableValue(this, undefined));
        this._isAccepting = observableValue(this, false);
        this._enabled = observableFromEvent(this.editor.onDidChangeConfiguration, () => this.editor.getOption(63 /* EditorOption.inlineEdit */).enabled);
        this._fontFamily = observableFromEvent(this.editor.onDidChangeConfiguration, () => this.editor.getOption(63 /* EditorOption.inlineEdit */).fontFamily);
        this._backgroundColoring = observableFromEvent(this.editor.onDidChangeConfiguration, () => this.editor.getOption(63 /* EditorOption.inlineEdit */).backgroundColoring);
        //Automatically request inline edit when the content was changed
        //Cancel the previous request if there is one
        //Remove the previous ghost text
        const modelChangedSignal = observableSignalFromEvent('InlineEditController.modelContentChangedSignal', editor.onDidChangeModelContent);
        this._register(autorun(reader => {
            /** @description InlineEditController.modelContentChanged model */
            if (!this._enabled.read(reader)) {
                return;
            }
            modelChangedSignal.read(reader);
            if (this._isAccepting.read(reader)) {
                return;
            }
            this.getInlineEdit(editor, true);
        }));
        //Check if the cursor is at the ghost text
        const cursorPosition = observableFromEvent(editor.onDidChangeCursorPosition, () => editor.getPosition());
        this._register(autorun(reader => {
            /** @description InlineEditController.cursorPositionChanged model */
            if (!this._enabled.read(reader)) {
                return;
            }
            const pos = cursorPosition.read(reader);
            if (pos) {
                this.checkCursorPosition(pos);
            }
        }));
        //Perform stuff when the current edit has changed
        this._register(autorun((reader) => {
            /** @description InlineEditController.update model */
            const currentEdit = this._currentEdit.read(reader);
            this._isCursorAtInlineEditContext.set(false);
            if (!currentEdit) {
                this._isVisibleContext.set(false);
                return;
            }
            this._isVisibleContext.set(true);
            const pos = editor.getPosition();
            if (pos) {
                this.checkCursorPosition(pos);
            }
        }));
        //Clear suggestions on lost focus
        const editorBlurSingal = observableSignalFromEvent('InlineEditController.editorBlurSignal', editor.onDidBlurEditorWidget);
        this._register(autorun(async (reader) => {
            var _a;
            /** @description InlineEditController.editorBlur */
            if (!this._enabled.read(reader)) {
                return;
            }
            editorBlurSingal.read(reader);
            // This is a hidden setting very useful for debugging
            if (this._configurationService.getValue('editor.experimentalInlineEdit.keepOnBlur') || editor.getOption(63 /* EditorOption.inlineEdit */).keepOnBlur) {
                return;
            }
            (_a = this._currentRequestCts) === null || _a === void 0 ? void 0 : _a.dispose(true);
            this._currentRequestCts = undefined;
            await this.clear(false);
        }));
        //Invoke provider on focus
        const editorFocusSignal = observableSignalFromEvent('InlineEditController.editorFocusSignal', editor.onDidFocusEditorText);
        this._register(autorun(reader => {
            /** @description InlineEditController.editorFocus */
            if (!this._enabled.read(reader)) {
                return;
            }
            editorFocusSignal.read(reader);
            this.getInlineEdit(editor, true);
        }));
        //handle changes of font setting
        const styleElement = this._register(createStyleSheet2());
        this._register(autorun(reader => {
            const fontFamily = this._fontFamily.read(reader);
            styleElement.setStyle(fontFamily === '' || fontFamily === 'default' ? `` : `
.monaco-editor .inline-edit-decoration,
.monaco-editor .inline-edit-decoration-preview,
.monaco-editor .inline-edit {
	font-family: ${fontFamily};
}`);
        }));
        this._register(new InlineEditHintsWidget(this.editor, this._currentEdit, this.instantiationService));
    }
    checkCursorPosition(position) {
        var _a;
        if (!this._currentEdit) {
            this._isCursorAtInlineEditContext.set(false);
            return;
        }
        const gt = (_a = this._currentEdit.get()) === null || _a === void 0 ? void 0 : _a.edit;
        if (!gt) {
            this._isCursorAtInlineEditContext.set(false);
            return;
        }
        this._isCursorAtInlineEditContext.set(Range.containsPosition(gt.range, position));
    }
    validateInlineEdit(editor, edit) {
        var _a, _b;
        //Multiline inline replacing edit must replace whole lines
        if (edit.text.includes('\n') && edit.range.startLineNumber !== edit.range.endLineNumber && edit.range.startColumn !== edit.range.endColumn) {
            const firstColumn = edit.range.startColumn;
            if (firstColumn !== 1) {
                return false;
            }
            const lastLine = edit.range.endLineNumber;
            const lastColumn = edit.range.endColumn;
            const lineLength = (_b = (_a = editor.getModel()) === null || _a === void 0 ? void 0 : _a.getLineLength(lastLine)) !== null && _b !== void 0 ? _b : 0;
            if (lastColumn !== lineLength + 1) {
                return false;
            }
        }
        return true;
    }
    async fetchInlineEdit(editor, auto) {
        if (this._currentRequestCts) {
            this._currentRequestCts.dispose(true);
        }
        const model = editor.getModel();
        if (!model) {
            return;
        }
        const modelVersion = model.getVersionId();
        const providers = this.languageFeaturesService.inlineEditProvider.all(model);
        if (providers.length === 0) {
            return;
        }
        const provider = providers[0];
        this._currentRequestCts = new CancellationTokenSource();
        const token = this._currentRequestCts.token;
        const triggerKind = auto ? InlineEditTriggerKind.Automatic : InlineEditTriggerKind.Invoke;
        const shouldDebounce = auto;
        if (shouldDebounce) {
            await wait(50, token);
        }
        if (token.isCancellationRequested || model.isDisposed() || model.getVersionId() !== modelVersion) {
            return;
        }
        const edit = await provider.provideInlineEdit(model, { triggerKind }, token);
        if (!edit) {
            return;
        }
        if (token.isCancellationRequested || model.isDisposed() || model.getVersionId() !== modelVersion) {
            return;
        }
        if (!this.validateInlineEdit(editor, edit)) {
            return;
        }
        return edit;
    }
    async getInlineEdit(editor, auto) {
        var _a;
        this._isCursorAtInlineEditContext.set(false);
        await this.clear();
        const edit = await this.fetchInlineEdit(editor, auto);
        if (!edit) {
            return;
        }
        const line = edit.range.endLineNumber;
        const column = edit.range.endColumn;
        const textToDisplay = edit.text.endsWith('\n') && !(edit.range.startLineNumber === edit.range.endLineNumber && edit.range.startColumn === edit.range.endColumn) ? edit.text.slice(0, -1) : edit.text;
        const ghostText = new GhostText(line, [new GhostTextPart(column, textToDisplay, false)]);
        const instance = this.instantiationService.createInstance(GhostTextWidget, this.editor, {
            ghostText: constObservable(ghostText),
            minReservedLineCount: constObservable(0),
            targetTextModel: constObservable((_a = this.editor.getModel()) !== null && _a !== void 0 ? _a : undefined),
            range: constObservable(edit.range),
            backgroundColoring: this._backgroundColoring
        });
        this._currentEdit.set(new InlineEditWidget(instance, edit), undefined);
    }
    async trigger() {
        await this.getInlineEdit(this.editor, false);
    }
    async jumpBack() {
        if (!this._jumpBackPosition) {
            return;
        }
        this.editor.setPosition(this._jumpBackPosition);
        //if position is outside viewports, scroll to it
        this.editor.revealPositionInCenterIfOutsideViewport(this._jumpBackPosition);
    }
    async accept() {
        var _a;
        this._isAccepting.set(true, undefined);
        const data = (_a = this._currentEdit.get()) === null || _a === void 0 ? void 0 : _a.edit;
        if (!data) {
            return;
        }
        //It should only happen in case of last line suggestion
        let text = data.text;
        if (data.text.startsWith('\n')) {
            text = data.text.substring(1);
        }
        this.editor.pushUndoStop();
        this.editor.executeEdits('acceptCurrent', [EditOperation.replace(Range.lift(data.range), text)]);
        if (data.accepted) {
            await this._commandService
                .executeCommand(data.accepted.id, ...(data.accepted.arguments || []))
                .then(undefined, onUnexpectedExternalError);
        }
        this.freeEdit(data);
        transaction((tx) => {
            this._currentEdit.set(undefined, tx);
            this._isAccepting.set(false, tx);
        });
    }
    jumpToCurrent() {
        var _a, _b;
        this._jumpBackPosition = (_a = this.editor.getSelection()) === null || _a === void 0 ? void 0 : _a.getStartPosition();
        const data = (_b = this._currentEdit.get()) === null || _b === void 0 ? void 0 : _b.edit;
        if (!data) {
            return;
        }
        const position = Position.lift({ lineNumber: data.range.startLineNumber, column: data.range.startColumn });
        this.editor.setPosition(position);
        //if position is outside viewports, scroll to it
        this.editor.revealPositionInCenterIfOutsideViewport(position);
    }
    async clear(sendRejection = true) {
        var _a;
        const edit = (_a = this._currentEdit.get()) === null || _a === void 0 ? void 0 : _a.edit;
        if (edit && (edit === null || edit === void 0 ? void 0 : edit.rejected) && sendRejection) {
            await this._commandService
                .executeCommand(edit.rejected.id, ...(edit.rejected.arguments || []))
                .then(undefined, onUnexpectedExternalError);
        }
        if (edit) {
            this.freeEdit(edit);
        }
        this._currentEdit.set(undefined, undefined);
    }
    freeEdit(edit) {
        const model = this.editor.getModel();
        if (!model) {
            return;
        }
        const providers = this.languageFeaturesService.inlineEditProvider.all(model);
        if (providers.length === 0) {
            return;
        }
        providers[0].freeInlineEdit(edit);
    }
    shouldShowHoverAt(range) {
        const currentEdit = this._currentEdit.get();
        if (!currentEdit) {
            return false;
        }
        const edit = currentEdit.edit;
        const model = currentEdit.widget.model;
        const overReplaceRange = Range.containsPosition(edit.range, range.getStartPosition()) || Range.containsPosition(edit.range, range.getEndPosition());
        if (overReplaceRange) {
            return true;
        }
        const ghostText = model.ghostText.get();
        if (ghostText) {
            return ghostText.parts.some(p => range.containsPosition(new Position(ghostText.lineNumber, p.column)));
        }
        return false;
    }
    shouldShowHoverAtViewZone(viewZoneId) {
        var _a, _b;
        return (_b = (_a = this._currentEdit.get()) === null || _a === void 0 ? void 0 : _a.widget.ownsViewZone(viewZoneId)) !== null && _b !== void 0 ? _b : false;
    }
};
InlineEditController.ID = 'editor.contrib.inlineEditController';
InlineEditController.inlineEditVisibleKey = 'inlineEditVisible';
InlineEditController.inlineEditVisibleContext = new RawContextKey(InlineEditController_1.inlineEditVisibleKey, false);
InlineEditController.cursorAtInlineEditKey = 'cursorAtInlineEdit';
InlineEditController.cursorAtInlineEditContext = new RawContextKey(InlineEditController_1.cursorAtInlineEditKey, false);
InlineEditController = InlineEditController_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IContextKeyService),
    __param(3, ILanguageFeaturesService),
    __param(4, ICommandService),
    __param(5, IConfigurationService)
], InlineEditController);
export { InlineEditController };
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
