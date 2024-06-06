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
var HoverController_1;
import { DECREASE_HOVER_VERBOSITY_ACTION_ID, INCREASE_HOVER_VERBOSITY_ACTION_ID, SHOW_OR_FOCUS_HOVER_ACTION_ID } from './hoverActionIds.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { InlineSuggestionHintsContentWidget } from '../../inlineCompletions/browser/inlineCompletionsHintsWidget.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { ContentHoverWidget } from './contentHoverWidget.js';
import { ContentHoverController } from './contentHoverController.js';
import './hover.css';
import { MarginHoverWidget } from './marginHoverWidget.js';
// sticky hover widget which doesn't disappear on focus out and such
const _sticky = false;
let HoverController = HoverController_1 = class HoverController extends Disposable {
    constructor(_editor, _instantiationService, _keybindingService) {
        super();
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._keybindingService = _keybindingService;
        this._listenersStore = new DisposableStore();
        this._hoverState = {
            mouseDown: false,
            activatedByDecoratorClick: false
        };
        this._reactToEditorMouseMoveRunner = this._register(new RunOnceScheduler(() => this._reactToEditorMouseMove(this._mouseMoveEvent), 0));
        this._hookListeners();
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(60 /* EditorOption.hover */)) {
                this._unhookListeners();
                this._hookListeners();
            }
        }));
    }
    static get(editor) {
        return editor.getContribution(HoverController_1.ID);
    }
    _hookListeners() {
        const hoverOpts = this._editor.getOption(60 /* EditorOption.hover */);
        this._hoverSettings = {
            enabled: hoverOpts.enabled,
            sticky: hoverOpts.sticky,
            hidingDelay: hoverOpts.delay
        };
        if (hoverOpts.enabled) {
            this._listenersStore.add(this._editor.onMouseDown((e) => this._onEditorMouseDown(e)));
            this._listenersStore.add(this._editor.onMouseUp(() => this._onEditorMouseUp()));
            this._listenersStore.add(this._editor.onMouseMove((e) => this._onEditorMouseMove(e)));
            this._listenersStore.add(this._editor.onKeyDown((e) => this._onKeyDown(e)));
        }
        else {
            this._listenersStore.add(this._editor.onMouseMove((e) => this._onEditorMouseMove(e)));
            this._listenersStore.add(this._editor.onKeyDown((e) => this._onKeyDown(e)));
        }
        this._listenersStore.add(this._editor.onMouseLeave((e) => this._onEditorMouseLeave(e)));
        this._listenersStore.add(this._editor.onDidChangeModel(() => {
            this._cancelScheduler();
            this._hideWidgets();
        }));
        this._listenersStore.add(this._editor.onDidChangeModelContent(() => this._cancelScheduler()));
        this._listenersStore.add(this._editor.onDidScrollChange((e) => this._onEditorScrollChanged(e)));
    }
    _unhookListeners() {
        this._listenersStore.clear();
    }
    _cancelScheduler() {
        this._mouseMoveEvent = undefined;
        this._reactToEditorMouseMoveRunner.cancel();
    }
    _onEditorScrollChanged(e) {
        if (e.scrollTopChanged || e.scrollLeftChanged) {
            this._hideWidgets();
        }
    }
    _onEditorMouseDown(mouseEvent) {
        this._hoverState.mouseDown = true;
        const shouldNotHideCurrentHoverWidget = this._shouldNotHideCurrentHoverWidget(mouseEvent);
        if (shouldNotHideCurrentHoverWidget) {
            return;
        }
        this._hideWidgets();
    }
    _shouldNotHideCurrentHoverWidget(mouseEvent) {
        if (this._isMouseOnContentHoverWidget(mouseEvent)
            || this._isMouseOnMarginHoverWidget(mouseEvent)
            || this._isContentWidgetResizing()) {
            return true;
        }
        return false;
    }
    _isMouseOnMarginHoverWidget(mouseEvent) {
        const target = mouseEvent.target;
        if (!target) {
            return false;
        }
        return target.type === 12 /* MouseTargetType.OVERLAY_WIDGET */ && target.detail === MarginHoverWidget.ID;
    }
    _isMouseOnContentHoverWidget(mouseEvent) {
        const target = mouseEvent.target;
        if (!target) {
            return false;
        }
        return target.type === 9 /* MouseTargetType.CONTENT_WIDGET */ && target.detail === ContentHoverWidget.ID;
    }
    _onEditorMouseUp() {
        this._hoverState.mouseDown = false;
    }
    _onEditorMouseLeave(mouseEvent) {
        this._cancelScheduler();
        const shouldNotHideCurrentHoverWidget = this._shouldNotHideCurrentHoverWidget(mouseEvent);
        if (shouldNotHideCurrentHoverWidget) {
            return;
        }
        if (_sticky) {
            return;
        }
        this._hideWidgets();
    }
    _shouldNotRecomputeCurrentHoverWidget(mouseEvent) {
        const isHoverSticky = this._hoverSettings.sticky;
        const isMouseOnStickyMarginHoverWidget = (mouseEvent, isHoverSticky) => {
            const isMouseOnMarginHoverWidget = this._isMouseOnMarginHoverWidget(mouseEvent);
            return isHoverSticky && isMouseOnMarginHoverWidget;
        };
        const isMouseOnStickyContentHoverWidget = (mouseEvent, isHoverSticky) => {
            const isMouseOnContentHoverWidget = this._isMouseOnContentHoverWidget(mouseEvent);
            return isHoverSticky && isMouseOnContentHoverWidget;
        };
        const isMouseOnColorPicker = (mouseEvent) => {
            var _a;
            const isMouseOnContentHoverWidget = this._isMouseOnContentHoverWidget(mouseEvent);
            const isColorPickerVisible = (_a = this._contentWidget) === null || _a === void 0 ? void 0 : _a.isColorPickerVisible;
            return isMouseOnContentHoverWidget && isColorPickerVisible;
        };
        // TODO@aiday-mar verify if the following is necessary code
        const isTextSelectedWithinContentHoverWidget = (mouseEvent, sticky) => {
            var _a, _b, _c, _d;
            return sticky
                && ((_a = this._contentWidget) === null || _a === void 0 ? void 0 : _a.containsNode((_b = mouseEvent.event.browserEvent.view) === null || _b === void 0 ? void 0 : _b.document.activeElement))
                && !((_d = (_c = mouseEvent.event.browserEvent.view) === null || _c === void 0 ? void 0 : _c.getSelection()) === null || _d === void 0 ? void 0 : _d.isCollapsed);
        };
        if (isMouseOnStickyMarginHoverWidget(mouseEvent, isHoverSticky)
            || isMouseOnStickyContentHoverWidget(mouseEvent, isHoverSticky)
            || isMouseOnColorPicker(mouseEvent)
            || isTextSelectedWithinContentHoverWidget(mouseEvent, isHoverSticky)) {
            return true;
        }
        return false;
    }
    _onEditorMouseMove(mouseEvent) {
        var _a, _b, _c, _d;
        this._mouseMoveEvent = mouseEvent;
        if (((_a = this._contentWidget) === null || _a === void 0 ? void 0 : _a.isFocused) || ((_b = this._contentWidget) === null || _b === void 0 ? void 0 : _b.isResizing)) {
            return;
        }
        const sticky = this._hoverSettings.sticky;
        if (sticky && ((_c = this._contentWidget) === null || _c === void 0 ? void 0 : _c.isVisibleFromKeyboard)) {
            // Sticky mode is on and the hover has been shown via keyboard
            // so moving the mouse has no effect
            return;
        }
        const shouldNotRecomputeCurrentHoverWidget = this._shouldNotRecomputeCurrentHoverWidget(mouseEvent);
        if (shouldNotRecomputeCurrentHoverWidget) {
            this._reactToEditorMouseMoveRunner.cancel();
            return;
        }
        const hidingDelay = this._hoverSettings.hidingDelay;
        const isContentHoverWidgetVisible = (_d = this._contentWidget) === null || _d === void 0 ? void 0 : _d.isVisible;
        // If the mouse is not over the widget, and if sticky is on,
        // then give it a grace period before reacting to the mouse event
        const shouldRescheduleHoverComputation = isContentHoverWidgetVisible && sticky && hidingDelay > 0;
        if (shouldRescheduleHoverComputation) {
            if (!this._reactToEditorMouseMoveRunner.isScheduled()) {
                this._reactToEditorMouseMoveRunner.schedule(hidingDelay);
            }
            return;
        }
        this._reactToEditorMouseMove(mouseEvent);
    }
    _reactToEditorMouseMove(mouseEvent) {
        var _a;
        if (!mouseEvent) {
            return;
        }
        const target = mouseEvent.target;
        const mouseOnDecorator = (_a = target.element) === null || _a === void 0 ? void 0 : _a.classList.contains('colorpicker-color-decoration');
        const decoratorActivatedOn = this._editor.getOption(148 /* EditorOption.colorDecoratorsActivatedOn */);
        const enabled = this._hoverSettings.enabled;
        const activatedByDecoratorClick = this._hoverState.activatedByDecoratorClick;
        if ((mouseOnDecorator && ((decoratorActivatedOn === 'click' && !activatedByDecoratorClick) ||
            (decoratorActivatedOn === 'hover' && !enabled && !_sticky) ||
            (decoratorActivatedOn === 'clickAndHover' && !enabled && !activatedByDecoratorClick))) || (!mouseOnDecorator && !enabled && !activatedByDecoratorClick)) {
            this._hideWidgets();
            return;
        }
        const contentHoverShowsOrWillShow = this._tryShowHoverWidget(mouseEvent, 0 /* HoverWidgetType.Content */);
        if (contentHoverShowsOrWillShow) {
            return;
        }
        const glyphWidgetShowsOrWillShow = this._tryShowHoverWidget(mouseEvent, 1 /* HoverWidgetType.Glyph */);
        if (glyphWidgetShowsOrWillShow) {
            return;
        }
        if (_sticky) {
            return;
        }
        this._hideWidgets();
    }
    _tryShowHoverWidget(mouseEvent, hoverWidgetType) {
        const contentWidget = this._getOrCreateContentWidget();
        const glyphWidget = this._getOrCreateGlyphWidget();
        let currentWidget;
        let otherWidget;
        switch (hoverWidgetType) {
            case 0 /* HoverWidgetType.Content */:
                currentWidget = contentWidget;
                otherWidget = glyphWidget;
                break;
            case 1 /* HoverWidgetType.Glyph */:
                currentWidget = glyphWidget;
                otherWidget = contentWidget;
                break;
            default:
                throw new Error(`HoverWidgetType ${hoverWidgetType} is unrecognized`);
        }
        const showsOrWillShow = currentWidget.showsOrWillShow(mouseEvent);
        if (showsOrWillShow) {
            otherWidget.hide();
        }
        return showsOrWillShow;
    }
    _onKeyDown(e) {
        var _a;
        if (!this._editor.hasModel()) {
            return;
        }
        const resolvedKeyboardEvent = this._keybindingService.softDispatch(e, this._editor.getDomNode());
        // If the beginning of a multi-chord keybinding is pressed,
        // or the command aims to focus the hover,
        // set the variable to true, otherwise false
        const shouldKeepHoverVisible = (resolvedKeyboardEvent.kind === 1 /* ResultKind.MoreChordsNeeded */ ||
            (resolvedKeyboardEvent.kind === 2 /* ResultKind.KbFound */
                && (resolvedKeyboardEvent.commandId === SHOW_OR_FOCUS_HOVER_ACTION_ID
                    || resolvedKeyboardEvent.commandId === INCREASE_HOVER_VERBOSITY_ACTION_ID
                    || resolvedKeyboardEvent.commandId === DECREASE_HOVER_VERBOSITY_ACTION_ID)
                && ((_a = this._contentWidget) === null || _a === void 0 ? void 0 : _a.isVisible)));
        if (e.keyCode === 5 /* KeyCode.Ctrl */
            || e.keyCode === 6 /* KeyCode.Alt */
            || e.keyCode === 57 /* KeyCode.Meta */
            || e.keyCode === 4 /* KeyCode.Shift */
            || shouldKeepHoverVisible) {
            // Do not hide hover when a modifier key is pressed
            return;
        }
        this._hideWidgets();
    }
    _hideWidgets() {
        var _a, _b, _c;
        if (_sticky) {
            return;
        }
        if ((this._hoverState.mouseDown
            && ((_a = this._contentWidget) === null || _a === void 0 ? void 0 : _a.isColorPickerVisible)) || InlineSuggestionHintsContentWidget.dropDownVisible) {
            return;
        }
        this._hoverState.activatedByDecoratorClick = false;
        (_b = this._glyphWidget) === null || _b === void 0 ? void 0 : _b.hide();
        (_c = this._contentWidget) === null || _c === void 0 ? void 0 : _c.hide();
    }
    _getOrCreateContentWidget() {
        if (!this._contentWidget) {
            this._contentWidget = this._instantiationService.createInstance(ContentHoverController, this._editor);
        }
        return this._contentWidget;
    }
    _getOrCreateGlyphWidget() {
        if (!this._glyphWidget) {
            this._glyphWidget = this._instantiationService.createInstance(MarginHoverWidget, this._editor);
        }
        return this._glyphWidget;
    }
    showContentHover(range, mode, source, focus, activatedByColorDecoratorClick = false) {
        this._hoverState.activatedByDecoratorClick = activatedByColorDecoratorClick;
        this._getOrCreateContentWidget().startShowingAtRange(range, mode, source, focus);
    }
    _isContentWidgetResizing() {
        var _a;
        return ((_a = this._contentWidget) === null || _a === void 0 ? void 0 : _a.widget.isResizing) || false;
    }
    updateFocusedMarkdownHoverVerbosityLevel(action) {
        this._getOrCreateContentWidget().updateFocusedMarkdownHoverVerbosityLevel(action);
    }
    focus() {
        var _a;
        (_a = this._contentWidget) === null || _a === void 0 ? void 0 : _a.focus();
    }
    scrollUp() {
        var _a;
        (_a = this._contentWidget) === null || _a === void 0 ? void 0 : _a.scrollUp();
    }
    scrollDown() {
        var _a;
        (_a = this._contentWidget) === null || _a === void 0 ? void 0 : _a.scrollDown();
    }
    scrollLeft() {
        var _a;
        (_a = this._contentWidget) === null || _a === void 0 ? void 0 : _a.scrollLeft();
    }
    scrollRight() {
        var _a;
        (_a = this._contentWidget) === null || _a === void 0 ? void 0 : _a.scrollRight();
    }
    pageUp() {
        var _a;
        (_a = this._contentWidget) === null || _a === void 0 ? void 0 : _a.pageUp();
    }
    pageDown() {
        var _a;
        (_a = this._contentWidget) === null || _a === void 0 ? void 0 : _a.pageDown();
    }
    goToTop() {
        var _a;
        (_a = this._contentWidget) === null || _a === void 0 ? void 0 : _a.goToTop();
    }
    goToBottom() {
        var _a;
        (_a = this._contentWidget) === null || _a === void 0 ? void 0 : _a.goToBottom();
    }
    get isColorPickerVisible() {
        var _a;
        return (_a = this._contentWidget) === null || _a === void 0 ? void 0 : _a.isColorPickerVisible;
    }
    get isHoverVisible() {
        var _a;
        return (_a = this._contentWidget) === null || _a === void 0 ? void 0 : _a.isVisible;
    }
    dispose() {
        var _a, _b;
        super.dispose();
        this._unhookListeners();
        this._listenersStore.dispose();
        (_a = this._glyphWidget) === null || _a === void 0 ? void 0 : _a.dispose();
        (_b = this._contentWidget) === null || _b === void 0 ? void 0 : _b.dispose();
    }
};
HoverController.ID = 'editor.contrib.hover';
HoverController = HoverController_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IKeybindingService)
], HoverController);
export { HoverController };
