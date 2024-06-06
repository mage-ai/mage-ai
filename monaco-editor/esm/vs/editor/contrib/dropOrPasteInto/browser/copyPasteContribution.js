/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var _a;
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { EditorAction, EditorCommand, registerEditorAction, registerEditorCommand, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { registerEditorFeature } from '../../../common/editorFeatures.js';
import { CopyPasteController, changePasteTypeCommandId, pasteWidgetVisibleCtx } from './copyPasteController.js';
import { DefaultPasteProvidersFeature, DefaultTextPasteOrDropEditProvider } from './defaultProviders.js';
import * as nls from '../../../../nls.js';
registerEditorContribution(CopyPasteController.ID, CopyPasteController, 0 /* EditorContributionInstantiation.Eager */); // eager because it listens to events on the container dom node of the editor
registerEditorFeature(DefaultPasteProvidersFeature);
registerEditorCommand(new class extends EditorCommand {
    constructor() {
        super({
            id: changePasteTypeCommandId,
            precondition: pasteWidgetVisibleCtx,
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */,
            }
        });
    }
    runEditorCommand(_accessor, editor) {
        var _b;
        return (_b = CopyPasteController.get(editor)) === null || _b === void 0 ? void 0 : _b.changePasteType();
    }
});
registerEditorCommand(new class extends EditorCommand {
    constructor() {
        super({
            id: 'editor.hidePasteWidget',
            precondition: pasteWidgetVisibleCtx,
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 9 /* KeyCode.Escape */,
            }
        });
    }
    runEditorCommand(_accessor, editor) {
        var _b;
        (_b = CopyPasteController.get(editor)) === null || _b === void 0 ? void 0 : _b.clearWidgets();
    }
});
registerEditorAction((_a = class PasteAsAction extends EditorAction {
        constructor() {
            super({
                id: 'editor.action.pasteAs',
                label: nls.localize('pasteAs', "Paste As..."),
                alias: 'Paste As...',
                precondition: EditorContextKeys.writable,
                metadata: {
                    description: 'Paste as',
                    args: [{
                            name: 'args',
                            schema: _a.argsSchema
                        }]
                }
            });
        }
        run(_accessor, editor, args) {
            var _b;
            let kind = typeof (args === null || args === void 0 ? void 0 : args.kind) === 'string' ? args.kind : undefined;
            if (!kind && args) {
                // Support old id property
                // TODO: remove this in the future
                kind = typeof args.id === 'string' ? args.id : undefined;
            }
            return (_b = CopyPasteController.get(editor)) === null || _b === void 0 ? void 0 : _b.pasteAs(kind ? new HierarchicalKind(kind) : undefined);
        }
    },
    _a.argsSchema = {
        type: 'object',
        properties: {
            kind: {
                type: 'string',
                description: nls.localize('pasteAs.kind', "The kind of the paste edit to try applying. If not provided or there are multiple edits for this kind, the editor will show a picker."),
            }
        },
    },
    _a));
registerEditorAction(class extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.pasteAsText',
            label: nls.localize('pasteAsText', "Paste as Text"),
            alias: 'Paste as Text',
            precondition: EditorContextKeys.writable,
        });
    }
    run(_accessor, editor) {
        var _b;
        return (_b = CopyPasteController.get(editor)) === null || _b === void 0 ? void 0 : _b.pasteAs({ providerId: DefaultTextPasteOrDropEditProvider.id });
    }
});
