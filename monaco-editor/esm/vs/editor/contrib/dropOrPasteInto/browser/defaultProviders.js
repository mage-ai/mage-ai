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
import { coalesce } from '../../../../base/common/arrays.js';
import { UriList } from '../../../../base/common/dataTransfer.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Mimes } from '../../../../base/common/mime.js';
import { Schemas } from '../../../../base/common/network.js';
import { relativePath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { DocumentPasteTriggerKind } from '../../../common/languages.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { localize } from '../../../../nls.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
class SimplePasteAndDropProvider {
    async provideDocumentPasteEdits(_model, _ranges, dataTransfer, context, token) {
        const edit = await this.getEdit(dataTransfer, token);
        if (!edit) {
            return undefined;
        }
        return {
            dispose() { },
            edits: [{ insertText: edit.insertText, title: edit.title, kind: edit.kind, handledMimeType: edit.handledMimeType, yieldTo: edit.yieldTo }]
        };
    }
    async provideDocumentDropEdits(_model, _position, dataTransfer, token) {
        const edit = await this.getEdit(dataTransfer, token);
        return edit ? [{ insertText: edit.insertText, title: edit.title, kind: edit.kind, handledMimeType: edit.handledMimeType, yieldTo: edit.yieldTo }] : undefined;
    }
}
export class DefaultTextPasteOrDropEditProvider extends SimplePasteAndDropProvider {
    constructor() {
        super(...arguments);
        this.kind = DefaultTextPasteOrDropEditProvider.kind;
        this.dropMimeTypes = [Mimes.text];
        this.pasteMimeTypes = [Mimes.text];
    }
    async getEdit(dataTransfer, _token) {
        const textEntry = dataTransfer.get(Mimes.text);
        if (!textEntry) {
            return;
        }
        // Suppress if there's also a uriList entry.
        // Typically the uri-list contains the same text as the text entry so showing both is confusing.
        if (dataTransfer.has(Mimes.uriList)) {
            return;
        }
        const insertText = await textEntry.asString();
        return {
            handledMimeType: Mimes.text,
            title: localize('text.label', "Insert Plain Text"),
            insertText,
            kind: this.kind,
        };
    }
}
DefaultTextPasteOrDropEditProvider.id = 'text';
DefaultTextPasteOrDropEditProvider.kind = new HierarchicalKind('text.plain');
class PathProvider extends SimplePasteAndDropProvider {
    constructor() {
        super(...arguments);
        this.kind = new HierarchicalKind('uri.absolute');
        this.dropMimeTypes = [Mimes.uriList];
        this.pasteMimeTypes = [Mimes.uriList];
    }
    async getEdit(dataTransfer, token) {
        const entries = await extractUriList(dataTransfer);
        if (!entries.length || token.isCancellationRequested) {
            return;
        }
        let uriCount = 0;
        const insertText = entries
            .map(({ uri, originalText }) => {
            if (uri.scheme === Schemas.file) {
                return uri.fsPath;
            }
            else {
                uriCount++;
                return originalText;
            }
        })
            .join(' ');
        let label;
        if (uriCount > 0) {
            // Dropping at least one generic uri (such as https) so use most generic label
            label = entries.length > 1
                ? localize('defaultDropProvider.uriList.uris', "Insert Uris")
                : localize('defaultDropProvider.uriList.uri', "Insert Uri");
        }
        else {
            // All the paths are file paths
            label = entries.length > 1
                ? localize('defaultDropProvider.uriList.paths', "Insert Paths")
                : localize('defaultDropProvider.uriList.path', "Insert Path");
        }
        return {
            handledMimeType: Mimes.uriList,
            insertText,
            title: label,
            kind: this.kind,
        };
    }
}
let RelativePathProvider = class RelativePathProvider extends SimplePasteAndDropProvider {
    constructor(_workspaceContextService) {
        super();
        this._workspaceContextService = _workspaceContextService;
        this.kind = new HierarchicalKind('uri.relative');
        this.dropMimeTypes = [Mimes.uriList];
        this.pasteMimeTypes = [Mimes.uriList];
    }
    async getEdit(dataTransfer, token) {
        const entries = await extractUriList(dataTransfer);
        if (!entries.length || token.isCancellationRequested) {
            return;
        }
        const relativeUris = coalesce(entries.map(({ uri }) => {
            const root = this._workspaceContextService.getWorkspaceFolder(uri);
            return root ? relativePath(root.uri, uri) : undefined;
        }));
        if (!relativeUris.length) {
            return;
        }
        return {
            handledMimeType: Mimes.uriList,
            insertText: relativeUris.join(' '),
            title: entries.length > 1
                ? localize('defaultDropProvider.uriList.relativePaths', "Insert Relative Paths")
                : localize('defaultDropProvider.uriList.relativePath', "Insert Relative Path"),
            kind: this.kind,
        };
    }
};
RelativePathProvider = __decorate([
    __param(0, IWorkspaceContextService)
], RelativePathProvider);
class PasteHtmlProvider {
    constructor() {
        this.kind = new HierarchicalKind('html');
        this.pasteMimeTypes = ['text/html'];
        this._yieldTo = [{ mimeType: Mimes.text }];
    }
    async provideDocumentPasteEdits(_model, _ranges, dataTransfer, context, token) {
        var _a;
        if (context.triggerKind !== DocumentPasteTriggerKind.PasteAs && !((_a = context.only) === null || _a === void 0 ? void 0 : _a.contains(this.kind))) {
            return;
        }
        const entry = dataTransfer.get('text/html');
        const htmlText = await (entry === null || entry === void 0 ? void 0 : entry.asString());
        if (!htmlText || token.isCancellationRequested) {
            return;
        }
        return {
            dispose() { },
            edits: [{
                    insertText: htmlText,
                    yieldTo: this._yieldTo,
                    title: localize('pasteHtmlLabel', 'Insert HTML'),
                    kind: this.kind,
                }],
        };
    }
}
async function extractUriList(dataTransfer) {
    const urlListEntry = dataTransfer.get(Mimes.uriList);
    if (!urlListEntry) {
        return [];
    }
    const strUriList = await urlListEntry.asString();
    const entries = [];
    for (const entry of UriList.parse(strUriList)) {
        try {
            entries.push({ uri: URI.parse(entry), originalText: entry });
        }
        catch (_a) {
            // noop
        }
    }
    return entries;
}
let DefaultDropProvidersFeature = class DefaultDropProvidersFeature extends Disposable {
    constructor(languageFeaturesService, workspaceContextService) {
        super();
        this._register(languageFeaturesService.documentDropEditProvider.register('*', new DefaultTextPasteOrDropEditProvider()));
        this._register(languageFeaturesService.documentDropEditProvider.register('*', new PathProvider()));
        this._register(languageFeaturesService.documentDropEditProvider.register('*', new RelativePathProvider(workspaceContextService)));
    }
};
DefaultDropProvidersFeature = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IWorkspaceContextService)
], DefaultDropProvidersFeature);
export { DefaultDropProvidersFeature };
let DefaultPasteProvidersFeature = class DefaultPasteProvidersFeature extends Disposable {
    constructor(languageFeaturesService, workspaceContextService) {
        super();
        this._register(languageFeaturesService.documentPasteEditProvider.register('*', new DefaultTextPasteOrDropEditProvider()));
        this._register(languageFeaturesService.documentPasteEditProvider.register('*', new PathProvider()));
        this._register(languageFeaturesService.documentPasteEditProvider.register('*', new RelativePathProvider(workspaceContextService)));
        this._register(languageFeaturesService.documentPasteEditProvider.register('*', new PasteHtmlProvider()));
    }
};
DefaultPasteProvidersFeature = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IWorkspaceContextService)
], DefaultPasteProvidersFeature);
export { DefaultPasteProvidersFeature };
