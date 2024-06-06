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
var ContentHoverController_1;
import * as dom from '../../../../base/browser/dom.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { TokenizationRegistry } from '../../../common/languages.js';
import { HoverOperation } from './hoverOperation.js';
import { HoverParticipantRegistry, HoverRangeAnchor } from './hoverTypes.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { MarkdownHoverParticipant } from './markdownHoverParticipant.js';
import { InlayHintsHover } from '../../inlayHints/browser/inlayHintsHover.js';
import { ContentHoverWidget } from './contentHoverWidget.js';
import { ContentHoverComputer } from './contentHoverComputer.js';
import { ContentHoverVisibleData, HoverResult } from './contentHoverTypes.js';
import { EditorHoverStatusBar } from './contentHoverStatusBar.js';
let ContentHoverController = ContentHoverController_1 = class ContentHoverController extends Disposable {
    constructor(_editor, _instantiationService, _keybindingService) {
        super();
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._keybindingService = _keybindingService;
        this._currentResult = null;
        this._widget = this._register(this._instantiationService.createInstance(ContentHoverWidget, this._editor));
        // Instantiate participants and sort them by `hoverOrdinal` which is relevant for rendering order.
        this._participants = [];
        for (const participant of HoverParticipantRegistry.getAll()) {
            const participantInstance = this._instantiationService.createInstance(participant, this._editor);
            if (participantInstance instanceof MarkdownHoverParticipant && !(participantInstance instanceof InlayHintsHover)) {
                this._markdownHoverParticipant = participantInstance;
            }
            this._participants.push(participantInstance);
        }
        this._participants.sort((p1, p2) => p1.hoverOrdinal - p2.hoverOrdinal);
        this._computer = new ContentHoverComputer(this._editor, this._participants);
        this._hoverOperation = this._register(new HoverOperation(this._editor, this._computer));
        this._register(this._hoverOperation.onResult((result) => {
            if (!this._computer.anchor) {
                // invalid state, ignore result
                return;
            }
            const messages = (result.hasLoadingMessage ? this._addLoadingMessage(result.value) : result.value);
            this._withResult(new HoverResult(this._computer.anchor, messages, result.isComplete));
        }));
        this._register(dom.addStandardDisposableListener(this._widget.getDomNode(), 'keydown', (e) => {
            if (e.equals(9 /* KeyCode.Escape */)) {
                this.hide();
            }
        }));
        this._register(TokenizationRegistry.onDidChange(() => {
            if (this._widget.position && this._currentResult) {
                this._setCurrentResult(this._currentResult); // render again
            }
        }));
    }
    /**
     * Returns true if the hover shows now or will show.
     */
    _startShowingOrUpdateHover(anchor, mode, source, focus, mouseEvent) {
        if (!this._widget.position || !this._currentResult) {
            // The hover is not visible
            if (anchor) {
                this._startHoverOperationIfNecessary(anchor, mode, source, focus, false);
                return true;
            }
            return false;
        }
        // The hover is currently visible
        const isHoverSticky = this._editor.getOption(60 /* EditorOption.hover */).sticky;
        const isGettingCloser = (isHoverSticky
            && mouseEvent
            && this._widget.isMouseGettingCloser(mouseEvent.event.posx, mouseEvent.event.posy));
        if (isGettingCloser) {
            // The mouse is getting closer to the hover, so we will keep the hover untouched
            // But we will kick off a hover update at the new anchor, insisting on keeping the hover visible.
            if (anchor) {
                this._startHoverOperationIfNecessary(anchor, mode, source, focus, true);
            }
            return true;
        }
        if (!anchor) {
            this._setCurrentResult(null);
            return false;
        }
        if (anchor && this._currentResult.anchor.equals(anchor)) {
            // The widget is currently showing results for the exact same anchor, so no update is needed
            return true;
        }
        if (!anchor.canAdoptVisibleHover(this._currentResult.anchor, this._widget.position)) {
            // The new anchor is not compatible with the previous anchor
            this._setCurrentResult(null);
            this._startHoverOperationIfNecessary(anchor, mode, source, focus, false);
            return true;
        }
        // We aren't getting any closer to the hover, so we will filter existing results
        // and keep those which also apply to the new anchor.
        this._setCurrentResult(this._currentResult.filter(anchor));
        this._startHoverOperationIfNecessary(anchor, mode, source, focus, false);
        return true;
    }
    _startHoverOperationIfNecessary(anchor, mode, source, focus, insistOnKeepingHoverVisible) {
        if (this._computer.anchor && this._computer.anchor.equals(anchor)) {
            // We have to start a hover operation at the exact same anchor as before, so no work is needed
            return;
        }
        this._hoverOperation.cancel();
        this._computer.anchor = anchor;
        this._computer.shouldFocus = focus;
        this._computer.source = source;
        this._computer.insistOnKeepingHoverVisible = insistOnKeepingHoverVisible;
        this._hoverOperation.start(mode);
    }
    _setCurrentResult(hoverResult) {
        if (this._currentResult === hoverResult) {
            // avoid updating the DOM to avoid resetting the user selection
            return;
        }
        if (hoverResult && hoverResult.messages.length === 0) {
            hoverResult = null;
        }
        this._currentResult = hoverResult;
        if (this._currentResult) {
            this._renderMessages(this._currentResult.anchor, this._currentResult.messages);
        }
        else {
            this._widget.hide();
        }
    }
    _addLoadingMessage(result) {
        if (this._computer.anchor) {
            for (const participant of this._participants) {
                if (participant.createLoadingMessage) {
                    const loadingMessage = participant.createLoadingMessage(this._computer.anchor);
                    if (loadingMessage) {
                        return result.slice(0).concat([loadingMessage]);
                    }
                }
            }
        }
        return result;
    }
    _withResult(hoverResult) {
        if (this._widget.position && this._currentResult && this._currentResult.isComplete) {
            // The hover is visible with a previous complete result.
            if (!hoverResult.isComplete) {
                // Instead of rendering the new partial result, we wait for the result to be complete.
                return;
            }
            if (this._computer.insistOnKeepingHoverVisible && hoverResult.messages.length === 0) {
                // The hover would now hide normally, so we'll keep the previous messages
                return;
            }
        }
        this._setCurrentResult(hoverResult);
    }
    _renderMessages(anchor, messages) {
        const { showAtPosition, showAtSecondaryPosition, highlightRange } = ContentHoverController_1.computeHoverRanges(this._editor, anchor.range, messages);
        const disposables = new DisposableStore();
        const statusBar = disposables.add(new EditorHoverStatusBar(this._keybindingService));
        const fragment = document.createDocumentFragment();
        let colorPicker = null;
        const context = {
            fragment,
            statusBar,
            setColorPicker: (widget) => colorPicker = widget,
            onContentsChanged: () => this._widget.onContentsChanged(),
            setMinimumDimensions: (dimensions) => this._widget.setMinimumDimensions(dimensions),
            hide: () => this.hide()
        };
        for (const participant of this._participants) {
            const hoverParts = messages.filter(msg => msg.owner === participant);
            if (hoverParts.length > 0) {
                disposables.add(participant.renderHoverParts(context, hoverParts));
            }
        }
        const isBeforeContent = messages.some(m => m.isBeforeContent);
        if (statusBar.hasContent) {
            fragment.appendChild(statusBar.hoverElement);
        }
        if (fragment.hasChildNodes()) {
            if (highlightRange) {
                const highlightDecoration = this._editor.createDecorationsCollection();
                highlightDecoration.set([{
                        range: highlightRange,
                        options: ContentHoverController_1._DECORATION_OPTIONS
                    }]);
                disposables.add(toDisposable(() => {
                    highlightDecoration.clear();
                }));
            }
            this._widget.showAt(fragment, new ContentHoverVisibleData(anchor.initialMousePosX, anchor.initialMousePosY, colorPicker, showAtPosition, showAtSecondaryPosition, this._editor.getOption(60 /* EditorOption.hover */).above, this._computer.shouldFocus, this._computer.source, isBeforeContent, disposables));
        }
        else {
            disposables.dispose();
        }
    }
    static computeHoverRanges(editor, anchorRange, messages) {
        let startColumnBoundary = 1;
        if (editor.hasModel()) {
            // Ensure the range is on the current view line
            const viewModel = editor._getViewModel();
            const coordinatesConverter = viewModel.coordinatesConverter;
            const anchorViewRange = coordinatesConverter.convertModelRangeToViewRange(anchorRange);
            const anchorViewRangeStart = new Position(anchorViewRange.startLineNumber, viewModel.getLineMinColumn(anchorViewRange.startLineNumber));
            startColumnBoundary = coordinatesConverter.convertViewPositionToModelPosition(anchorViewRangeStart).column;
        }
        // The anchor range is always on a single line
        const anchorLineNumber = anchorRange.startLineNumber;
        let renderStartColumn = anchorRange.startColumn;
        let highlightRange = messages[0].range;
        let forceShowAtRange = null;
        for (const msg of messages) {
            highlightRange = Range.plusRange(highlightRange, msg.range);
            if (msg.range.startLineNumber === anchorLineNumber && msg.range.endLineNumber === anchorLineNumber) {
                // this message has a range that is completely sitting on the line of the anchor
                renderStartColumn = Math.max(Math.min(renderStartColumn, msg.range.startColumn), startColumnBoundary);
            }
            if (msg.forceShowAtRange) {
                forceShowAtRange = msg.range;
            }
        }
        const showAtPosition = forceShowAtRange ? forceShowAtRange.getStartPosition() : new Position(anchorLineNumber, anchorRange.startColumn);
        const showAtSecondaryPosition = forceShowAtRange ? forceShowAtRange.getStartPosition() : new Position(anchorLineNumber, renderStartColumn);
        return {
            showAtPosition,
            showAtSecondaryPosition,
            highlightRange
        };
    }
    showsOrWillShow(mouseEvent) {
        if (this._widget.isResizing) {
            return true;
        }
        const anchorCandidates = [];
        for (const participant of this._participants) {
            if (participant.suggestHoverAnchor) {
                const anchor = participant.suggestHoverAnchor(mouseEvent);
                if (anchor) {
                    anchorCandidates.push(anchor);
                }
            }
        }
        const target = mouseEvent.target;
        if (target.type === 6 /* MouseTargetType.CONTENT_TEXT */) {
            anchorCandidates.push(new HoverRangeAnchor(0, target.range, mouseEvent.event.posx, mouseEvent.event.posy));
        }
        if (target.type === 7 /* MouseTargetType.CONTENT_EMPTY */) {
            const epsilon = this._editor.getOption(50 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth / 2;
            if (!target.detail.isAfterLines
                && typeof target.detail.horizontalDistanceToText === 'number'
                && target.detail.horizontalDistanceToText < epsilon) {
                // Let hover kick in even when the mouse is technically in the empty area after a line, given the distance is small enough
                anchorCandidates.push(new HoverRangeAnchor(0, target.range, mouseEvent.event.posx, mouseEvent.event.posy));
            }
        }
        if (anchorCandidates.length === 0) {
            return this._startShowingOrUpdateHover(null, 0 /* HoverStartMode.Delayed */, 0 /* HoverStartSource.Mouse */, false, mouseEvent);
        }
        anchorCandidates.sort((a, b) => b.priority - a.priority);
        return this._startShowingOrUpdateHover(anchorCandidates[0], 0 /* HoverStartMode.Delayed */, 0 /* HoverStartSource.Mouse */, false, mouseEvent);
    }
    startShowingAtRange(range, mode, source, focus) {
        this._startShowingOrUpdateHover(new HoverRangeAnchor(0, range, undefined, undefined), mode, source, focus, null);
    }
    async updateFocusedMarkdownHoverVerbosityLevel(action) {
        var _a;
        (_a = this._markdownHoverParticipant) === null || _a === void 0 ? void 0 : _a.updateFocusedMarkdownHoverPartVerbosityLevel(action);
    }
    containsNode(node) {
        return (node ? this._widget.getDomNode().contains(node) : false);
    }
    focus() {
        this._widget.focus();
    }
    scrollUp() {
        this._widget.scrollUp();
    }
    scrollDown() {
        this._widget.scrollDown();
    }
    scrollLeft() {
        this._widget.scrollLeft();
    }
    scrollRight() {
        this._widget.scrollRight();
    }
    pageUp() {
        this._widget.pageUp();
    }
    pageDown() {
        this._widget.pageDown();
    }
    goToTop() {
        this._widget.goToTop();
    }
    goToBottom() {
        this._widget.goToBottom();
    }
    hide() {
        this._computer.anchor = null;
        this._hoverOperation.cancel();
        this._setCurrentResult(null);
    }
    get isColorPickerVisible() {
        return this._widget.isColorPickerVisible;
    }
    get isVisibleFromKeyboard() {
        return this._widget.isVisibleFromKeyboard;
    }
    get isVisible() {
        return this._widget.isVisible;
    }
    get isFocused() {
        return this._widget.isFocused;
    }
    get isResizing() {
        return this._widget.isResizing;
    }
    get widget() {
        return this._widget;
    }
};
ContentHoverController._DECORATION_OPTIONS = ModelDecorationOptions.register({
    description: 'content-hover-highlight',
    className: 'hoverHighlight'
});
ContentHoverController = ContentHoverController_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IKeybindingService)
], ContentHoverController);
export { ContentHoverController };
