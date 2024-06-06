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
var InlineEditHintsContentWidget_1;
import { h } from '../../../../base/browser/dom.js';
import { KeybindingLabel, unthemedKeybindingLabelOptions } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { Separator } from '../../../../base/common/actions.js';
import { equals } from '../../../../base/common/arrays.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, observableFromEvent } from '../../../../base/common/observable.js';
import { OS } from '../../../../base/common/platform.js';
import './inlineEditHintsWidget.css';
import { Position } from '../../../common/core/position.js';
import { MenuEntryActionViewItem, createAndFillInActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { IMenuService, MenuId, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
let InlineEditHintsWidget = class InlineEditHintsWidget extends Disposable {
    constructor(editor, model, instantiationService) {
        super();
        this.editor = editor;
        this.model = model;
        this.instantiationService = instantiationService;
        this.alwaysShowToolbar = observableFromEvent(this.editor.onDidChangeConfiguration, () => this.editor.getOption(63 /* EditorOption.inlineEdit */).showToolbar === 'always');
        this.sessionPosition = undefined;
        this.position = derived(this, reader => {
            var _a, _b, _c;
            const ghostText = (_a = this.model.read(reader)) === null || _a === void 0 ? void 0 : _a.widget.model.ghostText.read(reader);
            if (!this.alwaysShowToolbar.read(reader) || !ghostText || ghostText.parts.length === 0) {
                this.sessionPosition = undefined;
                return null;
            }
            const firstColumn = ghostText.parts[0].column;
            if (this.sessionPosition && this.sessionPosition.lineNumber !== ghostText.lineNumber) {
                this.sessionPosition = undefined;
            }
            const position = new Position(ghostText.lineNumber, Math.min(firstColumn, (_c = (_b = this.sessionPosition) === null || _b === void 0 ? void 0 : _b.column) !== null && _c !== void 0 ? _c : Number.MAX_SAFE_INTEGER));
            this.sessionPosition = position;
            return position;
        });
        this._register(autorunWithStore((reader, store) => {
            /** @description setup content widget */
            const model = this.model.read(reader);
            if (!model || !this.alwaysShowToolbar.read(reader)) {
                return;
            }
            const contentWidget = store.add(this.instantiationService.createInstance(InlineEditHintsContentWidget, this.editor, true, this.position));
            editor.addContentWidget(contentWidget);
            store.add(toDisposable(() => editor.removeContentWidget(contentWidget)));
        }));
    }
};
InlineEditHintsWidget = __decorate([
    __param(2, IInstantiationService)
], InlineEditHintsWidget);
export { InlineEditHintsWidget };
let InlineEditHintsContentWidget = InlineEditHintsContentWidget_1 = class InlineEditHintsContentWidget extends Disposable {
    constructor(editor, withBorder, _position, instantiationService, _contextKeyService, _menuService) {
        super();
        this.editor = editor;
        this.withBorder = withBorder;
        this._position = _position;
        this._contextKeyService = _contextKeyService;
        this._menuService = _menuService;
        this.id = `InlineEditHintsContentWidget${InlineEditHintsContentWidget_1.id++}`;
        this.allowEditorOverflow = true;
        this.suppressMouseDown = false;
        this.nodes = h('div.inlineEditHints', { className: this.withBorder ? '.withBorder' : '' }, [
            h('div@toolBar'),
        ]);
        this.inlineCompletionsActionsMenus = this._register(this._menuService.createMenu(MenuId.InlineEditActions, this._contextKeyService));
        this.toolBar = this._register(instantiationService.createInstance(CustomizedMenuWorkbenchToolBar, this.nodes.toolBar, this.editor, MenuId.InlineEditToolbar, {
            menuOptions: { renderShortTitle: true },
            toolbarOptions: { primaryGroup: g => g.startsWith('primary') },
            actionViewItemProvider: (action, options) => {
                if (action instanceof MenuItemAction) {
                    return instantiationService.createInstance(StatusBarViewItem, action, undefined);
                }
                return undefined;
            },
            telemetrySource: 'InlineEditToolbar',
        }));
        this._register(this.toolBar.onDidChangeDropdownVisibility(e => {
            InlineEditHintsContentWidget_1._dropDownVisible = e;
        }));
        this._register(autorun(reader => {
            /** @description update position */
            this._position.read(reader);
            this.editor.layoutContentWidget(this);
        }));
        this._register(autorun(reader => {
            /** @description actions menu */
            const extraActions = [];
            for (const [_, group] of this.inlineCompletionsActionsMenus.getActions()) {
                for (const action of group) {
                    if (action instanceof MenuItemAction) {
                        extraActions.push(action);
                    }
                }
            }
            if (extraActions.length > 0) {
                extraActions.unshift(new Separator());
            }
            this.toolBar.setAdditionalSecondaryActions(extraActions);
        }));
    }
    getId() { return this.id; }
    getDomNode() {
        return this.nodes.root;
    }
    getPosition() {
        return {
            position: this._position.get(),
            preference: [1 /* ContentWidgetPositionPreference.ABOVE */, 2 /* ContentWidgetPositionPreference.BELOW */],
            positionAffinity: 3 /* PositionAffinity.LeftOfInjectedText */,
        };
    }
};
InlineEditHintsContentWidget._dropDownVisible = false;
InlineEditHintsContentWidget.id = 0;
InlineEditHintsContentWidget = InlineEditHintsContentWidget_1 = __decorate([
    __param(3, IInstantiationService),
    __param(4, IContextKeyService),
    __param(5, IMenuService)
], InlineEditHintsContentWidget);
export { InlineEditHintsContentWidget };
class StatusBarViewItem extends MenuEntryActionViewItem {
    updateLabel() {
        const kb = this._keybindingService.lookupKeybinding(this._action.id, this._contextKeyService);
        if (!kb) {
            return super.updateLabel();
        }
        if (this.label) {
            const div = h('div.keybinding').root;
            const k = this._register(new KeybindingLabel(div, OS, { disableTitle: true, ...unthemedKeybindingLabelOptions }));
            k.set(kb);
            this.label.textContent = this._action.label;
            this.label.appendChild(div);
            this.label.classList.add('inlineEditStatusBarItemLabel');
        }
    }
    updateTooltip() {
        // NOOP, disable tooltip
    }
}
let CustomizedMenuWorkbenchToolBar = class CustomizedMenuWorkbenchToolBar extends WorkbenchToolBar {
    constructor(container, editor, menuId, options2, menuService, contextKeyService, contextMenuService, keybindingService, commandService, telemetryService) {
        super(container, { resetMenu: menuId, ...options2 }, menuService, contextKeyService, contextMenuService, keybindingService, commandService, telemetryService);
        this.editor = editor;
        this.menuId = menuId;
        this.options2 = options2;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.menu = this._store.add(this.menuService.createMenu(this.menuId, this.contextKeyService, { emitEventsForSubmenuChanges: true }));
        this.additionalActions = [];
        this.prependedPrimaryActions = [];
        this._store.add(this.menu.onDidChange(() => this.updateToolbar()));
        this._store.add(this.editor.onDidChangeCursorPosition(() => this.updateToolbar()));
        this.updateToolbar();
    }
    updateToolbar() {
        var _a, _b, _c, _d, _e, _f, _g;
        const primary = [];
        const secondary = [];
        createAndFillInActionBarActions(this.menu, (_a = this.options2) === null || _a === void 0 ? void 0 : _a.menuOptions, { primary, secondary }, (_c = (_b = this.options2) === null || _b === void 0 ? void 0 : _b.toolbarOptions) === null || _c === void 0 ? void 0 : _c.primaryGroup, (_e = (_d = this.options2) === null || _d === void 0 ? void 0 : _d.toolbarOptions) === null || _e === void 0 ? void 0 : _e.shouldInlineSubmenu, (_g = (_f = this.options2) === null || _f === void 0 ? void 0 : _f.toolbarOptions) === null || _g === void 0 ? void 0 : _g.useSeparatorsInPrimaryActions);
        secondary.push(...this.additionalActions);
        primary.unshift(...this.prependedPrimaryActions);
        this.setActions(primary, secondary);
    }
    setAdditionalSecondaryActions(actions) {
        if (equals(this.additionalActions, actions, (a, b) => a === b)) {
            return;
        }
        this.additionalActions = actions;
        this.updateToolbar();
    }
};
CustomizedMenuWorkbenchToolBar = __decorate([
    __param(4, IMenuService),
    __param(5, IContextKeyService),
    __param(6, IContextMenuService),
    __param(7, IKeybindingService),
    __param(8, ICommandService),
    __param(9, ITelemetryService)
], CustomizedMenuWorkbenchToolBar);
export { CustomizedMenuWorkbenchToolBar };
