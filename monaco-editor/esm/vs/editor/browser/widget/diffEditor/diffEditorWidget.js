var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getWindow, h } from '../../../../base/browser/dom.js';
import { findLast } from '../../../../base/common/arraysFind.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Event } from '../../../../base/common/event.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, observableFromEvent, observableValue, recomputeInitiallyAndOnChange, subtransaction, transaction } from '../../../../base/common/observable.js';
import { derivedDisposable } from '../../../../base/common/observableInternal/derived.js';
import './style.css';
import { EditorExtensionsRegistry } from '../../editorExtensions.js';
import { ICodeEditorService } from '../../services/codeEditorService.js';
import { StableEditorScrollState } from '../../stableEditorScroll.js';
import { CodeEditorWidget } from '../codeEditor/codeEditorWidget.js';
import { AccessibleDiffViewer, AccessibleDiffViewerModelFromEditors } from './components/accessibleDiffViewer.js';
import { DiffEditorDecorations } from './components/diffEditorDecorations.js';
import { DiffEditorSash } from './components/diffEditorSash.js';
import { DiffEditorViewZones } from './components/diffEditorViewZones/diffEditorViewZones.js';
import { DiffEditorGutter } from './features/gutterFeature.js';
import { HideUnchangedRegionsFeature } from './features/hideUnchangedRegionsFeature.js';
import { MovedBlocksLinesFeature } from './features/movedBlocksLinesFeature.js';
import { OverviewRulerFeature } from './features/overviewRulerFeature.js';
import { RevertButtonsFeature } from './features/revertButtonsFeature.js';
import { ObservableElementSizeObserver, applyStyle, applyViewZones, bindContextKey, readHotReloadableExport, translatePosition } from './utils.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { EditorType } from '../../../common/editorCommon.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
import { DiffEditorEditors } from './components/diffEditorEditors.js';
import { DelegatingEditor } from './delegatingEditorImpl.js';
import { DiffEditorOptions } from './diffEditorOptions.js';
import { DiffEditorViewModel } from './diffEditorViewModel.js';
let DiffEditorWidget = class DiffEditorWidget extends DelegatingEditor {
    get onDidContentSizeChange() { return this._editors.onDidContentSizeChange; }
    constructor(_domElement, options, codeEditorWidgetOptions, _parentContextKeyService, _parentInstantiationService, codeEditorService, _accessibilitySignalService, _editorProgressService) {
        var _a;
        super();
        this._domElement = _domElement;
        this._parentContextKeyService = _parentContextKeyService;
        this._parentInstantiationService = _parentInstantiationService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._editorProgressService = _editorProgressService;
        this.elements = h('div.monaco-diff-editor.side-by-side', { style: { position: 'relative', height: '100%' } }, [
            h('div.editor.original@original', { style: { position: 'absolute', height: '100%', } }),
            h('div.editor.modified@modified', { style: { position: 'absolute', height: '100%', } }),
            h('div.accessibleDiffViewer@accessibleDiffViewer', { style: { position: 'absolute', height: '100%' } }),
        ]);
        this._diffModel = observableValue(this, undefined);
        this._shouldDisposeDiffModel = false;
        this.onDidChangeModel = Event.fromObservableLight(this._diffModel);
        this._contextKeyService = this._register(this._parentContextKeyService.createScoped(this._domElement));
        this._instantiationService = this._parentInstantiationService.createChild(new ServiceCollection([IContextKeyService, this._contextKeyService]));
        this._boundarySashes = observableValue(this, undefined);
        this._accessibleDiffViewerShouldBeVisible = observableValue(this, false);
        this._accessibleDiffViewerVisible = derived(this, reader => this._options.onlyShowAccessibleDiffViewer.read(reader)
            ? true
            : this._accessibleDiffViewerShouldBeVisible.read(reader));
        this._movedBlocksLinesPart = observableValue(this, undefined);
        this._layoutInfo = derived(this, reader => {
            var _a, _b, _c, _d, _e;
            const fullWidth = this._rootSizeObserver.width.read(reader);
            const fullHeight = this._rootSizeObserver.height.read(reader);
            const sash = this._sash.read(reader);
            const gutter = this._gutter.read(reader);
            const gutterWidth = (_a = gutter === null || gutter === void 0 ? void 0 : gutter.width.read(reader)) !== null && _a !== void 0 ? _a : 0;
            const overviewRulerPartWidth = (_c = (_b = this._overviewRulerPart.read(reader)) === null || _b === void 0 ? void 0 : _b.width) !== null && _c !== void 0 ? _c : 0;
            let originalLeft, originalWidth, modifiedLeft, modifiedWidth, gutterLeft;
            const sideBySide = !!sash;
            if (sideBySide) {
                const sashLeft = sash.sashLeft.read(reader);
                const movedBlocksLinesWidth = (_e = (_d = this._movedBlocksLinesPart.read(reader)) === null || _d === void 0 ? void 0 : _d.width.read(reader)) !== null && _e !== void 0 ? _e : 0;
                originalLeft = 0;
                originalWidth = sashLeft - gutterWidth - movedBlocksLinesWidth;
                gutterLeft = sashLeft - gutterWidth;
                modifiedLeft = sashLeft;
                modifiedWidth = fullWidth - modifiedLeft - overviewRulerPartWidth;
            }
            else {
                gutterLeft = 0;
                originalLeft = gutterWidth;
                originalWidth = Math.max(5, this._editors.original.getLayoutInfo().decorationsLeft);
                modifiedLeft = gutterWidth + originalWidth;
                modifiedWidth = fullWidth - modifiedLeft - overviewRulerPartWidth;
            }
            this.elements.original.style.left = originalLeft + 'px';
            this.elements.original.style.width = originalWidth + 'px';
            this._editors.original.layout({ width: originalWidth, height: fullHeight }, true);
            gutter === null || gutter === void 0 ? void 0 : gutter.layout(gutterLeft);
            this.elements.modified.style.left = modifiedLeft + 'px';
            this.elements.modified.style.width = modifiedWidth + 'px';
            this._editors.modified.layout({ width: modifiedWidth, height: fullHeight }, true);
            return {
                modifiedEditor: this._editors.modified.getLayoutInfo(),
                originalEditor: this._editors.original.getLayoutInfo(),
            };
        });
        this._diffValue = this._diffModel.map((m, r) => m === null || m === void 0 ? void 0 : m.diff.read(r));
        this.onDidUpdateDiff = Event.fromObservableLight(this._diffValue);
        codeEditorService.willCreateDiffEditor();
        this._contextKeyService.createKey('isInDiffEditor', true);
        this._domElement.appendChild(this.elements.root);
        this._register(toDisposable(() => this._domElement.removeChild(this.elements.root)));
        this._rootSizeObserver = this._register(new ObservableElementSizeObserver(this.elements.root, options.dimension));
        this._rootSizeObserver.setAutomaticLayout((_a = options.automaticLayout) !== null && _a !== void 0 ? _a : false);
        this._options = this._instantiationService.createInstance(DiffEditorOptions, options);
        this._register(autorun(reader => {
            this._options.setWidth(this._rootSizeObserver.width.read(reader));
        }));
        this._contextKeyService.createKey(EditorContextKeys.isEmbeddedDiffEditor.key, false);
        this._register(bindContextKey(EditorContextKeys.isEmbeddedDiffEditor, this._contextKeyService, reader => this._options.isInEmbeddedEditor.read(reader)));
        this._register(bindContextKey(EditorContextKeys.comparingMovedCode, this._contextKeyService, reader => { var _a; return !!((_a = this._diffModel.read(reader)) === null || _a === void 0 ? void 0 : _a.movedTextToCompare.read(reader)); }));
        this._register(bindContextKey(EditorContextKeys.diffEditorRenderSideBySideInlineBreakpointReached, this._contextKeyService, reader => this._options.couldShowInlineViewBecauseOfSize.read(reader)));
        this._register(bindContextKey(EditorContextKeys.diffEditorInlineMode, this._contextKeyService, reader => !this._options.renderSideBySide.read(reader)));
        this._register(bindContextKey(EditorContextKeys.hasChanges, this._contextKeyService, reader => { var _a, _b, _c; return ((_c = (_b = (_a = this._diffModel.read(reader)) === null || _a === void 0 ? void 0 : _a.diff.read(reader)) === null || _b === void 0 ? void 0 : _b.mappings.length) !== null && _c !== void 0 ? _c : 0) > 0; }));
        this._editors = this._register(this._instantiationService.createInstance(DiffEditorEditors, this.elements.original, this.elements.modified, this._options, codeEditorWidgetOptions, (i, c, o, o2) => this._createInnerEditor(i, c, o, o2)));
        this._register(bindContextKey(EditorContextKeys.diffEditorOriginalWritable, this._contextKeyService, reader => this._options.originalEditable.read(reader)));
        this._register(bindContextKey(EditorContextKeys.diffEditorModifiedWritable, this._contextKeyService, reader => !this._options.readOnly.read(reader)));
        this._register(bindContextKey(EditorContextKeys.diffEditorOriginalUri, this._contextKeyService, reader => { var _a, _b; return (_b = (_a = this._diffModel.read(reader)) === null || _a === void 0 ? void 0 : _a.model.original.uri.toString()) !== null && _b !== void 0 ? _b : ''; }));
        this._register(bindContextKey(EditorContextKeys.diffEditorModifiedUri, this._contextKeyService, reader => { var _a, _b; return (_b = (_a = this._diffModel.read(reader)) === null || _a === void 0 ? void 0 : _a.model.modified.uri.toString()) !== null && _b !== void 0 ? _b : ''; }));
        this._overviewRulerPart = derivedDisposable(this, reader => !this._options.renderOverviewRuler.read(reader)
            ? undefined
            : this._instantiationService.createInstance(readHotReloadableExport(OverviewRulerFeature, reader), this._editors, this.elements.root, this._diffModel, this._rootSizeObserver.width, this._rootSizeObserver.height, this._layoutInfo.map(i => i.modifiedEditor))).recomputeInitiallyAndOnChange(this._store);
        this._sash = derivedDisposable(this, reader => {
            const showSash = this._options.renderSideBySide.read(reader);
            this.elements.root.classList.toggle('side-by-side', showSash);
            return !showSash ? undefined : new DiffEditorSash(this._options, this.elements.root, {
                height: this._rootSizeObserver.height,
                width: this._rootSizeObserver.width.map((w, reader) => { var _a, _b; return w - ((_b = (_a = this._overviewRulerPart.read(reader)) === null || _a === void 0 ? void 0 : _a.width) !== null && _b !== void 0 ? _b : 0); }),
            }, this._boundarySashes);
        }).recomputeInitiallyAndOnChange(this._store);
        const unchangedRangesFeature = derivedDisposable(this, reader => /** @description UnchangedRangesFeature */ this._instantiationService.createInstance(readHotReloadableExport(HideUnchangedRegionsFeature, reader), this._editors, this._diffModel, this._options)).recomputeInitiallyAndOnChange(this._store);
        derivedDisposable(this, reader => /** @description DiffEditorDecorations */ this._instantiationService.createInstance(readHotReloadableExport(DiffEditorDecorations, reader), this._editors, this._diffModel, this._options, this)).recomputeInitiallyAndOnChange(this._store);
        const origViewZoneIdsToIgnore = new Set();
        const modViewZoneIdsToIgnore = new Set();
        let isUpdatingViewZones = false;
        const viewZoneManager = derivedDisposable(this, reader => /** @description ViewZoneManager */ this._instantiationService.createInstance(readHotReloadableExport(DiffEditorViewZones, reader), getWindow(this._domElement), this._editors, this._diffModel, this._options, this, () => isUpdatingViewZones || unchangedRangesFeature.get().isUpdatingHiddenAreas, origViewZoneIdsToIgnore, modViewZoneIdsToIgnore)).recomputeInitiallyAndOnChange(this._store);
        const originalViewZones = derived(this, (reader) => {
            const orig = viewZoneManager.read(reader).viewZones.read(reader).orig;
            const orig2 = unchangedRangesFeature.read(reader).viewZones.read(reader).origViewZones;
            return orig.concat(orig2);
        });
        const modifiedViewZones = derived(this, (reader) => {
            const mod = viewZoneManager.read(reader).viewZones.read(reader).mod;
            const mod2 = unchangedRangesFeature.read(reader).viewZones.read(reader).modViewZones;
            return mod.concat(mod2);
        });
        this._register(applyViewZones(this._editors.original, originalViewZones, isUpdatingOrigViewZones => {
            isUpdatingViewZones = isUpdatingOrigViewZones;
        }, origViewZoneIdsToIgnore));
        let scrollState;
        this._register(applyViewZones(this._editors.modified, modifiedViewZones, isUpdatingModViewZones => {
            isUpdatingViewZones = isUpdatingModViewZones;
            if (isUpdatingViewZones) {
                scrollState = StableEditorScrollState.capture(this._editors.modified);
            }
            else {
                scrollState === null || scrollState === void 0 ? void 0 : scrollState.restore(this._editors.modified);
                scrollState = undefined;
            }
        }, modViewZoneIdsToIgnore));
        this._accessibleDiffViewer = derivedDisposable(this, reader => this._instantiationService.createInstance(readHotReloadableExport(AccessibleDiffViewer, reader), this.elements.accessibleDiffViewer, this._accessibleDiffViewerVisible, (visible, tx) => this._accessibleDiffViewerShouldBeVisible.set(visible, tx), this._options.onlyShowAccessibleDiffViewer.map(v => !v), this._rootSizeObserver.width, this._rootSizeObserver.height, this._diffModel.map((m, r) => { var _a; return (_a = m === null || m === void 0 ? void 0 : m.diff.read(r)) === null || _a === void 0 ? void 0 : _a.mappings.map(m => m.lineRangeMapping); }), new AccessibleDiffViewerModelFromEditors(this._editors))).recomputeInitiallyAndOnChange(this._store);
        const visibility = this._accessibleDiffViewerVisible.map(v => v ? 'hidden' : 'visible');
        this._register(applyStyle(this.elements.modified, { visibility }));
        this._register(applyStyle(this.elements.original, { visibility }));
        this._createDiffEditorContributions();
        codeEditorService.addDiffEditor(this);
        this._gutter = derivedDisposable(this, reader => {
            return this._options.shouldRenderGutterMenu.read(reader)
                ? this._instantiationService.createInstance(readHotReloadableExport(DiffEditorGutter, reader), this.elements.root, this._diffModel, this._editors)
                : undefined;
        });
        this._register(recomputeInitiallyAndOnChange(this._layoutInfo));
        derivedDisposable(this, reader => /** @description MovedBlocksLinesPart */ new (readHotReloadableExport(MovedBlocksLinesFeature, reader))(this.elements.root, this._diffModel, this._layoutInfo.map(i => i.originalEditor), this._layoutInfo.map(i => i.modifiedEditor), this._editors)).recomputeInitiallyAndOnChange(this._store, value => {
            // This is to break the layout info <-> moved blocks lines part dependency cycle.
            this._movedBlocksLinesPart.set(value, undefined);
        });
        this._register(Event.runAndSubscribe(this._editors.modified.onDidChangeCursorPosition, e => this._handleCursorPositionChange(e, true)));
        this._register(Event.runAndSubscribe(this._editors.original.onDidChangeCursorPosition, e => this._handleCursorPositionChange(e, false)));
        const isInitializingDiff = this._diffModel.map(this, (m, reader) => {
            /** @isInitializingDiff isDiffUpToDate */
            if (!m) {
                return undefined;
            }
            return m.diff.read(reader) === undefined && !m.isDiffUpToDate.read(reader);
        });
        this._register(autorunWithStore((reader, store) => {
            /** @description DiffEditorWidgetHelper.ShowProgress */
            if (isInitializingDiff.read(reader) === true) {
                const r = this._editorProgressService.show(true, 1000);
                store.add(toDisposable(() => r.done()));
            }
        }));
        this._register(toDisposable(() => {
            var _a;
            if (this._shouldDisposeDiffModel) {
                (_a = this._diffModel.get()) === null || _a === void 0 ? void 0 : _a.dispose();
            }
        }));
        this._register(autorunWithStore((reader, store) => {
            store.add(new (readHotReloadableExport(RevertButtonsFeature, reader))(this._editors, this._diffModel, this._options, this));
        }));
    }
    _createInnerEditor(instantiationService, container, options, editorWidgetOptions) {
        const editor = instantiationService.createInstance(CodeEditorWidget, container, options, editorWidgetOptions);
        return editor;
    }
    _createDiffEditorContributions() {
        const contributions = EditorExtensionsRegistry.getDiffEditorContributions();
        for (const desc of contributions) {
            try {
                this._register(this._instantiationService.createInstance(desc.ctor, this));
            }
            catch (err) {
                onUnexpectedError(err);
            }
        }
    }
    get _targetEditor() { return this._editors.modified; }
    getEditorType() { return EditorType.IDiffEditor; }
    layout(dimension) {
        this._rootSizeObserver.observe(dimension);
    }
    hasTextFocus() { return this._editors.original.hasTextFocus() || this._editors.modified.hasTextFocus(); }
    saveViewState() {
        var _a;
        const originalViewState = this._editors.original.saveViewState();
        const modifiedViewState = this._editors.modified.saveViewState();
        return {
            original: originalViewState,
            modified: modifiedViewState,
            modelState: (_a = this._diffModel.get()) === null || _a === void 0 ? void 0 : _a.serializeState(),
        };
    }
    restoreViewState(s) {
        var _a;
        if (s && s.original && s.modified) {
            const diffEditorState = s;
            this._editors.original.restoreViewState(diffEditorState.original);
            this._editors.modified.restoreViewState(diffEditorState.modified);
            if (diffEditorState.modelState) {
                (_a = this._diffModel.get()) === null || _a === void 0 ? void 0 : _a.restoreSerializedState(diffEditorState.modelState);
            }
        }
    }
    handleInitialized() {
        this._editors.original.handleInitialized();
        this._editors.modified.handleInitialized();
    }
    createViewModel(model) {
        return this._instantiationService.createInstance(DiffEditorViewModel, model, this._options);
    }
    getModel() { var _a, _b; return (_b = (_a = this._diffModel.get()) === null || _a === void 0 ? void 0 : _a.model) !== null && _b !== void 0 ? _b : null; }
    setModel(model, tx) {
        if (!model && this._diffModel.get()) {
            // Transitioning from a model to no-model
            this._accessibleDiffViewer.get().close();
        }
        const vm = model ? ('model' in model) ? { model, shouldDispose: false } : { model: this.createViewModel(model), shouldDispose: true } : undefined;
        if (this._diffModel.get() !== (vm === null || vm === void 0 ? void 0 : vm.model)) {
            subtransaction(tx, tx => {
                var _a;
                /** @description DiffEditorWidget.setModel */
                observableFromEvent.batchEventsGlobally(tx, () => {
                    this._editors.original.setModel(vm ? vm.model.model.original : null);
                    this._editors.modified.setModel(vm ? vm.model.model.modified : null);
                });
                const prevValue = this._diffModel.get();
                const shouldDispose = this._shouldDisposeDiffModel;
                this._shouldDisposeDiffModel = (_a = vm === null || vm === void 0 ? void 0 : vm.shouldDispose) !== null && _a !== void 0 ? _a : false;
                this._diffModel.set(vm === null || vm === void 0 ? void 0 : vm.model, tx);
                if (shouldDispose) {
                    prevValue === null || prevValue === void 0 ? void 0 : prevValue.dispose();
                }
            });
        }
    }
    /**
     * @param changedOptions Only has values for top-level options that have actually changed.
     */
    updateOptions(changedOptions) {
        this._options.updateOptions(changedOptions);
    }
    getContainerDomNode() { return this._domElement; }
    getOriginalEditor() { return this._editors.original; }
    getModifiedEditor() { return this._editors.modified; }
    /**
     * @deprecated Use `this.getDiffComputationResult().changes2` instead.
     */
    getLineChanges() {
        var _a;
        const diffState = (_a = this._diffModel.get()) === null || _a === void 0 ? void 0 : _a.diff.get();
        if (!diffState) {
            return null;
        }
        return toLineChanges(diffState);
    }
    revert(diff) {
        const model = this._diffModel.get();
        if (!model || !model.isDiffUpToDate.get()) {
            return;
        }
        this._editors.modified.executeEdits('diffEditor', [
            {
                range: diff.modified.toExclusiveRange(),
                text: model.model.original.getValueInRange(diff.original.toExclusiveRange())
            }
        ]);
    }
    revertRangeMappings(diffs) {
        const model = this._diffModel.get();
        if (!model || !model.isDiffUpToDate.get()) {
            return;
        }
        const changes = diffs.map(c => ({
            range: c.modifiedRange,
            text: model.model.original.getValueInRange(c.originalRange)
        }));
        this._editors.modified.executeEdits('diffEditor', changes);
    }
    _goTo(diff) {
        this._editors.modified.setPosition(new Position(diff.lineRangeMapping.modified.startLineNumber, 1));
        this._editors.modified.revealRangeInCenter(diff.lineRangeMapping.modified.toExclusiveRange());
    }
    goToDiff(target) {
        var _a, _b, _c, _d;
        const diffs = (_b = (_a = this._diffModel.get()) === null || _a === void 0 ? void 0 : _a.diff.get()) === null || _b === void 0 ? void 0 : _b.mappings;
        if (!diffs || diffs.length === 0) {
            return;
        }
        const curLineNumber = this._editors.modified.getPosition().lineNumber;
        let diff;
        if (target === 'next') {
            diff = (_c = diffs.find(d => d.lineRangeMapping.modified.startLineNumber > curLineNumber)) !== null && _c !== void 0 ? _c : diffs[0];
        }
        else {
            diff = (_d = findLast(diffs, d => d.lineRangeMapping.modified.startLineNumber < curLineNumber)) !== null && _d !== void 0 ? _d : diffs[diffs.length - 1];
        }
        this._goTo(diff);
        if (diff.lineRangeMapping.modified.isEmpty) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineDeleted, { source: 'diffEditor.goToDiff' });
        }
        else if (diff.lineRangeMapping.original.isEmpty) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineInserted, { source: 'diffEditor.goToDiff' });
        }
        else if (diff) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineModified, { source: 'diffEditor.goToDiff' });
        }
    }
    revealFirstDiff() {
        const diffModel = this._diffModel.get();
        if (!diffModel) {
            return;
        }
        // wait for the diff computation to finish
        this.waitForDiff().then(() => {
            var _a;
            const diffs = (_a = diffModel.diff.get()) === null || _a === void 0 ? void 0 : _a.mappings;
            if (!diffs || diffs.length === 0) {
                return;
            }
            this._goTo(diffs[0]);
        });
    }
    accessibleDiffViewerNext() { this._accessibleDiffViewer.get().next(); }
    accessibleDiffViewerPrev() { this._accessibleDiffViewer.get().prev(); }
    async waitForDiff() {
        const diffModel = this._diffModel.get();
        if (!diffModel) {
            return;
        }
        await diffModel.waitForDiff();
    }
    mapToOtherSide() {
        var _a, _b;
        const isModifiedFocus = this._editors.modified.hasWidgetFocus();
        const source = isModifiedFocus ? this._editors.modified : this._editors.original;
        const destination = isModifiedFocus ? this._editors.original : this._editors.modified;
        let destinationSelection;
        const sourceSelection = source.getSelection();
        if (sourceSelection) {
            const mappings = (_b = (_a = this._diffModel.get()) === null || _a === void 0 ? void 0 : _a.diff.get()) === null || _b === void 0 ? void 0 : _b.mappings.map(m => isModifiedFocus ? m.lineRangeMapping.flip() : m.lineRangeMapping);
            if (mappings) {
                const newRange1 = translatePosition(sourceSelection.getStartPosition(), mappings);
                const newRange2 = translatePosition(sourceSelection.getEndPosition(), mappings);
                destinationSelection = Range.plusRange(newRange1, newRange2);
            }
        }
        return { destination, destinationSelection };
    }
    switchSide() {
        const { destination, destinationSelection } = this.mapToOtherSide();
        destination.focus();
        if (destinationSelection) {
            destination.setSelection(destinationSelection);
        }
    }
    exitCompareMove() {
        const model = this._diffModel.get();
        if (!model) {
            return;
        }
        model.movedTextToCompare.set(undefined, undefined);
    }
    collapseAllUnchangedRegions() {
        var _a;
        const unchangedRegions = (_a = this._diffModel.get()) === null || _a === void 0 ? void 0 : _a.unchangedRegions.get();
        if (!unchangedRegions) {
            return;
        }
        transaction(tx => {
            for (const region of unchangedRegions) {
                region.collapseAll(tx);
            }
        });
    }
    showAllUnchangedRegions() {
        var _a;
        const unchangedRegions = (_a = this._diffModel.get()) === null || _a === void 0 ? void 0 : _a.unchangedRegions.get();
        if (!unchangedRegions) {
            return;
        }
        transaction(tx => {
            for (const region of unchangedRegions) {
                region.showAll(tx);
            }
        });
    }
    _handleCursorPositionChange(e, isModifiedEditor) {
        var _a, _b;
        if ((e === null || e === void 0 ? void 0 : e.reason) === 3 /* CursorChangeReason.Explicit */) {
            const diff = (_b = (_a = this._diffModel.get()) === null || _a === void 0 ? void 0 : _a.diff.get()) === null || _b === void 0 ? void 0 : _b.mappings.find(m => isModifiedEditor ? m.lineRangeMapping.modified.contains(e.position.lineNumber) : m.lineRangeMapping.original.contains(e.position.lineNumber));
            if (diff === null || diff === void 0 ? void 0 : diff.lineRangeMapping.modified.isEmpty) {
                this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineDeleted, { source: 'diffEditor.cursorPositionChanged' });
            }
            else if (diff === null || diff === void 0 ? void 0 : diff.lineRangeMapping.original.isEmpty) {
                this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineInserted, { source: 'diffEditor.cursorPositionChanged' });
            }
            else if (diff) {
                this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineModified, { source: 'diffEditor.cursorPositionChanged' });
            }
        }
    }
};
DiffEditorWidget = __decorate([
    __param(3, IContextKeyService),
    __param(4, IInstantiationService),
    __param(5, ICodeEditorService),
    __param(6, IAccessibilitySignalService),
    __param(7, IEditorProgressService)
], DiffEditorWidget);
export { DiffEditorWidget };
function toLineChanges(state) {
    return state.mappings.map(x => {
        const m = x.lineRangeMapping;
        let originalStartLineNumber;
        let originalEndLineNumber;
        let modifiedStartLineNumber;
        let modifiedEndLineNumber;
        let innerChanges = m.innerChanges;
        if (m.original.isEmpty) {
            // Insertion
            originalStartLineNumber = m.original.startLineNumber - 1;
            originalEndLineNumber = 0;
            innerChanges = undefined;
        }
        else {
            originalStartLineNumber = m.original.startLineNumber;
            originalEndLineNumber = m.original.endLineNumberExclusive - 1;
        }
        if (m.modified.isEmpty) {
            // Deletion
            modifiedStartLineNumber = m.modified.startLineNumber - 1;
            modifiedEndLineNumber = 0;
            innerChanges = undefined;
        }
        else {
            modifiedStartLineNumber = m.modified.startLineNumber;
            modifiedEndLineNumber = m.modified.endLineNumberExclusive - 1;
        }
        return {
            originalStartLineNumber,
            originalEndLineNumber,
            modifiedStartLineNumber,
            modifiedEndLineNumber,
            charChanges: innerChanges === null || innerChanges === void 0 ? void 0 : innerChanges.map(m => ({
                originalStartLineNumber: m.originalRange.startLineNumber,
                originalStartColumn: m.originalRange.startColumn,
                originalEndLineNumber: m.originalRange.endLineNumber,
                originalEndColumn: m.originalRange.endColumn,
                modifiedStartLineNumber: m.modifiedRange.startLineNumber,
                modifiedStartColumn: m.modifiedRange.startColumn,
                modifiedEndLineNumber: m.modifiedRange.endLineNumber,
                modifiedEndColumn: m.modifiedRange.endColumn,
            }))
        };
    });
}
