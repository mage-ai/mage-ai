/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertFn } from '../assert.js';
import { DisposableStore, markAsDisposed, toDisposable, trackDisposable } from '../lifecycle.js';
import { DebugNameData } from './debugName.js';
import { getLogger } from './logging.js';
/**
 * Runs immediately and whenever a transaction ends and an observed observable changed.
 * {@link fn} should start with a JS Doc using `@description` to name the autorun.
 */
export function autorun(fn) {
    return new AutorunObserver(new DebugNameData(undefined, undefined, fn), fn, undefined, undefined);
}
/**
 * Runs immediately and whenever a transaction ends and an observed observable changed.
 * {@link fn} should start with a JS Doc using `@description` to name the autorun.
 */
export function autorunOpts(options, fn) {
    var _a;
    return new AutorunObserver(new DebugNameData(options.owner, options.debugName, (_a = options.debugReferenceFn) !== null && _a !== void 0 ? _a : fn), fn, undefined, undefined);
}
/**
 * Runs immediately and whenever a transaction ends and an observed observable changed.
 * {@link fn} should start with a JS Doc using `@description` to name the autorun.
 *
 * Use `createEmptyChangeSummary` to create a "change summary" that can collect the changes.
 * Use `handleChange` to add a reported change to the change summary.
 * The run function is given the last change summary.
 * The change summary is discarded after the run function was called.
 *
 * @see autorun
 */
export function autorunHandleChanges(options, fn) {
    var _a;
    return new AutorunObserver(new DebugNameData(options.owner, options.debugName, (_a = options.debugReferenceFn) !== null && _a !== void 0 ? _a : fn), fn, options.createEmptyChangeSummary, options.handleChange);
}
/**
 * @see autorun (but with a disposable store that is cleared before the next run or on dispose)
 */
export function autorunWithStore(fn) {
    const store = new DisposableStore();
    const disposable = autorunOpts({
        owner: undefined,
        debugName: undefined,
        debugReferenceFn: fn,
    }, reader => {
        store.clear();
        fn(reader, store);
    });
    return toDisposable(() => {
        disposable.dispose();
        store.dispose();
    });
}
export class AutorunObserver {
    get debugName() {
        var _a;
        return (_a = this._debugNameData.getDebugName(this)) !== null && _a !== void 0 ? _a : '(anonymous)';
    }
    constructor(_debugNameData, _runFn, createChangeSummary, _handleChange) {
        var _a, _b;
        this._debugNameData = _debugNameData;
        this._runFn = _runFn;
        this.createChangeSummary = createChangeSummary;
        this._handleChange = _handleChange;
        this.state = 2 /* AutorunState.stale */;
        this.updateCount = 0;
        this.disposed = false;
        this.dependencies = new Set();
        this.dependenciesToBeRemoved = new Set();
        this.changeSummary = (_a = this.createChangeSummary) === null || _a === void 0 ? void 0 : _a.call(this);
        (_b = getLogger()) === null || _b === void 0 ? void 0 : _b.handleAutorunCreated(this);
        this._runIfNeeded();
        trackDisposable(this);
    }
    dispose() {
        this.disposed = true;
        for (const o of this.dependencies) {
            o.removeObserver(this);
        }
        this.dependencies.clear();
        markAsDisposed(this);
    }
    _runIfNeeded() {
        var _a, _b, _c;
        if (this.state === 3 /* AutorunState.upToDate */) {
            return;
        }
        const emptySet = this.dependenciesToBeRemoved;
        this.dependenciesToBeRemoved = this.dependencies;
        this.dependencies = emptySet;
        this.state = 3 /* AutorunState.upToDate */;
        const isDisposed = this.disposed;
        try {
            if (!isDisposed) {
                (_a = getLogger()) === null || _a === void 0 ? void 0 : _a.handleAutorunTriggered(this);
                const changeSummary = this.changeSummary;
                this.changeSummary = (_b = this.createChangeSummary) === null || _b === void 0 ? void 0 : _b.call(this);
                this._runFn(this, changeSummary);
            }
        }
        finally {
            if (!isDisposed) {
                (_c = getLogger()) === null || _c === void 0 ? void 0 : _c.handleAutorunFinished(this);
            }
            // We don't want our observed observables to think that they are (not even temporarily) not being observed.
            // Thus, we only unsubscribe from observables that are definitely not read anymore.
            for (const o of this.dependenciesToBeRemoved) {
                o.removeObserver(this);
            }
            this.dependenciesToBeRemoved.clear();
        }
    }
    toString() {
        return `Autorun<${this.debugName}>`;
    }
    // IObserver implementation
    beginUpdate() {
        if (this.state === 3 /* AutorunState.upToDate */) {
            this.state = 1 /* AutorunState.dependenciesMightHaveChanged */;
        }
        this.updateCount++;
    }
    endUpdate() {
        if (this.updateCount === 1) {
            do {
                if (this.state === 1 /* AutorunState.dependenciesMightHaveChanged */) {
                    this.state = 3 /* AutorunState.upToDate */;
                    for (const d of this.dependencies) {
                        d.reportChanges();
                        if (this.state === 2 /* AutorunState.stale */) {
                            // The other dependencies will refresh on demand
                            break;
                        }
                    }
                }
                this._runIfNeeded();
            } while (this.state !== 3 /* AutorunState.upToDate */);
        }
        this.updateCount--;
        assertFn(() => this.updateCount >= 0);
    }
    handlePossibleChange(observable) {
        if (this.state === 3 /* AutorunState.upToDate */ && this.dependencies.has(observable) && !this.dependenciesToBeRemoved.has(observable)) {
            this.state = 1 /* AutorunState.dependenciesMightHaveChanged */;
        }
    }
    handleChange(observable, change) {
        if (this.dependencies.has(observable) && !this.dependenciesToBeRemoved.has(observable)) {
            const shouldReact = this._handleChange ? this._handleChange({
                changedObservable: observable,
                change,
                didChange: o => o === observable,
            }, this.changeSummary) : true;
            if (shouldReact) {
                this.state = 2 /* AutorunState.stale */;
            }
        }
    }
    // IReader implementation
    readObservable(observable) {
        // In case the run action disposes the autorun
        if (this.disposed) {
            return observable.get();
        }
        observable.addObserver(this);
        const value = observable.get();
        this.dependencies.add(observable);
        this.dependenciesToBeRemoved.delete(observable);
        return value;
    }
}
(function (autorun) {
    autorun.Observer = AutorunObserver;
})(autorun || (autorun = {}));
