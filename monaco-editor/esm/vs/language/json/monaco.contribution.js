import '../../editor/editor.api.js';
/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.49.0(383fdf3fc0e1e1a024068b8d0fd4f3dcbae74d04)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/


// src/language/json/monaco.contribution.ts
import { Emitter, languages } from "../../editor/editor.api.js";
var LanguageServiceDefaultsImpl = class {
  constructor(languageId, diagnosticsOptions, modeConfiguration) {
    this._onDidChange = new Emitter();
    this._languageId = languageId;
    this.setDiagnosticsOptions(diagnosticsOptions);
    this.setModeConfiguration(modeConfiguration);
  }
  get onDidChange() {
    return this._onDidChange.event;
  }
  get languageId() {
    return this._languageId;
  }
  get modeConfiguration() {
    return this._modeConfiguration;
  }
  get diagnosticsOptions() {
    return this._diagnosticsOptions;
  }
  setDiagnosticsOptions(options) {
    this._diagnosticsOptions = options || /* @__PURE__ */ Object.create(null);
    this._onDidChange.fire(this);
  }
  setModeConfiguration(modeConfiguration) {
    this._modeConfiguration = modeConfiguration || /* @__PURE__ */ Object.create(null);
    this._onDidChange.fire(this);
  }
};
var diagnosticDefault = {
  validate: true,
  allowComments: true,
  schemas: [],
  enableSchemaRequest: false,
  schemaRequest: "warning",
  schemaValidation: "warning",
  comments: "error",
  trailingCommas: "error"
};
var modeConfigurationDefault = {
  documentFormattingEdits: true,
  documentRangeFormattingEdits: true,
  completionItems: true,
  hovers: true,
  documentSymbols: true,
  tokens: true,
  colors: true,
  foldingRanges: true,
  diagnostics: true,
  selectionRanges: true
};
var jsonDefaults = new LanguageServiceDefaultsImpl(
  "json",
  diagnosticDefault,
  modeConfigurationDefault
);
var getWorker = () => getMode().then((mode) => mode.getWorker());
languages.json = { jsonDefaults, getWorker };
function getMode() {
  if (false) {
    return new Promise((resolve, reject) => {
      __require(["vs/language/json/jsonMode"], resolve, reject);
    });
  } else {
    return import("./jsonMode.js");
  }
}
languages.register({
  id: "json",
  extensions: [".json", ".bowerrc", ".jshintrc", ".jscsrc", ".eslintrc", ".babelrc", ".har"],
  aliases: ["JSON", "json"],
  mimetypes: ["application/json"]
});
languages.onLanguage("json", () => {
  getMode().then((mode) => mode.setupMode(jsonDefaults));
});
export {
  getWorker,
  jsonDefaults
};
