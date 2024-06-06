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
import * as dom from '../../../../base/browser/dom.js';
import { asArray, compareBy, numberComparator } from '../../../../base/common/arrays.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { isEmptyMarkdownString, MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { MarkdownRenderer } from '../../../browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { DECREASE_HOVER_VERBOSITY_ACTION_ID, INCREASE_HOVER_VERBOSITY_ACTION_ID } from './hoverActionIds.js';
import { Range } from '../../../common/core/range.js';
import { ILanguageService } from '../../../common/languages/language.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { HoverVerbosityAction } from '../../../common/languages.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ClickAction, KeyDownAction } from '../../../../base/browser/ui/hover/hoverWidget.js';
import { IHoverService, WorkbenchHoverDelegate } from '../../../../platform/hover/browser/hover.js';
import { AsyncIterableObject } from '../../../../base/common/async.js';
import { getHoverProviderResultsAsAsyncIterable } from './getHover.js';
const $ = dom.$;
const increaseHoverVerbosityIcon = registerIcon('hover-increase-verbosity', Codicon.add, nls.localize('increaseHoverVerbosity', 'Icon for increaseing hover verbosity.'));
const decreaseHoverVerbosityIcon = registerIcon('hover-decrease-verbosity', Codicon.remove, nls.localize('decreaseHoverVerbosity', 'Icon for decreasing hover verbosity.'));
export class MarkdownHover {
    constructor(owner, range, contents, isBeforeContent, ordinal, source = undefined) {
        this.owner = owner;
        this.range = range;
        this.contents = contents;
        this.isBeforeContent = isBeforeContent;
        this.ordinal = ordinal;
        this.source = source;
    }
    isValidForHoverAnchor(anchor) {
        return (anchor.type === 1 /* HoverAnchorType.Range */
            && this.range.startColumn <= anchor.range.startColumn
            && this.range.endColumn >= anchor.range.endColumn);
    }
}
class HoverSource {
    constructor(hover, hoverProvider, hoverPosition) {
        this.hover = hover;
        this.hoverProvider = hoverProvider;
        this.hoverPosition = hoverPosition;
    }
    supportsVerbosityAction(hoverVerbosityAction) {
        var _a, _b;
        switch (hoverVerbosityAction) {
            case HoverVerbosityAction.Increase:
                return (_a = this.hover.canIncreaseVerbosity) !== null && _a !== void 0 ? _a : false;
            case HoverVerbosityAction.Decrease:
                return (_b = this.hover.canDecreaseVerbosity) !== null && _b !== void 0 ? _b : false;
        }
    }
}
let MarkdownHoverParticipant = class MarkdownHoverParticipant {
    constructor(_editor, _languageService, _openerService, _configurationService, _languageFeaturesService, _keybindingService, _hoverService) {
        this._editor = _editor;
        this._languageService = _languageService;
        this._openerService = _openerService;
        this._configurationService = _configurationService;
        this._languageFeaturesService = _languageFeaturesService;
        this._keybindingService = _keybindingService;
        this._hoverService = _hoverService;
        this.hoverOrdinal = 3;
    }
    createLoadingMessage(anchor) {
        return new MarkdownHover(this, anchor.range, [new MarkdownString().appendText(nls.localize('modesContentHover.loading', "Loading..."))], false, 2000);
    }
    computeSync(anchor, lineDecorations) {
        if (!this._editor.hasModel() || anchor.type !== 1 /* HoverAnchorType.Range */) {
            return [];
        }
        const model = this._editor.getModel();
        const lineNumber = anchor.range.startLineNumber;
        const maxColumn = model.getLineMaxColumn(lineNumber);
        const result = [];
        let index = 1000;
        const lineLength = model.getLineLength(lineNumber);
        const languageId = model.getLanguageIdAtPosition(anchor.range.startLineNumber, anchor.range.startColumn);
        const stopRenderingLineAfter = this._editor.getOption(117 /* EditorOption.stopRenderingLineAfter */);
        const maxTokenizationLineLength = this._configurationService.getValue('editor.maxTokenizationLineLength', {
            overrideIdentifier: languageId
        });
        let stopRenderingMessage = false;
        if (stopRenderingLineAfter >= 0 && lineLength > stopRenderingLineAfter && anchor.range.startColumn >= stopRenderingLineAfter) {
            stopRenderingMessage = true;
            result.push(new MarkdownHover(this, anchor.range, [{
                    value: nls.localize('stopped rendering', "Rendering paused for long line for performance reasons. This can be configured via `editor.stopRenderingLineAfter`.")
                }], false, index++));
        }
        if (!stopRenderingMessage && typeof maxTokenizationLineLength === 'number' && lineLength >= maxTokenizationLineLength) {
            result.push(new MarkdownHover(this, anchor.range, [{
                    value: nls.localize('too many characters', "Tokenization is skipped for long lines for performance reasons. This can be configured via `editor.maxTokenizationLineLength`.")
                }], false, index++));
        }
        let isBeforeContent = false;
        for (const d of lineDecorations) {
            const startColumn = (d.range.startLineNumber === lineNumber) ? d.range.startColumn : 1;
            const endColumn = (d.range.endLineNumber === lineNumber) ? d.range.endColumn : maxColumn;
            const hoverMessage = d.options.hoverMessage;
            if (!hoverMessage || isEmptyMarkdownString(hoverMessage)) {
                continue;
            }
            if (d.options.beforeContentClassName) {
                isBeforeContent = true;
            }
            const range = new Range(anchor.range.startLineNumber, startColumn, anchor.range.startLineNumber, endColumn);
            result.push(new MarkdownHover(this, range, asArray(hoverMessage), isBeforeContent, index++));
        }
        return result;
    }
    computeAsync(anchor, lineDecorations, token) {
        if (!this._editor.hasModel() || anchor.type !== 1 /* HoverAnchorType.Range */) {
            return AsyncIterableObject.EMPTY;
        }
        const model = this._editor.getModel();
        const hoverProviderRegistry = this._languageFeaturesService.hoverProvider;
        if (!hoverProviderRegistry.has(model)) {
            return AsyncIterableObject.EMPTY;
        }
        const markdownHovers = this._getMarkdownHovers(hoverProviderRegistry, model, anchor, token);
        return markdownHovers;
    }
    _getMarkdownHovers(hoverProviderRegistry, model, anchor, token) {
        const position = anchor.range.getStartPosition();
        const hoverProviderResults = getHoverProviderResultsAsAsyncIterable(hoverProviderRegistry, model, position, token);
        const markdownHovers = hoverProviderResults.filter(item => !isEmptyMarkdownString(item.hover.contents))
            .map(item => {
            const range = item.hover.range ? Range.lift(item.hover.range) : anchor.range;
            const hoverSource = new HoverSource(item.hover, item.provider, position);
            return new MarkdownHover(this, range, item.hover.contents, false, item.ordinal, hoverSource);
        });
        return markdownHovers;
    }
    renderHoverParts(context, hoverParts) {
        this._renderedHoverParts = new MarkdownRenderedHoverParts(hoverParts, context.fragment, this._editor, this._languageService, this._openerService, this._keybindingService, this._hoverService, this._configurationService, context.onContentsChanged);
        return this._renderedHoverParts;
    }
    updateFocusedMarkdownHoverPartVerbosityLevel(action) {
        var _a;
        (_a = this._renderedHoverParts) === null || _a === void 0 ? void 0 : _a.updateFocusedHoverPartVerbosityLevel(action);
    }
};
MarkdownHoverParticipant = __decorate([
    __param(1, ILanguageService),
    __param(2, IOpenerService),
    __param(3, IConfigurationService),
    __param(4, ILanguageFeaturesService),
    __param(5, IKeybindingService),
    __param(6, IHoverService)
], MarkdownHoverParticipant);
export { MarkdownHoverParticipant };
class MarkdownRenderedHoverParts extends Disposable {
    constructor(hoverParts, // we own!
    hoverPartsContainer, _editor, _languageService, _openerService, _keybindingService, _hoverService, _configurationService, _onFinishedRendering) {
        super();
        this._editor = _editor;
        this._languageService = _languageService;
        this._openerService = _openerService;
        this._keybindingService = _keybindingService;
        this._hoverService = _hoverService;
        this._configurationService = _configurationService;
        this._onFinishedRendering = _onFinishedRendering;
        this._hoverFocusInfo = { hoverPartIndex: -1, focusRemains: false };
        this._renderedHoverParts = this._renderHoverParts(hoverParts, hoverPartsContainer, this._onFinishedRendering);
        this._register(toDisposable(() => {
            this._renderedHoverParts.forEach(renderedHoverPart => {
                renderedHoverPart.disposables.dispose();
            });
        }));
    }
    _renderHoverParts(hoverParts, hoverPartsContainer, onFinishedRendering) {
        hoverParts.sort(compareBy(hover => hover.ordinal, numberComparator));
        return hoverParts.map((hoverPart, hoverIndex) => {
            const renderedHoverPart = this._renderHoverPart(hoverIndex, hoverPart.contents, hoverPart.source, onFinishedRendering);
            hoverPartsContainer.appendChild(renderedHoverPart.renderedMarkdown);
            return renderedHoverPart;
        });
    }
    _renderHoverPart(hoverPartIndex, hoverContents, hoverSource, onFinishedRendering) {
        const { renderedMarkdown, disposables } = this._renderMarkdownContent(hoverContents, onFinishedRendering);
        if (!hoverSource) {
            return { renderedMarkdown, disposables };
        }
        const canIncreaseVerbosity = hoverSource.supportsVerbosityAction(HoverVerbosityAction.Increase);
        const canDecreaseVerbosity = hoverSource.supportsVerbosityAction(HoverVerbosityAction.Decrease);
        if (!canIncreaseVerbosity && !canDecreaseVerbosity) {
            return { renderedMarkdown, disposables, hoverSource };
        }
        const actionsContainer = $('div.verbosity-actions');
        renderedMarkdown.prepend(actionsContainer);
        disposables.add(this._renderHoverExpansionAction(actionsContainer, HoverVerbosityAction.Increase, canIncreaseVerbosity));
        disposables.add(this._renderHoverExpansionAction(actionsContainer, HoverVerbosityAction.Decrease, canDecreaseVerbosity));
        const focusTracker = disposables.add(dom.trackFocus(renderedMarkdown));
        disposables.add(focusTracker.onDidFocus(() => {
            this._hoverFocusInfo = {
                hoverPartIndex,
                focusRemains: true
            };
        }));
        disposables.add(focusTracker.onDidBlur(() => {
            var _a;
            if ((_a = this._hoverFocusInfo) === null || _a === void 0 ? void 0 : _a.focusRemains) {
                this._hoverFocusInfo.focusRemains = false;
                return;
            }
        }));
        return { renderedMarkdown, disposables, hoverSource };
    }
    _renderMarkdownContent(markdownContent, onFinishedRendering) {
        const renderedMarkdown = $('div.hover-row');
        renderedMarkdown.tabIndex = 0;
        const renderedMarkdownContents = $('div.hover-row-contents');
        renderedMarkdown.appendChild(renderedMarkdownContents);
        const disposables = new DisposableStore();
        disposables.add(renderMarkdownInContainer(this._editor, renderedMarkdownContents, markdownContent, this._languageService, this._openerService, onFinishedRendering));
        return { renderedMarkdown, disposables };
    }
    _renderHoverExpansionAction(container, action, actionEnabled) {
        const store = new DisposableStore();
        const isActionIncrease = action === HoverVerbosityAction.Increase;
        const actionElement = dom.append(container, $(ThemeIcon.asCSSSelector(isActionIncrease ? increaseHoverVerbosityIcon : decreaseHoverVerbosityIcon)));
        actionElement.tabIndex = 0;
        const hoverDelegate = new WorkbenchHoverDelegate('mouse', false, { target: container, position: { hoverPosition: 0 /* HoverPosition.LEFT */ } }, this._configurationService, this._hoverService);
        if (isActionIncrease) {
            const kb = this._keybindingService.lookupKeybinding(INCREASE_HOVER_VERBOSITY_ACTION_ID);
            store.add(this._hoverService.setupUpdatableHover(hoverDelegate, actionElement, kb ?
                nls.localize('increaseVerbosityWithKb', "Increase Verbosity ({0})", kb.getLabel()) :
                nls.localize('increaseVerbosity', "Increase Verbosity")));
        }
        else {
            const kb = this._keybindingService.lookupKeybinding(DECREASE_HOVER_VERBOSITY_ACTION_ID);
            store.add(this._hoverService.setupUpdatableHover(hoverDelegate, actionElement, kb ?
                nls.localize('decreaseVerbosityWithKb', "Decrease Verbosity ({0})", kb.getLabel()) :
                nls.localize('decreaseVerbosity', "Decrease Verbosity")));
        }
        if (!actionEnabled) {
            actionElement.classList.add('disabled');
            return store;
        }
        actionElement.classList.add('enabled');
        const actionFunction = () => this.updateFocusedHoverPartVerbosityLevel(action);
        store.add(new ClickAction(actionElement, actionFunction));
        store.add(new KeyDownAction(actionElement, actionFunction, [3 /* KeyCode.Enter */, 10 /* KeyCode.Space */]));
        return store;
    }
    async updateFocusedHoverPartVerbosityLevel(action) {
        var _a;
        const model = this._editor.getModel();
        if (!model) {
            return;
        }
        const hoverFocusedPartIndex = this._hoverFocusInfo.hoverPartIndex;
        const hoverRenderedPart = this._getRenderedHoverPartAtIndex(hoverFocusedPartIndex);
        if (!hoverRenderedPart || !((_a = hoverRenderedPart.hoverSource) === null || _a === void 0 ? void 0 : _a.supportsVerbosityAction(action))) {
            return;
        }
        const hoverPosition = hoverRenderedPart.hoverSource.hoverPosition;
        const hoverProvider = hoverRenderedPart.hoverSource.hoverProvider;
        const hover = hoverRenderedPart.hoverSource.hover;
        const hoverContext = { verbosityRequest: { action, previousHover: hover } };
        let newHover;
        try {
            newHover = await Promise.resolve(hoverProvider.provideHover(model, hoverPosition, CancellationToken.None, hoverContext));
        }
        catch (e) {
            onUnexpectedExternalError(e);
        }
        if (!newHover) {
            return;
        }
        const hoverSource = new HoverSource(newHover, hoverProvider, hoverPosition);
        const renderedHoverPart = this._renderHoverPart(hoverFocusedPartIndex, newHover.contents, hoverSource, this._onFinishedRendering);
        this._replaceRenderedHoverPartAtIndex(hoverFocusedPartIndex, renderedHoverPart);
        this._focusOnHoverPartWithIndex(hoverFocusedPartIndex);
        this._onFinishedRendering();
    }
    _replaceRenderedHoverPartAtIndex(index, renderedHoverPart) {
        if (index >= this._renderHoverParts.length || index < 0) {
            return;
        }
        const currentRenderedHoverPart = this._renderedHoverParts[index];
        const currentRenderedMarkdown = currentRenderedHoverPart.renderedMarkdown;
        currentRenderedMarkdown.replaceWith(renderedHoverPart.renderedMarkdown);
        currentRenderedHoverPart.disposables.dispose();
        this._renderedHoverParts[index] = renderedHoverPart;
    }
    _focusOnHoverPartWithIndex(index) {
        this._renderedHoverParts[index].renderedMarkdown.focus();
        this._hoverFocusInfo.focusRemains = true;
    }
    _getRenderedHoverPartAtIndex(index) {
        return this._renderedHoverParts[index];
    }
}
export function renderMarkdownHovers(context, hoverParts, editor, languageService, openerService) {
    // Sort hover parts to keep them stable since they might come in async, out-of-order
    hoverParts.sort(compareBy(hover => hover.ordinal, numberComparator));
    const disposables = new DisposableStore();
    for (const hoverPart of hoverParts) {
        disposables.add(renderMarkdownInContainer(editor, context.fragment, hoverPart.contents, languageService, openerService, context.onContentsChanged));
    }
    return disposables;
}
function renderMarkdownInContainer(editor, container, markdownStrings, languageService, openerService, onFinishedRendering) {
    const store = new DisposableStore();
    for (const contents of markdownStrings) {
        if (isEmptyMarkdownString(contents)) {
            continue;
        }
        const markdownHoverElement = $('div.markdown-hover');
        const hoverContentsElement = dom.append(markdownHoverElement, $('div.hover-contents'));
        const renderer = store.add(new MarkdownRenderer({ editor }, languageService, openerService));
        store.add(renderer.onDidRenderAsync(() => {
            hoverContentsElement.className = 'hover-contents code-hover-contents';
            onFinishedRendering();
        }));
        const renderedContents = store.add(renderer.render(contents));
        hoverContentsElement.appendChild(renderedContents.element);
        container.appendChild(markdownHoverElement);
    }
    return store;
}
