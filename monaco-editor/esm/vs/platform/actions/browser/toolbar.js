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
import { addDisposableListener, getWindow } from '../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../base/browser/mouseEvent.js';
import { ToggleMenuAction, ToolBar } from '../../../base/browser/ui/toolbar/toolbar.js';
import { Separator, toAction } from '../../../base/common/actions.js';
import { coalesceInPlace } from '../../../base/common/arrays.js';
import { intersection } from '../../../base/common/collections.js';
import { BugIndicatingError } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { Iterable } from '../../../base/common/iterator.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { localize } from '../../../nls.js';
import { createAndFillInActionBarActions } from './menuEntryActionViewItem.js';
import { IMenuService, MenuItemAction, SubmenuItemAction } from '../common/actions.js';
import { createConfigureKeybindingAction } from '../common/menuService.js';
import { ICommandService } from '../../commands/common/commands.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { IContextMenuService } from '../../contextview/browser/contextView.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
/**
 * The `WorkbenchToolBar` does
 * - support hiding of menu items
 * - lookup keybindings for each actions automatically
 * - send `workbenchActionExecuted`-events for each action
 *
 * See {@link MenuWorkbenchToolBar} for a toolbar that is backed by a menu.
 */
let WorkbenchToolBar = class WorkbenchToolBar extends ToolBar {
    constructor(container, _options, _menuService, _contextKeyService, _contextMenuService, _keybindingService, _commandService, telemetryService) {
        super(container, _contextMenuService, {
            // defaults
            getKeyBinding: (action) => { var _a; return (_a = _keybindingService.lookupKeybinding(action.id)) !== null && _a !== void 0 ? _a : undefined; },
            // options (override defaults)
            ..._options,
            // mandatory (overide options)
            allowContextMenu: true,
            skipTelemetry: typeof (_options === null || _options === void 0 ? void 0 : _options.telemetrySource) === 'string',
        });
        this._options = _options;
        this._menuService = _menuService;
        this._contextKeyService = _contextKeyService;
        this._contextMenuService = _contextMenuService;
        this._keybindingService = _keybindingService;
        this._commandService = _commandService;
        this._sessionDisposables = this._store.add(new DisposableStore());
        // telemetry logic
        const telemetrySource = _options === null || _options === void 0 ? void 0 : _options.telemetrySource;
        if (telemetrySource) {
            this._store.add(this.actionBar.onDidRun(e => telemetryService.publicLog2('workbenchActionExecuted', { id: e.action.id, from: telemetrySource })));
        }
    }
    setActions(_primary, _secondary = [], menuIds) {
        var _a, _b, _c;
        this._sessionDisposables.clear();
        const primary = _primary.slice(); // for hiding and overflow we set some items to undefined
        const secondary = _secondary.slice();
        const toggleActions = [];
        let toggleActionsCheckedCount = 0;
        const extraSecondary = [];
        let someAreHidden = false;
        // unless disabled, move all hidden items to secondary group or ignore them
        if (((_a = this._options) === null || _a === void 0 ? void 0 : _a.hiddenItemStrategy) !== -1 /* HiddenItemStrategy.NoHide */) {
            for (let i = 0; i < primary.length; i++) {
                const action = primary[i];
                if (!(action instanceof MenuItemAction) && !(action instanceof SubmenuItemAction)) {
                    // console.warn(`Action ${action.id}/${action.label} is not a MenuItemAction`);
                    continue;
                }
                if (!action.hideActions) {
                    continue;
                }
                // collect all toggle actions
                toggleActions.push(action.hideActions.toggle);
                if (action.hideActions.toggle.checked) {
                    toggleActionsCheckedCount++;
                }
                // hidden items move into overflow or ignore
                if (action.hideActions.isHidden) {
                    someAreHidden = true;
                    primary[i] = undefined;
                    if (((_b = this._options) === null || _b === void 0 ? void 0 : _b.hiddenItemStrategy) !== 0 /* HiddenItemStrategy.Ignore */) {
                        extraSecondary[i] = action;
                    }
                }
            }
        }
        // count for max
        if (((_c = this._options) === null || _c === void 0 ? void 0 : _c.overflowBehavior) !== undefined) {
            const exemptedIds = intersection(new Set(this._options.overflowBehavior.exempted), Iterable.map(primary, a => a === null || a === void 0 ? void 0 : a.id));
            const maxItems = this._options.overflowBehavior.maxItems - exemptedIds.size;
            let count = 0;
            for (let i = 0; i < primary.length; i++) {
                const action = primary[i];
                if (!action) {
                    continue;
                }
                count++;
                if (exemptedIds.has(action.id)) {
                    continue;
                }
                if (count >= maxItems) {
                    primary[i] = undefined;
                    extraSecondary[i] = action;
                }
            }
        }
        // coalesce turns Array<IAction|undefined> into IAction[]
        coalesceInPlace(primary);
        coalesceInPlace(extraSecondary);
        super.setActions(primary, Separator.join(extraSecondary, secondary));
        // add context menu for toggle and configure keybinding actions
        if (toggleActions.length > 0 || primary.length > 0) {
            this._sessionDisposables.add(addDisposableListener(this.getElement(), 'contextmenu', e => {
                var _a, _b, _c, _d, _e;
                const event = new StandardMouseEvent(getWindow(this.getElement()), e);
                const action = this.getItemAction(event.target);
                if (!(action)) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                const primaryActions = [];
                // -- Configure Keybinding Action --
                if (action instanceof MenuItemAction && action.menuKeybinding) {
                    primaryActions.push(action.menuKeybinding);
                }
                else if (!(action instanceof SubmenuItemAction || action instanceof ToggleMenuAction)) {
                    primaryActions.push(createConfigureKeybindingAction(action.id, undefined, this._commandService, this._keybindingService));
                }
                // -- Hide Actions --
                if (toggleActions.length > 0) {
                    let noHide = false;
                    // last item cannot be hidden when using ignore strategy
                    if (toggleActionsCheckedCount === 1 && ((_a = this._options) === null || _a === void 0 ? void 0 : _a.hiddenItemStrategy) === 0 /* HiddenItemStrategy.Ignore */) {
                        noHide = true;
                        for (let i = 0; i < toggleActions.length; i++) {
                            if (toggleActions[i].checked) {
                                toggleActions[i] = toAction({
                                    id: action.id,
                                    label: action.label,
                                    checked: true,
                                    enabled: false,
                                    run() { }
                                });
                                break; // there is only one
                            }
                        }
                    }
                    // add "hide foo" actions
                    if (!noHide && (action instanceof MenuItemAction || action instanceof SubmenuItemAction)) {
                        if (!action.hideActions) {
                            // no context menu for MenuItemAction instances that support no hiding
                            // those are fake actions and need to be cleaned up
                            return;
                        }
                        primaryActions.push(action.hideActions.hide);
                    }
                    else {
                        primaryActions.push(toAction({
                            id: 'label',
                            label: localize('hide', "Hide"),
                            enabled: false,
                            run() { }
                        }));
                    }
                }
                const actions = Separator.join(primaryActions, toggleActions);
                // add "Reset Menu" action
                if (((_b = this._options) === null || _b === void 0 ? void 0 : _b.resetMenu) && !menuIds) {
                    menuIds = [this._options.resetMenu];
                }
                if (someAreHidden && menuIds) {
                    actions.push(new Separator());
                    actions.push(toAction({
                        id: 'resetThisMenu',
                        label: localize('resetThisMenu', "Reset Menu"),
                        run: () => this._menuService.resetHiddenStates(menuIds)
                    }));
                }
                if (actions.length === 0) {
                    return;
                }
                this._contextMenuService.showContextMenu({
                    getAnchor: () => event,
                    getActions: () => actions,
                    // add context menu actions (iff appicable)
                    menuId: (_c = this._options) === null || _c === void 0 ? void 0 : _c.contextMenu,
                    menuActionOptions: { renderShortTitle: true, ...(_d = this._options) === null || _d === void 0 ? void 0 : _d.menuOptions },
                    skipTelemetry: typeof ((_e = this._options) === null || _e === void 0 ? void 0 : _e.telemetrySource) === 'string',
                    contextKeyService: this._contextKeyService,
                });
            }));
        }
    }
};
WorkbenchToolBar = __decorate([
    __param(2, IMenuService),
    __param(3, IContextKeyService),
    __param(4, IContextMenuService),
    __param(5, IKeybindingService),
    __param(6, ICommandService),
    __param(7, ITelemetryService)
], WorkbenchToolBar);
export { WorkbenchToolBar };
/**
 * A {@link WorkbenchToolBar workbench toolbar} that is purely driven from a {@link MenuId menu}-identifier.
 *
 * *Note* that Manual updates via `setActions` are NOT supported.
 */
