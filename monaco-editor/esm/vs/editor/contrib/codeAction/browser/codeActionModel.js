/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createCancelablePromise, TimeoutTimer } from '../../../../base/common/async.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../base/common/resources.js';
import { ShowLightbulbIconMode } from '../../../common/config/editorOptions.js';
import { Position } from '../../../common/core/position.js';
import { Selection } from '../../../common/core/selection.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { CodeActionKind, CodeActionTriggerSource } from '../common/types.js';
import { getCodeActions } from './codeAction.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
export const SUPPORTED_CODE_ACTIONS = new RawContextKey('supportedCodeAction', '');
export const APPLY_FIX_ALL_COMMAND_ID = '_typescript.applyFixAllCodeAction';
class CodeActionOracle extends Disposable {
    constructor(_editor, _markerService, _signalChange, _delay = 250) {
        super();
        this._editor = _editor;
        this._markerService = _markerService;
        this._signalChange = _signalChange;
        this._delay = _delay;
        this._autoTriggerTimer = this._register(new TimeoutTimer());
        this._register(this._markerService.onMarkerChanged(e => this._onMarkerChanges(e)));
        this._register(this._editor.onDidChangeCursorPosition(() => this._tryAutoTrigger()));
    }
    trigger(trigger) {
        const selection = this._getRangeOfSelectionUnlessWhitespaceEnclosed(trigger);
        this._signalChange(selection ? { trigger, selection } : undefined);
    }
    _onMarkerChanges(resources) {
        const model = this._editor.getModel();
        if (model && resources.some(resource => isEqual(resource, model.uri))) {
            this._tryAutoTrigger();
        }
    }
    _tryAutoTrigger() {
        this._autoTriggerTimer.cancelAndSet(() => {
            this.trigger({ type: 2 /* CodeActionTriggerType.Auto */, triggerAction: CodeActionTriggerSource.Default });
        }, this._delay);
    }
    _getRangeOfSelectionUnlessWhitespaceEnclosed(trigger) {
        if (!this._editor.hasModel()) {
            return undefined;
        }
        const selection = this._editor.getSelection();
        if (trigger.type === 1 /* CodeActionTriggerType.Invoke */) {
            return selection;
        }
        const enabled = this._editor.getOption(65 /* EditorOption.lightbulb */).enabled;
        if (enabled === ShowLightbulbIconMode.Off) {
            return undefined;
        }
        else if (enabled === ShowLightbulbIconMode.On) {
            return selection;
        }
        else if (enabled === ShowLightbulbIconMode.OnCode) {
            const isSelectionEmpty = selection.isEmpty();
            if (!isSelectionEmpty) {
                return selection;
            }
            const model = this._editor.getModel();
            const { lineNumber, column } = selection.getPosition();
            const line = model.getLineContent(lineNumber);
            if (line.length === 0) {
                // empty line
                return undefined;
            }
            else if (column === 1) {
                // look only right
                if (/\s/.test(line[0])) {
                    return undefined;
                }
            }
            else if (column === model.getLineMaxColumn(lineNumber)) {
                // look only left
                if (/\s/.test(line[line.length - 1])) {
                    return undefined;
                }
            }
            else {
                // look left and right
                if (/\s/.test(line[column - 2]) && /\s/.test(line[column - 1])) {
                    return undefined;
                }
            }
        }
        return selection;
    }
}
export var CodeActionsState;
(function (CodeActionsState) {
    CodeActionsState.Empty = { type: 0 /* Type.Empty */ };
    class Triggered {
        constructor(trigger, position, _cancellablePromise) {
            this.trigger = trigger;
            this.position = position;
            this._cancellablePromise = _cancellablePromise;
            this.type = 1 /* Type.Triggered */;
            this.actions = _cancellablePromise.catch((e) => {
                if (isCancellationError(e)) {
                    return emptyCodeActionSet;
                }
                throw e;
            });
        }
        cancel() {
            this._cancellablePromise.cancel();
        }
    }
    CodeActionsState.Triggered = Triggered;
})(CodeActionsState || (CodeActionsState = {}));
const emptyCodeActionSet = Object.freeze({
    allActions: [],
    validActions: [],
    dispose: () => { },
    documentation: [],
    hasAutoFix: false,
    hasAIFix: false,
    allAIFixes: false,
});
export class CodeActionModel extends Disposable {
    constructor(_editor, _registry, _markerService, contextKeyService, _progressService, _configurationService) {
        super();
        this._editor = _editor;
        this._registry = _registry;
        this._markerService = _markerService;
        this._progressService = _progressService;
        this._configurationService = _configurationService;
        this._codeActionOracle = this._register(new MutableDisposable());
        this._state = CodeActionsState.Empty;
        this._onDidChangeState = this._register(new Emitter());
        this.onDidChangeState = this._onDidChangeState.event;
        this._disposed = false;
        this._supportedCodeActions = SUPPORTED_CODE_ACTIONS.bindTo(contextKeyService);
        this._register(this._editor.onDidChangeModel(() => this._update()));
        this._register(this._editor.onDidChangeModelLanguage(() => this._update()));
        this._register(this._registry.onDidChange(() => this._update()));
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(65 /* EditorOption.lightbulb */)) {
                this._update();
            }
        }));
        this._update();
    }
    dispose() {
        if (this._disposed) {
            return;
        }
        this._disposed = true;
        super.dispose();
        this.setState(CodeActionsState.Empty, true);
    }
    _settingEnabledNearbyQuickfixes() {
        var _a;
        const model = (_a = this._editor) === null || _a === void 0 ? void 0 : _a.getModel();
        return this._configurationService ? this._configurationService.getValue('editor.codeActionWidget.includeNearbyQuickFixes', { resource: model === null || model === void 0 ? void 0 : model.uri }) : false;
    }
    _update() {
        if (this._disposed) {
            return;
        }
        this._codeActionOracle.value = undefined;
        this.setState(CodeActionsState.Empty);
        const model = this._editor.getModel();
        if (model
            && this._registry.has(model)
            && !this._editor.getOption(91 /* EditorOption.readOnly */)) {
            const supportedActions = this._registry.all(model).flatMap(provider => { var _a; return (_a = provider.providedCodeActionKinds) !== null && _a !== void 0 ? _a : []; });
            this._supportedCodeActions.set(supportedActions.join(' '));
            this._codeActionOracle.value = new CodeActionOracle(this._editor, this._markerService, trigger => {
                var _a;
                if (!trigger) {
                    this.setState(CodeActionsState.Empty);
                    return;
                }
                const startPosition = trigger.selection.getStartPosition();
                const actions = createCancelablePromise(async (token) => {
                    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                    if (this._settingEnabledNearbyQuickfixes() && trigger.trigger.type === 1 /* CodeActionTriggerType.Invoke */ && (trigger.trigger.triggerAction === CodeActionTriggerSource.QuickFix || ((_b = (_a = trigger.trigger.filter) === null || _a === void 0 ? void 0 : _a.include) === null || _b === void 0 ? void 0 : _b.contains(CodeActionKind.QuickFix)))) {
                        const codeActionSet = await getCodeActions(this._registry, model, trigger.selection, trigger.trigger, Progress.None, token);
                        const allCodeActions = [...codeActionSet.allActions];
                        if (token.isCancellationRequested) {
                            return emptyCodeActionSet;
                        }
                        // Search for quickfixes in the curret code action set.
                        const foundQuickfix = (_c = codeActionSet.validActions) === null || _c === void 0 ? void 0 : _c.some(action => action.action.kind ? CodeActionKind.QuickFix.contains(new HierarchicalKind(action.action.kind)) : false);
                        const allMarkers = this._markerService.read({ resource: model.uri });
                        if (foundQuickfix) {
                            for (const action of codeActionSet.validActions) {
                                if ((_e = (_d = action.action.command) === null || _d === void 0 ? void 0 : _d.arguments) === null || _e === void 0 ? void 0 : _e.some(arg => typeof arg === 'string' && arg.includes(APPLY_FIX_ALL_COMMAND_ID))) {
                                    action.action.diagnostics = [...allMarkers.filter(marker => marker.relatedInformation)];
                                }
                            }
                            return { validActions: codeActionSet.validActions, allActions: allCodeActions, documentation: codeActionSet.documentation, hasAutoFix: codeActionSet.hasAutoFix, hasAIFix: codeActionSet.hasAIFix, allAIFixes: codeActionSet.allAIFixes, dispose: () => { codeActionSet.dispose(); } };
                        }
                        else if (!foundQuickfix) {
                            // If markers exists, and there are no quickfixes found or length is zero, check for quickfixes on that line.
                            if (allMarkers.length > 0) {
                                const currPosition = trigger.selection.getPosition();
                                let trackedPosition = currPosition;
                                let distance = Number.MAX_VALUE;
                                const currentActions = [...codeActionSet.validActions];
                                for (const marker of allMarkers) {
                                    const col = marker.endColumn;
                                    const row = marker.endLineNumber;
                                    const startRow = marker.startLineNumber;
                                    // Found quickfix on the same line and check relative distance to other markers
                                    if ((row === currPosition.lineNumber || startRow === currPosition.lineNumber)) {
                                        trackedPosition = new Position(row, col);
                                        const newCodeActionTrigger = {
                                            type: trigger.trigger.type,
                                            triggerAction: trigger.trigger.triggerAction,
                                            filter: { include: ((_f = trigger.trigger.filter) === null || _f === void 0 ? void 0 : _f.include) ? (_g = trigger.trigger.filter) === null || _g === void 0 ? void 0 : _g.include : CodeActionKind.QuickFix },
                                            autoApply: trigger.trigger.autoApply,
                                            context: { notAvailableMessage: ((_h = trigger.trigger.context) === null || _h === void 0 ? void 0 : _h.notAvailableMessage) || '', position: trackedPosition }
                                        };
                                        const selectionAsPosition = new Selection(trackedPosition.lineNumber, trackedPosition.column, trackedPosition.lineNumber, trackedPosition.column);
                                        const actionsAtMarker = await getCodeActions(this._registry, model, selectionAsPosition, newCodeActionTrigger, Progress.None, token);
                                        if (actionsAtMarker.validActions.length !== 0) {
                                            for (const action of actionsAtMarker.validActions) {
                                                if ((_k = (_j = action.action.command) === null || _j === void 0 ? void 0 : _j.arguments) === null || _k === void 0 ? void 0 : _k.some(arg => typeof arg === 'string' && arg.includes(APPLY_FIX_ALL_COMMAND_ID))) {
                                                    action.action.diagnostics = [...allMarkers.filter(marker => marker.relatedInformation)];
                                                }
                                            }
                                            if (codeActionSet.allActions.length === 0) {
                                                allCodeActions.push(...actionsAtMarker.allActions);
                                            }
                                            // Already filtered through to only get quickfixes, so no need to filter again.
                                            if (Math.abs(currPosition.column - col) < distance) {
                                                currentActions.unshift(...actionsAtMarker.validActions);
                                            }
                                            else {
                                                currentActions.push(...actionsAtMarker.validActions);
                                            }
                                        }
                                        distance = Math.abs(currPosition.column - col);
                                    }
                                }
                                const filteredActions = currentActions.filter((action, index, self) => self.findIndex((a) => a.action.title === action.action.title) === index);
                                filteredActions.sort((a, b) => {
                                    if (a.action.isPreferred && !b.action.isPreferred) {
                                        return -1;
                                    }
                                    else if (!a.action.isPreferred && b.action.isPreferred) {
                                        return 1;
                                    }
                                    else if (a.action.isAI && !b.action.isAI) {
                                        return 1;
                                    }
                                    else if (!a.action.isAI && b.action.isAI) {
                                        return -1;
                                    }
                                    else {
                                        return 0;
                                    }
                                });
                                // Only retriggers if actually found quickfix on the same line as cursor
                                return { validActions: filteredActions, allActions: allCodeActions, documentation: codeActionSet.documentation, hasAutoFix: codeActionSet.hasAutoFix, hasAIFix: codeActionSet.hasAIFix, allAIFixes: codeActionSet.allAIFixes, dispose: () => { codeActionSet.dispose(); } };
                            }
                        }
                    }
                    // temporarilly hiding here as this is enabled/disabled behind a setting.
                    return getCodeActions(this._registry, model, trigger.selection, trigger.trigger, Progress.None, token);
                });
                if (trigger.trigger.type === 1 /* CodeActionTriggerType.Invoke */) {
                    (_a = this._progressService) === null || _a === void 0 ? void 0 : _a.showWhile(actions, 250);
                }
                const newState = new CodeActionsState.Triggered(trigger.trigger, startPosition, actions);
                let isManualToAutoTransition = false;
                if (this._state.type === 1 /* CodeActionsState.Type.Triggered */) {
                    // Check if the current state is manual and the new state is automatic
                    isManualToAutoTransition = this._state.trigger.type === 1 /* CodeActionTriggerType.Invoke */ &&
                        newState.type === 1 /* CodeActionsState.Type.Triggered */ &&
                        newState.trigger.type === 2 /* CodeActionTriggerType.Auto */ &&
                        this._state.position !== newState.position;
                }
                // Do not trigger state if current state is manual and incoming state is automatic
                if (!isManualToAutoTransition) {
                    this.setState(newState);
                }
                else {
                    // Reset the new state after getting code actions back.
                    setTimeout(() => {
                        this.setState(newState);
                    }, 500);
                }
            }, undefined);
            this._codeActionOracle.value.trigger({ type: 2 /* CodeActionTriggerType.Auto */, triggerAction: CodeActionTriggerSource.Default });
        }
        else {
            this._supportedCodeActions.reset();
        }
    }
    trigger(trigger) {
        var _a;
        (_a = this._codeActionOracle.value) === null || _a === void 0 ? void 0 : _a.trigger(trigger);
    }
    setState(newState, skipNotify) {
        if (newState === this._state) {
            return;
        }
        // Cancel old request
        if (this._state.type === 1 /* CodeActionsState.Type.Triggered */) {
            this._state.cancel();
        }
        this._state = newState;
        if (!skipNotify && !this._disposed) {
            this._onDidChangeState.fire(newState);
        }
    }
}
