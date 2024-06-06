/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../../base/common/strings.js';
import { ShiftCommand } from '../../../common/commands/shiftCommand.js';
import { EditOperation } from '../../../common/core/editOperation.js';
import { normalizeIndentation } from '../../../common/core/indentation.js';
import { Selection } from '../../../common/core/selection.js';
export function getReindentEditOperations(model, languageConfigurationService, startLineNumber, endLineNumber, inheritedIndent) {
    if (model.getLineCount() === 1 && model.getLineMaxColumn(1) === 1) {
        // Model is empty
        return [];
    }
    const indentationRules = languageConfigurationService.getLanguageConfiguration(model.getLanguageId()).indentationRules;
    if (!indentationRules) {
        return [];
    }
    endLineNumber = Math.min(endLineNumber, model.getLineCount());
    // Skip `unIndentedLinePattern` lines
    while (startLineNumber <= endLineNumber) {
        if (!indentationRules.unIndentedLinePattern) {
            break;
        }
        const text = model.getLineContent(startLineNumber);
        if (!indentationRules.unIndentedLinePattern.test(text)) {
            break;
        }
        startLineNumber++;
    }
    if (startLineNumber > endLineNumber - 1) {
        return [];
    }
    const { tabSize, indentSize, insertSpaces } = model.getOptions();
    const shiftIndent = (indentation, count) => {
        count = count || 1;
        return ShiftCommand.shiftIndent(indentation, indentation.length + count, tabSize, indentSize, insertSpaces);
    };
    const unshiftIndent = (indentation, count) => {
        count = count || 1;
        return ShiftCommand.unshiftIndent(indentation, indentation.length + count, tabSize, indentSize, insertSpaces);
    };
    const indentEdits = [];
    // indentation being passed to lines below
    let globalIndent;
    // Calculate indentation for the first line
    // If there is no passed-in indentation, we use the indentation of the first line as base.
    const currentLineText = model.getLineContent(startLineNumber);
    let adjustedLineContent = currentLineText;
    if (inheritedIndent !== undefined && inheritedIndent !== null) {
        globalIndent = inheritedIndent;
        const oldIndentation = strings.getLeadingWhitespace(currentLineText);
        adjustedLineContent = globalIndent + currentLineText.substring(oldIndentation.length);
        if (indentationRules.decreaseIndentPattern && indentationRules.decreaseIndentPattern.test(adjustedLineContent)) {
            globalIndent = unshiftIndent(globalIndent);
            adjustedLineContent = globalIndent + currentLineText.substring(oldIndentation.length);
        }
        if (currentLineText !== adjustedLineContent) {
            indentEdits.push(EditOperation.replaceMove(new Selection(startLineNumber, 1, startLineNumber, oldIndentation.length + 1), normalizeIndentation(globalIndent, indentSize, insertSpaces)));
        }
    }
    else {
        globalIndent = strings.getLeadingWhitespace(currentLineText);
    }
    // idealIndentForNextLine doesn't equal globalIndent when there is a line matching `indentNextLinePattern`.
    let idealIndentForNextLine = globalIndent;
    if (indentationRules.increaseIndentPattern && indentationRules.increaseIndentPattern.test(adjustedLineContent)) {
        idealIndentForNextLine = shiftIndent(idealIndentForNextLine);
        globalIndent = shiftIndent(globalIndent);
    }
    else if (indentationRules.indentNextLinePattern && indentationRules.indentNextLinePattern.test(adjustedLineContent)) {
        idealIndentForNextLine = shiftIndent(idealIndentForNextLine);
    }
    startLineNumber++;
    // Calculate indentation adjustment for all following lines
    for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
        const text = model.getLineContent(lineNumber);
        const oldIndentation = strings.getLeadingWhitespace(text);
        const adjustedLineContent = idealIndentForNextLine + text.substring(oldIndentation.length);
        if (indentationRules.decreaseIndentPattern && indentationRules.decreaseIndentPattern.test(adjustedLineContent)) {
            idealIndentForNextLine = unshiftIndent(idealIndentForNextLine);
            globalIndent = unshiftIndent(globalIndent);
        }
        if (oldIndentation !== idealIndentForNextLine) {
            indentEdits.push(EditOperation.replaceMove(new Selection(lineNumber, 1, lineNumber, oldIndentation.length + 1), normalizeIndentation(idealIndentForNextLine, indentSize, insertSpaces)));
        }
        // calculate idealIndentForNextLine
        if (indentationRules.unIndentedLinePattern && indentationRules.unIndentedLinePattern.test(text)) {
            // In reindent phase, if the line matches `unIndentedLinePattern` we inherit indentation from above lines
            // but don't change globalIndent and idealIndentForNextLine.
            continue;
        }
        else if (indentationRules.increaseIndentPattern && indentationRules.increaseIndentPattern.test(adjustedLineContent)) {
            globalIndent = shiftIndent(globalIndent);
            idealIndentForNextLine = globalIndent;
        }
        else if (indentationRules.indentNextLinePattern && indentationRules.indentNextLinePattern.test(adjustedLineContent)) {
            idealIndentForNextLine = shiftIndent(idealIndentForNextLine);
        }
        else {
            idealIndentForNextLine = globalIndent;
        }
    }
    return indentEdits;
}
