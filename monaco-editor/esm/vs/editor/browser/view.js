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
import * as dom from '../../base/browser/dom.js';
import { createFastDomNode } from '../../base/browser/fastDomNode.js';
import { inputLatency } from '../../base/browser/performance.js';
import { BugIndicatingError, onUnexpectedError } from '../../base/common/errors.js';
import { PointerHandlerLastRenderData } from './controller/mouseTarget.js';
import { PointerHandler } from './controller/pointerHandler.js';
import { TextAreaHandler } from './controller/textAreaHandler.js';
import { RenderingContext } from './view/renderingContext.js';
import { ViewController } from './view/viewController.js';
import { ContentViewOverlays, MarginViewOverlays } from './view/viewOverlays.js';
import { PartFingerprints } from './view/viewPart.js';
import { ViewUserInputEvents } from './view/viewUserInputEvents.js';
import { BlockDecorations } from './viewParts/blockDecorations/blockDecorations.js';
import { ViewContentWidgets } from './viewParts/contentWidgets/contentWidgets.js';
import { CurrentLineHighlightOverlay, CurrentLineMarginHighlightOverlay } from './viewParts/currentLineHighlight/currentLineHighlight.js';
import { DecorationsOverlay } from './viewParts/decorations/decorations.js';
import { EditorScrollbar } from './viewParts/editorScrollbar/editorScrollbar.js';
import { GlyphMarginWidgets } from './viewParts/glyphMargin/glyphMargin.js';
import { IndentGuidesOverlay } from './viewParts/indentGuides/indentGuides.js';
import { LineNumbersOverlay } from './viewParts/lineNumbers/lineNumbers.js';
import { ViewLines } from './viewParts/lines/viewLines.js';
import { LinesDecorationsOverlay } from './viewParts/linesDecorations/linesDecorations.js';
import { Margin } from './viewParts/margin/margin.js';
import { MarginViewLineDecorationsOverlay } from './viewParts/marginDecorations/marginDecorations.js';
import { Minimap } from './viewParts/minimap/minimap.js';
import { ViewOverlayWidgets } from './viewParts/overlayWidgets/overlayWidgets.js';
import { DecorationsOverviewRuler } from './viewParts/overviewRuler/decorationsOverviewRuler.js';
import { OverviewRuler } from './viewParts/overviewRuler/overviewRuler.js';
import { Rulers } from './viewParts/rulers/rulers.js';
import { ScrollDecorationViewPart } from './viewParts/scrollDecoration/scrollDecoration.js';
import { SelectionsOverlay } from './viewParts/selections/selections.js';
import { ViewCursors } from './viewParts/viewCursors/viewCursors.js';
import { ViewZones } from './viewParts/viewZones/viewZones.js';
import { WhitespaceOverlay } from './viewParts/whitespace/whitespace.js';
import { Position } from '../common/core/position.js';
import { Range } from '../common/core/range.js';
import { Selection } from '../common/core/selection.js';
import { GlyphMarginLane } from '../common/model.js';
import { ViewEventHandler } from '../common/viewEventHandler.js';
import { ViewportData } from '../common/viewLayout/viewLinesViewportData.js';
import { ViewContext } from '../common/viewModel/viewContext.js';
import { IInstantiationService } from '../../platform/instantiation/common/instantiation.js';
import { getThemeTypeSelector } from '../../platform/theme/common/themeService.js';
let View = class View extends ViewEventHandler {
    constructor(commandDelegate, configuration, colorTheme, model, userInputEvents, overflowWidgetsDomNode, _instantiationService) {
        super();
        this._instantiationService = _instantiationService;
        // Actual mutable state
        this._shouldRecomputeGlyphMarginLanes = false;
        this._selections = [new Selection(1, 1, 1, 1)];
        this._renderAnimationFrame = null;
        const viewController = new ViewController(configuration, model, userInputEvents, commandDelegate);
        // The view context is passed on to most classes (basically to reduce param. counts in ctors)
        this._context = new ViewContext(configuration, colorTheme, model);
        // Ensure the view is the first event handler in order to update the layout
        this._context.addEventHandler(this);
        this._viewParts = [];
        // Keyboard handler
        this._textAreaHandler = this._instantiationService.createInstance(TextAreaHandler, this._context, viewController, this._createTextAreaHandlerHelper());
        this._viewParts.push(this._textAreaHandler);
        // These two dom nodes must be constructed up front, since references are needed in the layout provider (scrolling & co.)
        this._linesContent = createFastDomNode(document.createElement('div'));
        this._linesContent.setClassName('lines-content' + ' monaco-editor-background');
        this._linesContent.setPosition('absolute');
        this.domNode = createFastDomNode(document.createElement('div'));
        this.domNode.setClassName(this._getEditorClassName());
        // Set role 'code' for better screen reader support https://github.com/microsoft/vscode/issues/93438
        this.domNode.setAttribute('role', 'code');
        this._overflowGuardContainer = createFastDomNode(document.createElement('div'));
        PartFingerprints.write(this._overflowGuardContainer, 3 /* PartFingerprint.OverflowGuard */);
        this._overflowGuardContainer.setClassName('overflow-guard');
        this._scrollbar = new EditorScrollbar(this._context, this._linesContent, this.domNode, this._overflowGuardContainer);
        this._viewParts.push(this._scrollbar);
        // View Lines
        this._viewLines = new ViewLines(this._context, this._linesContent);
        // View Zones
        this._viewZones = new ViewZones(this._context);
        this._viewParts.push(this._viewZones);
        // Decorations overview ruler
        const decorationsOverviewRuler = new DecorationsOverviewRuler(this._context);
        this._viewParts.push(decorationsOverviewRuler);
        const scrollDecoration = new ScrollDecorationViewPart(this._context);
        this._viewParts.push(scrollDecoration);
        const contentViewOverlays = new ContentViewOverlays(this._context);
        this._viewParts.push(contentViewOverlays);
        contentViewOverlays.addDynamicOverlay(new CurrentLineHighlightOverlay(this._context));
        contentViewOverlays.addDynamicOverlay(new SelectionsOverlay(this._context));
        contentViewOverlays.addDynamicOverlay(new IndentGuidesOverlay(this._context));
        contentViewOverlays.addDynamicOverlay(new DecorationsOverlay(this._context));
        contentViewOverlays.addDynamicOverlay(new WhitespaceOverlay(this._context));
        const marginViewOverlays = new MarginViewOverlays(this._context);
        this._viewParts.push(marginViewOverlays);
        marginViewOverlays.addDynamicOverlay(new CurrentLineMarginHighlightOverlay(this._context));
        marginViewOverlays.addDynamicOverlay(new MarginViewLineDecorationsOverlay(this._context));
        marginViewOverlays.addDynamicOverlay(new LinesDecorationsOverlay(this._context));
        marginViewOverlays.addDynamicOverlay(new LineNumbersOverlay(this._context));
        // Glyph margin widgets
        this._glyphMarginWidgets = new GlyphMarginWidgets(this._context);
        this._viewParts.push(this._glyphMarginWidgets);
        const margin = new Margin(this._context);
        margin.getDomNode().appendChild(this._viewZones.marginDomNode);
        margin.getDomNode().appendChild(marginViewOverlays.getDomNode());
        margin.getDomNode().appendChild(this._glyphMarginWidgets.domNode);
        this._viewParts.push(margin);
        // Content widgets
        this._contentWidgets = new ViewContentWidgets(this._context, this.domNode);
        this._viewParts.push(this._contentWidgets);
        this._viewCursors = new ViewCursors(this._context);
        this._viewParts.push(this._viewCursors);
        // Overlay widgets
        this._overlayWidgets = new ViewOverlayWidgets(this._context, this.domNode);
        this._viewParts.push(this._overlayWidgets);
        const rulers = new Rulers(this._context);
        this._viewParts.push(rulers);
        const blockOutline = new BlockDecorations(this._context);
        this._viewParts.push(blockOutline);
        const minimap = new Minimap(this._context);
        this._viewParts.push(minimap);
        // -------------- Wire dom nodes up
        if (decorationsOverviewRuler) {
            const overviewRulerData = this._scrollbar.getOverviewRulerLayoutInfo();
            overviewRulerData.parent.insertBefore(decorationsOverviewRuler.getDomNode(), overviewRulerData.insertBefore);
        }
        this._linesContent.appendChild(contentViewOverlays.getDomNode());
        this._linesContent.appendChild(rulers.domNode);
        this._linesContent.appendChild(this._viewZones.domNode);
        this._linesContent.appendChild(this._viewLines.getDomNode());
        this._linesContent.appendChild(this._contentWidgets.domNode);
        this._linesContent.appendChild(this._viewCursors.getDomNode());
        this._overflowGuardContainer.appendChild(margin.getDomNode());
        this._overflowGuardContainer.appendChild(this._scrollbar.getDomNode());
        this._overflowGuardContainer.appendChild(scrollDecoration.getDomNode());
        this._overflowGuardContainer.appendChild(this._textAreaHandler.textArea);
        this._overflowGuardContainer.appendChild(this._textAreaHandler.textAreaCover);
        this._overflowGuardContainer.appendChild(this._overlayWidgets.getDomNode());
        this._overflowGuardContainer.appendChild(minimap.getDomNode());
        this._overflowGuardContainer.appendChild(blockOutline.domNode);
        this.domNode.appendChild(this._overflowGuardContainer);
        if (overflowWidgetsDomNode) {
            overflowWidgetsDomNode.appendChild(this._contentWidgets.overflowingContentWidgetsDomNode.domNode);
            overflowWidgetsDomNode.appendChild(this._overlayWidgets.overflowingOverlayWidgetsDomNode.domNode);
        }
        else {
            this.domNode.appendChild(this._contentWidgets.overflowingContentWidgetsDomNode);
            this.domNode.appendChild(this._overlayWidgets.overflowingOverlayWidgetsDomNode);
        }
        this._applyLayout();
        // Pointer handler
        this._pointerHandler = this._register(new PointerHandler(this._context, viewController, this._createPointerHandlerHelper()));
    }
    _computeGlyphMarginLanes() {
        const model = this._context.viewModel.model;
        const laneModel = this._context.viewModel.glyphLanes;
        let glyphs = [];
        let maxLineNumber = 0;
        // Add all margin decorations
        glyphs = glyphs.concat(model.getAllMarginDecorations().map((decoration) => {
            var _a, _b, _c;
            const lane = (_b = (_a = decoration.options.glyphMargin) === null || _a === void 0 ? void 0 : _a.position) !== null && _b !== void 0 ? _b : GlyphMarginLane.Center;
            maxLineNumber = Math.max(maxLineNumber, decoration.range.endLineNumber);
            return { range: decoration.range, lane, persist: (_c = decoration.options.glyphMargin) === null || _c === void 0 ? void 0 : _c.persistLane };
        }));
        // Add all glyph margin widgets
        glyphs = glyphs.concat(this._glyphMarginWidgets.getWidgets().map((widget) => {
            const range = model.validateRange(widget.preference.range);
            maxLineNumber = Math.max(maxLineNumber, range.endLineNumber);
            return { range, lane: widget.preference.lane };
        }));
        // Sorted by their start position
        glyphs.sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range));
        laneModel.reset(maxLineNumber);
        for (const glyph of glyphs) {
            laneModel.push(glyph.lane, glyph.range, glyph.persist);
        }
        return laneModel;
    }
    _createPointerHandlerHelper() {
        return {
            viewDomNode: this.domNode.domNode,
            linesContentDomNode: this._linesContent.domNode,
            viewLinesDomNode: this._viewLines.getDomNode().domNode,
            focusTextArea: () => {
                this.focus();
            },
            dispatchTextAreaEvent: (event) => {
                this._textAreaHandler.textArea.domNode.dispatchEvent(event);
            },
            getLastRenderData: () => {
                const lastViewCursorsRenderData = this._viewCursors.getLastRenderData() || [];
                const lastTextareaPosition = this._textAreaHandler.getLastRenderData();
                return new PointerHandlerLastRenderData(lastViewCursorsRenderData, lastTextareaPosition);
            },
            renderNow: () => {
                this.render(true, false);
            },
            shouldSuppressMouseDownOnViewZone: (viewZoneId) => {
                return this._viewZones.shouldSuppressMouseDownOnViewZone(viewZoneId);
            },
            shouldSuppressMouseDownOnWidget: (widgetId) => {
                return this._contentWidgets.shouldSuppressMouseDownOnWidget(widgetId);
            },
            getPositionFromDOMInfo: (spanNode, offset) => {
                this._flushAccumulatedAndRenderNow();
                return this._viewLines.getPositionFromDOMInfo(spanNode, offset);
            },
            visibleRangeForPosition: (lineNumber, column) => {
                this._flushAccumulatedAndRenderNow();
                return this._viewLines.visibleRangeForPosition(new Position(lineNumber, column));
            },
            getLineWidth: (lineNumber) => {
                this._flushAccumulatedAndRenderNow();
                return this._viewLines.getLineWidth(lineNumber);
            }
        };
    }
    _createTextAreaHandlerHelper() {
        return {
            visibleRangeForPosition: (position) => {
                this._flushAccumulatedAndRenderNow();
                return this._viewLines.visibleRangeForPosition(position);
            }
        };
    }
    _applyLayout() {
        const options = this._context.configuration.options;
        const layoutInfo = options.get(145 /* EditorOption.layoutInfo */);
        this.domNode.setWidth(layoutInfo.width);
        this.domNode.setHeight(layoutInfo.height);
        this._overflowGuardContainer.setWidth(layoutInfo.width);
        this._overflowGuardContainer.setHeight(layoutInfo.height);
        // https://stackoverflow.com/questions/38905916/content-in-google-chrome-larger-than-16777216-px-not-being-rendered
        this._linesContent.setWidth(16777216);
        this._linesContent.setHeight(16777216);
    }
    _getEditorClassName() {
        const focused = this._textAreaHandler.isFocused() ? ' focused' : '';
        return this._context.configuration.options.get(142 /* EditorOption.editorClassName */) + ' ' + getThemeTypeSelector(this._context.theme.type) + focused;
    }
    // --- begin event handlers
    handleEvents(events) {
        super.handleEvents(events);
        this._scheduleRender();
    }
    onConfigurationChanged(e) {
        this.domNode.setClassName(this._getEditorClassName());
        this._applyLayout();
        return false;
    }
    onCursorStateChanged(e) {
        this._selections = e.selections;
        return false;
    }
    onDecorationsChanged(e) {
        if (e.affectsGlyphMargin) {
            this._shouldRecomputeGlyphMarginLanes = true;
        }
        return false;
    }
    onFocusChanged(e) {
        this.domNode.setClassName(this._getEditorClassName());
        return false;
    }
    onThemeChanged(e) {
        this._context.theme.update(e.theme);
        this.domNode.setClassName(this._getEditorClassName());
        return false;
    }
    // --- end event handlers
    dispose() {
        if (this._renderAnimationFrame !== null) {
            this._renderAnimationFrame.dispose();
            this._renderAnimationFrame = null;
        }
        this._contentWidgets.overflowingContentWidgetsDomNode.domNode.remove();
        this._context.removeEventHandler(this);
        this._viewLines.dispose();
        // Destroy view parts
        for (const viewPart of this._viewParts) {
            viewPart.dispose();
        }
        super.dispose();
    }
    _scheduleRender() {
        if (this._store.isDisposed) {
            throw new BugIndicatingError();
        }
        if (this._renderAnimationFrame === null) {
            const rendering = this._createCoordinatedRendering();
            this._renderAnimationFrame = EditorRenderingCoordinator.INSTANCE.scheduleCoordinatedRendering({
                window: dom.getWindow(this.domNode.domNode),
                prepareRenderText: () => {
                    if (this._store.isDisposed) {
                        throw new BugIndicatingError();
                    }
                    try {
                        return rendering.prepareRenderText();
                    }
                    finally {
                        this._renderAnimationFrame = null;
                    }
                },
                renderText: () => {
                    if (this._store.isDisposed) {
                        throw new BugIndicatingError();
                    }
                    return rendering.renderText();
                },
                prepareRender: (viewParts, ctx) => {
                    if (this._store.isDisposed) {
                        throw new BugIndicatingError();
                    }
                    return rendering.prepareRender(viewParts, ctx);
                },
                render: (viewParts, ctx) => {
                    if (this._store.isDisposed) {
                        throw new BugIndicatingError();
                    }
                    return rendering.render(viewParts, ctx);
                }
            });
        }
    }
    _flushAccumulatedAndRenderNow() {
        const rendering = this._createCoordinatedRendering();
        safeInvokeNoArg(() => rendering.prepareRenderText());
        const data = safeInvokeNoArg(() => rendering.renderText());
        if (data) {
            const [viewParts, ctx] = data;
            safeInvokeNoArg(() => rendering.prepareRender(viewParts, ctx));
            safeInvokeNoArg(() => rendering.render(viewParts, ctx));
        }
    }
    _getViewPartsToRender() {
        const result = [];
        let resultLen = 0;
        for (const viewPart of this._viewParts) {
            if (viewPart.shouldRender()) {
                result[resultLen++] = viewPart;
            }
        }
        return result;
    }
    _createCoordinatedRendering() {
        return {
            prepareRenderText: () => {
                if (this._shouldRecomputeGlyphMarginLanes) {
                    this._shouldRecomputeGlyphMarginLanes = false;
                    const model = this._computeGlyphMarginLanes();
                    this._context.configuration.setGlyphMarginDecorationLaneCount(model.requiredLanes);
                }
                inputLatency.onRenderStart();
            },
            renderText: () => {
                if (!this.domNode.domNode.isConnected) {
                    return null;
                }
                let viewPartsToRender = this._getViewPartsToRender();
                if (!this._viewLines.shouldRender() && viewPartsToRender.length === 0) {
                    // Nothing to render
                    return null;
                }
                const partialViewportData = this._context.viewLayout.getLinesViewportData();
                this._context.viewModel.setViewport(partialViewportData.startLineNumber, partialViewportData.endLineNumber, partialViewportData.centeredLineNumber);
                const viewportData = new ViewportData(this._selections, partialViewportData, this._context.viewLayout.getWhitespaceViewportData(), this._context.viewModel);
                if (this._contentWidgets.shouldRender()) {
                    // Give the content widgets a chance to set their max width before a possible synchronous layout
                    this._contentWidgets.onBeforeRender(viewportData);
                }
                if (this._viewLines.shouldRender()) {
                    this._viewLines.renderText(viewportData);
                    this._viewLines.onDidRender();
                    // Rendering of viewLines might cause scroll events to occur, so collect view parts to render again
                    viewPartsToRender = this._getViewPartsToRender();
                }
                return [viewPartsToRender, new RenderingContext(this._context.viewLayout, viewportData, this._viewLines)];
            },
            prepareRender: (viewPartsToRender, ctx) => {
                for (const viewPart of viewPartsToRender) {
                    viewPart.prepareRender(ctx);
                }
            },
            render: (viewPartsToRender, ctx) => {
                for (const viewPart of viewPartsToRender) {
                    viewPart.render(ctx);
                    viewPart.onDidRender();
                }
            }
        };
    }
    // --- BEGIN CodeEditor helpers
    delegateVerticalScrollbarPointerDown(browserEvent) {
        this._scrollbar.delegateVerticalScrollbarPointerDown(browserEvent);
    }
    delegateScrollFromMouseWheelEvent(browserEvent) {
        this._scrollbar.delegateScrollFromMouseWheelEvent(browserEvent);
    }
    restoreState(scrollPosition) {
        this._context.viewModel.viewLayout.setScrollPosition({
            scrollTop: scrollPosition.scrollTop,
            scrollLeft: scrollPosition.scrollLeft
        }, 1 /* ScrollType.Immediate */);
        this._context.viewModel.visibleLinesStabilized();
    }
    getOffsetForColumn(modelLineNumber, modelColumn) {
        const modelPosition = this._context.viewModel.model.validatePosition({
            lineNumber: modelLineNumber,
            column: modelColumn
        });
        const viewPosition = this._context.viewModel.coordinatesConverter.convertModelPositionToViewPosition(modelPosition);
        this._flushAccumulatedAndRenderNow();
        const visibleRange = this._viewLines.visibleRangeForPosition(new Position(viewPosition.lineNumber, viewPosition.column));
        if (!visibleRange) {
            return -1;
        }
        return visibleRange.left;
    }
    getTargetAtClientPoint(clientX, clientY) {
        const mouseTarget = this._pointerHandler.getTargetAtClientPoint(clientX, clientY);
        if (!mouseTarget) {
            return null;
        }
        return ViewUserInputEvents.convertViewToModelMouseTarget(mouseTarget, this._context.viewModel.coordinatesConverter);
    }
    createOverviewRuler(cssClassName) {
        return new OverviewRuler(this._context, cssClassName);
    }
    change(callback) {
        this._viewZones.changeViewZones(callback);
        this._scheduleRender();
    }
    render(now, everything) {
        if (everything) {
            // Force everything to render...
            this._viewLines.forceShouldRender();
            for (const viewPart of this._viewParts) {
                viewPart.forceShouldRender();
            }
        }
        if (now) {
            this._flushAccumulatedAndRenderNow();
        }
        else {
            this._scheduleRender();
        }
    }
    writeScreenReaderContent(reason) {
        this._textAreaHandler.writeScreenReaderContent(reason);
    }
    focus() {
        this._textAreaHandler.focusTextArea();
    }
    isFocused() {
        return this._textAreaHandler.isFocused();
    }
    setAriaOptions(options) {
        this._textAreaHandler.setAriaOptions(options);
    }
    addContentWidget(widgetData) {
        this._contentWidgets.addWidget(widgetData.widget);
        this.layoutContentWidget(widgetData);
        this._scheduleRender();
    }
    layoutContentWidget(widgetData) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        this._contentWidgets.setWidgetPosition(widgetData.widget, (_b = (_a = widgetData.position) === null || _a === void 0 ? void 0 : _a.position) !== null && _b !== void 0 ? _b : null, (_d = (_c = widgetData.position) === null || _c === void 0 ? void 0 : _c.secondaryPosition) !== null && _d !== void 0 ? _d : null, (_f = (_e = widgetData.position) === null || _e === void 0 ? void 0 : _e.preference) !== null && _f !== void 0 ? _f : null, (_h = (_g = widgetData.position) === null || _g === void 0 ? void 0 : _g.positionAffinity) !== null && _h !== void 0 ? _h : null);
        this._scheduleRender();
    }
    removeContentWidget(widgetData) {
        this._contentWidgets.removeWidget(widgetData.widget);
        this._scheduleRender();
    }
    addOverlayWidget(widgetData) {
        this._overlayWidgets.addWidget(widgetData.widget);
        this.layoutOverlayWidget(widgetData);
        this._scheduleRender();
    }
    layoutOverlayWidget(widgetData) {
        const newPreference = widgetData.position ? widgetData.position.preference : null;
        const shouldRender = this._overlayWidgets.setWidgetPosition(widgetData.widget, newPreference);
        if (shouldRender) {
            this._scheduleRender();
        }
    }
    removeOverlayWidget(widgetData) {
        this._overlayWidgets.removeWidget(widgetData.widget);
        this._scheduleRender();
    }
    addGlyphMarginWidget(widgetData) {
        this._glyphMarginWidgets.addWidget(widgetData.widget);
        this._shouldRecomputeGlyphMarginLanes = true;
        this._scheduleRender();
    }
    layoutGlyphMarginWidget(widgetData) {
        const newPreference = widgetData.position;
        const shouldRender = this._glyphMarginWidgets.setWidgetPosition(widgetData.widget, newPreference);
        if (shouldRender) {
            this._shouldRecomputeGlyphMarginLanes = true;
            this._scheduleRender();
        }
    }
    removeGlyphMarginWidget(widgetData) {
        this._glyphMarginWidgets.removeWidget(widgetData.widget);
        this._shouldRecomputeGlyphMarginLanes = true;
        this._scheduleRender();
    }
};
View = __decorate([
    __param(6, IInstantiationService)
], View);
export { View };
function safeInvokeNoArg(func) {
    try {
        return func();
    }
    catch (e) {
        onUnexpectedError(e);
        return null;
    }
}
class EditorRenderingCoordinator {
    constructor() {
        this._coordinatedRenderings = [];
        this._animationFrameRunners = new Map();
    }
    scheduleCoordinatedRendering(rendering) {
        this._coordinatedRenderings.push(rendering);
        this._scheduleRender(rendering.window);
        return {
            dispose: () => {
                const renderingIndex = this._coordinatedRenderings.indexOf(rendering);
                if (renderingIndex === -1) {
                    return;
                }
                this._coordinatedRenderings.splice(renderingIndex, 1);
                if (this._coordinatedRenderings.length === 0) {
                    // There are no more renderings to coordinate => cancel animation frames
                    for (const [_, disposable] of this._animationFrameRunners) {
                        disposable.dispose();
                    }
                    this._animationFrameRunners.clear();
                }
            }
        };
    }
    _scheduleRender(window) {
        if (!this._animationFrameRunners.has(window)) {
            const runner = () => {
                this._animationFrameRunners.delete(window);
                this._onRenderScheduled();
            };
            this._animationFrameRunners.set(window, dom.runAtThisOrScheduleAtNextAnimationFrame(window, runner, 100));
        }
    }
    _onRenderScheduled() {
        const coordinatedRenderings = this._coordinatedRenderings.slice(0);
        this._coordinatedRenderings = [];
        for (const rendering of coordinatedRenderings) {
            safeInvokeNoArg(() => rendering.prepareRenderText());
        }
        const datas = [];
        for (let i = 0, len = coordinatedRenderings.length; i < len; i++) {
            const rendering = coordinatedRenderings[i];
            datas[i] = safeInvokeNoArg(() => rendering.renderText());
        }
        for (let i = 0, len = coordinatedRenderings.length; i < len; i++) {
            const rendering = coordinatedRenderings[i];
            const data = datas[i];
            if (!data) {
                continue;
            }
            const [viewParts, ctx] = data;
            safeInvokeNoArg(() => rendering.prepareRender(viewParts, ctx));
        }
        for (let i = 0, len = coordinatedRenderings.length; i < len; i++) {
            const rendering = coordinatedRenderings[i];
            const data = datas[i];
            if (!data) {
                continue;
            }
            const [viewParts, ctx] = data;
            safeInvokeNoArg(() => rendering.render(viewParts, ctx));
        }
    }
}
EditorRenderingCoordinator.INSTANCE = new EditorRenderingCoordinator();
