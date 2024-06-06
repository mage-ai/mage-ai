/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.49.0(383fdf3fc0e1e1a024068b8d0fd4f3dcbae74d04)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/
define("vs/basic-languages/go/go", ["require"],(require)=>{
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

  // src/basic-languages/go/go.ts
  var go_exports = {};
  __export(go_exports, {
    conf: () => conf,
    language: () => language
  });
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
      { open: "`", close: "`", notIn: ["string"] },
      { open: '"', close: '"', notIn: ["string"] },
      { open: "'", close: "'", notIn: ["string", "comment"] }
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "`", close: "`" },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ]
  };
  var language = {
    defaultToken: "",
    tokenPostfix: ".go",
    keywords: [
      "break",
      "case",
      "chan",
      "const",
      "continue",
      "default",
      "defer",
      "else",
      "fallthrough",
      "for",
      "func",
      "go",
      "goto",
      "if",
      "import",
      "interface",
      "map",
      "package",
      "range",
      "return",
      "select",
      "struct",
      "switch",
      "type",
      "var",
      "bool",
      "true",
      "false",
      "uint8",
      "uint16",
      "uint32",
      "uint64",
      "int8",
      "int16",
      "int32",
      "int64",
      "float32",
      "float64",
      "complex64",
      "complex128",
      "byte",
      "rune",
      "uint",
      "int",
      "uintptr",
      "string",
      "nil"
    ],
    operators: [
      "+",
      "-",
      "*",
      "/",
      "%",
      "&",
      "|",
      "^",
      "<<",
      ">>",
      "&^",
      "+=",
      "-=",
      "*=",
      "/=",
      "%=",
      "&=",
      "|=",
      "^=",
      "<<=",
      ">>=",
      "&^=",
      "&&",
      "||",
      "<-",
      "++",
      "--",
      "==",
      "<",
      ">",
      "=",
      "!",
      "!=",
      "<=",
      ">=",
      ":=",
      "...",
      "(",
      ")",
      "",
      "]",
      "{",
      "}",
      ",",
      ";",
      ".",
      ":"
    ],
    // we include these common regular expressions
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    // The main tokenizer for our languages
    tokenizer: {
      root: [
        // identifiers and keywords
        [
          /[a-zA-Z_]\w*/,
          {
            cases: {
              "@keywords": { token: "keyword.$0" },
              "@default": "identifier"
            }
          }
        ],
        // whitespace
        { include: "@whitespace" },
        // [[ attributes ]].
        [/\[\[.*\]\]/, "annotation"],
        // Preprocessor directive
        [/^\s*#\w+/, "keyword"],
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
        [/\d*\d+[eE]([\-+]?\d+)?/, "number.float"],
        [/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
        [/0[xX][0-9a-fA-F']*[0-9a-fA-F]/, "number.hex"],
        [/0[0-7']*[0-7]/, "number.octal"],
        [/0[bB][0-1']*[0-1]/, "number.binary"],
        [/\d[\d']*/, "number"],
        [/\d/, "number"],
        // delimiter: after number because of .\d floats
        [/[;,.]/, "delimiter"],
        // strings
        [/"([^"\\]|\\.)*$/, "string.invalid"],
        // non-teminated string
        [/"/, "string", "@string"],
        [/`/, "string", "@rawstring"],
        // characters
        [/'[^\\']'/, "string"],
        [/(')(@escapes)(')/, ["string", "string.escape", "string"]],
        [/'/, "string.invalid"]
      ],
      whitespace: [
        [/[ \t\r\n]+/, ""],
        [/\/\*\*(?!\/)/, "comment.doc", "@doccomment"],
        [/\/\*/, "comment", "@comment"],
        [/\/\/.*$/, "comment"]
      ],
      comment: [
        [/[^\/*]+/, "comment"],
        // [/\/\*/, 'comment', '@push' ],    // nested comment not allowed :-(
        // [/\/\*/,    'comment.invalid' ],    // this breaks block comments in the shape of /* //*/
        [/\*\//, "comment", "@pop"],
        [/[\/*]/, "comment"]
      ],
      //Identical copy of comment above, except for the addition of .doc
      doccomment: [
        [/[^\/*]+/, "comment.doc"],
        // [/\/\*/, 'comment.doc', '@push' ],    // nested comment not allowed :-(
        [/\/\*/, "comment.doc.invalid"],
        [/\*\//, "comment.doc", "@pop"],
        [/[\/*]/, "comment.doc"]
      ],
      string: [
        [/[^\\"]+/, "string"],
        [/@escapes/, "string.escape"],
        [/\\./, "string.escape.invalid"],
        [/"/, "string", "@pop"]
      ],
      rawstring: [
        [/[^\`]/, "string"],
        [/`/, "string", "@pop"]
      ]
    }
  };
  return __toCommonJS(go_exports);
})();
return moduleExports;
});
