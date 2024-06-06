/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const NO_KEY_MODS = { ctrlCmd: false, alt: false };
export var QuickInputHideReason;
(function (QuickInputHideReason) {
    /**
     * Focus moved away from the quick input.
     */
    QuickInputHideReason[QuickInputHideReason["Blur"] = 1] = "Blur";
    /**
     * An explicit user gesture, e.g. pressing Escape key.
     */
    QuickInputHideReason[QuickInputHideReason["Gesture"] = 2] = "Gesture";
    /**
     * Anything else.
     */
    QuickInputHideReason[QuickInputHideReason["Other"] = 3] = "Other";
})(QuickInputHideReason || (QuickInputHideReason = {}));
/**
 * Represents the activation behavior for items in a quick input. This means which item will be
 * "active" (aka focused).
 */
export var ItemActivation;
(function (ItemActivation) {
    /**
     * No item will be active.
     */
    ItemActivation[ItemActivation["NONE"] = 0] = "NONE";
    /**
     * First item will be active.
     */
    ItemActivation[ItemActivation["FIRST"] = 1] = "FIRST";
    /**
     * Second item will be active.
     */
    ItemActivation[ItemActivation["SECOND"] = 2] = "SECOND";
    /**
     * Last item will be active.
     */
    ItemActivation[ItemActivation["LAST"] = 3] = "LAST";
})(ItemActivation || (ItemActivation = {}));
export class QuickPickItemScorerAccessor {
    constructor(options) {
        this.options = options;
    }
}
export const quickPickItemScorerAccessor = new QuickPickItemScorerAccessor();
//#endregion
export const IQuickInputService = createDecorator('quickInputService');
