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
var AbstractCommandsQuickAccessProvider_1, CommandsHistory_1;
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { isCancellationError } from '../../../base/common/errors.js';
import { matchesContiguousSubString, matchesPrefix, matchesWords, or } from '../../../base/common/filters.js';
import { createSingleCallFunction } from '../../../base/common/functional.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { LRUCache } from '../../../base/common/map.js';
import { TfIdfCalculator, normalizeTfIdfScores } from '../../../base/common/tfIdf.js';
import { localize } from '../../../nls.js';
import { ICommandService } from '../../commands/common/commands.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IDialogService } from '../../dialogs/common/dialogs.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { ILogService } from '../../log/common/log.js';
import { PickerQuickAccessProvider } from './pickerQuickAccess.js';
import { IStorageService, WillSaveStateReason } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
let AbstractCommandsQuickAccessProvider = AbstractCommandsQuickAccessProvider_1 = class AbstractCommandsQuickAccessProvider extends PickerQuickAccessProvider {
    constructor(options, instantiationService, keybindingService, commandService, telemetryService, dialogService) {
        super(AbstractCommandsQuickAccessProvider_1.PREFIX, options);
        this.instantiationService = instantiationService;
        this.keybindingService = keybindingService;
        this.commandService = commandService;
        this.telemetryService = telemetryService;
        this.dialogService = dialogService;
        this.commandsHistory = this._register(this.instantiationService.createInstance(CommandsHistory));
        this.options = options;
    }
    async _getPicks(filter, _disposables, token, runOptions) {
        var _a, _b, _c, _d;
        // Ask subclass for all command picks
        const allCommandPicks = await this.getCommandPicks(token);
        if (token.isCancellationRequested) {
            return [];
        }
        const runTfidf = createSingleCallFunction(() => {
            const tfidf = new TfIdfCalculator();
            tfidf.updateDocuments(allCommandPicks.map(commandPick => ({
                key: commandPick.commandId,
                textChunks: [this.getTfIdfChunk(commandPick)]
            })));
            const result = tfidf.calculateScores(filter, token);
            return normalizeTfIdfScores(result)
                .filter(score => score.score > AbstractCommandsQuickAccessProvider_1.TFIDF_THRESHOLD)
                .slice(0, AbstractCommandsQuickAccessProvider_1.TFIDF_MAX_RESULTS);
        });
        // Filter
        const filteredCommandPicks = [];
        for (const commandPick of allCommandPicks) {
            const labelHighlights = (_a = AbstractCommandsQuickAccessProvider_1.WORD_FILTER(filter, commandPick.label)) !== null && _a !== void 0 ? _a : undefined;
            const aliasHighlights = commandPick.commandAlias ? (_b = AbstractCommandsQuickAccessProvider_1.WORD_FILTER(filter, commandPick.commandAlias)) !== null && _b !== void 0 ? _b : undefined : undefined;
            // Add if matching in label or alias
            if (labelHighlights || aliasHighlights) {
                commandPick.highlights = {
                    label: labelHighlights,
                    detail: this.options.showAlias ? aliasHighlights : undefined
                };
                filteredCommandPicks.push(commandPick);
            }
            // Also add if we have a 100% command ID match
            else if (filter === commandPick.commandId) {
                filteredCommandPicks.push(commandPick);
            }
            // Handle tf-idf scoring for the rest if there's a filter
            else if (filter.length >= 3) {
                const tfidf = runTfidf();
                if (token.isCancellationRequested) {
                    return [];
                }
                // Add if we have a tf-idf score
                const tfidfScore = tfidf.find(score => score.key === commandPick.commandId);
                if (tfidfScore) {
                    commandPick.tfIdfScore = tfidfScore.score;
                    filteredCommandPicks.push(commandPick);
                }
            }
        }
        // Add description to commands that have duplicate labels
        const mapLabelToCommand = new Map();
        for (const commandPick of filteredCommandPicks) {
            const existingCommandForLabel = mapLabelToCommand.get(commandPick.label);
            if (existingCommandForLabel) {
                commandPick.description = commandPick.commandId;
                existingCommandForLabel.description = existingCommandForLabel.commandId;
            }
            else {
                mapLabelToCommand.set(commandPick.label, commandPick);
            }
        }
        // Sort by MRU order and fallback to name otherwise
        filteredCommandPicks.sort((commandPickA, commandPickB) => {
            // If a result came from tf-idf, we want to put that towards the bottom
            if (commandPickA.tfIdfScore && commandPickB.tfIdfScore) {
                if (commandPickA.tfIdfScore === commandPickB.tfIdfScore) {
                    return commandPickA.label.localeCompare(commandPickB.label); // prefer lexicographically smaller command
                }
                return commandPickB.tfIdfScore - commandPickA.tfIdfScore; // prefer higher tf-idf score
            }
            else if (commandPickA.tfIdfScore) {
                return 1; // first command has a score but other doesn't so other wins
            }
            else if (commandPickB.tfIdfScore) {
                return -1; // other command has a score but first doesn't so first wins
            }
            const commandACounter = this.commandsHistory.peek(commandPickA.commandId);
            const commandBCounter = this.commandsHistory.peek(commandPickB.commandId);
            if (commandACounter && commandBCounter) {
                return commandACounter > commandBCounter ? -1 : 1; // use more recently used command before older
            }
            if (commandACounter) {
                return -1; // first command was used, so it wins over the non used one
            }
            if (commandBCounter) {
                return 1; // other command was used so it wins over the command
            }
            if (this.options.suggestedCommandIds) {
                const commandASuggestion = this.options.suggestedCommandIds.has(commandPickA.commandId);
                const commandBSuggestion = this.options.suggestedCommandIds.has(commandPickB.commandId);
                if (commandASuggestion && commandBSuggestion) {
                    return 0; // honor the order of the array
                }
                if (commandASuggestion) {
                    return -1; // first command was suggested, so it wins over the non suggested one
                }
                if (commandBSuggestion) {
                    return 1; // other command was suggested so it wins over the command
                }
            }
            // both commands were never used, so we sort by name
            return commandPickA.label.localeCompare(commandPickB.label);
        });
        const commandPicks = [];
        let addOtherSeparator = false;
        let addSuggestedSeparator = true;
        let addCommonlyUsedSeparator = !!this.options.suggestedCommandIds;
        for (let i = 0; i < filteredCommandPicks.length; i++) {
            const commandPick = filteredCommandPicks[i];
            // Separator: recently used
            if (i === 0 && this.commandsHistory.peek(commandPick.commandId)) {
                commandPicks.push({ type: 'separator', label: localize('recentlyUsed', "recently used") });
                addOtherSeparator = true;
            }
            if (addSuggestedSeparator && commandPick.tfIdfScore !== undefined) {
                commandPicks.push({ type: 'separator', label: localize('suggested', "similar commands") });
                addSuggestedSeparator = false;
            }
            // Separator: commonly used
            if (addCommonlyUsedSeparator && commandPick.tfIdfScore === undefined && !this.commandsHistory.peek(commandPick.commandId) && ((_c = this.options.suggestedCommandIds) === null || _c === void 0 ? void 0 : _c.has(commandPick.commandId))) {
                commandPicks.push({ type: 'separator', label: localize('commonlyUsed', "commonly used") });
                addOtherSeparator = true;
                addCommonlyUsedSeparator = false;
            }
            // Separator: other commands
            if (addOtherSeparator && commandPick.tfIdfScore === undefined && !this.commandsHistory.peek(commandPick.commandId) && !((_d = this.options.suggestedCommandIds) === null || _d === void 0 ? void 0 : _d.has(commandPick.commandId))) {
                commandPicks.push({ type: 'separator', label: localize('morecCommands', "other commands") });
                addOtherSeparator = false;
            }
            // Command
            commandPicks.push(this.toCommandPick(commandPick, runOptions));
        }
        if (!this.hasAdditionalCommandPicks(filter, token)) {
            return commandPicks;
        }
        return {
            picks: commandPicks,
            additionalPicks: (async () => {
                var _a;
                const additionalCommandPicks = await this.getAdditionalCommandPicks(allCommandPicks, filteredCommandPicks, filter, token);
                if (token.isCancellationRequested) {
                    return [];
                }
                const commandPicks = additionalCommandPicks.map(commandPick => this.toCommandPick(commandPick, runOptions));
                // Basically, if we haven't already added a separator, we add one before the additional picks so long
                // as one hasn't been added to the start of the array.
                if (addSuggestedSeparator && ((_a = commandPicks[0]) === null || _a === void 0 ? void 0 : _a.type) !== 'separator') {
                    commandPicks.unshift({ type: 'separator', label: localize('suggested', "similar commands") });
                }
                return commandPicks;
            })()
        };
    }
    toCommandPick(commandPick, runOptions) {
        if (commandPick.type === 'separator') {
            return commandPick;
        }
        const keybinding = this.keybindingService.lookupKeybinding(commandPick.commandId);
        const ariaLabel = keybinding ?
            localize('commandPickAriaLabelWithKeybinding', "{0}, {1}", commandPick.label, keybinding.getAriaLabel()) :
            commandPick.label;
        return {
            ...commandPick,
            ariaLabel,
            detail: this.options.showAlias && commandPick.commandAlias !== commandPick.label ? commandPick.commandAlias : undefined,
            keybinding,
            accept: async () => {
                var _a, _b;
                // Add to history
                this.commandsHistory.push(commandPick.commandId);
                // Telementry
                this.telemetryService.publicLog2('workbenchActionExecuted', {
                    id: commandPick.commandId,
                    from: (_a = runOptions === null || runOptions === void 0 ? void 0 : runOptions.from) !== null && _a !== void 0 ? _a : 'quick open'
                });
                // Run
                try {
                    ((_b = commandPick.args) === null || _b === void 0 ? void 0 : _b.length)
                        ? await this.commandService.executeCommand(commandPick.commandId, ...commandPick.args)
                        : await this.commandService.executeCommand(commandPick.commandId);
                }
                catch (error) {
                    if (!isCancellationError(error)) {
                        this.dialogService.error(localize('canNotRun', "Command '{0}' resulted in an error", commandPick.label), toErrorMessage(error));
                    }
                }
            }
        };
    }
    // TF-IDF string to be indexed
    getTfIdfChunk({ label, commandAlias, commandDescription }) {
        let chunk = label;
        if (commandAlias && commandAlias !== label) {
            chunk += ` - ${commandAlias}`;
        }
        if (commandDescription && commandDescription.value !== label) {
            // If the original is the same as the value, don't add it
            chunk += ` - ${commandDescription.value === commandDescription.original ? commandDescription.value : `${commandDescription.value} (${commandDescription.original})`}`;
        }
        return chunk;
    }
};
AbstractCommandsQuickAccessProvider.PREFIX = '>';
AbstractCommandsQuickAccessProvider.TFIDF_THRESHOLD = 0.5;
AbstractCommandsQuickAccessProvider.TFIDF_MAX_RESULTS = 5;
AbstractCommandsQuickAccessProvider.WORD_FILTER = or(matchesPrefix, matchesWords, matchesContiguousSubString);
AbstractCommandsQuickAccessProvider = AbstractCommandsQuickAccessProvider_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IKeybindingService),
    __param(3, ICommandService),
    __param(4, ITelemetryService),
    __param(5, IDialogService)
], AbstractCommandsQuickAccessProvider);
export { AbstractCommandsQuickAccessProvider };
let CommandsHistory = CommandsHistory_1 = class CommandsHistory extends Disposable {
    constructor(storageService, configurationService, logService) {
        super();
        this.storageService = storageService;
        this.configurationService = configurationService;
        this.logService = logService;
        this.configuredCommandsHistoryLength = 0;
        this.updateConfiguration();
        this.load();
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration(e => this.updateConfiguration(e)));
        this._register(this.storageService.onWillSaveState(e => {
            if (e.reason === WillSaveStateReason.SHUTDOWN) {
                // Commands history is very dynamic and so we limit impact
                // on storage to only save on shutdown. This helps reduce
                // the overhead of syncing this data across machines.
                this.saveState();
            }
        }));
    }
    updateConfiguration(e) {
        if (e && !e.affectsConfiguration('workbench.commandPalette.history')) {
            return;
        }
        this.configuredCommandsHistoryLength = CommandsHistory_1.getConfiguredCommandHistoryLength(this.configurationService);
        if (CommandsHistory_1.cache && CommandsHistory_1.cache.limit !== this.configuredCommandsHistoryLength) {
            CommandsHistory_1.cache.limit = this.configuredCommandsHistoryLength;
            CommandsHistory_1.hasChanges = true;
        }
    }
    load() {
        const raw = this.storageService.get(CommandsHistory_1.PREF_KEY_CACHE, 0 /* StorageScope.PROFILE */);
        let serializedCache;
        if (raw) {
            try {
                serializedCache = JSON.parse(raw);
            }
            catch (error) {
                this.logService.error(`[CommandsHistory] invalid data: ${error}`);
            }
        }
        const cache = CommandsHistory_1.cache = new LRUCache(this.configuredCommandsHistoryLength, 1);
        if (serializedCache) {
            let entries;
            if (serializedCache.usesLRU) {
                entries = serializedCache.entries;
            }
            else {
                entries = serializedCache.entries.sort((a, b) => a.value - b.value);
            }
            entries.forEach(entry => cache.set(entry.key, entry.value));
        }
        CommandsHistory_1.counter = this.storageService.getNumber(CommandsHistory_1.PREF_KEY_COUNTER, 0 /* StorageScope.PROFILE */, CommandsHistory_1.counter);
    }
    push(commandId) {
        if (!CommandsHistory_1.cache) {
            return;
        }
        CommandsHistory_1.cache.set(commandId, CommandsHistory_1.counter++); // set counter to command
        CommandsHistory_1.hasChanges = true;
    }
    peek(commandId) {
        var _a;
        return (_a = CommandsHistory_1.cache) === null || _a === void 0 ? void 0 : _a.peek(commandId);
    }
    saveState() {
        if (!CommandsHistory_1.cache) {
            return;
        }
        if (!CommandsHistory_1.hasChanges) {
            return;
        }
        const serializedCache = { usesLRU: true, entries: [] };
        CommandsHistory_1.cache.forEach((value, key) => serializedCache.entries.push({ key, value }));
        this.storageService.store(CommandsHistory_1.PREF_KEY_CACHE, JSON.stringify(serializedCache), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        this.storageService.store(CommandsHistory_1.PREF_KEY_COUNTER, CommandsHistory_1.counter, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        CommandsHistory_1.hasChanges = false;
    }
    static getConfiguredCommandHistoryLength(configurationService) {
        var _a, _b;
        const config = configurationService.getValue();
        const configuredCommandHistoryLength = (_b = (_a = config.workbench) === null || _a === void 0 ? void 0 : _a.commandPalette) === null || _b === void 0 ? void 0 : _b.history;
        if (typeof configuredCommandHistoryLength === 'number') {
            return configuredCommandHistoryLength;
        }
        return CommandsHistory_1.DEFAULT_COMMANDS_HISTORY_LENGTH;
    }
};
CommandsHistory.DEFAULT_COMMANDS_HISTORY_LENGTH = 50;
CommandsHistory.PREF_KEY_CACHE = 'commandPalette.mru.cache';
CommandsHistory.PREF_KEY_COUNTER = 'commandPalette.mru.counter';
CommandsHistory.counter = 1;
CommandsHistory.hasChanges = false;
CommandsHistory = CommandsHistory_1 = __decorate([
    __param(0, IStorageService),
    __param(1, IConfigurationService),
    __param(2, ILogService)
], CommandsHistory);
export { CommandsHistory };
