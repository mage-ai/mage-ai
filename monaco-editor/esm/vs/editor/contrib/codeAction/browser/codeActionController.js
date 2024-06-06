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
var CodeActionController_1;
import { getDomNodePagePosition } from '../../../../base/browser/dom.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { Position } from '../../../common/core/position.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { ApplyCodeActionReason, applyCodeAction } from './codeAction.js';
import { CodeActionKeybindingResolver } from './codeActionKeybindingResolver.js';
import { toMenuItems } from './codeActionMenu.js';
import { LightBulbWidget } from './lightBulbWidget.js';
import { MessageController } from '../../message/browser/messageController.js';
import { localize } from '../../../../nls.js';
import { IActionWidgetService } from '../../../../platform/actionWidget/browser/actionWidget.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IMarkerService } from '../../../../platform/markers/common/markers.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
import { editorFindMatchHighlight, editorFindMatchHighlightBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { isHighContrast } from '../../../../platform/theme/common/theme.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { CodeActionKind, CodeActionTriggerSource } from '../common/types.js';
import { CodeActionModel } from './codeActionModel.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
const DECORATION_CLASS_NAME = 'quickfix-edit-highlight';
let CodeActionController = CodeActionController_1 = class CodeActionController extends Disposable {
    static get(editor) {
        return editor.getContribution(CodeActionController_1.ID);
    }
    constructor(editor, markerService, contextKeyService, instantiationService, languageFeaturesService, progressService, _commandService, _configurationService, _actionWidgetService, _instantiationService, _telemetryService) {
        super();
        this._commandService = _commandService;
        this._configurationService = _configurationService;
        this._actionWidgetService = _actionWidgetService;
        this._instantiationService = _instantiationService;
        this._telemetryService = _telemetryService;
        this._activeCodeActions = this._register(new MutableDisposable());
        this._showDisabled = false;
        this._disposed = false;
        this._editor = editor;
        this._model = this._register(new CodeActionModel(this._editor, languageFeaturesService.codeActionProvider, markerService, contextKeyService, progressService, _configurationService));
        this._register(this._model.onDidChangeState(newState => this.update(newState)));
        this._lightBulbWidget = new Lazy(() => {
            const widget = this._editor.getContribution(LightBulbWidget.ID);
            if (widget) {
                this._register(widget.onClick(e => this.showCodeActionsFromLightbulb(e.actions, e)));
            }
            return widget;
        });
        this._resolver = instantiationService.createInstance(CodeActionKeybindingResolver);
        this._register(this._editor.onDidLayoutChange(() => this._actionWidgetService.hide()));
    }
    dispose() {
        this._disposed = true;
        super.dispose();
    }
    async showCodeActionsFromLightbulb(actions, at) {
        this._telemetryService.publicLog2('codeAction.showCodeActionsFromLightbulb', {
            codeActionListLength: actions.validActions.length,
            codeActions: actions.validActions.map(action => action.action.title),
            codeActionProviders: actions.validActions.map(action => { var _a, _b; return (_b = (_a = action.provider) === null || _a === void 0 ? void 0 : _a.displayName) !== null && _b !== void 0 ? _b : ''; }),
        });
        if (actions.allAIFixes && actions.validActions.length === 1) {
            const actionItem = actions.validActions[0];
            const command = actionItem.action.command;
            if (command && command.id === 'inlineChat.start') {
                if (command.arguments && command.arguments.length >= 1) {
                    command.arguments[0] = { ...command.arguments[0], autoSend: false };
                }
            }
            await this._applyCodeAction(actionItem, false, false, ApplyCodeActionReason.FromAILightbulb);
            return;
        }
        await this.showCodeActionList(actions, at, { includeDisabledActions: false, fromLightbulb: true });
    }
    showCodeActions(_trigger, actions, at) {
        return this.showCodeActionList(actions, at, { includeDisabledActions: false, fromLightbulb: false });
    }
    manualTriggerAtCurrentPosition(notAvailableMessage, triggerAction, filter, autoApply) {
        var _a;
        if (!this._editor.hasModel()) {
            return;
        }
        (_a = MessageController.get(this._editor)) === null || _a === void 0 ? void 0 : _a.closeMessage();
        const triggerPosition = this._editor.getPosition();
        this._trigger({ type: 1 /* CodeActionTriggerType.Invoke */, triggerAction, filter, autoApply, context: { notAvailableMessage, position: triggerPosition } });
    }
    _trigger(trigger) {
        return this._model.trigger(trigger);
    }
    async _applyCodeAction(action, retrigger, preview, actionReason) {
        try {
            await this._instantiationService.invokeFunction(applyCodeAction, action, actionReason, { preview, editor: this._editor });
        }
        finally {
            if (retrigger) {
                this._trigger({ type: 2 /* CodeActionTriggerType.Auto */, triggerAction: CodeActionTriggerSource.QuickFix, filter: {} });
            }
        }
    }
    async update(newState) {
        var _a, _b, _c, _d, _e, _f, _g;
        if (newState.type !== 1 /* CodeActionsState.Type.Triggered */) {
            (_a = this._lightBulbWidget.rawValue) === null || _a === void 0 ? void 0 : _a.hide();
            return;
        }
        let actions;
        try {
            actions = await newState.actions;
        }
        catch (e) {
            onUnexpectedError(e);
            return;
        }
        if (this._disposed) {
            return;
        }
        (_b = this._lightBulbWidget.value) === null || _b === void 0 ? void 0 : _b.update(actions, newState.trigger, newState.position);
        if (newState.trigger.type === 1 /* CodeActionTriggerType.Invoke */) {
            if ((_c = newState.trigger.filter) === null || _c === void 0 ? void 0 : _c.include) { // Triggered for specific scope
                // Check to see if we want to auto apply.
                const validActionToApply = this.tryGetValidActionToApply(newState.trigger, actions);
                if (validActionToApply) {
                    try {
                        (_d = this._lightBulbWidget.value) === null || _d === void 0 ? void 0 : _d.hide();
                        await this._applyCodeAction(validActionToApply, false, false, ApplyCodeActionReason.FromCodeActions);
                    }
                    finally {
                        actions.dispose();
                    }
                    return;
                }
                // Check to see if there is an action that we would have applied were it not invalid
                if (newState.trigger.context) {
                    const invalidAction = this.getInvalidActionThatWouldHaveBeenApplied(newState.trigger, actions);
                    if (invalidAction && invalidAction.action.disabled) {
                        (_e = MessageController.get(this._editor)) === null || _e === void 0 ? void 0 : _e.showMessage(invalidAction.action.disabled, newState.trigger.context.position);
                        actions.dispose();
                        return;
                    }
                }
            }
            const includeDisabledActions = !!((_f = newState.trigger.filter) === null || _f === void 0 ? void 0 : _f.include);
            if (newState.trigger.context) {
                if (!actions.allActions.length || !includeDisabledActions && !actions.validActions.length) {
                    (_g = MessageController.get(this._editor)) === null || _g === void 0 ? void 0 : _g.showMessage(newState.trigger.context.notAvailableMessage, newState.trigger.context.position);
                    this._activeCodeActions.value = actions;
                    actions.dispose();
                    return;
                }
            }
            this._activeCodeActions.value = actions;
            this.showCodeActionList(actions, this.toCoords(newState.position), { includeDisabledActions, fromLightbulb: false });
        }
        else {
            // auto magically triggered
            if (this._actionWidgetService.isVisible) {
                // TODO: Figure out if we should update the showing menu?
                actions.dispose();
            }
            else {
                this._activeCodeActions.value = actions;
            }
        }
    }
    getInvalidActionThatWouldHaveBeenApplied(trigger, actions) {
        if (!actions.allActions.length) {
            return undefined;
        }
        if ((trigger.autoApply === "first" /* CodeActionAutoApply.First */ && actions.validActions.length === 0)
            || (trigger.autoApply === "ifSingle" /* CodeActionAutoApply.IfSingle */ && actions.allActions.length === 1)) {
            return actions.allActions.find(({ action }) => action.disabled);
        }
        return undefined;
    }
    tryGetValidActionToApply(trigger, actions) {
        if (!actions.validActions.length) {
            return undefined;
        }
        if ((trigger.autoApply === "first" /* CodeActionAutoApply.First */ && actions.validActions.length > 0)
            || (trigger.autoApply === "ifSingle" /* CodeActionAutoApply.IfSingle */ && actions.validActions.length === 1)) {
            return actions.validActions[0];
        }
        return undefined;
    }
    async showCodeActionList(actions, at, options) {
        const currentDecorations = this._editor.createDecorationsCollection();
        const editorDom = this._editor.getDomNode();
        if (!editorDom) {
            return;
        }
        const actionsToShow = options.includeDisabledActions && (this._showDisabled || actions.validActions.length === 0) ? actions.allActions : actions.validActions;
        if (!actionsToShow.length) {
            return;
        }
        const anchor = Position.isIPosition(at) ? this.toCoords(at) : at;
        const delegate = {
            onSelect: async (action, preview) => {
                this._applyCodeAction(action, /* retrigger */ true, !!preview, options.fromLightbulb ? ApplyCodeActionReason.FromAILightbulb : ApplyCodeActionReason.FromCodeActions);
                this._actionWidgetService.hide(false);
                currentDecorations.clear();
            },
            onHide: (didCancel) => {
                var _a;
                (_a = this._editor) === null || _a === void 0 ? void 0 : _a.focus();
                currentDecorations.clear();
                // Telemetry for showing code actions here. only log on `showLightbulb`. Logs when code action list is quit out.
                if (options.fromLightbulb && didCancel !== undefined) {
                    this._telemetryService.publicLog2('codeAction.showCodeActionList.onHide', {
                        codeActionListLength: actions.validActions.length,
                        didCancel: didCancel,
                    });
                }
            },
            onHover: async (action, token) => {
                var _a;
                if (token.isCancellationRequested) {
                    return;
                }
                let canPreview = false;
                const actionKind = action.action.kind;
                if (actionKind) {
                    const hierarchicalKind = new HierarchicalKind(actionKind);
                    const refactorKinds = [
                        CodeActionKind.RefactorExtract,
                        CodeActionKind.RefactorInline,
                        CodeActionKind.RefactorRewrite,
                        CodeActionKind.RefactorMove,
                        CodeActionKind.Source
                    ];
                    canPreview = refactorKinds.some(refactorKind => refactorKind.contains(hierarchicalKind));
                }
                return { canPreview: canPreview || !!((_a = action.action.edit) === null || _a === void 0 ? void 0 : _a.edits.length) };
            },
            onFocus: (action) => {
                var _a, _b;
                if (action && action.action) {
                    const ranges = action.action.ranges;
                    const diagnostics = action.action.diagnostics;
                    currentDecorations.clear();
                    if (ranges && ranges.length > 0) {
                        // Handles case for `fix all` where there are multiple diagnostics.
                        const decorations = (diagnostics && (diagnostics === null || diagnostics === void 0 ? void 0 : diagnostics.length) > 1)
                            ? diagnostics.map(diagnostic => ({ range: diagnostic, options: CodeActionController_1.DECORATION }))
                            : ranges.map(range => ({ range, options: CodeActionController_1.DECORATION }));
                        currentDecorations.set(decorations);
                    }
                    else if (diagnostics && diagnostics.length > 0) {
                        const decorations = diagnostics.map(diagnostic => ({ range: diagnostic, options: CodeActionController_1.DECORATION }));
                        currentDecorations.set(decorations);
                        const diagnostic = diagnostics[0];
                        if (diagnostic.startLineNumber && diagnostic.startColumn) {
                            const selectionText = (_b = (_a = this._editor.getModel()) === null || _a === void 0 ? void 0 : _a.getWordAtPosition({ lineNumber: diagnostic.startLineNumber, column: diagnostic.startColumn })) === null || _b === void 0 ? void 0 : _b.word;
                            aria.status(localize('editingNewSelection', "Context: {0} at line {1} and column {2}.", selectionText, diagnostic.startLineNumber, diagnostic.startColumn));
                        }
                    }
                }
                else {
                    currentDecorations.clear();
                }
            }
        };
        this._actionWidgetService.show('codeActionWidget', true, toMenuItems(actionsToShow, this._shouldShowHeaders(), this._resolver.getResolver()), delegate, anchor, editorDom, this._getActionBarActions(actions, at, options));
    }
    toCoords(position) {
        if (!this._editor.hasModel()) {
            return { x: 0, y: 0 };
        }
        this._editor.revealPosition(position, 1 /* ScrollType.Immediate */);
        this._editor.render();
        // Translate to absolute editor position
        const cursorCoords = this._editor.getScrolledVisiblePosition(position);
        const editorCoords = getDomNodePagePosition(this._editor.getDomNode());
        const x = editorCoords.left + cursorCoords.left;
        const y = editorCoords.top + cursorCoords.top + cursorCoords.height;
        return { x, y };
    }
    _shouldShowHeaders() {
        var _a;
        const model = (_a = this._editor) === null || _a === void 0 ? void 0 : _a.getModel();
        return this._configurationService.getValue('editor.codeActionWidget.showHeaders', { resource: model === null || model === void 0 ? void 0 : model.uri });
    }
    _getActionBarActions(actions, at, options) {
        if (options.fromLightbulb) {
            return [];
        }
        const resultActions = actions.documentation.map((command) => {
            var _a;
            return ({
                id: command.id,
                label: command.title,
                tooltip: (_a = command.tooltip) !== null && _a !== void 0 ? _a : '',
                class: undefined,
                enabled: true,
                run: () => { var _a; return this._commandService.executeCommand(command.id, ...((_a = command.arguments) !== null && _a !== void 0 ? _a : [])); },
            });
        });
        if (options.includeDisabledActions && actions.validActions.length > 0 && actions.allActions.length !== actions.validActions.length) {
            resultActions.push(this._showDisabled ? {
                id: 'hideMoreActions',
                label: localize('hideMoreActions', 'Hide Disabled'),
                enabled: true,
                tooltip: '',
                class: undefined,
                run: () => {
                    this._showDisabled = false;
                    return this.showCodeActionList(actions, at, options);
                }
            } : {
                id: 'showMoreActions',
                label: localize('showMoreActions', 'Show Disabled'),
                enabled: true,
                tooltip: '',
                class: undefined,
                run: () => {
                    this._showDisabled = true;
                    return this.showCodeActionList(actions, at, options);
                }
            });
        }
        return resultActions;
    }
};
CodeActionController.ID = 'editor.contrib.codeActionController';
CodeActionController.DECORATION = ModelDecorationOptions.register({
    description: 'quickfix-highlight',
    className: DECORATION_CLASS_NAME
});
CodeActionController = CodeActionController_1 = __decorate([
    __param(1, IMarkerService),
    __param(2, IContextKeyService),
    __param(3, IInstantiationService),
    __param(4, ILanguageFeaturesService),
    __param(5, IEditorProgressService),
    __param(6, ICommandService),
    __param(7, IConfigurationService),
    __param(8, IActionWidgetService),
    __param(9, IInstantiationService),
    __param(10, ITelemetryService)
], CodeActionController);
export { CodeActionController };
registerThemingParticipant((theme, collector) => {
    const addBackgroundColorRule = (selector, color) => {
        if (color) {
            collector.addRule(`.monaco-editor ${selector} { background-color: ${color}; }`);
        }
    };
    addBackgroundColorRule('.quickfix-edit-highlight', theme.getColor(editorFindMatchHighlight));
    const findMatchHighlightBorder = theme.getColor(editorFindMatchHighlightBorder);
    if (findMatchHighlightBorder) {
        collector.addRule(`.monaco-editor .quickfix-edit-highlight { border: 1px ${isHighContrast(theme.type) ? 'dotted' : 'solid'} ${findMatchHighlightBorder}; box-sizing: border-box; }`);
    }
});