let MenuWorkbenchToolBar = class MenuWorkbenchToolBar extends WorkbenchToolBar {
    constructor(container, menuId, options, menuService, contextKeyService, contextMenuService, keybindingService, commandService, telemetryService) {
        super(container, { resetMenu: menuId, ...options }, menuService, contextKeyService, contextMenuService, keybindingService, commandService, telemetryService);
        this._onDidChangeMenuItems = this._store.add(new Emitter());
        this.onDidChangeMenuItems = this._onDidChangeMenuItems.event;
        // update logic
        const menu = this._store.add(menuService.createMenu(menuId, contextKeyService, { emitEventsForSubmenuChanges: true }));
        const updateToolbar = () => {
            var _a, _b, _c;
            const primary = [];
            const secondary = [];
            createAndFillInActionBarActions(menu, options === null || options === void 0 ? void 0 : options.menuOptions, { primary, secondary }, (_a = options === null || options === void 0 ? void 0 : options.toolbarOptions) === null || _a === void 0 ? void 0 : _a.primaryGroup, (_b = options === null || options === void 0 ? void 0 : options.toolbarOptions) === null || _b === void 0 ? void 0 : _b.shouldInlineSubmenu, (_c = options === null || options === void 0 ? void 0 : options.toolbarOptions) === null || _c === void 0 ? void 0 : _c.useSeparatorsInPrimaryActions);
            container.classList.toggle('has-no-actions', primary.length === 0 && secondary.length === 0);
            super.setActions(primary, secondary);
        };
        this._store.add(menu.onDidChange(() => {
            updateToolbar();
            this._onDidChangeMenuItems.fire(this);
        }));
        updateToolbar();
    }
    /**
     * @deprecated The WorkbenchToolBar does not support this method because it works with menus.
     */
    setActions() {
        throw new BugIndicatingError('This toolbar is populated from a menu.');
    }
};
MenuWorkbenchToolBar = __decorate([
    __param(3, IMenuService),
    __param(4, IContextKeyService),
    __param(5, IContextMenuService),
    __param(6, IKeybindingService),
    __param(7, ICommandService),
    __param(8, ITelemetryService)
], MenuWorkbenchToolBar);
export { MenuWorkbenchToolBar };
