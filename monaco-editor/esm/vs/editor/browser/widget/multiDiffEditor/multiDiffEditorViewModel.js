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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { derived, observableValue } from '../../../../base/common/observable.js';
import { constObservable, derivedObservableWithWritableCache, mapObservableArrayCached, observableFromValueWithChangeEvent } from '../../../../base/common/observableInternal/utils.js';
import { DiffEditorOptions } from '../diffEditor/diffEditorOptions.js';
import { DiffEditorViewModel } from '../diffEditor/diffEditorViewModel.js';
import { IModelService } from '../../../common/services/model.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
export class MultiDiffEditorViewModel extends Disposable {
    get contextKeys() {
        return this.model.contextKeys;
    }
    constructor(model, _instantiationService) {
        super();
        this.model = model;
        this._instantiationService = _instantiationService;
        this._documents = observableFromValueWithChangeEvent(this.model, this.model.documents);
        this.items = mapObservableArrayCached(this, this._documents, (d, store) => store.add(this._instantiationService.createInstance(DocumentDiffItemViewModel, d, this)))
            .recomputeInitiallyAndOnChange(this._store);
        this.focusedDiffItem = derived(this, reader => this.items.read(reader).find(i => i.isFocused.read(reader)));
        this.activeDiffItem = derivedObservableWithWritableCache(this, (reader, lastValue) => { var _a; return (_a = this.focusedDiffItem.read(reader)) !== null && _a !== void 0 ? _a : lastValue; });
    }
}
let DocumentDiffItemViewModel = class DocumentDiffItemViewModel extends Disposable {
    get originalUri() { var _a; return (_a = this.entry.value.original) === null || _a === void 0 ? void 0 : _a.uri; }
    get modifiedUri() { var _a; return (_a = this.entry.value.modified) === null || _a === void 0 ? void 0 : _a.uri; }
    setIsFocused(source, tx) {
        this._isFocusedSource.set(source, tx);
    }
    constructor(entry, _editorViewModel, _instantiationService, _modelService) {
        var _a, _b;
        super();
        this.entry = entry;
        this._editorViewModel = _editorViewModel;
        this._instantiationService = _instantiationService;
        this._modelService = _modelService;
        this.collapsed = observableValue(this, false);
        this.lastTemplateData = observableValue(this, { contentHeight: 500, selections: undefined, });
        this.isActive = derived(this, reader => this._editorViewModel.activeDiffItem.read(reader) === this);
        this._isFocusedSource = observableValue(this, constObservable(false));
        this.isFocused = derived(this, reader => this._isFocusedSource.read(reader).read(reader));
        function updateOptions(options) {
            return {
                ...options,
                hideUnchangedRegions: {
                    enabled: true,
                },
            };
        }
        const options = this._instantiationService.createInstance(DiffEditorOptions, updateOptions(this.entry.value.options || {}));
        if (this.entry.value.onOptionsDidChange) {
            this._register(this.entry.value.onOptionsDidChange(() => {
                options.updateOptions(updateOptions(this.entry.value.options || {}));
            }));
        }
        const originalTextModel = (_a = this.entry.value.original) !== null && _a !== void 0 ? _a : this._register(this._modelService.createModel('', null));
        const modifiedTextModel = (_b = this.entry.value.modified) !== null && _b !== void 0 ? _b : this._register(this._modelService.createModel('', null));
        this.diffEditorViewModel = this._register(this._instantiationService.createInstance(DiffEditorViewModel, {
            original: originalTextModel,
            modified: modifiedTextModel,
        }, options));
    }
    getKey() {
        var _a, _b;
        return JSON.stringify([
            (_a = this.originalUri) === null || _a === void 0 ? void 0 : _a.toString(),
            (_b = this.modifiedUri) === null || _b === void 0 ? void 0 : _b.toString()
        ]);
    }
};
DocumentDiffItemViewModel = __decorate([
    __param(2, IInstantiationService),
    __param(3, IModelService)
], DocumentDiffItemViewModel);
export { DocumentDiffItemViewModel };
