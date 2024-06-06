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
var MenuItemAction_1;
import { SubmenuAction } from '../../../base/common/actions.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { MicrotaskEmitter } from '../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { LinkedList } from '../../../base/common/linkedList.js';
import { CommandsRegistry, ICommandService } from '../../commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService } from '../../contextkey/common/contextkey.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { KeybindingsRegistry } from '../../keybinding/common/keybindingsRegistry.js';
export function isIMenuItem(item) {
    return item.command !== undefined;
}
export function isISubmenuItem(item) {
    return item.submenu !== undefined;
}
export class MenuId {
    /**
     * Create a new `MenuId` with the unique identifier. Will throw if a menu
     * with the identifier already exists, use `MenuId.for(ident)` or a unique
     * identifier
     */
    constructor(identifier) {
        if (MenuId._instances.has(identifier)) {
            throw new TypeError(`MenuId with identifier '${identifier}' already exists. Use MenuId.for(ident) or a unique identifier`);
        }
        MenuId._instances.set(identifier, this);
        this.id = identifier;
    }
}
MenuId._instances = new Map();
MenuId.CommandPalette = new MenuId('CommandPalette');
MenuId.DebugBreakpointsContext = new MenuId('DebugBreakpointsContext');
MenuId.DebugCallStackContext = new MenuId('DebugCallStackContext');
MenuId.DebugConsoleContext = new MenuId('DebugConsoleContext');
MenuId.DebugVariablesContext = new MenuId('DebugVariablesContext');
MenuId.NotebookVariablesContext = new MenuId('NotebookVariablesContext');
MenuId.DebugHoverContext = new MenuId('DebugHoverContext');
MenuId.DebugWatchContext = new MenuId('DebugWatchContext');
MenuId.DebugToolBar = new MenuId('DebugToolBar');
MenuId.DebugToolBarStop = new MenuId('DebugToolBarStop');
MenuId.EditorContext = new MenuId('EditorContext');
MenuId.SimpleEditorContext = new MenuId('SimpleEditorContext');
MenuId.EditorContent = new MenuId('EditorContent');
MenuId.EditorLineNumberContext = new MenuId('EditorLineNumberContext');
MenuId.EditorContextCopy = new MenuId('EditorContextCopy');
MenuId.EditorContextPeek = new MenuId('EditorContextPeek');
MenuId.EditorContextShare = new MenuId('EditorContextShare');
MenuId.EditorTitle = new MenuId('EditorTitle');
MenuId.EditorTitleRun = new MenuId('EditorTitleRun');
MenuId.EditorTitleContext = new MenuId('EditorTitleContext');
MenuId.EditorTitleContextShare = new MenuId('EditorTitleContextShare');
MenuId.EmptyEditorGroup = new MenuId('EmptyEditorGroup');
MenuId.EmptyEditorGroupContext = new MenuId('EmptyEditorGroupContext');
MenuId.EditorTabsBarContext = new MenuId('EditorTabsBarContext');
MenuId.EditorTabsBarShowTabsSubmenu = new MenuId('EditorTabsBarShowTabsSubmenu');
MenuId.EditorTabsBarShowTabsZenModeSubmenu = new MenuId('EditorTabsBarShowTabsZenModeSubmenu');
MenuId.EditorActionsPositionSubmenu = new MenuId('EditorActionsPositionSubmenu');
MenuId.ExplorerContext = new MenuId('ExplorerContext');
MenuId.ExplorerContextShare = new MenuId('ExplorerContextShare');
MenuId.ExtensionContext = new MenuId('ExtensionContext');
MenuId.GlobalActivity = new MenuId('GlobalActivity');
MenuId.CommandCenter = new MenuId('CommandCenter');
MenuId.CommandCenterCenter = new MenuId('CommandCenterCenter');
MenuId.LayoutControlMenuSubmenu = new MenuId('LayoutControlMenuSubmenu');
MenuId.LayoutControlMenu = new MenuId('LayoutControlMenu');
MenuId.MenubarMainMenu = new MenuId('MenubarMainMenu');
MenuId.MenubarAppearanceMenu = new MenuId('MenubarAppearanceMenu');
MenuId.MenubarDebugMenu = new MenuId('MenubarDebugMenu');
MenuId.MenubarEditMenu = new MenuId('MenubarEditMenu');
MenuId.MenubarCopy = new MenuId('MenubarCopy');
MenuId.MenubarFileMenu = new MenuId('MenubarFileMenu');
MenuId.MenubarGoMenu = new MenuId('MenubarGoMenu');
MenuId.MenubarHelpMenu = new MenuId('MenubarHelpMenu');
MenuId.MenubarLayoutMenu = new MenuId('MenubarLayoutMenu');
MenuId.MenubarNewBreakpointMenu = new MenuId('MenubarNewBreakpointMenu');
MenuId.PanelAlignmentMenu = new MenuId('PanelAlignmentMenu');
MenuId.PanelPositionMenu = new MenuId('PanelPositionMenu');
MenuId.ActivityBarPositionMenu = new MenuId('ActivityBarPositionMenu');
MenuId.MenubarPreferencesMenu = new MenuId('MenubarPreferencesMenu');
MenuId.MenubarRecentMenu = new MenuId('MenubarRecentMenu');
MenuId.MenubarSelectionMenu = new MenuId('MenubarSelectionMenu');
MenuId.MenubarShare = new MenuId('MenubarShare');
MenuId.MenubarSwitchEditorMenu = new MenuId('MenubarSwitchEditorMenu');
MenuId.MenubarSwitchGroupMenu = new MenuId('MenubarSwitchGroupMenu');
MenuId.MenubarTerminalMenu = new MenuId('MenubarTerminalMenu');
MenuId.MenubarViewMenu = new MenuId('MenubarViewMenu');
MenuId.MenubarHomeMenu = new MenuId('MenubarHomeMenu');
MenuId.OpenEditorsContext = new MenuId('OpenEditorsContext');
MenuId.OpenEditorsContextShare = new MenuId('OpenEditorsContextShare');
MenuId.ProblemsPanelContext = new MenuId('ProblemsPanelContext');
MenuId.SCMInputBox = new MenuId('SCMInputBox');
MenuId.SCMChangesSeparator = new MenuId('SCMChangesSeparator');
MenuId.SCMIncomingChanges = new MenuId('SCMIncomingChanges');
MenuId.SCMIncomingChangesContext = new MenuId('SCMIncomingChangesContext');
MenuId.SCMIncomingChangesSetting = new MenuId('SCMIncomingChangesSetting');
MenuId.SCMOutgoingChanges = new MenuId('SCMOutgoingChanges');
MenuId.SCMOutgoingChangesContext = new MenuId('SCMOutgoingChangesContext');
MenuId.SCMOutgoingChangesSetting = new MenuId('SCMOutgoingChangesSetting');
MenuId.SCMIncomingChangesAllChangesContext = new MenuId('SCMIncomingChangesAllChangesContext');
MenuId.SCMIncomingChangesHistoryItemContext = new MenuId('SCMIncomingChangesHistoryItemContext');
MenuId.SCMOutgoingChangesAllChangesContext = new MenuId('SCMOutgoingChangesAllChangesContext');
MenuId.SCMOutgoingChangesHistoryItemContext = new MenuId('SCMOutgoingChangesHistoryItemContext');
MenuId.SCMChangeContext = new MenuId('SCMChangeContext');
MenuId.SCMResourceContext = new MenuId('SCMResourceContext');
MenuId.SCMResourceContextShare = new MenuId('SCMResourceContextShare');
MenuId.SCMResourceFolderContext = new MenuId('SCMResourceFolderContext');
MenuId.SCMResourceGroupContext = new MenuId('SCMResourceGroupContext');
MenuId.SCMSourceControl = new MenuId('SCMSourceControl');
MenuId.SCMSourceControlInline = new MenuId('SCMSourceControlInline');
MenuId.SCMSourceControlTitle = new MenuId('SCMSourceControlTitle');
MenuId.SCMTitle = new MenuId('SCMTitle');
MenuId.SearchContext = new MenuId('SearchContext');
MenuId.SearchActionMenu = new MenuId('SearchActionContext');
MenuId.StatusBarWindowIndicatorMenu = new MenuId('StatusBarWindowIndicatorMenu');
MenuId.StatusBarRemoteIndicatorMenu = new MenuId('StatusBarRemoteIndicatorMenu');
MenuId.StickyScrollContext = new MenuId('StickyScrollContext');
MenuId.TestItem = new MenuId('TestItem');
MenuId.TestItemGutter = new MenuId('TestItemGutter');
MenuId.TestMessageContext = new MenuId('TestMessageContext');
MenuId.TestMessageContent = new MenuId('TestMessageContent');
MenuId.TestPeekElement = new MenuId('TestPeekElement');
MenuId.TestPeekTitle = new MenuId('TestPeekTitle');
MenuId.TouchBarContext = new MenuId('TouchBarContext');
MenuId.TitleBarContext = new MenuId('TitleBarContext');
MenuId.TitleBarTitleContext = new MenuId('TitleBarTitleContext');
MenuId.TunnelContext = new MenuId('TunnelContext');
MenuId.TunnelPrivacy = new MenuId('TunnelPrivacy');
MenuId.TunnelProtocol = new MenuId('TunnelProtocol');
MenuId.TunnelPortInline = new MenuId('TunnelInline');
MenuId.TunnelTitle = new MenuId('TunnelTitle');
MenuId.TunnelLocalAddressInline = new MenuId('TunnelLocalAddressInline');
MenuId.TunnelOriginInline = new MenuId('TunnelOriginInline');
MenuId.ViewItemContext = new MenuId('ViewItemContext');
MenuId.ViewContainerTitle = new MenuId('ViewContainerTitle');
MenuId.ViewContainerTitleContext = new MenuId('ViewContainerTitleContext');
MenuId.ViewTitle = new MenuId('ViewTitle');
MenuId.ViewTitleContext = new MenuId('ViewTitleContext');
MenuId.CommentEditorActions = new MenuId('CommentEditorActions');
MenuId.CommentThreadTitle = new MenuId('CommentThreadTitle');
MenuId.CommentThreadActions = new MenuId('CommentThreadActions');
MenuId.CommentThreadAdditionalActions = new MenuId('CommentThreadAdditionalActions');
MenuId.CommentThreadTitleContext = new MenuId('CommentThreadTitleContext');
MenuId.CommentThreadCommentContext = new MenuId('CommentThreadCommentContext');
MenuId.CommentTitle = new MenuId('CommentTitle');
MenuId.CommentActions = new MenuId('CommentActions');
MenuId.CommentsViewThreadActions = new MenuId('CommentsViewThreadActions');
MenuId.InteractiveToolbar = new MenuId('InteractiveToolbar');
MenuId.InteractiveCellTitle = new MenuId('InteractiveCellTitle');
MenuId.InteractiveCellDelete = new MenuId('InteractiveCellDelete');
MenuId.InteractiveCellExecute = new MenuId('InteractiveCellExecute');
MenuId.InteractiveInputExecute = new MenuId('InteractiveInputExecute');
MenuId.IssueReporter = new MenuId('IssueReporter');
MenuId.NotebookToolbar = new MenuId('NotebookToolbar');
MenuId.NotebookStickyScrollContext = new MenuId('NotebookStickyScrollContext');
MenuId.NotebookCellTitle = new MenuId('NotebookCellTitle');
MenuId.NotebookCellDelete = new MenuId('NotebookCellDelete');
MenuId.NotebookCellInsert = new MenuId('NotebookCellInsert');
MenuId.NotebookCellBetween = new MenuId('NotebookCellBetween');
MenuId.NotebookCellListTop = new MenuId('NotebookCellTop');
MenuId.NotebookCellExecute = new MenuId('NotebookCellExecute');
MenuId.NotebookCellExecuteGoTo = new MenuId('NotebookCellExecuteGoTo');
MenuId.NotebookCellExecutePrimary = new MenuId('NotebookCellExecutePrimary');
MenuId.NotebookDiffCellInputTitle = new MenuId('NotebookDiffCellInputTitle');
MenuId.NotebookDiffCellMetadataTitle = new MenuId('NotebookDiffCellMetadataTitle');
MenuId.NotebookDiffCellOutputsTitle = new MenuId('NotebookDiffCellOutputsTitle');
MenuId.NotebookOutputToolbar = new MenuId('NotebookOutputToolbar');
MenuId.NotebookOutlineFilter = new MenuId('NotebookOutlineFilter');
MenuId.NotebookOutlineActionMenu = new MenuId('NotebookOutlineActionMenu');
MenuId.NotebookEditorLayoutConfigure = new MenuId('NotebookEditorLayoutConfigure');
MenuId.NotebookKernelSource = new MenuId('NotebookKernelSource');
MenuId.BulkEditTitle = new MenuId('BulkEditTitle');
MenuId.BulkEditContext = new MenuId('BulkEditContext');
MenuId.TimelineItemContext = new MenuId('TimelineItemContext');
MenuId.TimelineTitle = new MenuId('TimelineTitle');
MenuId.TimelineTitleContext = new MenuId('TimelineTitleContext');
MenuId.TimelineFilterSubMenu = new MenuId('TimelineFilterSubMenu');
MenuId.AccountsContext = new MenuId('AccountsContext');
MenuId.SidebarTitle = new MenuId('SidebarTitle');
MenuId.PanelTitle = new MenuId('PanelTitle');
MenuId.AuxiliaryBarTitle = new MenuId('AuxiliaryBarTitle');
MenuId.AuxiliaryBarHeader = new MenuId('AuxiliaryBarHeader');
MenuId.TerminalInstanceContext = new MenuId('TerminalInstanceContext');
MenuId.TerminalEditorInstanceContext = new MenuId('TerminalEditorInstanceContext');
MenuId.TerminalNewDropdownContext = new MenuId('TerminalNewDropdownContext');
MenuId.TerminalTabContext = new MenuId('TerminalTabContext');
MenuId.TerminalTabEmptyAreaContext = new MenuId('TerminalTabEmptyAreaContext');
MenuId.TerminalStickyScrollContext = new MenuId('TerminalStickyScrollContext');
MenuId.WebviewContext = new MenuId('WebviewContext');
MenuId.InlineCompletionsActions = new MenuId('InlineCompletionsActions');
MenuId.InlineEditActions = new MenuId('InlineEditActions');
MenuId.NewFile = new MenuId('NewFile');
MenuId.MergeInput1Toolbar = new MenuId('MergeToolbar1Toolbar');
MenuId.MergeInput2Toolbar = new MenuId('MergeToolbar2Toolbar');
MenuId.MergeBaseToolbar = new MenuId('MergeBaseToolbar');
MenuId.MergeInputResultToolbar = new MenuId('MergeToolbarResultToolbar');
MenuId.InlineSuggestionToolbar = new MenuId('InlineSuggestionToolbar');
MenuId.InlineEditToolbar = new MenuId('InlineEditToolbar');
MenuId.ChatContext = new MenuId('ChatContext');
MenuId.ChatCodeBlock = new MenuId('ChatCodeblock');
MenuId.ChatCompareBlock = new MenuId('ChatCompareBlock');
MenuId.ChatMessageTitle = new MenuId('ChatMessageTitle');
MenuId.ChatExecute = new MenuId('ChatExecute');
MenuId.ChatExecuteSecondary = new MenuId('ChatExecuteSecondary');
MenuId.ChatInputSide = new MenuId('ChatInputSide');
MenuId.AccessibleView = new MenuId('AccessibleView');
MenuId.MultiDiffEditorFileToolbar = new MenuId('MultiDiffEditorFileToolbar');
MenuId.DiffEditorHunkToolbar = new MenuId('DiffEditorHunkToolbar');
MenuId.DiffEditorSelectionToolbar = new MenuId('DiffEditorSelectionToolbar');
export const IMenuService = createDecorator('menuService');
class MenuRegistryChangeEvent {
    static for(id) {
        let value = this._all.get(id);
        if (!value) {
            value = new MenuRegistryChangeEvent(id);
            this._all.set(id, value);
        }
        return value;
    }
    static merge(events) {
        const ids = new Set();
        for (const item of events) {
            if (item instanceof MenuRegistryChangeEvent) {
                ids.add(item.id);
            }
        }
        return ids;
    }
    constructor(id) {
        this.id = id;
        this.has = candidate => candidate === id;
    }
}
MenuRegistryChangeEvent._all = new Map();
export const MenuRegistry = new class {
    constructor() {
        this._commands = new Map();
        this._menuItems = new Map();
        this._onDidChangeMenu = new MicrotaskEmitter({
            merge: MenuRegistryChangeEvent.merge
        });
        this.onDidChangeMenu = this._onDidChangeMenu.event;
    }
    addCommand(command) {
        this._commands.set(command.id, command);
        this._onDidChangeMenu.fire(MenuRegistryChangeEvent.for(MenuId.CommandPalette));
        return toDisposable(() => {
            if (this._commands.delete(command.id)) {
                this._onDidChangeMenu.fire(MenuRegistryChangeEvent.for(MenuId.CommandPalette));
            }
        });
    }
    getCommand(id) {
        return this._commands.get(id);
    }
    getCommands() {
        const map = new Map();
        this._commands.forEach((value, key) => map.set(key, value));
        return map;
    }
    appendMenuItem(id, item) {
        let list = this._menuItems.get(id);
        if (!list) {
            list = new LinkedList();
            this._menuItems.set(id, list);
        }
        const rm = list.push(item);
        this._onDidChangeMenu.fire(MenuRegistryChangeEvent.for(id));
        return toDisposable(() => {
            rm();
            this._onDidChangeMenu.fire(MenuRegistryChangeEvent.for(id));
        });
    }
    appendMenuItems(items) {
        const result = new DisposableStore();
        for (const { id, item } of items) {
            result.add(this.appendMenuItem(id, item));
        }
        return result;
    }
    getMenuItems(id) {
        let result;
        if (this._menuItems.has(id)) {
            result = [...this._menuItems.get(id)];
        }
        else {
            result = [];
        }
        if (id === MenuId.CommandPalette) {
            // CommandPalette is special because it shows
            // all commands by default
            this._appendImplicitItems(result);
        }
        return result;
    }
    _appendImplicitItems(result) {
        const set = new Set();
        for (const item of result) {
            if (isIMenuItem(item)) {
                set.add(item.command.id);
                if (item.alt) {
                    set.add(item.alt.id);
                }
            }
        }
        this._commands.forEach((command, id) => {
            if (!set.has(id)) {
                result.push({ command });
            }
        });
    }
};
export class SubmenuItemAction extends SubmenuAction {
    constructor(item, hideActions, actions) {
        super(`submenuitem.${item.submenu.id}`, typeof item.title === 'string' ? item.title : item.title.value, actions, 'submenu');
        this.item = item;
        this.hideActions = hideActions;
    }
}
// implements IAction, does NOT extend Action, so that no one
// subscribes to events of Action or modified properties
let MenuItemAction = MenuItemAction_1 = class MenuItemAction {
    static label(action, options) {
        return (options === null || options === void 0 ? void 0 : options.renderShortTitle) && action.shortTitle
            ? (typeof action.shortTitle === 'string' ? action.shortTitle : action.shortTitle.value)
            : (typeof action.title === 'string' ? action.title : action.title.value);
    }
    constructor(item, alt, options, hideActions, menuKeybinding, contextKeyService, _commandService) {
        var _a, _b;
        this.hideActions = hideActions;
        this.menuKeybinding = menuKeybinding;
        this._commandService = _commandService;
        this.id = item.id;
        this.label = MenuItemAction_1.label(item, options);
        this.tooltip = (_b = (typeof item.tooltip === 'string' ? item.tooltip : (_a = item.tooltip) === null || _a === void 0 ? void 0 : _a.value)) !== null && _b !== void 0 ? _b : '';
        this.enabled = !item.precondition || contextKeyService.contextMatchesRules(item.precondition);
        this.checked = undefined;
        let icon;
        if (item.toggled) {
            const toggled = (item.toggled.condition ? item.toggled : { condition: item.toggled });
            this.checked = contextKeyService.contextMatchesRules(toggled.condition);
            if (this.checked && toggled.tooltip) {
                this.tooltip = typeof toggled.tooltip === 'string' ? toggled.tooltip : toggled.tooltip.value;
            }
            if (this.checked && ThemeIcon.isThemeIcon(toggled.icon)) {
                icon = toggled.icon;
            }
            if (this.checked && toggled.title) {
                this.label = typeof toggled.title === 'string' ? toggled.title : toggled.title.value;
            }
        }
        if (!icon) {
            icon = ThemeIcon.isThemeIcon(item.icon) ? item.icon : undefined;
        }
        this.item = item;
        this.alt = alt ? new MenuItemAction_1(alt, undefined, options, hideActions, undefined, contextKeyService, _commandService) : undefined;
        this._options = options;
        this.class = icon && ThemeIcon.asClassName(icon);
    }
    run(...args) {
        var _a, _b;
        let runArgs = [];
        if ((_a = this._options) === null || _a === void 0 ? void 0 : _a.arg) {
            runArgs = [...runArgs, this._options.arg];
        }
        if ((_b = this._options) === null || _b === void 0 ? void 0 : _b.shouldForwardArgs) {
            runArgs = [...runArgs, ...args];
        }
        return this._commandService.executeCommand(this.id, ...runArgs);
    }
};
MenuItemAction = MenuItemAction_1 = __decorate([
    __param(5, IContextKeyService),
    __param(6, ICommandService)
], MenuItemAction);
export { MenuItemAction };
export class Action2 {
    constructor(desc) {
        this.desc = desc;
    }
}
export function registerAction2(ctor) {
    const disposables = new DisposableStore();
    const action = new ctor();
    const { f1, menu, keybinding, ...command } = action.desc;
    if (CommandsRegistry.getCommand(command.id)) {
        throw new Error(`Cannot register two commands with the same id: ${command.id}`);
    }
    // command
    disposables.add(CommandsRegistry.registerCommand({
        id: command.id,
        handler: (accessor, ...args) => action.run(accessor, ...args),
        metadata: command.metadata,
    }));
    // menu
    if (Array.isArray(menu)) {
        for (const item of menu) {
            disposables.add(MenuRegistry.appendMenuItem(item.id, { command: { ...command, precondition: item.precondition === null ? undefined : command.precondition }, ...item }));
        }
    }
    else if (menu) {
        disposables.add(MenuRegistry.appendMenuItem(menu.id, { command: { ...command, precondition: menu.precondition === null ? undefined : command.precondition }, ...menu }));
    }
    if (f1) {
        disposables.add(MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command, when: command.precondition }));
        disposables.add(MenuRegistry.addCommand(command));
    }
    // keybinding
    if (Array.isArray(keybinding)) {
        for (const item of keybinding) {
            disposables.add(KeybindingsRegistry.registerKeybindingRule({
                ...item,
                id: command.id,
                when: command.precondition ? ContextKeyExpr.and(command.precondition, item.when) : item.when
            }));
        }
    }
    else if (keybinding) {
        disposables.add(KeybindingsRegistry.registerKeybindingRule({
            ...keybinding,
            id: command.id,
            when: command.precondition ? ContextKeyExpr.and(command.precondition, keybinding.when) : keybinding.when
        }));
    }
    return disposables;
}
//#endregion
