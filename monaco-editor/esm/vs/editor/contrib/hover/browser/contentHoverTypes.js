/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class HoverResult {
    constructor(anchor, messages, isComplete) {
        this.anchor = anchor;
        this.messages = messages;
        this.isComplete = isComplete;
    }
    filter(anchor) {
        const filteredMessages = this.messages.filter((m) => m.isValidForHoverAnchor(anchor));
        if (filteredMessages.length === this.messages.length) {
            return this;
        }
        return new FilteredHoverResult(this, this.anchor, filteredMessages, this.isComplete);
    }
}
export class FilteredHoverResult extends HoverResult {
    constructor(original, anchor, messages, isComplete) {
        super(anchor, messages, isComplete);
        this.original = original;
    }
    filter(anchor) {
        return this.original.filter(anchor);
    }
}
export class ContentHoverVisibleData {
    constructor(initialMousePosX, initialMousePosY, colorPicker, showAtPosition, showAtSecondaryPosition, preferAbove, stoleFocus, source, isBeforeContent, disposables) {
        this.initialMousePosX = initialMousePosX;
        this.initialMousePosY = initialMousePosY;
        this.colorPicker = colorPicker;
        this.showAtPosition = showAtPosition;
        this.showAtSecondaryPosition = showAtSecondaryPosition;
        this.preferAbove = preferAbove;
        this.stoleFocus = stoleFocus;
        this.source = source;
        this.isBeforeContent = isBeforeContent;
        this.disposables = disposables;
        this.closestMouseDistance = undefined;
    }
}
