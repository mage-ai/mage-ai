/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorCommand, registerEditorCommand, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { editorConfigurationBaseNode } from '../../../common/config/editorConfigurationSchema.js';
import { registerEditorFeature } from '../../../common/editorFeatures.js';
import { DefaultDropProvidersFeature } from './defaultProviders.js';
import * as nls from '../../../../nls.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { DropIntoEditorController, changeDropTypeCommandId, defaultProviderConfig, dropWidgetVisibleCtx } from './dropIntoEditorController.js';
registerEditorContribution(DropIntoEditorController.ID, DropIntoEditorController, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorFeature(DefaultDropProvidersFeature);
registerEditorCommand(new class extends EditorCommand {
    constructor() {
        super({
            id: changeDropTypeCommandId,
            precondition: dropWidgetVisibleCtx,
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */,
            }
        });
    }
    runEditorCommand(_accessor, editor, _args) {
        var _a;
        (_a = DropIntoEditorController.get(editor)) === null || _a === void 0 ? void 0 : _a.changeDropType();
    }
});
registerEditorCommand(new class extends EditorCommand {
    constructor() {
        super({
            id: 'editor.hideDropWidget',
            precondition: dropWidgetVisibleCtx,
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 9 /* KeyCode.Escape */,
            }
        });
    }
    runEditorCommand(_accessor, editor, _args) {
        var _a;
        (_a = DropIntoEditorController.get(editor)) === null || _a === void 0 ? void 0 : _a.clearWidgets();
    }
});
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    ...editorConfigurationBaseNode,
    properties: {
        [defaultProviderConfig]: {
            type: 'object',
            scope: 5 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            description: nls.localize('defaultProviderDescription', "Configures the default drop provider to use for content of a given mime type."),
            default: {},
            additionalProperties: {
                type: 'string',
            },
        },
    }
});
