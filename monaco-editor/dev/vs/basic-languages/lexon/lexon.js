/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.49.0(383fdf3fc0e1e1a024068b8d0fd4f3dcbae74d04)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/
define("vs/basic-languages/lexon/lexon", ["require"],(require)=>{
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

  // src/basic-languages/lexon/lexon.ts
  var lexon_exports = {};
  __export(lexon_exports, {
    conf: () => conf,
    language: () => language
  });
  var conf = {
    comments: {
      lineComment: "COMMENT"
      // blockComment: ['COMMENT', '.'],
    },
    brackets: [["(", ")"]],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: ":", close: "." }
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "`", close: "`" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: ":", close: "." }
    ],
    folding: {
      markers: {
        start: new RegExp("^\\s*(::\\s*|COMMENT\\s+)#region"),
        end: new RegExp("^\\s*(::\\s*|COMMENT\\s+)#endregion")
      }
    }
  };
  var language = {
    // Set defaultToken to invalid to see what you do not tokenize yet
    // defaultToken: 'invalid',
    tokenPostfix: ".lexon",
    ignoreCase: true,
    keywords: [
      "lexon",
      "lex",
      "clause",
      "terms",
      "contracts",
      "may",
      "pay",
      "pays",
      "appoints",
      "into",
      "to"
    ],
    typeKeywords: ["amount", "person", "key", "time", "date", "asset", "text"],
    operators: [
      "less",
      "greater",
      "equal",
      "le",
      "gt",
      "or",
      "and",
      "add",
      "added",
      "subtract",
      "subtracted",
      "multiply",
      "multiplied",
      "times",
      "divide",
      "divided",
      "is",
      "be",
      "certified"
    ],
    // we include these common regular expressions
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    // The main tokenizer for our languages
    tokenizer: {
      root: [
        // comment
        [/^(\s*)(comment:?(?:\s.*|))$/, ["", "comment"]],
        // special identifier cases
        [
          /"/,
          {
            token: "identifier.quote",
            bracket: "@open",
            next: "@quoted_identifier"
          }
        ],
        [
          "LEX$",
          {
            token: "keyword",
            bracket: "@open",
            next: "@identifier_until_period"
          }
        ],
        ["LEXON", { token: "keyword", bracket: "@open", next: "@semver" }],
        [
          ":",
          {
            token: "delimiter",
            bracket: "@open",
            next: "@identifier_until_period"
          }
        ],
        // identifiers and keywords
        [
          /[a-z_$][\w$]*/,
          {
            cases: {
              "@operators": "operator",
              "@typeKeywords": "keyword.type",
              "@keywords": "keyword",
              "@default": "identifier"
            }
          }
        ],
        // whitespace
        { include: "@whitespace" },
        // delimiters and operators
        [/[{}()\[\]]/, "@brackets"],
        [/[<>](?!@symbols)/, "@brackets"],
        [/@symbols/, "delimiter"],
        // numbers
        [/\d*\.\d*\.\d*/, "number.semver"],
        [/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
        [/0[xX][0-9a-fA-F]+/, "number.hex"],
        [/\d+/, "number"],
        // delimiter: after number because of .\d floats
        [/[;,.]/, "delimiter"]
      ],
      quoted_identifier: [
        [/[^\\"]+/, "identifier"],
        [/"/, { token: "identifier.quote", bracket: "@close", next: "@pop" }]
      ],
      space_identifier_until_period: [
        [":", "delimiter"],
        [" ", { token: "white", next: "@identifier_rest" }]
      ],
      identifier_until_period: [
        { include: "@whitespace" },
        [":", { token: "delimiter", next: "@identifier_rest" }],
        [/[^\\.]+/, "identifier"],
        [/\./, { token: "delimiter", bracket: "@close", next: "@pop" }]
      ],
      identifier_rest: [
        [/[^\\.]+/, "identifier"],
        [/\./, { token: "delimiter", bracket: "@close", next: "@pop" }]
      ],
      semver: [
        { include: "@whitespace" },
        [":", "delimiter"],
        [/\d*\.\d*\.\d*/, { token: "number.semver", bracket: "@close", next: "@pop" }]
      ],
      whitespace: [[/[ \t\r\n]+/, "white"]]
    }
  };
  return __toCommonJS(lexon_exports);
})();
return moduleExports;
});
