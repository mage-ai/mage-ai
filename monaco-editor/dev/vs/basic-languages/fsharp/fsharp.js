/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.49.0(383fdf3fc0e1e1a024068b8d0fd4f3dcbae74d04)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/
define("vs/basic-languages/fsharp/fsharp", ["require"],(require)=>{
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

  // src/basic-languages/fsharp/fsharp.ts
  var fsharp_exports = {};
  __export(fsharp_exports, {
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
      ["(", ")"]
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' }
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ],
    folding: {
      markers: {
        start: new RegExp("^\\s*//\\s*#region\\b|^\\s*\\(\\*\\s*#region(.*)\\*\\)"),
        end: new RegExp("^\\s*//\\s*#endregion\\b|^\\s*\\(\\*\\s*#endregion\\s*\\*\\)")
      }
    }
  };
  var language = {
    defaultToken: "",
    tokenPostfix: ".fs",
    keywords: [
      "abstract",
      "and",
      "atomic",
      "as",
      "assert",
      "asr",
      "base",
      "begin",
      "break",
      "checked",
      "component",
      "const",
      "constraint",
      "constructor",
      "continue",
      "class",
      "default",
      "delegate",
      "do",
      "done",
      "downcast",
      "downto",
      "elif",
      "else",
      "end",
      "exception",
      "eager",
      "event",
      "external",
      "extern",
      "false",
      "finally",
      "for",
      "fun",
      "function",
      "fixed",
      "functor",
      "global",
      "if",
      "in",
      "include",
      "inherit",
      "inline",
      "interface",
      "internal",
      "land",
      "lor",
      "lsl",
      "lsr",
      "lxor",
      "lazy",
      "let",
      "match",
      "member",
      "mod",
      "module",
      "mutable",
      "namespace",
      "method",
      "mixin",
      "new",
      "not",
      "null",
      "of",
      "open",
      "or",
      "object",
      "override",
      "private",
      "parallel",
      "process",
      "protected",
      "pure",
      "public",
      "rec",
      "return",
      "static",
      "sealed",
      "struct",
      "sig",
      "then",
      "to",
      "true",
      "tailcall",
      "trait",
      "try",
      "type",
      "upcast",
      "use",
      "val",
      "void",
      "virtual",
      "volatile",
      "when",
      "while",
      "with",
      "yield"
    ],
    // we include these common regular expressions
    symbols: /[=><!~?:&|+\-*\^%;\.,\/]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    integersuffix: /[uU]?[yslnLI]?/,
    floatsuffix: /[fFmM]?/,
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
        // [< attributes >].
        [/\[<.*>\]/, "annotation"],
        // Preprocessor directive
        [/^#(if|else|endif)/, "keyword"],
        // delimiters and operators
        [/[{}()\[\]]/, "@brackets"],
        [/[<>](?!@symbols)/, "@brackets"],
        [/@symbols/, "delimiter"],
        // numbers
        [/\d*\d+[eE]([\-+]?\d+)?(@floatsuffix)/, "number.float"],
        [/\d*\.\d+([eE][\-+]?\d+)?(@floatsuffix)/, "number.float"],
        [/0x[0-9a-fA-F]+LF/, "number.float"],
        [/0x[0-9a-fA-F]+(@integersuffix)/, "number.hex"],
        [/0b[0-1]+(@integersuffix)/, "number.bin"],
        [/\d+(@integersuffix)/, "number"],
        // delimiter: after number because of .\d floats
        [/[;,.]/, "delimiter"],
        // strings
        [/"([^"\\]|\\.)*$/, "string.invalid"],
        // non-teminated string
        [/"""/, "string", '@string."""'],
        [/"/, "string", '@string."'],
        // literal string
        [/\@"/, { token: "string.quote", next: "@litstring" }],
        // characters
        [/'[^\\']'B?/, "string"],
        [/(')(@escapes)(')/, ["string", "string.escape", "string"]],
        [/'/, "string.invalid"]
      ],
      whitespace: [
        [/[ \t\r\n]+/, ""],
        [/\(\*(?!\))/, "comment", "@comment"],
        [/\/\/.*$/, "comment"]
      ],
      comment: [
        [/[^*(]+/, "comment"],
        [/\*\)/, "comment", "@pop"],
        [/\*/, "comment"],
        [/\(\*\)/, "comment"],
        [/\(/, "comment"]
      ],
      string: [
        [/[^\\"]+/, "string"],
        [/@escapes/, "string.escape"],
        [/\\./, "string.escape.invalid"],
        [
          /("""|"B?)/,
          {
            cases: {
              "$#==$S2": { token: "string", next: "@pop" },
              "@default": "string"
            }
          }
        ]
      ],
      litstring: [
        [/[^"]+/, "string"],
        [/""/, "string.escape"],
        [/"/, { token: "string.quote", next: "@pop" }]
      ]
    }
  };
  return __toCommonJS(fsharp_exports);
})();
return moduleExports;
});
