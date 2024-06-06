/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertFn } from '../assert.js';
import { strictEquals } from '../equals.js';
import { DisposableStore } from '../lifecycle.js';
import { BaseObservable, _setDerivedOpts } from './base.js';
import { DebugNameData } from './debugName.js';
import { getLogger } from './logging.js';
export function derived(computeFnOrOwner, computeFn) {
    if (computeFn !== undefined) {
        return new Derived(new DebugNameData(computeFnOrOwner, undefined, computeFn), computeFn, undefined, undefined, undefined, strictEquals);
    }
    return new Derived(new DebugNameData(undefined, undefined, computeFnOrOwner), computeFnOrOwner, undefined, undefined, undefined, strictEquals);
}
export function derivedOpts(options, computeFn) {
    var _a;
    return new Derived(new DebugNameData(options.owner, options.debugName, options.debugReferenceFn), computeFn, undefined, undefined, options.onLastObserverRemoved, (_a = options.equalsFn) !== null && _a !== void 0 ? _a : strictEquals);
}
_setDerivedOpts(derivedOpts);
/**
 * Represents an observable that is derived from other observables.
 * The value is only recomputed when absolutely needed.
 *
 * {@link computeFn} should start with a JS Doc using `@description` to name the derived.
 *
 * Use `createEmptyChangeSummary` to create a "change summary" that can collect the changes.
 * Use `handleChange` to add a reported change to the change summary.
 * The compute function is given the last change summary.
 * The change summary is discarded after the compute function was called.
 *
 * @see derived
 */
