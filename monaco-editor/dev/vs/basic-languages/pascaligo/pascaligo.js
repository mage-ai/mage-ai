/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.49.0(383fdf3fc0e1e1a024068b8d0fd4f3dcbae74d04)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/
define("vs/basic-languages/pascaligo/pascaligo", ["require"],(require)=>{
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

  // src/basic-languages/pascaligo/pascaligo.ts
  var pascaligo_exports = {};
  __export(pascaligo_exports, {
    conf: () => conf,
    language: () => language
  });
  var conf = {
    comments: {
      lineComment: "//",
      blockComment: ["(*", "*)"]
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
      ["<", ">"]
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "<", close: ">" },
      { open: "'", close: "'" }
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "<", close: ">" },
      { open: "'", close: "'" }
    ]
  };
  var language = {
    defaultToken: "",
    tokenPostfix: ".pascaligo",
    ignoreCase: true,
    brackets: [
      { open: "{", close: "}", token: "delimiter.curly" },
      { open: "[", close: "]", token: "delimiter.square" },
      { open: "(", close: ")", token: "delimiter.parenthesis" },
      { open: "<", close: ">", token: "delimiter.angle" }
    ],
    keywords: [
      "begin",
      "block",
      "case",
      "const",
      "else",
      "end",
      "fail",
      "for",
      "from",
      "function",
      "if",
      "is",
      "nil",
      "of",
      "remove",
      "return",
      "skip",
      "then",
      "type",
      "var",
      "while",
      "with",
      "option",
      "None",
      "transaction"
    ],
    typeKeywords: [
      "bool",
      "int",
      "list",
      "map",
      "nat",
      "record",
      "string",
      "unit",
      "address",
      "map",
      "mtz",
      "xtz"
    ],
    operators: [
      "=",
      ">",
      "<",
      "<=",
      ">=",
      "<>",
      ":",
      ":=",
      "and",
      "mod",
      "or",
      "+",
      "-",
      "*",
      "/",
      "@",
      "&",
      "^",
      "%"
    ],
    // we include these common regular expressions
    symbols: /[=><:@\^&|+\-*\/\^%]+/,
    // The main tokenizer for our languages
    tokenizer: {
      root: [
        // identifiers and keywords
        [
          /[a-zA-Z_][\w]*/,
          {
            cases: {
              "@keywords": { token: "keyword.$0" },
              "@default": "identifier"
            }
          }
        ],
        // whitespace
        { include: "@whitespace" },
        // delimiters and operators
        [/[{}()\[\]]/, "@brackets"],
        [/[<>](?!@symbols)/, "@brackets"],
        [
          /@symbols/,
          {
            cases: {
              "@operators": "delimiter",
              "@default": ""
            }
          }
        ],
        // numbers
        [/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
        [/\$[0-9a-fA-F]{1,16}/, "number.hex"],
        [/\d+/, "number"],
        // delimiter: after number because of .\d floats
        [/[;,.]/, "delimiter"],
        // strings
        [/'([^'\\]|\\.)*$/, "string.invalid"],
        // non-teminated string
        [/'/, "string", "@string"],
        // characters
        [/'[^\\']'/, "string"],
        [/'/, "string.invalid"],
        [/\#\d+/, "string"]
      ],
      /* */
      comment: [
        [/[^\(\*]+/, "comment"],
        //[/\(\*/,    'comment', '@push' ],    // nested comment  not allowed :-(
        [/\*\)/, "comment", "@pop"],
        [/\(\*/, "comment"]
      ],
      string: [
        [/[^\\']+/, "string"],
        [/\\./, "string.escape.invalid"],
        [/'/, { token: "string.quote", bracket: "@close", next: "@pop" }]
      ],
      whitespace: [
        [/[ \t\r\n]+/, "white"],
        [/\(\*/, "comment", "@comment"],
        [/\/\/.*$/, "comment"]
      ]
    }
  };
  return __toCommonJS(pascaligo_exports);
})();
return moduleExports;
});
