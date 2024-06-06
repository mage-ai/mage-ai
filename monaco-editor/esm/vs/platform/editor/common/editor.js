/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var EditorOpenSource;
(function (EditorOpenSource) {
    /**
     * Default: the editor is opening via a programmatic call
     * to the editor service API.
     */
    EditorOpenSource[EditorOpenSource["API"] = 0] = "API";
    /**
     * Indicates that a user action triggered the opening, e.g.
     * via mouse or keyboard use.
     */
    EditorOpenSource[EditorOpenSource["USER"] = 1] = "USER";
})(EditorOpenSource || (EditorOpenSource = {}));
