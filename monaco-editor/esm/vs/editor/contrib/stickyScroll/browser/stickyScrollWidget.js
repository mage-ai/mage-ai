/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import { createTrustedTypesPolicy } from '../../../../base/browser/trustedTypes.js';
import { equals } from '../../../../base/common/arrays.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import './stickyScroll.css';
import { getColumnOfNodeOffset } from '../../../browser/viewParts/lines/viewLine.js';
import { EmbeddedCodeEditorWidget } from '../../../browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { Position } from '../../../common/core/position.js';
import { StringBuilder } from '../../../common/core/stringBuilder.js';
import { LineDecoration } from '../../../common/viewLayout/lineDecorations.js';
import { RenderLineInput, renderViewLine } from '../../../common/viewLayout/viewLineRenderer.js';
import { foldingCollapsedIcon, foldingExpandedIcon } from '../../folding/browser/foldingDecorations.js';
export class StickyScrollWidgetState {
    constructor(startLineNumbers, endLineNumbers, lastLineRelativePosition, showEndForLine = null) {
        this.startLineNumbers = startLineNumbers;
        this.endLineNumbers = endLineNumbers;
        this.lastLineRelativePosition = lastLineRelativePosition;
        this.showEndForLine = showEndForLine;
    }
    equals(other) {
        return !!other
            && this.lastLineRelativePosition === other.lastLineRelativePosition
            && this.showEndForLine === other.showEndForLine
            && equals(this.startLineNumbers, other.startLineNumbers)
            && equals(this.endLineNumbers, other.endLineNumbers);
    }
}
const _ttPolicy = createTrustedTypesPolicy('stickyScrollViewLayer', { createHTML: value => value });
const STICKY_INDEX_ATTR = 'data-sticky-line-index';
const STICKY_IS_LINE_ATTR = 'data-sticky-is-line';
const STICKY_IS_LINE_NUMBER_ATTR = 'data-sticky-is-line-number';
const STICKY_IS_FOLDING_ICON_ATTR = 'data-sticky-is-folding-icon';
export class StickyScrollWidget extends Disposable {
    constructor(_editor) {
        super();
        this._editor = _editor;
        this._foldingIconStore = new DisposableStore();
        this._rootDomNode = document.createElement('div');
        this._lineNumbersDomNode = document.createElement('div');
        this._linesDomNodeScrollable = document.createElement('div');
        this._linesDomNode = document.createElement('div');
        this._lineHeight = this._editor.getOption(67 /* EditorOption.lineHeight */);
        this._renderedStickyLines = [];
        this._lineNumbers = [];
        this._lastLineRelativePosition = 0;
        this._minContentWidthInPx = 0;
        this._isOnGlyphMargin = false;
        this._lineNumbersDomNode.className = 'sticky-widget-line-numbers';
        this._lineNumbersDomNode.setAttribute('role', 'none');
        this._linesDomNode.className = 'sticky-widget-lines';
        this._linesDomNode.setAttribute('role', 'list');
        this._linesDomNodeScrollable.className = 'sticky-widget-lines-scrollable';
        this._linesDomNodeScrollable.appendChild(this._linesDomNode);
        this._rootDomNode.className = 'sticky-widget';
        this._rootDomNode.classList.toggle('peek', _editor instanceof EmbeddedCodeEditorWidget);
        this._rootDomNode.appendChild(this._lineNumbersDomNode);
        this._rootDomNode.appendChild(this._linesDomNodeScrollable);
        const updateScrollLeftPosition = () => {
            this._linesDomNode.style.left = this._editor.getOption(115 /* EditorOption.stickyScroll */).scrollWithEditor ? `-${this._editor.getScrollLeft()}px` : '0px';
        };
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(115 /* EditorOption.stickyScroll */)) {
                updateScrollLeftPosition();
            }
            if (e.hasChanged(67 /* EditorOption.lineHeight */)) {
                this._lineHeight = this._editor.getOption(67 /* EditorOption.lineHeight */);
            }
        }));
        this._register(this._editor.onDidScrollChange((e) => {
            if (e.scrollLeftChanged) {
                updateScrollLeftPosition();
            }
            if (e.scrollWidthChanged) {
                this._updateWidgetWidth();
            }
        }));
        this._register(this._editor.onDidChangeModel(() => {
            updateScrollLeftPosition();
            this._updateWidgetWidth();
        }));
        this._register(this._foldingIconStore);
        updateScrollLeftPosition();
        this._register(this._editor.onDidLayoutChange((e) => {
            this._updateWidgetWidth();
        }));
        this._updateWidgetWidth();
    }
    get lineNumbers() {
        return this._lineNumbers;
    }
    get lineNumberCount() {
        return this._lineNumbers.length;
    }
    getRenderedStickyLine(lineNumber) {
        return this._renderedStickyLines.find(stickyLine => stickyLine.lineNumber === lineNumber);
    }
    getCurrentLines() {
        return this._lineNumbers;
    }
    setState(_state, foldingModel, _rebuildFromLine) {
        if (_rebuildFromLine === undefined &&
            ((!this._previousState && !_state) || (this._previousState && this._previousState.equals(_state)))) {
            return;
        }
        const isWidgetHeightZero = this._isWidgetHeightZero(_state);
        const state = isWidgetHeightZero ? undefined : _state;
        const rebuildFromLine = isWidgetHeightZero ? 0 : this._findLineToRebuildWidgetFrom(_state, _rebuildFromLine);
        this._renderRootNode(state, foldingModel, rebuildFromLine);
        this._previousState = _state;
    }
    _isWidgetHeightZero(state) {
        if (!state) {
            return true;
        }
        const futureWidgetHeight = state.startLineNumbers.length * this._lineHeight + state.lastLineRelativePosition;
        if (futureWidgetHeight > 0) {
            this._lastLineRelativePosition = state.lastLineRelativePosition;
            const lineNumbers = [...state.startLineNumbers];
            if (state.showEndForLine !== null) {
                lineNumbers[state.showEndForLine] = state.endLineNumbers[state.showEndForLine];
            }
            this._lineNumbers = lineNumbers;
        }
        else {
            this._lastLineRelativePosition = 0;
            this._lineNumbers = [];
        }
        return futureWidgetHeight === 0;
    }
    _findLineToRebuildWidgetFrom(state, _rebuildFromLine) {
        if (!state || !this._previousState) {
            return 0;
        }
        if (_rebuildFromLine !== undefined) {
            return _rebuildFromLine;
        }
        const previousState = this._previousState;
        const indexOfLinesAlreadyRendered = state.startLineNumbers.findIndex(startLineNumber => !previousState.startLineNumbers.includes(startLineNumber));
        return (indexOfLinesAlreadyRendered === -1) ? 0 : indexOfLinesAlreadyRendered;
    }
    _updateWidgetWidth() {
        const layoutInfo = this._editor.getLayoutInfo();
        const lineNumbersWidth = layoutInfo.contentLeft;
        this._lineNumbersDomNode.style.width = `${lineNumbersWidth}px`;
        this._linesDomNodeScrollable.style.setProperty('--vscode-editorStickyScroll-scrollableWidth', `${this._editor.getScrollWidth() - layoutInfo.verticalScrollbarWidth}px`);
        this._rootDomNode.style.width = `${layoutInfo.width - layoutInfo.verticalScrollbarWidth}px`;
    }
    _clearStickyLinesFromLine(clearFromLine) {
        this._foldingIconStore.clear();
        // Removing only the lines that need to be rerendered
        for (let i = clearFromLine; i < this._renderedStickyLines.length; i++) {
            const stickyLine = this._renderedStickyLines[i];
            stickyLine.lineNumberDomNode.remove();
            stickyLine.lineDomNode.remove();
        }
        // Keep the lines that need to be updated
        this._renderedStickyLines = this._renderedStickyLines.slice(0, clearFromLine);
        this._rootDomNode.style.display = 'none';
    }
    _useFoldingOpacityTransition(requireTransitions) {
        this._lineNumbersDomNode.style.setProperty('--vscode-editorStickyScroll-foldingOpacityTransition', `opacity ${requireTransitions ? 0.5 : 0}s`);
    }
    _setFoldingIconsVisibility(allVisible) {
        for (const line of this._renderedStickyLines) {
            const foldingIcon = line.foldingIcon;
            if (!foldingIcon) {
                continue;
            }
            foldingIcon.setVisible(allVisible ? true : foldingIcon.isCollapsed);
        }
    }
    async _renderRootNode(state, foldingModel, rebuildFromLine) {
        this._clearStickyLinesFromLine(rebuildFromLine);
        if (!state) {
            return;
        }
        // For existing sticky lines update the top and z-index
        for (const stickyLine of this._renderedStickyLines) {
            this._updateTopAndZIndexOfStickyLine(stickyLine);
        }
        // For new sticky lines
        const layoutInfo = this._editor.getLayoutInfo();
        const linesToRender = this._lineNumbers.slice(rebuildFromLine);
        for (const [index, line] of linesToRender.entries()) {
            const stickyLine = this._renderChildNode(index + rebuildFromLine, line, foldingModel, layoutInfo);
            if (!stickyLine) {
                continue;
            }
            this._linesDomNode.appendChild(stickyLine.lineDomNode);
            this._lineNumbersDomNode.appendChild(stickyLine.lineNumberDomNode);
            this._renderedStickyLines.push(stickyLine);
        }
        if (foldingModel) {
            this._setFoldingHoverListeners();
            this._useFoldingOpacityTransition(!this._isOnGlyphMargin);
        }
        const widgetHeight = this._lineNumbers.length * this._lineHeight + this._lastLineRelativePosition;
        this._rootDomNode.style.display = 'block';
        this._lineNumbersDomNode.style.height = `${widgetHeight}px`;
        this._linesDomNodeScrollable.style.height = `${widgetHeight}px`;
        this._rootDomNode.style.height = `${widgetHeight}px`;
        this._rootDomNode.style.marginLeft = '0px';
        this._minContentWidthInPx = Math.max(...this._renderedStickyLines.map(l => l.scrollWidth)) + layoutInfo.verticalScrollbarWidth;
        this._editor.layoutOverlayWidget(this);
    }
    _setFoldingHoverListeners() {
        const showFoldingControls = this._editor.getOption(110 /* EditorOption.showFoldingControls */);
        if (showFoldingControls !== 'mouseover') {
            return;
        }
        this._foldingIconStore.add(dom.addDisposableListener(this._lineNumbersDomNode, dom.EventType.MOUSE_ENTER, () => {
            this._isOnGlyphMargin = true;
            this._setFoldingIconsVisibility(true);
        }));
        this._foldingIconStore.add(dom.addDisposableListener(this._lineNumbersDomNode, dom.EventType.MOUSE_LEAVE, () => {
            this._isOnGlyphMargin = false;
            this._useFoldingOpacityTransition(true);
            this._setFoldingIconsVisibility(false);
        }));
    }
    _renderChildNode(index, line, foldingModel, layoutInfo) {
        const viewModel = this._editor._getViewModel();
        if (!viewModel) {
            return;
        }
        const viewLineNumber = viewModel.coordinatesConverter.convertModelPositionToViewPosition(new Position(line, 1)).lineNumber;
        const lineRenderingData = viewModel.getViewLineRenderingData(viewLineNumber);
        const lineNumberOption = this._editor.getOption(68 /* EditorOption.lineNumbers */);
        let actualInlineDecorations;
        try {
            actualInlineDecorations = LineDecoration.filter(lineRenderingData.inlineDecorations, viewLineNumber, lineRenderingData.minColumn, lineRenderingData.maxColumn);
        }
        catch (err) {
            actualInlineDecorations = [];
        }
        const renderLineInput = new RenderLineInput(true, true, lineRenderingData.content, lineRenderingData.continuesWithWrappedLine, lineRenderingData.isBasicASCII, lineRenderingData.containsRTL, 0, lineRenderingData.tokens, actualInlineDecorations, lineRenderingData.tabSize, lineRenderingData.startVisibleColumn, 1, 1, 1, 500, 'none', true, true, null);
        const sb = new StringBuilder(2000);
        const renderOutput = renderViewLine(renderLineInput, sb);
        let newLine;
        if (_ttPolicy) {
            newLine = _ttPolicy.createHTML(sb.build());
        }
        else {
            newLine = sb.build();
        }
        const lineHTMLNode = document.createElement('span');
        lineHTMLNode.setAttribute(STICKY_INDEX_ATTR, String(index));
        lineHTMLNode.setAttribute(STICKY_IS_LINE_ATTR, '');
        lineHTMLNode.setAttribute('role', 'listitem');
        lineHTMLNode.tabIndex = 0;
        lineHTMLNode.className = 'sticky-line-content';
        lineHTMLNode.classList.add(`stickyLine${line}`);
        lineHTMLNode.style.lineHeight = `${this._lineHeight}px`;
        lineHTMLNode.innerHTML = newLine;
        const lineNumberHTMLNode = document.createElement('span');
        lineNumberHTMLNode.setAttribute(STICKY_INDEX_ATTR, String(index));
        lineNumberHTMLNode.setAttribute(STICKY_IS_LINE_NUMBER_ATTR, '');
        lineNumberHTMLNode.className = 'sticky-line-number';
        lineNumberHTMLNode.style.lineHeight = `${this._lineHeight}px`;
        const lineNumbersWidth = layoutInfo.contentLeft;
        lineNumberHTMLNode.style.width = `${lineNumbersWidth}px`;
        const innerLineNumberHTML = document.createElement('span');
        if (lineNumberOption.renderType === 1 /* RenderLineNumbersType.On */ || lineNumberOption.renderType === 3 /* RenderLineNumbersType.Interval */ && line % 10 === 0) {
            innerLineNumberHTML.innerText = line.toString();
        }
        else if (lineNumberOption.renderType === 2 /* RenderLineNumbersType.Relative */) {
            innerLineNumberHTML.innerText = Math.abs(line - this._editor.getPosition().lineNumber).toString();
        }
        innerLineNumberHTML.className = 'sticky-line-number-inner';
        innerLineNumberHTML.style.lineHeight = `${this._lineHeight}px`;
        innerLineNumberHTML.style.width = `${layoutInfo.lineNumbersWidth}px`;
        innerLineNumberHTML.style.paddingLeft = `${layoutInfo.lineNumbersLeft}px`;
        lineNumberHTMLNode.appendChild(innerLineNumberHTML);
        const foldingIcon = this._renderFoldingIconForLine(foldingModel, line);
        if (foldingIcon) {
            lineNumberHTMLNode.appendChild(foldingIcon.domNode);
        }
        this._editor.applyFontInfo(lineHTMLNode);
        this._editor.applyFontInfo(innerLineNumberHTML);
        lineNumberHTMLNode.style.lineHeight = `${this._lineHeight}px`;
        lineHTMLNode.style.lineHeight = `${this._lineHeight}px`;
        lineNumberHTMLNode.style.height = `${this._lineHeight}px`;
        lineHTMLNode.style.height = `${this._lineHeight}px`;
        const renderedLine = new RenderedStickyLine(index, line, lineHTMLNode, lineNumberHTMLNode, foldingIcon, renderOutput.characterMapping, lineHTMLNode.scrollWidth);
        return this._updateTopAndZIndexOfStickyLine(renderedLine);
    }
    _updateTopAndZIndexOfStickyLine(stickyLine) {
        var _a;
        const index = stickyLine.index;
        const lineHTMLNode = stickyLine.lineDomNode;
        const lineNumberHTMLNode = stickyLine.lineNumberDomNode;
        const isLastLine = index === this._lineNumbers.length - 1;
        const lastLineZIndex = '0';
        const intermediateLineZIndex = '1';
        lineHTMLNode.style.zIndex = isLastLine ? lastLineZIndex : intermediateLineZIndex;
        lineNumberHTMLNode.style.zIndex = isLastLine ? lastLineZIndex : intermediateLineZIndex;
        const lastLineTop = `${index * this._lineHeight + this._lastLineRelativePosition + (((_a = stickyLine.foldingIcon) === null || _a === void 0 ? void 0 : _a.isCollapsed) ? 1 : 0)}px`;
        const intermediateLineTop = `${index * this._lineHeight}px`;
        lineHTMLNode.style.top = isLastLine ? lastLineTop : intermediateLineTop;
        lineNumberHTMLNode.style.top = isLastLine ? lastLineTop : intermediateLineTop;
        return stickyLine;
    }
    _renderFoldingIconForLine(foldingModel, line) {
        const showFoldingControls = this._editor.getOption(110 /* EditorOption.showFoldingControls */);
        if (!foldingModel || showFoldingControls === 'never') {
            return;
        }
        const foldingRegions = foldingModel.regions;
        const indexOfFoldingRegion = foldingRegions.findRange(line);
        const startLineNumber = foldingRegions.getStartLineNumber(indexOfFoldingRegion);
        const isFoldingScope = line === startLineNumber;
        if (!isFoldingScope) {
            return;
        }
        const isCollapsed = foldingRegions.isCollapsed(indexOfFoldingRegion);
        const foldingIcon = new StickyFoldingIcon(isCollapsed, startLineNumber, foldingRegions.getEndLineNumber(indexOfFoldingRegion), this._lineHeight);
        foldingIcon.setVisible(this._isOnGlyphMargin ? true : (isCollapsed || showFoldingControls === 'always'));
        foldingIcon.domNode.setAttribute(STICKY_IS_FOLDING_ICON_ATTR, '');
        return foldingIcon;
    }
    getId() {
        return 'editor.contrib.stickyScrollWidget';
    }
    getDomNode() {
        return this._rootDomNode;
    }
    getPosition() {
        return {
            preference: null
        };
    }
    getMinContentWidthInPx() {
        return this._minContentWidthInPx;
    }
    focusLineWithIndex(index) {
        if (0 <= index && index < this._renderedStickyLines.length) {
            this._renderedStickyLines[index].lineDomNode.focus();
        }
    }
    /**
     * Given a leaf dom node, tries to find the editor position.
     */
    getEditorPositionFromNode(spanDomNode) {
        if (!spanDomNode || spanDomNode.children.length > 0) {
            // This is not a leaf node
            return null;
        }
        const renderedStickyLine = this._getRenderedStickyLineFromChildDomNode(spanDomNode);
        if (!renderedStickyLine) {
            return null;
        }
        const column = getColumnOfNodeOffset(renderedStickyLine.characterMapping, spanDomNode, 0);
        return new Position(renderedStickyLine.lineNumber, column);
    }
    getLineNumberFromChildDomNode(domNode) {
        var _a, _b;
        return (_b = (_a = this._getRenderedStickyLineFromChildDomNode(domNode)) === null || _a === void 0 ? void 0 : _a.lineNumber) !== null && _b !== void 0 ? _b : null;
    }
    _getRenderedStickyLineFromChildDomNode(domNode) {
        const index = this.getLineIndexFromChildDomNode(domNode);
        if (index === null || index < 0 || index >= this._renderedStickyLines.length) {
            return null;
        }
        return this._renderedStickyLines[index];
    }
    /**
     * Given a child dom node, tries to find the line number attribute that was stored in the node.
     * @returns the attribute value or null if none is found.
     */
    getLineIndexFromChildDomNode(domNode) {
        const lineIndex = this._getAttributeValue(domNode, STICKY_INDEX_ATTR);
        return lineIndex ? parseInt(lineIndex, 10) : null;
    }
    /**
     * Given a child dom node, tries to find if it is (contained in) a sticky line.
     * @returns a boolean.
     */
    isInStickyLine(domNode) {
        const isInLine = this._getAttributeValue(domNode, STICKY_IS_LINE_ATTR);
        return isInLine !== undefined;
    }
    /**
     * Given a child dom node, tries to find if this dom node is (contained in) a sticky folding icon.
     * @returns a boolean.
     */
    isInFoldingIconDomNode(domNode) {
        const isInFoldingIcon = this._getAttributeValue(domNode, STICKY_IS_FOLDING_ICON_ATTR);
        return isInFoldingIcon !== undefined;
    }
    /**
     * Given the dom node, finds if it or its parent sequence contains the given attribute.
     * @returns the attribute value or undefined.
     */
    _getAttributeValue(domNode, attribute) {
        while (domNode && domNode !== this._rootDomNode) {
            const line = domNode.getAttribute(attribute);
            if (line !== null) {
                return line;
            }
            domNode = domNode.parentElement;
        }
        return;
    }
}
class RenderedStickyLine {
    constructor(index, lineNumber, lineDomNode, lineNumberDomNode, foldingIcon, characterMapping, scrollWidth) {
        this.index = index;
        this.lineNumber = lineNumber;
        this.lineDomNode = lineDomNode;
        this.lineNumberDomNode = lineNumberDomNode;
        this.foldingIcon = foldingIcon;
        this.characterMapping = characterMapping;
        this.scrollWidth = scrollWidth;
    }
}
class StickyFoldingIcon {
    constructor(isCollapsed, foldingStartLine, foldingEndLine, dimension) {
        this.isCollapsed = isCollapsed;
        this.foldingStartLine = foldingStartLine;
        this.foldingEndLine = foldingEndLine;
        this.dimension = dimension;
        this.domNode = document.createElement('div');
        this.domNode.style.width = `${dimension}px`;
        this.domNode.style.height = `${dimension}px`;
        this.domNode.className = ThemeIcon.asClassName(isCollapsed ? foldingCollapsedIcon : foldingExpandedIcon);
    }
    setVisible(visible) {
        this.domNode.style.cursor = visible ? 'pointer' : 'default';
        this.domNode.style.opacity = visible ? '1' : '0';
    }
}
