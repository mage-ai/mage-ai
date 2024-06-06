/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.49.0(383fdf3fc0e1e1a024068b8d0fd4f3dcbae74d04)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/
define("vs/basic-languages/graphql/graphql", ["require"],(require)=>{
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

  // src/basic-languages/graphql/graphql.ts
  var graphql_exports = {};
  __export(graphql_exports, {
    conf: () => conf,
    language: () => language
  });
  var conf = {
    comments: {
      lineComment: "#"
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
      { open: '"""', close: '"""', notIn: ["string", "comment"] },
      { open: '"', close: '"', notIn: ["string", "comment"] }
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"""', close: '"""' },
      { open: '"', close: '"' }
    ],
    folding: {
      offSide: true
    }
  };
  var language = {
    // Set defaultToken to invalid to see what you do not tokenize yet
    defaultToken: "invalid",
    tokenPostfix: ".gql",
    keywords: [
      "null",
      "true",
      "false",
      "query",
      "mutation",
      "subscription",
      "extend",
      "schema",
      "directive",
      "scalar",
      "type",
      "interface",
      "union",
      "enum",
      "input",
      "implements",
      "fragment",
      "on"
    ],
    typeKeywords: ["Int", "Float", "String", "Boolean", "ID"],
    directiveLocations: [
      "SCHEMA",
      "SCALAR",
      "OBJECT",
      "FIELD_DEFINITION",
      "ARGUMENT_DEFINITION",
      "INTERFACE",
      "UNION",
      "ENUM",
      "ENUM_VALUE",
      "INPUT_OBJECT",
      "INPUT_FIELD_DEFINITION",
      "QUERY",
      "MUTATION",
      "SUBSCRIPTION",
      "FIELD",
      "FRAGMENT_DEFINITION",
      "FRAGMENT_SPREAD",
      "INLINE_FRAGMENT",
      "VARIABLE_DEFINITION"
    ],
    operators: ["=", "!", "?", ":", "&", "|"],
    // we include these common regular expressions
    symbols: /[=!?:&|]+/,
    // https://facebook.github.io/graphql/draft/#sec-String-Value
    escapes: /\\(?:["\\\/bfnrt]|u[0-9A-Fa-f]{4})/,
    // The main tokenizer for our languages
    tokenizer: {
      root: [
        // fields and argument names
        [
          /[a-z_][\w$]*/,
          {
            cases: {
              "@keywords": "keyword",
              "@default": "key.identifier"
            }
          }
        ],
        // identify typed input variables
        [
          /[$][\w$]*/,
          {
            cases: {
              "@keywords": "keyword",
              "@default": "argument.identifier"
            }
          }
        ],
        // to show class names nicely
        [
          /[A-Z][\w\$]*/,
          {
            cases: {
              "@typeKeywords": "keyword",
              "@default": "type.identifier"
            }
          }
        ],
        // whitespace
        { include: "@whitespace" },
        // delimiters and operators
        [/[{}()\[\]]/, "@brackets"],
        [/@symbols/, { cases: { "@operators": "operator", "@default": "" } }],
        // @ annotations.
        // As an example, we emit a debugging log message on these tokens.
        // Note: message are supressed during the first load -- change some lines to see them.
        [/@\s*[a-zA-Z_\$][\w\$]*/, { token: "annotation", log: "annotation token: $0" }],
        // numbers
        [/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
        [/0[xX][0-9a-fA-F]+/, "number.hex"],
        [/\d+/, "number"],
        // delimiter: after number because of .\d floats
        [/[;,.]/, "delimiter"],
        [/"""/, { token: "string", next: "@mlstring", nextEmbedded: "markdown" }],
        // strings
        [/"([^"\\]|\\.)*$/, "string.invalid"],
        // non-teminated string
        [/"/, { token: "string.quote", bracket: "@open", next: "@string" }]
      ],
      mlstring: [
        [/[^"]+/, "string"],
        ['"""', { token: "string", next: "@pop", nextEmbedded: "@pop" }]
      ],
      string: [
        [/[^\\"]+/, "string"],
        [/@escapes/, "string.escape"],
        [/\\./, "string.escape.invalid"],
        [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }]
      ],
      whitespace: [
        [/[ \t\r\n]+/, ""],
        [/#.*$/, "comment"]
      ]
    }
  };
  return __toCommonJS(graphql_exports);
})();
return moduleExports;
});
