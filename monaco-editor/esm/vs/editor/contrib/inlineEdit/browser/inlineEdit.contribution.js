/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerEditorAction, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { HoverParticipantRegistry } from '../../hover/browser/hoverTypes.js';
import { AcceptInlineEdit, JumpBackInlineEdit, JumpToInlineEdit, RejectInlineEdit, TriggerInlineEdit } from './commands.js';
import { InlineEditHoverParticipant } from './hoverParticipant.js';
import { InlineEditController } from './inlineEditController.js';
registerEditorAction(AcceptInlineEdit);
registerEditorAction(RejectInlineEdit);
registerEditorAction(JumpToInlineEdit);
registerEditorAction(JumpBackInlineEdit);
registerEditorAction(TriggerInlineEdit);
registerEditorContribution(InlineEditController.ID, InlineEditController, 3 /* EditorContributionInstantiation.Eventually */);
HoverParticipantRegistry.register(InlineEditHoverParticipant);
