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
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import * as strings from '../../../../base/common/strings.js';
import { EditorAction, registerEditorAction, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { ShiftCommand } from '../../../common/commands/shiftCommand.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { IModelService } from '../../../common/services/model.js';
import * as indentUtils from '../common/indentUtils.js';
import * as nls from '../../../../nls.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { getGoodIndentForLine, getIndentMetadata } from '../../../common/languages/autoIndent.js';
import { getReindentEditOperations } from '../common/indentation.js';
export class IndentationToSpacesAction extends EditorAction {
    constructor() {
        super({
            id: IndentationToSpacesAction.ID,
            label: nls.localize('indentationToSpaces', "Convert Indentation to Spaces"),
            alias: 'Convert Indentation to Spaces',
            precondition: EditorContextKeys.writable,
            metadata: {
                description: nls.localize2('indentationToSpacesDescription', "Convert the tab indentation to spaces."),
            }
        });
    }
    run(accessor, editor) {
        const model = editor.getModel();
        if (!model) {
            return;
        }
        const modelOpts = model.getOptions();
        const selection = editor.getSelection();
        if (!selection) {
            return;
        }
        const command = new IndentationToSpacesCommand(selection, modelOpts.tabSize);
        editor.pushUndoStop();
        editor.executeCommands(this.id, [command]);
        editor.pushUndoStop();
        model.updateOptions({
            insertSpaces: true
        });
    }
}
IndentationToSpacesAction.ID = 'editor.action.indentationToSpaces';
export class IndentationToTabsAction extends EditorAction {
    constructor() {
        super({
            id: IndentationToTabsAction.ID,
            label: nls.localize('indentationToTabs', "Convert Indentation to Tabs"),
            alias: 'Convert Indentation to Tabs',
            precondition: EditorContextKeys.writable,
            metadata: {
                description: nls.localize2('indentationToTabsDescription', "Convert the spaces indentation to tabs."),
            }
        });
    }
    run(accessor, editor) {
        const model = editor.getModel();
        if (!model) {
            return;
        }
        const modelOpts = model.getOptions();
        const selection = editor.getSelection();
        if (!selection) {
            return;
        }
        const command = new IndentationToTabsCommand(selection, modelOpts.tabSize);
        editor.pushUndoStop();
        editor.executeCommands(this.id, [command]);
        editor.pushUndoStop();
        model.updateOptions({
            insertSpaces: false
        });
    }
}
IndentationToTabsAction.ID = 'editor.action.indentationToTabs';
export class ChangeIndentationSizeAction extends EditorAction {
    constructor(insertSpaces, displaySizeOnly, opts) {
        super(opts);
        this.insertSpaces = insertSpaces;
        this.displaySizeOnly = displaySizeOnly;
    }
    run(accessor, editor) {
        const quickInputService = accessor.get(IQuickInputService);
        const modelService = accessor.get(IModelService);
        const model = editor.getModel();
        if (!model) {
            return;
        }
        const creationOpts = modelService.getCreationOptions(model.getLanguageId(), model.uri, model.isForSimpleWidget);
        const modelOpts = model.getOptions();
        const picks = [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({
            id: n.toString(),
            label: n.toString(),
            // add description for tabSize value set in the configuration
            description: (n === creationOpts.tabSize && n === modelOpts.tabSize
                ? nls.localize('configuredTabSize', "Configured Tab Size")
                : n === creationOpts.tabSize
                    ? nls.localize('defaultTabSize', "Default Tab Size")
                    : n === modelOpts.tabSize
                        ? nls.localize('currentTabSize', "Current Tab Size")
                        : undefined)
        }));
        // auto focus the tabSize set for the current editor
        const autoFocusIndex = Math.min(model.getOptions().tabSize - 1, 7);
        setTimeout(() => {
            quickInputService.pick(picks, { placeHolder: nls.localize({ key: 'selectTabWidth', comment: ['Tab corresponds to the tab key'] }, "Select Tab Size for Current File"), activeItem: picks[autoFocusIndex] }).then(pick => {
                if (pick) {
                    if (model && !model.isDisposed()) {
                        const pickedVal = parseInt(pick.label, 10);
                        if (this.displaySizeOnly) {
                            model.updateOptions({
                                tabSize: pickedVal
                            });
                        }
                        else {
                            model.updateOptions({
                                tabSize: pickedVal,
                                indentSize: pickedVal,
                                insertSpaces: this.insertSpaces
                            });
                        }
                    }
                }
            });
        }, 50 /* quick input is sensitive to being opened so soon after another */);
    }
}
export class IndentUsingTabs extends ChangeIndentationSizeAction {
    constructor() {
        super(false, false, {
            id: IndentUsingTabs.ID,
            label: nls.localize('indentUsingTabs', "Indent Using Tabs"),
            alias: 'Indent Using Tabs',
            precondition: undefined,
            metadata: {
                description: nls.localize2('indentUsingTabsDescription', "Use indentation with tabs."),
            }
        });
    }
}
IndentUsingTabs.ID = 'editor.action.indentUsingTabs';
export class IndentUsingSpaces extends ChangeIndentationSizeAction {
    constructor() {
        super(true, false, {
            id: IndentUsingSpaces.ID,
            label: nls.localize('indentUsingSpaces', "Indent Using Spaces"),
            alias: 'Indent Using Spaces',
            precondition: undefined,
            metadata: {
                description: nls.localize2('indentUsingSpacesDescription', "Use indentation with spaces."),
            }
        });
    }
}
IndentUsingSpaces.ID = 'editor.action.indentUsingSpaces';
export class ChangeTabDisplaySize extends ChangeIndentationSizeAction {
    constructor() {
        super(true, true, {
            id: ChangeTabDisplaySize.ID,
            label: nls.localize('changeTabDisplaySize', "Change Tab Display Size"),
            alias: 'Change Tab Display Size',
            precondition: undefined,
            metadata: {
                description: nls.localize2('changeTabDisplaySizeDescription', "Change the space size equivalent of the tab."),
            }
        });
    }
}
ChangeTabDisplaySize.ID = 'editor.action.changeTabDisplaySize';
export class DetectIndentation extends EditorAction {
    constructor() {
        super({
            id: DetectIndentation.ID,
            label: nls.localize('detectIndentation', "Detect Indentation from Content"),
            alias: 'Detect Indentation from Content',
            precondition: undefined,
            metadata: {
                description: nls.localize2('detectIndentationDescription', "Detect the indentation from content."),
            }
        });
    }
    run(accessor, editor) {
        const modelService = accessor.get(IModelService);
        const model = editor.getModel();
        if (!model) {
            return;
        }
        const creationOpts = modelService.getCreationOptions(model.getLanguageId(), model.uri, model.isForSimpleWidget);
        model.detectIndentation(creationOpts.insertSpaces, creationOpts.tabSize);
    }
}
DetectIndentation.ID = 'editor.action.detectIndentation';
export class ReindentLinesAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.reindentlines',
            label: nls.localize('editor.reindentlines', "Reindent Lines"),
            alias: 'Reindent Lines',
            precondition: EditorContextKeys.writable,
            metadata: {
                description: nls.localize2('editor.reindentlinesDescription', "Reindent the lines of the editor."),
            }
        });
    }
    run(accessor, editor) {
        const languageConfigurationService = accessor.get(ILanguageConfigurationService);
        const model = editor.getModel();
        if (!model) {
            return;
        }
        const edits = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        if (edits.length > 0) {
            editor.pushUndoStop();
            editor.executeEdits(this.id, edits);
            editor.pushUndoStop();
        }
    }
}
export class ReindentSelectedLinesAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.reindentselectedlines',
            label: nls.localize('editor.reindentselectedlines', "Reindent Selected Lines"),
            alias: 'Reindent Selected Lines',
            precondition: EditorContextKeys.writable,
            metadata: {
                description: nls.localize2('editor.reindentselectedlinesDescription', "Reindent the selected lines of the editor."),
            }
        });
    }
    run(accessor, editor) {
        const languageConfigurationService = accessor.get(ILanguageConfigurationService);
        const model = editor.getModel();
        if (!model) {
            return;
        }
        const selections = editor.getSelections();
        if (selections === null) {
            return;
        }
        const edits = [];
        for (const selection of selections) {
            let startLineNumber = selection.startLineNumber;
            let endLineNumber = selection.endLineNumber;
            if (startLineNumber !== endLineNumber && selection.endColumn === 1) {
                endLineNumber--;
            }
            if (startLineNumber === 1) {
                if (startLineNumber === endLineNumber) {
                    continue;
                }
            }
            else {
                startLineNumber--;
            }
            const editOperations = getReindentEditOperations(model, languageConfigurationService, startLineNumber, endLineNumber);
            edits.push(...editOperations);
        }
        if (edits.length > 0) {
            editor.pushUndoStop();
            editor.executeEdits(this.id, edits);
            editor.pushUndoStop();
        }
    }
}
export class AutoIndentOnPasteCommand {
    constructor(edits, initialSelection) {
        this._initialSelection = initialSelection;
        this._edits = [];
        this._selectionId = null;
        for (const edit of edits) {
            if (edit.range && typeof edit.text === 'string') {
                this._edits.push(edit);
            }
        }
    }
    getEditOperations(model, builder) {
        for (const edit of this._edits) {
            builder.addEditOperation(Range.lift(edit.range), edit.text);
        }
        let selectionIsSet = false;
        if (Array.isArray(this._edits) && this._edits.length === 1 && this._initialSelection.isEmpty()) {
            if (this._edits[0].range.startColumn === this._initialSelection.endColumn &&
                this._edits[0].range.startLineNumber === this._initialSelection.endLineNumber) {
                selectionIsSet = true;
                this._selectionId = builder.trackSelection(this._initialSelection, true);
            }
            else if (this._edits[0].range.endColumn === this._initialSelection.startColumn &&
                this._edits[0].range.endLineNumber === this._initialSelection.startLineNumber) {
                selectionIsSet = true;
                this._selectionId = builder.trackSelection(this._initialSelection, false);
            }
        }
        if (!selectionIsSet) {
            this._selectionId = builder.trackSelection(this._initialSelection);
        }
    }
    computeCursorState(model, helper) {
        return helper.getTrackedSelection(this._selectionId);
    }
}
let AutoIndentOnPaste = class AutoIndentOnPaste {
    constructor(editor, _languageConfigurationService) {
        this.editor = editor;
        this._languageConfigurationService = _languageConfigurationService;
        this.callOnDispose = new DisposableStore();
        this.callOnModel = new DisposableStore();
        this.callOnDispose.add(editor.onDidChangeConfiguration(() => this.update()));
        this.callOnDispose.add(editor.onDidChangeModel(() => this.update()));
        this.callOnDispose.add(editor.onDidChangeModelLanguage(() => this.update()));
    }
    update() {
        // clean up
        this.callOnModel.clear();
        // we are disabled
        if (this.editor.getOption(12 /* EditorOption.autoIndent */) < 4 /* EditorAutoIndentStrategy.Full */ || this.editor.getOption(55 /* EditorOption.formatOnPaste */)) {
            return;
        }
        // no model
        if (!this.editor.hasModel()) {
            return;
        }
        this.callOnModel.add(this.editor.onDidPaste(({ range }) => {
            this.trigger(range);
        }));
    }
    trigger(range) {
        const selections = this.editor.getSelections();
        if (selections === null || selections.length > 1) {
            return;
        }
        const model = this.editor.getModel();
        if (!model) {
            return;
        }
        if (!model.tokenization.isCheapToTokenize(range.getStartPosition().lineNumber)) {
            return;
        }
        const autoIndent = this.editor.getOption(12 /* EditorOption.autoIndent */);
        const { tabSize, indentSize, insertSpaces } = model.getOptions();
        const textEdits = [];
        const indentConverter = {
            shiftIndent: (indentation) => {
                return ShiftCommand.shiftIndent(indentation, indentation.length + 1, tabSize, indentSize, insertSpaces);
            },
            unshiftIndent: (indentation) => {
                return ShiftCommand.unshiftIndent(indentation, indentation.length + 1, tabSize, indentSize, insertSpaces);
            }
        };
        let startLineNumber = range.startLineNumber;
        while (startLineNumber <= range.endLineNumber) {
            if (this.shouldIgnoreLine(model, startLineNumber)) {
                startLineNumber++;
                continue;
            }
            break;
        }
        if (startLineNumber > range.endLineNumber) {
            return;
        }
        let firstLineText = model.getLineContent(startLineNumber);
        if (!/\S/.test(firstLineText.substring(0, range.startColumn - 1))) {
            const indentOfFirstLine = getGoodIndentForLine(autoIndent, model, model.getLanguageId(), startLineNumber, indentConverter, this._languageConfigurationService);
            if (indentOfFirstLine !== null) {
                const oldIndentation = strings.getLeadingWhitespace(firstLineText);
                const newSpaceCnt = indentUtils.getSpaceCnt(indentOfFirstLine, tabSize);
                const oldSpaceCnt = indentUtils.getSpaceCnt(oldIndentation, tabSize);
                if (newSpaceCnt !== oldSpaceCnt) {
                    const newIndent = indentUtils.generateIndent(newSpaceCnt, tabSize, insertSpaces);
                    textEdits.push({
                        range: new Range(startLineNumber, 1, startLineNumber, oldIndentation.length + 1),
                        text: newIndent
                    });
                    firstLineText = newIndent + firstLineText.substr(oldIndentation.length);
                }
                else {
                    const indentMetadata = getIndentMetadata(model, startLineNumber, this._languageConfigurationService);
                    if (indentMetadata === 0 || indentMetadata === 8 /* IndentConsts.UNINDENT_MASK */) {
                        // we paste content into a line where only contains whitespaces
                        // after pasting, the indentation of the first line is already correct
                        // the first line doesn't match any indentation rule
                        // then no-op.
                        return;
                    }
                }
            }
        }
        const firstLineNumber = startLineNumber;
        // ignore empty or ignored lines
        while (startLineNumber < range.endLineNumber) {
            if (!/\S/.test(model.getLineContent(startLineNumber + 1))) {
                startLineNumber++;
                continue;
            }
            break;
        }
        if (startLineNumber !== range.endLineNumber) {
            const virtualModel = {
                tokenization: {
                    getLineTokens: (lineNumber) => {
                        return model.tokenization.getLineTokens(lineNumber);
                    },
                    getLanguageId: () => {
                        return model.getLanguageId();
                    },
                    getLanguageIdAtPosition: (lineNumber, column) => {
                        return model.getLanguageIdAtPosition(lineNumber, column);
                    },
                },
                getLineContent: (lineNumber) => {
                    if (lineNumber === firstLineNumber) {
                        return firstLineText;
                    }
                    else {
                        return model.getLineContent(lineNumber);
                    }
                }
            };
            const indentOfSecondLine = getGoodIndentForLine(autoIndent, virtualModel, model.getLanguageId(), startLineNumber + 1, indentConverter, this._languageConfigurationService);
            if (indentOfSecondLine !== null) {
                const newSpaceCntOfSecondLine = indentUtils.getSpaceCnt(indentOfSecondLine, tabSize);
                const oldSpaceCntOfSecondLine = indentUtils.getSpaceCnt(strings.getLeadingWhitespace(model.getLineContent(startLineNumber + 1)), tabSize);
                if (newSpaceCntOfSecondLine !== oldSpaceCntOfSecondLine) {
                    const spaceCntOffset = newSpaceCntOfSecondLine - oldSpaceCntOfSecondLine;
                    for (let i = startLineNumber + 1; i <= range.endLineNumber; i++) {
                        const lineContent = model.getLineContent(i);
                        const originalIndent = strings.getLeadingWhitespace(lineContent);
                        const originalSpacesCnt = indentUtils.getSpaceCnt(originalIndent, tabSize);
                        const newSpacesCnt = originalSpacesCnt + spaceCntOffset;
                        const newIndent = indentUtils.generateIndent(newSpacesCnt, tabSize, insertSpaces);
                        if (newIndent !== originalIndent) {
                            textEdits.push({
                                range: new Range(i, 1, i, originalIndent.length + 1),
                                text: newIndent
                            });
                        }
                    }
                }
            }
        }
        if (textEdits.length > 0) {
            this.editor.pushUndoStop();
            const cmd = new AutoIndentOnPasteCommand(textEdits, this.editor.getSelection());
            this.editor.executeCommand('autoIndentOnPaste', cmd);
            this.editor.pushUndoStop();
        }
    }
    shouldIgnoreLine(model, lineNumber) {
        model.tokenization.forceTokenization(lineNumber);
        const nonWhitespaceColumn = model.getLineFirstNonWhitespaceColumn(lineNumber);
        if (nonWhitespaceColumn === 0) {
            return true;
        }
        const tokens = model.tokenization.getLineTokens(lineNumber);
        if (tokens.getCount() > 0) {
            const firstNonWhitespaceTokenIndex = tokens.findTokenIndexAtOffset(nonWhitespaceColumn);
            if (firstNonWhitespaceTokenIndex >= 0 && tokens.getStandardTokenType(firstNonWhitespaceTokenIndex) === 1 /* StandardTokenType.Comment */) {
                return true;
            }
        }
        return false;
    }
    dispose() {
        this.callOnDispose.dispose();
        this.callOnModel.dispose();
    }
};
AutoIndentOnPaste.ID = 'editor.contrib.autoIndentOnPaste';
AutoIndentOnPaste = __decorate([
    __param(1, ILanguageConfigurationService)
], AutoIndentOnPaste);
export { AutoIndentOnPaste };
function getIndentationEditOperations(model, builder, tabSize, tabsToSpaces) {
    if (model.getLineCount() === 1 && model.getLineMaxColumn(1) === 1) {
        // Model is empty
        return;
    }
    let spaces = '';
    for (let i = 0; i < tabSize; i++) {
        spaces += ' ';
    }
    const spacesRegExp = new RegExp(spaces, 'gi');
    for (let lineNumber = 1, lineCount = model.getLineCount(); lineNumber <= lineCount; lineNumber++) {
        let lastIndentationColumn = model.getLineFirstNonWhitespaceColumn(lineNumber);
        if (lastIndentationColumn === 0) {
            lastIndentationColumn = model.getLineMaxColumn(lineNumber);
        }
        if (lastIndentationColumn === 1) {
            continue;
        }
        const originalIndentationRange = new Range(lineNumber, 1, lineNumber, lastIndentationColumn);
        const originalIndentation = model.getValueInRange(originalIndentationRange);
        const newIndentation = (tabsToSpaces
            ? originalIndentation.replace(/\t/ig, spaces)
            : originalIndentation.replace(spacesRegExp, '\t'));
        builder.addEditOperation(originalIndentationRange, newIndentation);
    }
}
export class IndentationToSpacesCommand {
    constructor(selection, tabSize) {
        this.selection = selection;
        this.tabSize = tabSize;
        this.selectionId = null;
    }
    getEditOperations(model, builder) {
        this.selectionId = builder.trackSelection(this.selection);
        getIndentationEditOperations(model, builder, this.tabSize, true);
    }
    computeCursorState(model, helper) {
        return helper.getTrackedSelection(this.selectionId);
    }
}
export class IndentationToTabsCommand {
    constructor(selection, tabSize) {
        this.selection = selection;
        this.tabSize = tabSize;
        this.selectionId = null;
    }
    getEditOperations(model, builder) {
        this.selectionId = builder.trackSelection(this.selection);
        getIndentationEditOperations(model, builder, this.tabSize, false);
    }
    computeCursorState(model, helper) {
        return helper.getTrackedSelection(this.selectionId);
    }
}
registerEditorContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorAction(IndentationToSpacesAction);
registerEditorAction(IndentationToTabsAction);
registerEditorAction(IndentUsingTabs);
registerEditorAction(IndentUsingSpaces);
registerEditorAction(ChangeTabDisplaySize);
registerEditorAction(DetectIndentation);
registerEditorAction(ReindentLinesAction);
registerEditorAction(ReindentSelectedLinesAction);