export function derivedHandleChanges(options, computeFn) {
    var _a;
    return new Derived(new DebugNameData(options.owner, options.debugName, undefined), computeFn, options.createEmptyChangeSummary, options.handleChange, undefined, (_a = options.equalityComparer) !== null && _a !== void 0 ? _a : strictEquals);
}
export function derivedWithStore(computeFnOrOwner, computeFnOrUndefined) {
    let computeFn;
    let owner;
    if (computeFnOrUndefined === undefined) {
        computeFn = computeFnOrOwner;
        owner = undefined;
    }
    else {
        owner = computeFnOrOwner;
        computeFn = computeFnOrUndefined;
    }
    const store = new DisposableStore();
    return new Derived(new DebugNameData(owner, undefined, computeFn), r => {
        store.clear();
        return computeFn(r, store);
    }, undefined, undefined, () => store.dispose(), strictEquals);
}
export function derivedDisposable(computeFnOrOwner, computeFnOrUndefined) {
    let computeFn;
    let owner;
    if (computeFnOrUndefined === undefined) {
        computeFn = computeFnOrOwner;
        owner = undefined;
    }
    else {
        owner = computeFnOrOwner;
        computeFn = computeFnOrUndefined;
    }
    const store = new DisposableStore();
    return new Derived(new DebugNameData(owner, undefined, computeFn), r => {
        store.clear();
        const result = computeFn(r);
        if (result) {
            store.add(result);
        }
        return result;
    }, undefined, undefined, () => store.dispose(), strictEquals);
}
export class Derived extends BaseObservable {
    get debugName() {
        var _a;
        return (_a = this._debugNameData.getDebugName(this)) !== null && _a !== void 0 ? _a : '(anonymous)';
    }
    constructor(_debugNameData, _computeFn, createChangeSummary, _handleChange, _handleLastObserverRemoved = undefined, _equalityComparator) {
        var _a, _b;
        super();
        this._debugNameData = _debugNameData;
        this._computeFn = _computeFn;
        this.createChangeSummary = createChangeSummary;
        this._handleChange = _handleChange;
        this._handleLastObserverRemoved = _handleLastObserverRemoved;
        this._equalityComparator = _equalityComparator;
        this.state = 0 /* DerivedState.initial */;
        this.value = undefined;
        this.updateCount = 0;
        this.dependencies = new Set();
        this.dependenciesToBeRemoved = new Set();
        this.changeSummary = undefined;
        this.changeSummary = (_a = this.createChangeSummary) === null || _a === void 0 ? void 0 : _a.call(this);
        (_b = getLogger()) === null || _b === void 0 ? void 0 : _b.handleDerivedCreated(this);
    }
    onLastObserverRemoved() {
        var _a;
        /**
         * We are not tracking changes anymore, thus we have to assume
         * that our cache is invalid.
         */
        this.state = 0 /* DerivedState.initial */;
        this.value = undefined;
        for (const d of this.dependencies) {
            d.removeObserver(this);
        }
        this.dependencies.clear();
        (_a = this._handleLastObserverRemoved) === null || _a === void 0 ? void 0 : _a.call(this);
    }
    get() {
        var _a;
        if (this.observers.size === 0) {
            // Without observers, we don't know when to clean up stuff.
            // Thus, we don't cache anything to prevent memory leaks.
            const result = this._computeFn(this, (_a = this.createChangeSummary) === null || _a === void 0 ? void 0 : _a.call(this));
            // Clear new dependencies
            this.onLastObserverRemoved();
            return result;
        }
        else {
            do {
                // We might not get a notification for a dependency that changed while it is updating,
                // thus we also have to ask all our depedencies if they changed in this case.
                if (this.state === 1 /* DerivedState.dependenciesMightHaveChanged */) {
                    for (const d of this.dependencies) {
                        /** might call {@link handleChange} indirectly, which could make us stale */
                        d.reportChanges();
                        if (this.state === 2 /* DerivedState.stale */) {
                            // The other dependencies will refresh on demand, so early break
                            break;
                        }
                    }
                }
                // We called report changes of all dependencies.
                // If we are still not stale, we can assume to be up to date again.
                if (this.state === 1 /* DerivedState.dependenciesMightHaveChanged */) {
                    this.state = 3 /* DerivedState.upToDate */;
                }
                this._recomputeIfNeeded();
                // In case recomputation changed one of our dependencies, we need to recompute again.
            } while (this.state !== 3 /* DerivedState.upToDate */);
            return this.value;
        }
    }
    _recomputeIfNeeded() {
        var _a, _b;
        if (this.state === 3 /* DerivedState.upToDate */) {
            return;
        }
        const emptySet = this.dependenciesToBeRemoved;
        this.dependenciesToBeRemoved = this.dependencies;
        this.dependencies = emptySet;
        const hadValue = this.state !== 0 /* DerivedState.initial */;
        const oldValue = this.value;
        this.state = 3 /* DerivedState.upToDate */;
        const changeSummary = this.changeSummary;
        this.changeSummary = (_a = this.createChangeSummary) === null || _a === void 0 ? void 0 : _a.call(this);
        try {
            /** might call {@link handleChange} indirectly, which could invalidate us */
            this.value = this._computeFn(this, changeSummary);
        }
        finally {
            // We don't want our observed observables to think that they are (not even temporarily) not being observed.
            // Thus, we only unsubscribe from observables that are definitely not read anymore.
            for (const o of this.dependenciesToBeRemoved) {
                o.removeObserver(this);
            }
            this.dependenciesToBeRemoved.clear();
        }
        const didChange = hadValue && !(this._equalityComparator(oldValue, this.value));
        (_b = getLogger()) === null || _b === void 0 ? void 0 : _b.handleDerivedRecomputed(this, {
            oldValue,
            newValue: this.value,
            change: undefined,
            didChange,
            hadValue,
        });
        if (didChange) {
            for (const r of this.observers) {
                r.handleChange(this, undefined);
            }
        }
    }
    toString() {
        return `LazyDerived<${this.debugName}>`;
    }
    // IObserver Implementation
    beginUpdate(_observable) {
        this.updateCount++;
        const propagateBeginUpdate = this.updateCount === 1;
        if (this.state === 3 /* DerivedState.upToDate */) {
            this.state = 1 /* DerivedState.dependenciesMightHaveChanged */;
            // If we propagate begin update, that will already signal a possible change.
            if (!propagateBeginUpdate) {
                for (const r of this.observers) {
                    r.handlePossibleChange(this);
                }
            }
        }
        if (propagateBeginUpdate) {
            for (const r of this.observers) {
                r.beginUpdate(this); // This signals a possible change
            }
        }
    }
    endUpdate(_observable) {
        this.updateCount--;
        if (this.updateCount === 0) {
            // End update could change the observer list.
            const observers = [...this.observers];
            for (const r of observers) {
                r.endUpdate(this);
            }
        }
        assertFn(() => this.updateCount >= 0);
    }
    handlePossibleChange(observable) {
        // In all other states, observers already know that we might have changed.
        if (this.state === 3 /* DerivedState.upToDate */ && this.dependencies.has(observable) && !this.dependenciesToBeRemoved.has(observable)) {
            this.state = 1 /* DerivedState.dependenciesMightHaveChanged */;
            for (const r of this.observers) {
                r.handlePossibleChange(this);
            }
        }
    }
    handleChange(observable, change) {
        if (this.dependencies.has(observable) && !this.dependenciesToBeRemoved.has(observable)) {
            const shouldReact = this._handleChange ? this._handleChange({
                changedObservable: observable,
                change,
                didChange: o => o === observable,
            }, this.changeSummary) : true;
            const wasUpToDate = this.state === 3 /* DerivedState.upToDate */;
            if (shouldReact && (this.state === 1 /* DerivedState.dependenciesMightHaveChanged */ || wasUpToDate)) {
                this.state = 2 /* DerivedState.stale */;
                if (wasUpToDate) {
                    for (const r of this.observers) {
                        r.handlePossibleChange(this);
                    }
                }
            }
        }
    }
    // IReader Implementation
    readObservable(observable) {
        // Subscribe before getting the value to enable caching
        observable.addObserver(this);
        /** This might call {@link handleChange} indirectly, which could invalidate us */
        const value = observable.get();
        // Which is why we only add the observable to the dependencies now.
        this.dependencies.add(observable);
        this.dependenciesToBeRemoved.delete(observable);
        return value;
    }
    addObserver(observer) {
        const shouldCallBeginUpdate = !this.observers.has(observer) && this.updateCount > 0;
        super.addObserver(observer);
        if (shouldCallBeginUpdate) {
            observer.beginUpdate(this);
        }
    }
    removeObserver(observer) {
        const shouldCallEndUpdate = this.observers.has(observer) && this.updateCount > 0;
        super.removeObserver(observer);
        if (shouldCallEndUpdate) {
            // Calling end update after removing the observer makes sure endUpdate cannot be called twice here.
            observer.endUpdate(this);
        }
    }
}
