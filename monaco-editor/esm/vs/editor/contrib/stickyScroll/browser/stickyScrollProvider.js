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
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { binarySearch } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { StickyModelProvider } from './stickyScrollModelProvider.js';
export class StickyLineCandidate {
    constructor(startLineNumber, endLineNumber, nestingDepth) {
        this.startLineNumber = startLineNumber;
        this.endLineNumber = endLineNumber;
        this.nestingDepth = nestingDepth;
    }
}
let StickyLineCandidateProvider = class StickyLineCandidateProvider extends Disposable {
    constructor(editor, _languageFeaturesService, _languageConfigurationService) {
        super();
        this._languageFeaturesService = _languageFeaturesService;
        this._languageConfigurationService = _languageConfigurationService;
        this._onDidChangeStickyScroll = this._register(new Emitter());
        this.onDidChangeStickyScroll = this._onDidChangeStickyScroll.event;
        this._model = null;
        this._cts = null;
        this._stickyModelProvider = null;
        this._editor = editor;
        this._sessionStore = this._register(new DisposableStore());
        this._updateSoon = this._register(new RunOnceScheduler(() => this.update(), 50));
        this._register(this._editor.onDidChangeConfiguration(e => {
            if (e.hasChanged(115 /* EditorOption.stickyScroll */)) {
                this.readConfiguration();
            }
        }));
        this.readConfiguration();
    }
    readConfiguration() {
        this._sessionStore.clear();
        const options = this._editor.getOption(115 /* EditorOption.stickyScroll */);
        if (!options.enabled) {
            return;
        }
        this._sessionStore.add(this._editor.onDidChangeModel(() => {
            // We should not show an old model for a different file, it will always be wrong.
            // So we clear the model here immediately and then trigger an update.
            this._model = null;
            this.updateStickyModelProvider();
            this._onDidChangeStickyScroll.fire();
            this.update();
        }));
        this._sessionStore.add(this._editor.onDidChangeHiddenAreas(() => this.update()));
        this._sessionStore.add(this._editor.onDidChangeModelContent(() => this._updateSoon.schedule()));
        this._sessionStore.add(this._languageFeaturesService.documentSymbolProvider.onDidChange(() => this.update()));
        this._sessionStore.add(toDisposable(() => {
            var _a;
            (_a = this._stickyModelProvider) === null || _a === void 0 ? void 0 : _a.dispose();
            this._stickyModelProvider = null;
        }));
        this.updateStickyModelProvider();
        this.update();
    }
    getVersionId() {
        var _a;
        return (_a = this._model) === null || _a === void 0 ? void 0 : _a.version;
    }
    updateStickyModelProvider() {
        var _a;
        (_a = this._stickyModelProvider) === null || _a === void 0 ? void 0 : _a.dispose();
        this._stickyModelProvider = null;
        const editor = this._editor;
        if (editor.hasModel()) {
            this._stickyModelProvider = new StickyModelProvider(editor, () => this._updateSoon.schedule(), this._languageConfigurationService, this._languageFeaturesService);
        }
    }
    async update() {
        var _a;
        (_a = this._cts) === null || _a === void 0 ? void 0 : _a.dispose(true);
        this._cts = new CancellationTokenSource();
        await this.updateStickyModel(this._cts.token);
        this._onDidChangeStickyScroll.fire();
    }
    async updateStickyModel(token) {
        if (!this._editor.hasModel() || !this._stickyModelProvider || this._editor.getModel().isTooLargeForTokenization()) {
            this._model = null;
            return;
        }
        const model = await this._stickyModelProvider.update(token);
        if (token.isCancellationRequested) {
            // the computation was canceled, so do not overwrite the model
            return;
        }
        this._model = model;
    }
    updateIndex(index) {
        if (index === -1) {
            index = 0;
        }
        else if (index < 0) {
            index = -index - 2;
        }
        return index;
    }
    getCandidateStickyLinesIntersectingFromStickyModel(range, outlineModel, result, depth, lastStartLineNumber) {
        if (outlineModel.children.length === 0) {
            return;
        }
        let lastLine = lastStartLineNumber;
        const childrenStartLines = [];
        for (let i = 0; i < outlineModel.children.length; i++) {
            const child = outlineModel.children[i];
            if (child.range) {
                childrenStartLines.push(child.range.startLineNumber);
            }
        }
        const lowerBound = this.updateIndex(binarySearch(childrenStartLines, range.startLineNumber, (a, b) => { return a - b; }));
        const upperBound = this.updateIndex(binarySearch(childrenStartLines, range.startLineNumber + depth, (a, b) => { return a - b; }));
        for (let i = lowerBound; i <= upperBound; i++) {
            const child = outlineModel.children[i];
            if (!child) {
                return;
            }
            if (child.range) {
                const childStartLine = child.range.startLineNumber;
                const childEndLine = child.range.endLineNumber;
                if (range.startLineNumber <= childEndLine + 1 && childStartLine - 1 <= range.endLineNumber && childStartLine !== lastLine) {
                    lastLine = childStartLine;
                    result.push(new StickyLineCandidate(childStartLine, childEndLine - 1, depth + 1));
                    this.getCandidateStickyLinesIntersectingFromStickyModel(range, child, result, depth + 1, childStartLine);
                }
            }
            else {
                this.getCandidateStickyLinesIntersectingFromStickyModel(range, child, result, depth, lastStartLineNumber);
            }
        }
    }
    getCandidateStickyLinesIntersecting(range) {
        var _a, _b;
        if (!((_a = this._model) === null || _a === void 0 ? void 0 : _a.element)) {
            return [];
        }
        let stickyLineCandidates = [];
        this.getCandidateStickyLinesIntersectingFromStickyModel(range, this._model.element, stickyLineCandidates, 0, -1);
        const hiddenRanges = (_b = this._editor._getViewModel()) === null || _b === void 0 ? void 0 : _b.getHiddenAreas();
        if (hiddenRanges) {
            for (const hiddenRange of hiddenRanges) {
                stickyLineCandidates = stickyLineCandidates.filter(stickyLine => !(stickyLine.startLineNumber >= hiddenRange.startLineNumber && stickyLine.endLineNumber <= hiddenRange.endLineNumber + 1));
            }
        }
        return stickyLineCandidates;
    }
};
StickyLineCandidateProvider = __decorate([
    __param(1, ILanguageFeaturesService),
    __param(2, ILanguageConfigurationService)
], StickyLineCandidateProvider);
export { StickyLineCandidateProvider };
