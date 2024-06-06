/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.49.0(383fdf3fc0e1e1a024068b8d0fd4f3dcbae74d04)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/
define("vs/basic-languages/typespec/typespec", ["require"],(require)=>{
"use strict";
var moduleExports = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/basic-languages/typespec/typespec.ts
  var typespec_exports = {};
  __export(typespec_exports, {
    conf: () => conf,
    language: () => language
  });
  var bounded = (text) => `\\b${text}\\b`;
  var notBefore = (regex) => `(?!${regex})`;
  var identifierStart = "[_a-zA-Z]";
  var identifierContinue = "[_a-zA-Z0-9]";
  var identifier = bounded(`${identifierStart}${identifierContinue}*`);
  var directive = bounded(`[_a-zA-Z-0-9]+`);
  var keywords = [
    "import",
    "model",
    "scalar",
    "namespace",
    "op",
    "interface",
    "union",
    "using",
    "is",
    "extends",
    "enum",
    "alias",
    "return",
    "void",
    "if",
    "else",
    "projection",
    "dec",
    "extern",
    "fn"
  ];
  var namedLiterals = ["true", "false", "null", "unknown", "never"];
  var nonCommentWs = `[ \\t\\r\\n]`;
  var numericLiteral = `[0-9]+`;
  var conf = {
    comments: {
      lineComment: "//",
      blockComment: ["/*", "*/"]
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"]
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "/**", close: " */", notIn: ["string"] }
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' }
    ],
    indentationRules: {
      decreaseIndentPattern: new RegExp("^((?!.*?/\\*).*\\*/)?\\s*[\\}\\]].*$"),
      increaseIndentPattern: new RegExp(
        "^((?!//).)*(\\{([^}\"'`/]*|(\\t|[ ])*//.*)|\\([^)\"'`/]*|\\[[^\\]\"'`/]*)$"
      ),
      // e.g.  * ...| or */| or *-----*/|
      unIndentedLinePattern: new RegExp(
        "^(\\t|[ ])*[ ]\\*[^/]*\\*/\\s*$|^(\\t|[ ])*[ ]\\*/\\s*$|^(\\t|[ ])*[ ]\\*([ ]([^\\*]|\\*(?!/))*)?$"
      )
    }
  };
  var language = {
    defaultToken: "",
    tokenPostfix: ".tsp",
    brackets: [
      { open: "{", close: "}", token: "delimiter.curly" },
      { open: "[", close: "]", token: "delimiter.square" },
      { open: "(", close: ")", token: "delimiter.parenthesis" }
    ],
    symbols: /[=:;<>]+/,
    keywords,
    namedLiterals,
    escapes: `\\\\(u{[0-9A-Fa-f]+}|n|r|t|\\\\|"|\\\${)`,
    tokenizer: {
      root: [{ include: "@expression" }, { include: "@whitespace" }],
      stringVerbatim: [
        { regex: `(|"|"")[^"]`, action: { token: "string" } },
        { regex: `"""${notBefore(`"`)}`, action: { token: "string", next: "@pop" } }
      ],
      stringLiteral: [
        { regex: `\\\${`, action: { token: "delimiter.bracket", next: "@bracketCounting" } },
        { regex: `[^\\\\"$]+`, action: { token: "string" } },
        { regex: "@escapes", action: { token: "string.escape" } },
        { regex: `\\\\.`, action: { token: "string.escape.invalid" } },
        { regex: `"`, action: { token: "string", next: "@pop" } }
      ],
      bracketCounting: [
        { regex: `{`, action: { token: "delimiter.bracket", next: "@bracketCounting" } },
        { regex: `}`, action: { token: "delimiter.bracket", next: "@pop" } },
        { include: "@expression" }
      ],
      comment: [
        { regex: `[^\\*]+`, action: { token: "comment" } },
        { regex: `\\*\\/`, action: { token: "comment", next: "@pop" } },
        { regex: `[\\/*]`, action: { token: "comment" } }
      ],
      whitespace: [
        { regex: nonCommentWs },
        { regex: `\\/\\*`, action: { token: "comment", next: "@comment" } },
        { regex: `\\/\\/.*$`, action: { token: "comment" } }
      ],
      expression: [
        { regex: `"""`, action: { token: "string", next: "@stringVerbatim" } },
        { regex: `"${notBefore(`""`)}`, action: { token: "string", next: "@stringLiteral" } },
        { regex: numericLiteral, action: { token: "number" } },
        {
          regex: identifier,
          action: {
            cases: {
              "@keywords": { token: "keyword" },
              "@namedLiterals": { token: "keyword" },
              "@default": { token: "identifier" }
            }
          }
        },
        { regex: `@${identifier}`, action: { token: "tag" } },
        { regex: `#${directive}`, action: { token: "directive" } }
      ]
    }
  };
  return __toCommonJS(typespec_exports);
})();
return moduleExports;
});
