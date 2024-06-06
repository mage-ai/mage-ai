/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ResourceTextEdit } from '../../../browser/services/bulkEditService.js';
import { SnippetParser } from '../../snippet/browser/snippetParser.js';
/**
 * Given a {@link DropOrPasteEdit} and set of ranges, creates a {@link WorkspaceEdit} that applies the insert text from
 * the {@link DropOrPasteEdit} at each range plus any additional edits.
 */
export function createCombinedWorkspaceEdit(uri, ranges, edit) {
    var _a, _b, _c, _d;
    // If the edit insert text is empty, skip applying at each range
    if (typeof edit.insertText === 'string' ? edit.insertText === '' : edit.insertText.snippet === '') {
        return {
            edits: (_b = (_a = edit.additionalEdit) === null || _a === void 0 ? void 0 : _a.edits) !== null && _b !== void 0 ? _b : []
        };
    }
    return {
        edits: [
            ...ranges.map(range => new ResourceTextEdit(uri, { range, text: typeof edit.insertText === 'string' ? SnippetParser.escape(edit.insertText) + '$0' : edit.insertText.snippet, insertAsSnippet: true })),
            ...((_d = (_c = edit.additionalEdit) === null || _c === void 0 ? void 0 : _c.edits) !== null && _d !== void 0 ? _d : [])
        ]
    };
}
export function sortEditsByYieldTo(edits) {
    var _a;
    function yieldsTo(yTo, other) {
        if ('mimeType' in yTo) {
            return yTo.mimeType === other.handledMimeType;
        }
        return !!other.kind && yTo.kind.contains(other.kind);
    }
    // Build list of nodes each node yields to
    const yieldsToMap = new Map();
    for (const edit of edits) {
        for (const yTo of (_a = edit.yieldTo) !== null && _a !== void 0 ? _a : []) {
            for (const other of edits) {
                if (other === edit) {
                    continue;
                }
                if (yieldsTo(yTo, other)) {
                    let arr = yieldsToMap.get(edit);
                    if (!arr) {
                        arr = [];
                        yieldsToMap.set(edit, arr);
                    }
                    arr.push(other);
                }
            }
        }
    }
    if (!yieldsToMap.size) {
        return Array.from(edits);
    }
    // Topological sort
    const visited = new Set();
    const tempStack = [];
    function visit(nodes) {
        if (!nodes.length) {
            return [];
        }
        const node = nodes[0];
        if (tempStack.includes(node)) {
            console.warn('Yield to cycle detected', node);
            return nodes;
        }
        if (visited.has(node)) {
            return visit(nodes.slice(1));
        }
        let pre = [];
        const yTo = yieldsToMap.get(node);
        if (yTo) {
            tempStack.push(node);
            pre = visit(yTo);
            tempStack.pop();
        }
        visited.add(node);
        return [...pre, node, ...visit(nodes.slice(1))];
    }
    return visit(Array.from(edits));
}
