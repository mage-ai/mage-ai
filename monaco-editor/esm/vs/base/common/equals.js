/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from './arrays.js';
export const strictEquals = (a, b) => a === b;
/**
 * Checks if the items of two arrays are equal.
 * By default, strict equality is used to compare elements, but a custom equality comparer can be provided.
 */
export function itemsEquals(itemEquals = strictEquals) {
    return (a, b) => arrays.equals(a, b, itemEquals);
}
/**
 * Uses `item.equals(other)` to determine equality.
 */
export function itemEquals() {
    return (a, b) => a.equals(b);
}
export function equalsIfDefined(v1, v2, equals) {
    if (!v1 || !v2) {
        return v1 === v2;
    }
    return equals(v1, v2);
}
const objIds = new WeakMap();
