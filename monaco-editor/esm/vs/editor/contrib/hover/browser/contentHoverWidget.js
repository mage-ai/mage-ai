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
var ContentHoverWidget_1;
import * as dom from '../../../../base/browser/dom.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ResizableContentWidget } from './resizableContentWidget.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { getHoverAccessibleViewHint, HoverWidget } from '../../../../base/browser/ui/hover/hoverWidget.js';
const HORIZONTAL_SCROLLING_BY = 30;
const CONTAINER_HEIGHT_PADDING = 6;
let ContentHoverWidget = ContentHoverWidget_1 = class ContentHoverWidget extends ResizableContentWidget {
    get isColorPickerVisible() {
        var _a;
        return Boolean((_a = this._visibleData) === null || _a === void 0 ? void 0 : _a.colorPicker);
    }
    get isVisibleFromKeyboard() {
        var _a;
        return (((_a = this._visibleData) === null || _a === void 0 ? void 0 : _a.source) === 1 /* HoverStartSource.Keyboard */);
    }
    get isVisible() {
        var _a;
        return (_a = this._hoverVisibleKey.get()) !== null && _a !== void 0 ? _a : false;
    }
    get isFocused() {
        var _a;
        return (_a = this._hoverFocusedKey.get()) !== null && _a !== void 0 ? _a : false;
    }
    constructor(editor, contextKeyService, _configurationService, _accessibilityService, _keybindingService) {
        const minimumHeight = editor.getOption(67 /* EditorOption.lineHeight */) + 8;
        const minimumWidth = 150;
        const minimumSize = new dom.Dimension(minimumWidth, minimumHeight);
        super(editor, minimumSize);
        this._configurationService = _configurationService;
        this._accessibilityService = _accessibilityService;
        this._keybindingService = _keybindingService;
        this._hover = this._register(new HoverWidget());
        this._minimumSize = minimumSize;
        this._hoverVisibleKey = EditorContextKeys.hoverVisible.bindTo(contextKeyService);
        this._hoverFocusedKey = EditorContextKeys.hoverFocused.bindTo(contextKeyService);
        dom.append(this._resizableNode.domNode, this._hover.containerDomNode);
        this._resizableNode.domNode.style.zIndex = '50';
        this._register(this._editor.onDidLayoutChange(() => {
            if (this.isVisible) {
                this._updateMaxDimensions();
            }
        }));
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(50 /* EditorOption.fontInfo */)) {
                this._updateFont();
            }
        }));
        const focusTracker = this._register(dom.trackFocus(this._resizableNode.domNode));
        this._register(focusTracker.onDidFocus(() => {
            this._hoverFocusedKey.set(true);
        }));
        this._register(focusTracker.onDidBlur(() => {
            this._hoverFocusedKey.set(false);
        }));
        this._setHoverData(undefined);
        this._editor.addContentWidget(this);
    }
    dispose() {
        var _a;
        super.dispose();
        (_a = this._visibleData) === null || _a === void 0 ? void 0 : _a.disposables.dispose();
        this._editor.removeContentWidget(this);
    }
    getId() {
        return ContentHoverWidget_1.ID;
    }
    static _applyDimensions(container, width, height) {
        const transformedWidth = typeof width === 'number' ? `${width}px` : width;
        const transformedHeight = typeof height === 'number' ? `${height}px` : height;
        container.style.width = transformedWidth;
        container.style.height = transformedHeight;
    }
    _setContentsDomNodeDimensions(width, height) {
        const contentsDomNode = this._hover.contentsDomNode;
        return ContentHoverWidget_1._applyDimensions(contentsDomNode, width, height);
    }
    _setContainerDomNodeDimensions(width, height) {
        const containerDomNode = this._hover.containerDomNode;
        return ContentHoverWidget_1._applyDimensions(containerDomNode, width, height);
    }
    _setHoverWidgetDimensions(width, height) {
        this._setContentsDomNodeDimensions(width, height);
        this._setContainerDomNodeDimensions(width, height);
        this._layoutContentWidget();
    }
    static _applyMaxDimensions(container, width, height) {
        const transformedWidth = typeof width === 'number' ? `${width}px` : width;
        const transformedHeight = typeof height === 'number' ? `${height}px` : height;
        container.style.maxWidth = transformedWidth;
        container.style.maxHeight = transformedHeight;
    }
    _setHoverWidgetMaxDimensions(width, height) {
        ContentHoverWidget_1._applyMaxDimensions(this._hover.contentsDomNode, width, height);
        ContentHoverWidget_1._applyMaxDimensions(this._hover.containerDomNode, width, height);
        this._hover.containerDomNode.style.setProperty('--vscode-hover-maxWidth', typeof width === 'number' ? `${width}px` : width);
        this._layoutContentWidget();
    }
    _setAdjustedHoverWidgetDimensions(size) {
        this._setHoverWidgetMaxDimensions('none', 'none');
        const width = size.width;
        const height = size.height;
        this._setHoverWidgetDimensions(width, height);
    }
    _updateResizableNodeMaxDimensions() {
        var _a, _b;
        const maxRenderingWidth = (_a = this._findMaximumRenderingWidth()) !== null && _a !== void 0 ? _a : Infinity;
        const maxRenderingHeight = (_b = this._findMaximumRenderingHeight()) !== null && _b !== void 0 ? _b : Infinity;
        this._resizableNode.maxSize = new dom.Dimension(maxRenderingWidth, maxRenderingHeight);
        this._setHoverWidgetMaxDimensions(maxRenderingWidth, maxRenderingHeight);
    }
    _resize(size) {
        var _a, _b;
        ContentHoverWidget_1._lastDimensions = new dom.Dimension(size.width, size.height);
        this._setAdjustedHoverWidgetDimensions(size);
        this._resizableNode.layout(size.height, size.width);
        this._updateResizableNodeMaxDimensions();
        this._hover.scrollbar.scanDomNode();
        this._editor.layoutContentWidget(this);
        (_b = (_a = this._visibleData) === null || _a === void 0 ? void 0 : _a.colorPicker) === null || _b === void 0 ? void 0 : _b.layout();
    }
    _findAvailableSpaceVertically() {
        var _a;
        const position = (_a = this._visibleData) === null || _a === void 0 ? void 0 : _a.showAtPosition;
        if (!position) {
            return;
        }
        return this._positionPreference === 1 /* ContentWidgetPositionPreference.ABOVE */ ?
            this._availableVerticalSpaceAbove(position)
            : this._availableVerticalSpaceBelow(position);
    }
    _findMaximumRenderingHeight() {
        const availableSpace = this._findAvailableSpaceVertically();
        if (!availableSpace) {
            return;
        }
        // Padding needed in order to stop the resizing down to a smaller height
        let maximumHeight = CONTAINER_HEIGHT_PADDING;
        Array.from(this._hover.contentsDomNode.children).forEach((hoverPart) => {
            maximumHeight += hoverPart.clientHeight;
        });
        return Math.min(availableSpace, maximumHeight);
    }
    _isHoverTextOverflowing() {
        // To find out if the text is overflowing, we will disable wrapping, check the widths, and then re-enable wrapping
        this._hover.containerDomNode.style.setProperty('--vscode-hover-whiteSpace', 'nowrap');
        this._hover.containerDomNode.style.setProperty('--vscode-hover-sourceWhiteSpace', 'nowrap');
        const overflowing = Array.from(this._hover.contentsDomNode.children).some((hoverElement) => {
            return hoverElement.scrollWidth > hoverElement.clientWidth;
        });
        this._hover.containerDomNode.style.removeProperty('--vscode-hover-whiteSpace');
        this._hover.containerDomNode.style.removeProperty('--vscode-hover-sourceWhiteSpace');
        return overflowing;
    }
    _findMaximumRenderingWidth() {
        if (!this._editor || !this._editor.hasModel()) {
            return;
        }
        const overflowing = this._isHoverTextOverflowing();
        const initialWidth = (typeof this._contentWidth === 'undefined'
            ? 0
            : this._contentWidth - 2 // - 2 for the borders
        );
        if (overflowing || this._hover.containerDomNode.clientWidth < initialWidth) {
            const bodyBoxWidth = dom.getClientArea(this._hover.containerDomNode.ownerDocument.body).width;
            const horizontalPadding = 14;
            return bodyBoxWidth - horizontalPadding;
        }
        else {
            return this._hover.containerDomNode.clientWidth + 2;
        }
    }
    isMouseGettingCloser(posx, posy) {
        if (!this._visibleData) {
            return false;
        }
        if (typeof this._visibleData.initialMousePosX === 'undefined'
            || typeof this._visibleData.initialMousePosY === 'undefined') {
            this._visibleData.initialMousePosX = posx;
            this._visibleData.initialMousePosY = posy;
            return false;
        }
        const widgetRect = dom.getDomNodePagePosition(this.getDomNode());
        if (typeof this._visibleData.closestMouseDistance === 'undefined') {
            this._visibleData.closestMouseDistance = computeDistanceFromPointToRectangle(this._visibleData.initialMousePosX, this._visibleData.initialMousePosY, widgetRect.left, widgetRect.top, widgetRect.width, widgetRect.height);
        }
        const distance = computeDistanceFromPointToRectangle(posx, posy, widgetRect.left, widgetRect.top, widgetRect.width, widgetRect.height);
        if (distance > this._visibleData.closestMouseDistance + 4 /* tolerance of 4 pixels */) {
            // The mouse is getting farther away
            return false;
        }
        this._visibleData.closestMouseDistance = Math.min(this._visibleData.closestMouseDistance, distance);
        return true;
    }
    _setHoverData(hoverData) {
        var _a;
        (_a = this._visibleData) === null || _a === void 0 ? void 0 : _a.disposables.dispose();
        this._visibleData = hoverData;
        this._hoverVisibleKey.set(!!hoverData);
        this._hover.containerDomNode.classList.toggle('hidden', !hoverData);
    }
    _updateFont() {
        const { fontSize, lineHeight } = this._editor.getOption(50 /* EditorOption.fontInfo */);
        const contentsDomNode = this._hover.contentsDomNode;
        contentsDomNode.style.fontSize = `${fontSize}px`;
        contentsDomNode.style.lineHeight = `${lineHeight / fontSize}`;
        const codeClasses = Array.prototype.slice.call(this._hover.contentsDomNode.getElementsByClassName('code'));
        codeClasses.forEach(node => this._editor.applyFontInfo(node));
    }
    _updateContent(node) {
        const contentsDomNode = this._hover.contentsDomNode;
        contentsDomNode.style.paddingBottom = '';
        contentsDomNode.textContent = '';
        contentsDomNode.appendChild(node);
    }
    _layoutContentWidget() {
        this._editor.layoutContentWidget(this);
        this._hover.onContentsChanged();
    }
    _updateMaxDimensions() {
        const height = Math.max(this._editor.getLayoutInfo().height / 4, 250, ContentHoverWidget_1._lastDimensions.height);
        const width = Math.max(this._editor.getLayoutInfo().width * 0.66, 500, ContentHoverWidget_1._lastDimensions.width);
        this._setHoverWidgetMaxDimensions(width, height);
    }
    _render(node, hoverData) {
        this._setHoverData(hoverData);
        this._updateFont();
        this._updateContent(node);
        this._updateMaxDimensions();
        this.onContentsChanged();
        // Simply force a synchronous render on the editor
        // such that the widget does not really render with left = '0px'
        this._editor.render();
    }
    getPosition() {
        var _a;
        if (!this._visibleData) {
            return null;
        }
        return {
            position: this._visibleData.showAtPosition,
            secondaryPosition: this._visibleData.showAtSecondaryPosition,
            positionAffinity: this._visibleData.isBeforeContent ? 3 /* PositionAffinity.LeftOfInjectedText */ : undefined,
            preference: [(_a = this._positionPreference) !== null && _a !== void 0 ? _a : 1 /* ContentWidgetPositionPreference.ABOVE */]
        };
    }
    showAt(node, hoverData) {
        var _a, _b, _c, _d;
        if (!this._editor || !this._editor.hasModel()) {
            return;
        }
        this._render(node, hoverData);
        const widgetHeight = dom.getTotalHeight(this._hover.containerDomNode);
        const widgetPosition = hoverData.showAtPosition;
        this._positionPreference = (_a = this._findPositionPreference(widgetHeight, widgetPosition)) !== null && _a !== void 0 ? _a : 1 /* ContentWidgetPositionPreference.ABOVE */;
        // See https://github.com/microsoft/vscode/issues/140339
        // TODO: Doing a second layout of the hover after force rendering the editor
        this.onContentsChanged();
        if (hoverData.stoleFocus) {
            this._hover.containerDomNode.focus();
        }
        (_b = hoverData.colorPicker) === null || _b === void 0 ? void 0 : _b.layout();
        // The aria label overrides the label, so if we add to it, add the contents of the hover
        const hoverFocused = this._hover.containerDomNode.ownerDocument.activeElement === this._hover.containerDomNode;
        const accessibleViewHint = hoverFocused && getHoverAccessibleViewHint(this._configurationService.getValue('accessibility.verbosity.hover') === true && this._accessibilityService.isScreenReaderOptimized(), (_d = (_c = this._keybindingService.lookupKeybinding('editor.action.accessibleView')) === null || _c === void 0 ? void 0 : _c.getAriaLabel()) !== null && _d !== void 0 ? _d : '');
        if (accessibleViewHint) {
            this._hover.contentsDomNode.ariaLabel = this._hover.contentsDomNode.textContent + ', ' + accessibleViewHint;
        }
    }
    hide() {
        if (!this._visibleData) {
            return;
        }
        const stoleFocus = this._visibleData.stoleFocus || this._hoverFocusedKey.get();
        this._setHoverData(undefined);
        this._resizableNode.maxSize = new dom.Dimension(Infinity, Infinity);
        this._resizableNode.clearSashHoverState();
        this._hoverFocusedKey.set(false);
        this._editor.layoutContentWidget(this);
        if (stoleFocus) {
            this._editor.focus();
        }
    }
    _removeConstraintsRenderNormally() {
        // Added because otherwise the initial size of the hover content is smaller than should be
        const layoutInfo = this._editor.getLayoutInfo();
        this._resizableNode.layout(layoutInfo.height, layoutInfo.width);
        this._setHoverWidgetDimensions('auto', 'auto');
    }
    setMinimumDimensions(dimensions) {
        // We combine the new minimum dimensions with the previous ones
        this._minimumSize = new dom.Dimension(Math.max(this._minimumSize.width, dimensions.width), Math.max(this._minimumSize.height, dimensions.height));
        this._updateMinimumWidth();
    }
    _updateMinimumWidth() {
        const width = (typeof this._contentWidth === 'undefined'
            ? this._minimumSize.width
            : Math.min(this._contentWidth, this._minimumSize.width));
        // We want to avoid that the hover is artificially large, so we use the content width as minimum width
        this._resizableNode.minSize = new dom.Dimension(width, this._minimumSize.height);
    }
    onContentsChanged() {
        var _a;
        this._removeConstraintsRenderNormally();
        const containerDomNode = this._hover.containerDomNode;
        let height = dom.getTotalHeight(containerDomNode);
        let width = dom.getTotalWidth(containerDomNode);
        this._resizableNode.layout(height, width);
        this._setHoverWidgetDimensions(width, height);
        height = dom.getTotalHeight(containerDomNode);
        width = dom.getTotalWidth(containerDomNode);
        this._contentWidth = width;
        this._updateMinimumWidth();
        this._resizableNode.layout(height, width);
        if ((_a = this._visibleData) === null || _a === void 0 ? void 0 : _a.showAtPosition) {
            const widgetHeight = dom.getTotalHeight(this._hover.containerDomNode);
            this._positionPreference = this._findPositionPreference(widgetHeight, this._visibleData.showAtPosition);
        }
        this._layoutContentWidget();
    }
    focus() {
        this._hover.containerDomNode.focus();
    }
    scrollUp() {
        const scrollTop = this._hover.scrollbar.getScrollPosition().scrollTop;
        const fontInfo = this._editor.getOption(50 /* EditorOption.fontInfo */);
        this._hover.scrollbar.setScrollPosition({ scrollTop: scrollTop - fontInfo.lineHeight });
    }
    scrollDown() {
        const scrollTop = this._hover.scrollbar.getScrollPosition().scrollTop;
        const fontInfo = this._editor.getOption(50 /* EditorOption.fontInfo */);
        this._hover.scrollbar.setScrollPosition({ scrollTop: scrollTop + fontInfo.lineHeight });
    }
    scrollLeft() {
        const scrollLeft = this._hover.scrollbar.getScrollPosition().scrollLeft;
        this._hover.scrollbar.setScrollPosition({ scrollLeft: scrollLeft - HORIZONTAL_SCROLLING_BY });
    }
    scrollRight() {
        const scrollLeft = this._hover.scrollbar.getScrollPosition().scrollLeft;
        this._hover.scrollbar.setScrollPosition({ scrollLeft: scrollLeft + HORIZONTAL_SCROLLING_BY });
    }
    pageUp() {
        const scrollTop = this._hover.scrollbar.getScrollPosition().scrollTop;
        const scrollHeight = this._hover.scrollbar.getScrollDimensions().height;
        this._hover.scrollbar.setScrollPosition({ scrollTop: scrollTop - scrollHeight });
    }
    pageDown() {
        const scrollTop = this._hover.scrollbar.getScrollPosition().scrollTop;
        const scrollHeight = this._hover.scrollbar.getScrollDimensions().height;
        this._hover.scrollbar.setScrollPosition({ scrollTop: scrollTop + scrollHeight });
    }
    goToTop() {
        this._hover.scrollbar.setScrollPosition({ scrollTop: 0 });
    }
    goToBottom() {
        this._hover.scrollbar.setScrollPosition({ scrollTop: this._hover.scrollbar.getScrollDimensions().scrollHeight });
    }
};
ContentHoverWidget.ID = 'editor.contrib.resizableContentHoverWidget';
ContentHoverWidget._lastDimensions = new dom.Dimension(0, 0);
ContentHoverWidget = ContentHoverWidget_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IConfigurationService),
    __param(3, IAccessibilityService),
    __param(4, IKeybindingService)
], ContentHoverWidget);
export { ContentHoverWidget };
function computeDistanceFromPointToRectangle(pointX, pointY, left, top, width, height) {
    const x = (left + width / 2); // x center of rectangle
    const y = (top + height / 2); // y center of rectangle
    const dx = Math.max(Math.abs(pointX - x) - width / 2, 0);
    const dy = Math.max(Math.abs(pointY - y) - height / 2, 0);
    return Math.sqrt(dx * dx + dy * dy);
}
