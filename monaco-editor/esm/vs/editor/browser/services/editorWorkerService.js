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
import { IntervalTimer, timeout } from '../../../base/common/async.js';
import { Disposable, dispose, toDisposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { SimpleWorkerClient, logOnceWebWorkerWarning } from '../../../base/common/worker/simpleWorker.js';
import { DefaultWorkerFactory } from '../../../base/browser/defaultWorkerFactory.js';
import { Range } from '../../common/core/range.js';
import { ILanguageConfigurationService } from '../../common/languages/languageConfigurationRegistry.js';
import { EditorSimpleWorker } from '../../common/services/editorSimpleWorker.js';
import { IModelService } from '../../common/services/model.js';
import { ITextResourceConfigurationService } from '../../common/services/textResourceConfiguration.js';
import { isNonEmptyArray } from '../../../base/common/arrays.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { canceled } from '../../../base/common/errors.js';
import { ILanguageFeaturesService } from '../../common/services/languageFeatures.js';
import { MovedText } from '../../common/diff/linesDiffComputer.js';
import { DetailedLineRangeMapping, RangeMapping, LineRangeMapping } from '../../common/diff/rangeMapping.js';
import { LineRange } from '../../common/core/lineRange.js';
import { mainWindow } from '../../../base/browser/window.js';
import { WindowIntervalTimer } from '../../../base/browser/dom.js';
/**
 * Stop syncing a model to the worker if it was not needed for 1 min.
 */
const STOP_SYNC_MODEL_DELTA_TIME_MS = 60 * 1000;
/**
 * Stop the worker if it was not needed for 5 min.
 */
const STOP_WORKER_DELTA_TIME_MS = 5 * 60 * 1000;
function canSyncModel(modelService, resource) {
    const model = modelService.getModel(resource);
    if (!model) {
        return false;
    }
    if (model.isTooLargeForSyncing()) {
        return false;
    }
    return true;
}
let EditorWorkerService = class EditorWorkerService extends Disposable {
    constructor(modelService, configurationService, logService, languageConfigurationService, languageFeaturesService) {
        super();
        this._modelService = modelService;
        this._workerManager = this._register(new WorkerManager(this._modelService, languageConfigurationService));
        this._logService = logService;
        // register default link-provider and default completions-provider
        this._register(languageFeaturesService.linkProvider.register({ language: '*', hasAccessToAllModels: true }, {
            provideLinks: (model, token) => {
                if (!canSyncModel(this._modelService, model.uri)) {
                    return Promise.resolve({ links: [] }); // File too large
                }
                return this._workerManager.withWorker().then(client => client.computeLinks(model.uri)).then(links => {
                    return links && { links };
                });
            }
        }));
        this._register(languageFeaturesService.completionProvider.register('*', new WordBasedCompletionItemProvider(this._workerManager, configurationService, this._modelService, languageConfigurationService)));
    }
    dispose() {
        super.dispose();
    }
    canComputeUnicodeHighlights(uri) {
        return canSyncModel(this._modelService, uri);
    }
    computedUnicodeHighlights(uri, options, range) {
        return this._workerManager.withWorker().then(client => client.computedUnicodeHighlights(uri, options, range));
    }
    async computeDiff(original, modified, options, algorithm) {
        const result = await this._workerManager.withWorker().then(client => client.computeDiff(original, modified, options, algorithm));
        if (!result) {
            return null;
        }
        // Convert from space efficient JSON data to rich objects.
        const diff = {
            identical: result.identical,
            quitEarly: result.quitEarly,
            changes: toLineRangeMappings(result.changes),
            moves: result.moves.map(m => new MovedText(new LineRangeMapping(new LineRange(m[0], m[1]), new LineRange(m[2], m[3])), toLineRangeMappings(m[4])))
        };
        return diff;
        function toLineRangeMappings(changes) {
            return changes.map((c) => {
                var _a;
                return new DetailedLineRangeMapping(new LineRange(c[0], c[1]), new LineRange(c[2], c[3]), (_a = c[4]) === null || _a === void 0 ? void 0 : _a.map((c) => new RangeMapping(new Range(c[0], c[1], c[2], c[3]), new Range(c[4], c[5], c[6], c[7]))));
            });
        }
    }
    computeMoreMinimalEdits(resource, edits, pretty = false) {
        if (isNonEmptyArray(edits)) {
            if (!canSyncModel(this._modelService, resource)) {
                return Promise.resolve(edits); // File too large
            }
            const sw = StopWatch.create();
            const result = this._workerManager.withWorker().then(client => client.computeMoreMinimalEdits(resource, edits, pretty));
            result.finally(() => this._logService.trace('FORMAT#computeMoreMinimalEdits', resource.toString(true), sw.elapsed()));
            return Promise.race([result, timeout(1000).then(() => edits)]);
        }
        else {
            return Promise.resolve(undefined);
        }
    }
    canNavigateValueSet(resource) {
        return (canSyncModel(this._modelService, resource));
    }
    navigateValueSet(resource, range, up) {
        return this._workerManager.withWorker().then(client => client.navigateValueSet(resource, range, up));
    }
    canComputeWordRanges(resource) {
        return canSyncModel(this._modelService, resource);
    }
    computeWordRanges(resource, range) {
        return this._workerManager.withWorker().then(client => client.computeWordRanges(resource, range));
    }
    findSectionHeaders(uri, options) {
        return this._workerManager.withWorker().then(client => client.findSectionHeaders(uri, options));
    }
};
EditorWorkerService = __decorate([
    __param(0, IModelService),
    __param(1, ITextResourceConfigurationService),
    __param(2, ILogService),
    __param(3, ILanguageConfigurationService),
    __param(4, ILanguageFeaturesService)
], EditorWorkerService);
export { EditorWorkerService };
class WordBasedCompletionItemProvider {
    constructor(workerManager, configurationService, modelService, languageConfigurationService) {
        this.languageConfigurationService = languageConfigurationService;
        this._debugDisplayName = 'wordbasedCompletions';
        this._workerManager = workerManager;
        this._configurationService = configurationService;
        this._modelService = modelService;
    }
    async provideCompletionItems(model, position) {
        const config = this._configurationService.getValue(model.uri, position, 'editor');
        if (config.wordBasedSuggestions === 'off') {
            return undefined;
        }
        const models = [];
        if (config.wordBasedSuggestions === 'currentDocument') {
            // only current file and only if not too large
            if (canSyncModel(this._modelService, model.uri)) {
                models.push(model.uri);
            }
        }
        else {
            // either all files or files of same language
            for (const candidate of this._modelService.getModels()) {
                if (!canSyncModel(this._modelService, candidate.uri)) {
                    continue;
                }
                if (candidate === model) {
                    models.unshift(candidate.uri);
                }
                else if (config.wordBasedSuggestions === 'allDocuments' || candidate.getLanguageId() === model.getLanguageId()) {
                    models.push(candidate.uri);
                }
            }
        }
        if (models.length === 0) {
            return undefined; // File too large, no other files
        }
        const wordDefRegExp = this.languageConfigurationService.getLanguageConfiguration(model.getLanguageId()).getWordDefinition();
        const word = model.getWordAtPosition(position);
        const replace = !word ? Range.fromPositions(position) : new Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
        const insert = replace.setEndPosition(position.lineNumber, position.column);
        const client = await this._workerManager.withWorker();
        const data = await client.textualSuggest(models, word === null || word === void 0 ? void 0 : word.word, wordDefRegExp);
        if (!data) {
            return undefined;
        }
        return {
            duration: data.duration,
            suggestions: data.words.map((word) => {
                return {
                    kind: 18 /* languages.CompletionItemKind.Text */,
                    label: word,
                    insertText: word,
                    range: { insert, replace }
                };
            }),
        };
    }
}
class WorkerManager extends Disposable {
    constructor(modelService, languageConfigurationService) {
        super();
        this.languageConfigurationService = languageConfigurationService;
        this._modelService = modelService;
        this._editorWorkerClient = null;
        this._lastWorkerUsedTime = (new Date()).getTime();
        const stopWorkerInterval = this._register(new WindowIntervalTimer());
        stopWorkerInterval.cancelAndSet(() => this._checkStopIdleWorker(), Math.round(STOP_WORKER_DELTA_TIME_MS / 2), mainWindow);
        this._register(this._modelService.onModelRemoved(_ => this._checkStopEmptyWorker()));
    }
    dispose() {
        if (this._editorWorkerClient) {
            this._editorWorkerClient.dispose();
            this._editorWorkerClient = null;
        }
        super.dispose();
    }
    /**
     * Check if the model service has no more models and stop the worker if that is the case.
     */
    _checkStopEmptyWorker() {
        if (!this._editorWorkerClient) {
            return;
        }
        const models = this._modelService.getModels();
        if (models.length === 0) {
            // There are no more models => nothing possible for me to do
            this._editorWorkerClient.dispose();
            this._editorWorkerClient = null;
        }
    }
    /**
     * Check if the worker has been idle for a while and then stop it.
     */
    _checkStopIdleWorker() {
        if (!this._editorWorkerClient) {
            return;
        }
        const timeSinceLastWorkerUsedTime = (new Date()).getTime() - this._lastWorkerUsedTime;
        if (timeSinceLastWorkerUsedTime > STOP_WORKER_DELTA_TIME_MS) {
            this._editorWorkerClient.dispose();
            this._editorWorkerClient = null;
        }
    }
    withWorker() {
        this._lastWorkerUsedTime = (new Date()).getTime();
        if (!this._editorWorkerClient) {
            this._editorWorkerClient = new EditorWorkerClient(this._modelService, false, 'editorWorkerService', this.languageConfigurationService);
        }
        return Promise.resolve(this._editorWorkerClient);
    }
}
class EditorModelManager extends Disposable {
    constructor(proxy, modelService, keepIdleModels) {
        super();
        this._syncedModels = Object.create(null);
        this._syncedModelsLastUsedTime = Object.create(null);
        this._proxy = proxy;
        this._modelService = modelService;
        if (!keepIdleModels) {
            const timer = new IntervalTimer();
            timer.cancelAndSet(() => this._checkStopModelSync(), Math.round(STOP_SYNC_MODEL_DELTA_TIME_MS / 2));
            this._register(timer);
        }
    }
    dispose() {
        for (const modelUrl in this._syncedModels) {
            dispose(this._syncedModels[modelUrl]);
        }
        this._syncedModels = Object.create(null);
        this._syncedModelsLastUsedTime = Object.create(null);
        super.dispose();
    }
    ensureSyncedResources(resources, forceLargeModels) {
        for (const resource of resources) {
            const resourceStr = resource.toString();
            if (!this._syncedModels[resourceStr]) {
                this._beginModelSync(resource, forceLargeModels);
            }
            if (this._syncedModels[resourceStr]) {
                this._syncedModelsLastUsedTime[resourceStr] = (new Date()).getTime();
            }
        }
    }
    _checkStopModelSync() {
        const currentTime = (new Date()).getTime();
        const toRemove = [];
        for (const modelUrl in this._syncedModelsLastUsedTime) {
            const elapsedTime = currentTime - this._syncedModelsLastUsedTime[modelUrl];
            if (elapsedTime > STOP_SYNC_MODEL_DELTA_TIME_MS) {
                toRemove.push(modelUrl);
            }
        }
        for (const e of toRemove) {
            this._stopModelSync(e);
        }
    }
    _beginModelSync(resource, forceLargeModels) {
        const model = this._modelService.getModel(resource);
        if (!model) {
            return;
        }
        if (!forceLargeModels && model.isTooLargeForSyncing()) {
            return;
        }
        const modelUrl = resource.toString();
        this._proxy.acceptNewModel({
            url: model.uri.toString(),
            lines: model.getLinesContent(),
            EOL: model.getEOL(),
            versionId: model.getVersionId()
        });
        const toDispose = new DisposableStore();
        toDispose.add(model.onDidChangeContent((e) => {
            this._proxy.acceptModelChanged(modelUrl.toString(), e);
        }));
        toDispose.add(model.onWillDispose(() => {
            this._stopModelSync(modelUrl);
        }));
        toDispose.add(toDisposable(() => {
            this._proxy.acceptRemovedModel(modelUrl);
        }));
        this._syncedModels[modelUrl] = toDispose;
    }
    _stopModelSync(modelUrl) {
        const toDispose = this._syncedModels[modelUrl];
        delete this._syncedModels[modelUrl];
        delete this._syncedModelsLastUsedTime[modelUrl];
        dispose(toDispose);
    }
}
class SynchronousWorkerClient {
    constructor(instance) {
        this._instance = instance;
        this._proxyObj = Promise.resolve(this._instance);
    }
    dispose() {
        this._instance.dispose();
    }
    getProxyObject() {
        return this._proxyObj;
    }
}
export class EditorWorkerHost {
    constructor(workerClient) {
        this._workerClient = workerClient;
    }
    // foreign host request
    fhr(method, args) {
        return this._workerClient.fhr(method, args);
    }
}
export class EditorWorkerClient extends Disposable {
    constructor(modelService, keepIdleModels, label, languageConfigurationService) {
        super();
        this.languageConfigurationService = languageConfigurationService;
        this._disposed = false;
        this._modelService = modelService;
        this._keepIdleModels = keepIdleModels;
        this._workerFactory = new DefaultWorkerFactory(label);
        this._worker = null;
        this._modelManager = null;
    }
    // foreign host request
    fhr(method, args) {
        throw new Error(`Not implemented!`);
    }
    _getOrCreateWorker() {
        if (!this._worker) {
            try {
                this._worker = this._register(new SimpleWorkerClient(this._workerFactory, 'vs/editor/common/services/editorSimpleWorker', new EditorWorkerHost(this)));
            }
            catch (err) {
                logOnceWebWorkerWarning(err);
                this._worker = new SynchronousWorkerClient(new EditorSimpleWorker(new EditorWorkerHost(this), null));
            }
        }
        return this._worker;
    }
    _getProxy() {
        return this._getOrCreateWorker().getProxyObject().then(undefined, (err) => {
            logOnceWebWorkerWarning(err);
            this._worker = new SynchronousWorkerClient(new EditorSimpleWorker(new EditorWorkerHost(this), null));
            return this._getOrCreateWorker().getProxyObject();
        });
    }
    _getOrCreateModelManager(proxy) {
        if (!this._modelManager) {
            this._modelManager = this._register(new EditorModelManager(proxy, this._modelService, this._keepIdleModels));
        }
        return this._modelManager;
    }
    async _withSyncedResources(resources, forceLargeModels = false) {
        if (this._disposed) {
            return Promise.reject(canceled());
        }
        return this._getProxy().then((proxy) => {
            this._getOrCreateModelManager(proxy).ensureSyncedResources(resources, forceLargeModels);
            return proxy;
        });
    }
    computedUnicodeHighlights(uri, options, range) {
        return this._withSyncedResources([uri]).then(proxy => {
            return proxy.computeUnicodeHighlights(uri.toString(), options, range);
        });
    }
    computeDiff(original, modified, options, algorithm) {
        return this._withSyncedResources([original, modified], /* forceLargeModels */ true).then(proxy => {
            return proxy.computeDiff(original.toString(), modified.toString(), options, algorithm);
        });
    }
    computeMoreMinimalEdits(resource, edits, pretty) {
        return this._withSyncedResources([resource]).then(proxy => {
            return proxy.computeMoreMinimalEdits(resource.toString(), edits, pretty);
        });
    }
    computeLinks(resource) {
        return this._withSyncedResources([resource]).then(proxy => {
            return proxy.computeLinks(resource.toString());
        });
    }
    computeDefaultDocumentColors(resource) {
        return this._withSyncedResources([resource]).then(proxy => {
            return proxy.computeDefaultDocumentColors(resource.toString());
        });
    }
    async textualSuggest(resources, leadingWord, wordDefRegExp) {
        const proxy = await this._withSyncedResources(resources);
        const wordDef = wordDefRegExp.source;
        const wordDefFlags = wordDefRegExp.flags;
        return proxy.textualSuggest(resources.map(r => r.toString()), leadingWord, wordDef, wordDefFlags);
    }
    computeWordRanges(resource, range) {
        return this._withSyncedResources([resource]).then(proxy => {
            const model = this._modelService.getModel(resource);
            if (!model) {
                return Promise.resolve(null);
            }
            const wordDefRegExp = this.languageConfigurationService.getLanguageConfiguration(model.getLanguageId()).getWordDefinition();
            const wordDef = wordDefRegExp.source;
            const wordDefFlags = wordDefRegExp.flags;
            return proxy.computeWordRanges(resource.toString(), range, wordDef, wordDefFlags);
        });
    }
    navigateValueSet(resource, range, up) {
        return this._withSyncedResources([resource]).then(proxy => {
            const model = this._modelService.getModel(resource);
            if (!model) {
                return null;
            }
            const wordDefRegExp = this.languageConfigurationService.getLanguageConfiguration(model.getLanguageId()).getWordDefinition();
            const wordDef = wordDefRegExp.source;
            const wordDefFlags = wordDefRegExp.flags;
            return proxy.navigateValueSet(resource.toString(), range, up, wordDef, wordDefFlags);
        });
    }
    findSectionHeaders(uri, options) {
        return this._withSyncedResources([uri]).then(proxy => {
            return proxy.findSectionHeaders(uri.toString(), options);
        });
    }
    dispose() {
        super.dispose();
        this._disposed = true;
    }
}
