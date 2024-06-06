/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { transaction } from '../../../../base/common/observable.js';
import { asyncTransaction } from '../../../../base/common/observableInternal/base.js';
import { EditorAction } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { showNextInlineSuggestionActionId, showPreviousInlineSuggestionActionId, inlineSuggestCommitId } from './commandIds.js';
import { InlineCompletionContextKeys } from './inlineCompletionContextKeys.js';
import { InlineCompletionsController } from './inlineCompletionsController.js';
import { Context as SuggestContext } from '../../suggest/browser/suggest.js';
import * as nls from '../../../../nls.js';
import { MenuId, Action2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
export class ShowNextInlineSuggestionAction extends EditorAction {
    constructor() {
        super({
            id: ShowNextInlineSuggestionAction.ID,
            label: nls.localize('action.inlineSuggest.showNext', "Show Next Inline Suggestion"),
            alias: 'Show Next Inline Suggestion',
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            kbOpts: {
                weight: 100,
                primary: 512 /* KeyMod.Alt */ | 94 /* KeyCode.BracketRight */,
            },
        });
    }
    async run(accessor, editor) {
        var _a;
        const controller = InlineCompletionsController.get(editor);
        (_a = controller === null || controller === void 0 ? void 0 : controller.model.get()) === null || _a === void 0 ? void 0 : _a.next();
    }
}
ShowNextInlineSuggestionAction.ID = showNextInlineSuggestionActionId;
export class ShowPreviousInlineSuggestionAction extends EditorAction {
    constructor() {
        super({
            id: ShowPreviousInlineSuggestionAction.ID,
            label: nls.localize('action.inlineSuggest.showPrevious', "Show Previous Inline Suggestion"),
            alias: 'Show Previous Inline Suggestion',
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            kbOpts: {
                weight: 100,
                primary: 512 /* KeyMod.Alt */ | 92 /* KeyCode.BracketLeft */,
            },
        });
    }
    async run(accessor, editor) {
        var _a;
        const controller = InlineCompletionsController.get(editor);
        (_a = controller === null || controller === void 0 ? void 0 : controller.model.get()) === null || _a === void 0 ? void 0 : _a.previous();
    }
}
ShowPreviousInlineSuggestionAction.ID = showPreviousInlineSuggestionActionId;
export class TriggerInlineSuggestionAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.trigger',
            label: nls.localize('action.inlineSuggest.trigger', "Trigger Inline Suggestion"),
            alias: 'Trigger Inline Suggestion',
            precondition: EditorContextKeys.writable
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        await asyncTransaction(async (tx) => {
            var _a;
            /** @description triggerExplicitly from command */
            await ((_a = controller === null || controller === void 0 ? void 0 : controller.model.get()) === null || _a === void 0 ? void 0 : _a.triggerExplicitly(tx));
            controller === null || controller === void 0 ? void 0 : controller.playAccessibilitySignal(tx);
        });
    }
}
export class AcceptNextWordOfInlineCompletion extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.acceptNextWord',
            label: nls.localize('action.inlineSuggest.acceptNextWord', "Accept Next Word Of Inline Suggestion"),
            alias: 'Accept Next Word Of Inline Suggestion',
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
                primary: 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */,
                kbExpr: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            },
            menuOpts: [{
                    menuId: MenuId.InlineSuggestionToolbar,
                    title: nls.localize('acceptWord', 'Accept Word'),
                    group: 'primary',
                    order: 2,
                }],
        });
    }
    async run(accessor, editor) {
        var _a;
        const controller = InlineCompletionsController.get(editor);
        await ((_a = controller === null || controller === void 0 ? void 0 : controller.model.get()) === null || _a === void 0 ? void 0 : _a.acceptNextWord(controller.editor));
    }
}
export class AcceptNextLineOfInlineCompletion extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.acceptNextLine',
            label: nls.localize('action.inlineSuggest.acceptNextLine', "Accept Next Line Of Inline Suggestion"),
            alias: 'Accept Next Line Of Inline Suggestion',
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
            },
            menuOpts: [{
                    menuId: MenuId.InlineSuggestionToolbar,
                    title: nls.localize('acceptLine', 'Accept Line'),
                    group: 'secondary',
                    order: 2,
                }],
        });
    }
    async run(accessor, editor) {
        var _a;
        const controller = InlineCompletionsController.get(editor);
        await ((_a = controller === null || controller === void 0 ? void 0 : controller.model.get()) === null || _a === void 0 ? void 0 : _a.acceptNextLine(controller.editor));
    }
}
export class AcceptInlineCompletion extends EditorAction {
    constructor() {
        super({
            id: inlineSuggestCommitId,
            label: nls.localize('action.inlineSuggest.accept', "Accept Inline Suggestion"),
            alias: 'Accept Inline Suggestion',
            precondition: InlineCompletionContextKeys.inlineSuggestionVisible,
            menuOpts: [{
                    menuId: MenuId.InlineSuggestionToolbar,
                    title: nls.localize('accept', "Accept"),
                    group: 'primary',
                    order: 1,
                }],
            kbOpts: {
                primary: 2 /* KeyCode.Tab */,
                weight: 200,
                kbExpr: ContextKeyExpr.and(InlineCompletionContextKeys.inlineSuggestionVisible, EditorContextKeys.tabMovesFocus.toNegated(), InlineCompletionContextKeys.inlineSuggestionHasIndentationLessThanTabSize, SuggestContext.Visible.toNegated(), EditorContextKeys.hoverFocused.toNegated()),
            }
        });
    }
    async run(accessor, editor) {
        var _a;
        const controller = InlineCompletionsController.get(editor);
        if (controller) {
            (_a = controller.model.get()) === null || _a === void 0 ? void 0 : _a.accept(controller.editor);
            controller.editor.focus();
        }
    }
}
export class HideInlineCompletion extends EditorAction {
    constructor() {
        super({
            id: HideInlineCompletion.ID,
            label: nls.localize('action.inlineSuggest.hide', "Hide Inline Suggestion"),
            alias: 'Hide Inline Suggestion',
            precondition: InlineCompletionContextKeys.inlineSuggestionVisible,
            kbOpts: {
                weight: 100,
                primary: 9 /* KeyCode.Escape */,
            }
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        transaction(tx => {
            var _a;
            (_a = controller === null || controller === void 0 ? void 0 : controller.model.get()) === null || _a === void 0 ? void 0 : _a.stop(tx);
        });
    }
}
HideInlineCompletion.ID = 'editor.action.inlineSuggest.hide';
export class ToggleAlwaysShowInlineSuggestionToolbar extends Action2 {
    constructor() {
        super({
            id: ToggleAlwaysShowInlineSuggestionToolbar.ID,
            title: nls.localize('action.inlineSuggest.alwaysShowToolbar', "Always Show Toolbar"),
            f1: false,
            precondition: undefined,
            menu: [{
                    id: MenuId.InlineSuggestionToolbar,
                    group: 'secondary',
                    order: 10,
                }],
            toggled: ContextKeyExpr.equals('config.editor.inlineSuggest.showToolbar', 'always')
        });
    }
    async run(accessor, editor) {
        const configService = accessor.get(IConfigurationService);
        const currentValue = configService.getValue('editor.inlineSuggest.showToolbar');
        const newValue = currentValue === 'always' ? 'onHover' : 'always';
        configService.updateValue('editor.inlineSuggest.showToolbar', newValue);
    }
}
ToggleAlwaysShowInlineSuggestionToolbar.ID = 'editor.action.inlineSuggest.toggleAlwaysShowToolbar';
