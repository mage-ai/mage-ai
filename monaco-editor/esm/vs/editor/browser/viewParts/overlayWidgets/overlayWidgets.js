/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './overlayWidgets.css';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { PartFingerprints, ViewPart } from '../../view/viewPart.js';
import * as dom from '../../../../base/browser/dom.js';
export class ViewOverlayWidgets extends ViewPart {
    constructor(context, viewDomNode) {
        super(context);
        this._viewDomNode = viewDomNode;
        const options = this._context.configuration.options;
        const layoutInfo = options.get(145 /* EditorOption.layoutInfo */);
        this._widgets = {};
        this._verticalScrollbarWidth = layoutInfo.verticalScrollbarWidth;
        this._minimapWidth = layoutInfo.minimap.minimapWidth;
        this._horizontalScrollbarHeight = layoutInfo.horizontalScrollbarHeight;
        this._editorHeight = layoutInfo.height;
        this._editorWidth = layoutInfo.width;
        this._viewDomNodeRect = { top: 0, left: 0, width: 0, height: 0 };
        this._domNode = createFastDomNode(document.createElement('div'));
        PartFingerprints.write(this._domNode, 4 /* PartFingerprint.OverlayWidgets */);
        this._domNode.setClassName('overlayWidgets');
        this.overflowingOverlayWidgetsDomNode = createFastDomNode(document.createElement('div'));
        PartFingerprints.write(this.overflowingOverlayWidgetsDomNode, 5 /* PartFingerprint.OverflowingOverlayWidgets */);
        this.overflowingOverlayWidgetsDomNode.setClassName('overflowingOverlayWidgets');
    }
    dispose() {
        super.dispose();
        this._widgets = {};
    }
    getDomNode() {
        return this._domNode;
    }
    // ---- begin view event handlers
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        const layoutInfo = options.get(145 /* EditorOption.layoutInfo */);
        this._verticalScrollbarWidth = layoutInfo.verticalScrollbarWidth;
        this._minimapWidth = layoutInfo.minimap.minimapWidth;
        this._horizontalScrollbarHeight = layoutInfo.horizontalScrollbarHeight;
        this._editorHeight = layoutInfo.height;
        this._editorWidth = layoutInfo.width;
        return true;
    }
    // ---- end view event handlers
    addWidget(widget) {
        const domNode = createFastDomNode(widget.getDomNode());
        this._widgets[widget.getId()] = {
            widget: widget,
            preference: null,
            domNode: domNode
        };
        // This is sync because a widget wants to be in the dom
        domNode.setPosition('absolute');
        domNode.setAttribute('widgetId', widget.getId());
        if (widget.allowEditorOverflow) {
            this.overflowingOverlayWidgetsDomNode.appendChild(domNode);
        }
        else {
            this._domNode.appendChild(domNode);
        }
        this.setShouldRender();
        this._updateMaxMinWidth();
    }
    setWidgetPosition(widget, preference) {
        const widgetData = this._widgets[widget.getId()];
        if (widgetData.preference === preference) {
            this._updateMaxMinWidth();
            return false;
        }
        widgetData.preference = preference;
        this.setShouldRender();
        this._updateMaxMinWidth();
        return true;
    }
    removeWidget(widget) {
        const widgetId = widget.getId();
        if (this._widgets.hasOwnProperty(widgetId)) {
            const widgetData = this._widgets[widgetId];
            const domNode = widgetData.domNode.domNode;
            delete this._widgets[widgetId];
            domNode.remove();
            this.setShouldRender();
            this._updateMaxMinWidth();
        }
    }
    _updateMaxMinWidth() {
        var _a, _b;
        let maxMinWidth = 0;
        const keys = Object.keys(this._widgets);
        for (let i = 0, len = keys.length; i < len; i++) {
            const widgetId = keys[i];
            const widget = this._widgets[widgetId];
            const widgetMinWidthInPx = (_b = (_a = widget.widget).getMinContentWidthInPx) === null || _b === void 0 ? void 0 : _b.call(_a);
            if (typeof widgetMinWidthInPx !== 'undefined') {
                maxMinWidth = Math.max(maxMinWidth, widgetMinWidthInPx);
            }
        }
        this._context.viewLayout.setOverlayWidgetsMinWidth(maxMinWidth);
    }
    _renderWidget(widgetData) {
        const domNode = widgetData.domNode;
        if (widgetData.preference === null) {
            domNode.setTop('');
            return;
        }
        if (widgetData.preference === 0 /* OverlayWidgetPositionPreference.TOP_RIGHT_CORNER */) {
            domNode.setTop(0);
            domNode.setRight((2 * this._verticalScrollbarWidth) + this._minimapWidth);
        }
        else if (widgetData.preference === 1 /* OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER */) {
            const widgetHeight = domNode.domNode.clientHeight;
            domNode.setTop((this._editorHeight - widgetHeight - 2 * this._horizontalScrollbarHeight));
            domNode.setRight((2 * this._verticalScrollbarWidth) + this._minimapWidth);
        }
        else if (widgetData.preference === 2 /* OverlayWidgetPositionPreference.TOP_CENTER */) {
            domNode.setTop(0);
            domNode.domNode.style.right = '50%';
        }
        else {
            const { top, left } = widgetData.preference;
            const fixedOverflowWidgets = this._context.configuration.options.get(42 /* EditorOption.fixedOverflowWidgets */);
            if (fixedOverflowWidgets && widgetData.widget.allowEditorOverflow) {
                // top, left are computed relative to the editor and we need them relative to the page
                const editorBoundingBox = this._viewDomNodeRect;
                domNode.setTop(top + editorBoundingBox.top);
                domNode.setLeft(left + editorBoundingBox.left);
                domNode.setPosition('fixed');
            }
            else {
                domNode.setTop(top);
                domNode.setLeft(left);
                domNode.setPosition('absolute');
            }
        }
    }
    prepareRender(ctx) {
        this._viewDomNodeRect = dom.getDomNodePagePosition(this._viewDomNode.domNode);
    }
    render(ctx) {
        this._domNode.setWidth(this._editorWidth);
        const keys = Object.keys(this._widgets);
        for (let i = 0, len = keys.length; i < len; i++) {
            const widgetId = keys[i];
            this._renderWidget(this._widgets[widgetId]);
        }
    }
}
