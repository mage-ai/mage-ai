/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { isMarkdownString } from '../../../../base/common/htmlContent.js';
import { isFunction, isString } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
export class UpdatableHoverWidget {
    constructor(hoverDelegate, target, fadeInAnimation) {
        this.hoverDelegate = hoverDelegate;
        this.target = target;
        this.fadeInAnimation = fadeInAnimation;
    }
    async update(content, focus, options) {
        var _a;
        if (this._cancellationTokenSource) {
            // there's an computation ongoing, cancel it
            this._cancellationTokenSource.dispose(true);
            this._cancellationTokenSource = undefined;
        }
        if (this.isDisposed) {
            return;
        }
        let resolvedContent;
        if (content === undefined || isString(content) || content instanceof HTMLElement) {
            resolvedContent = content;
        }
        else if (!isFunction(content.markdown)) {
            resolvedContent = (_a = content.markdown) !== null && _a !== void 0 ? _a : content.markdownNotSupportedFallback;
        }
        else {
            // compute the content, potentially long-running
            // show 'Loading' if no hover is up yet
            if (!this._hoverWidget) {
                this.show(localize('iconLabel.loading', "Loading..."), focus);
            }
            // compute the content
            this._cancellationTokenSource = new CancellationTokenSource();
            const token = this._cancellationTokenSource.token;
            resolvedContent = await content.markdown(token);
            if (resolvedContent === undefined) {
                resolvedContent = content.markdownNotSupportedFallback;
            }
            if (this.isDisposed || token.isCancellationRequested) {
                // either the widget has been closed in the meantime
                // or there has been a new call to `update`
                return;
            }
        }
        this.show(resolvedContent, focus, options);
    }
    show(content, focus, options) {
        const oldHoverWidget = this._hoverWidget;
        if (this.hasContent(content)) {
            const hoverOptions = {
                content,
                target: this.target,
                appearance: {
                    showPointer: this.hoverDelegate.placement === 'element',
                    skipFadeInAnimation: !this.fadeInAnimation || !!oldHoverWidget, // do not fade in if the hover is already showing
                },
                position: {
                    hoverPosition: 2 /* HoverPosition.BELOW */,
                },
                ...options
            };
            this._hoverWidget = this.hoverDelegate.showHover(hoverOptions, focus);
        }
        oldHoverWidget === null || oldHoverWidget === void 0 ? void 0 : oldHoverWidget.dispose();
    }
    hasContent(content) {
        if (!content) {
            return false;
        }
        if (isMarkdownString(content)) {
            return !!content.value;
        }
        return true;
    }
    get isDisposed() {
        var _a;
        return (_a = this._hoverWidget) === null || _a === void 0 ? void 0 : _a.isDisposed;
    }
    dispose() {
        var _a, _b;
        (_a = this._hoverWidget) === null || _a === void 0 ? void 0 : _a.dispose();
        (_b = this._cancellationTokenSource) === null || _b === void 0 ? void 0 : _b.dispose(true);
        this._cancellationTokenSource = undefined;
    }
}
