/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { MarkdownRenderer } from '../../../browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { HoverOperation } from './hoverOperation.js';
import { HoverWidget } from '../../../../base/browser/ui/hover/hoverWidget.js';
import { MarginHoverComputer } from './marginHoverComputer.js';
const $ = dom.$;
export class MarginHoverWidget extends Disposable {
    constructor(editor, languageService, openerService) {
        super();
        this._renderDisposeables = this._register(new DisposableStore());
        this._editor = editor;
        this._isVisible = false;
        this._messages = [];
        this._hover = this._register(new HoverWidget());
        this._hover.containerDomNode.classList.toggle('hidden', !this._isVisible);
        this._markdownRenderer = this._register(new MarkdownRenderer({ editor: this._editor }, languageService, openerService));
        this._computer = new MarginHoverComputer(this._editor);
        this._hoverOperation = this._register(new HoverOperation(this._editor, this._computer));
        this._register(this._hoverOperation.onResult((result) => {
            this._withResult(result.value);
        }));
        this._register(this._editor.onDidChangeModelDecorations(() => this._onModelDecorationsChanged()));
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(50 /* EditorOption.fontInfo */)) {
                this._updateFont();
            }
        }));
        this._editor.addOverlayWidget(this);
    }
    dispose() {
        this._editor.removeOverlayWidget(this);
        super.dispose();
    }
    getId() {
        return MarginHoverWidget.ID;
    }
    getDomNode() {
        return this._hover.containerDomNode;
    }
    getPosition() {
        return null;
    }
    _updateFont() {
        const codeClasses = Array.prototype.slice.call(this._hover.contentsDomNode.getElementsByClassName('code'));
        codeClasses.forEach(node => this._editor.applyFontInfo(node));
    }
    _onModelDecorationsChanged() {
        if (this._isVisible) {
            // The decorations have changed and the hover is visible,
            // we need to recompute the displayed text
            this._hoverOperation.cancel();
            this._hoverOperation.start(0 /* HoverStartMode.Delayed */);
        }
    }
    showsOrWillShow(mouseEvent) {
        const target = mouseEvent.target;
        if (target.type === 2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */ && target.detail.glyphMarginLane) {
            this._startShowingAt(target.position.lineNumber, target.detail.glyphMarginLane);
            return true;
        }
        if (target.type === 3 /* MouseTargetType.GUTTER_LINE_NUMBERS */) {
            this._startShowingAt(target.position.lineNumber, 'lineNo');
            return true;
        }
        return false;
    }
    _startShowingAt(lineNumber, laneOrLine) {
        if (this._computer.lineNumber === lineNumber && this._computer.lane === laneOrLine) {
            // We have to show the widget at the exact same line number as before, so no work is needed
            return;
        }
        this._hoverOperation.cancel();
        this.hide();
        this._computer.lineNumber = lineNumber;
        this._computer.lane = laneOrLine;
        this._hoverOperation.start(0 /* HoverStartMode.Delayed */);
    }
    hide() {
        this._computer.lineNumber = -1;
        this._hoverOperation.cancel();
        if (!this._isVisible) {
            return;
        }
        this._isVisible = false;
        this._hover.containerDomNode.classList.toggle('hidden', !this._isVisible);
    }
    _withResult(result) {
        this._messages = result;
        if (this._messages.length > 0) {
            this._renderMessages(this._computer.lineNumber, this._messages);
        }
        else {
            this.hide();
        }
    }
    _renderMessages(lineNumber, messages) {
        this._renderDisposeables.clear();
        const fragment = document.createDocumentFragment();
        for (const msg of messages) {
            const markdownHoverElement = $('div.hover-row.markdown-hover');
            const hoverContentsElement = dom.append(markdownHoverElement, $('div.hover-contents'));
            const renderedContents = this._renderDisposeables.add(this._markdownRenderer.render(msg.value));
            hoverContentsElement.appendChild(renderedContents.element);
            fragment.appendChild(markdownHoverElement);
        }
        this._updateContents(fragment);
        this._showAt(lineNumber);
    }
    _updateContents(node) {
        this._hover.contentsDomNode.textContent = '';
        this._hover.contentsDomNode.appendChild(node);
        this._updateFont();
    }
    _showAt(lineNumber) {
        if (!this._isVisible) {
            this._isVisible = true;
            this._hover.containerDomNode.classList.toggle('hidden', !this._isVisible);
        }
        const editorLayout = this._editor.getLayoutInfo();
        const topForLineNumber = this._editor.getTopForLineNumber(lineNumber);
        const editorScrollTop = this._editor.getScrollTop();
        const lineHeight = this._editor.getOption(67 /* EditorOption.lineHeight */);
        const nodeHeight = this._hover.containerDomNode.clientHeight;
        const top = topForLineNumber - editorScrollTop - ((nodeHeight - lineHeight) / 2);
        const left = editorLayout.glyphMarginLeft + editorLayout.glyphMarginWidth + (this._computer.lane === 'lineNo' ? editorLayout.lineNumbersWidth : 0);
        this._hover.containerDomNode.style.left = `${left}px`;
        this._hover.containerDomNode.style.top = `${Math.max(Math.round(top), 0)}px`;
    }
}
MarginHoverWidget.ID = 'editor.contrib.modesGlyphHoverWidget';
