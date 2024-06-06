/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.49.0(383fdf3fc0e1e1a024068b8d0fd4f3dcbae74d04)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/
define("vs/basic-languages/java/java", ["require"],(require)=>{
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

  // src/basic-languages/java/java.ts
  var java_exports = {};
  __export(java_exports, {
    conf: () => conf,
    language: () => language
  });
  var conf = {
    // the default separators except `@$`
    wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
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
      { open: "'", close: "'" }
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: "<", close: ">" }
    ],
    folding: {
      markers: {
        start: new RegExp("^\\s*//\\s*(?:(?:#?region\\b)|(?:<editor-fold\\b))"),
        end: new RegExp("^\\s*//\\s*(?:(?:#?endregion\\b)|(?:</editor-fold>))")
      }
    }
  };
  var language = {
    defaultToken: "",
    tokenPostfix: ".java",
    keywords: [
      "abstract",
      "continue",
      "for",
      "new",
      "switch",
      "assert",
      "default",
      "goto",
      "package",
      "synchronized",
      "boolean",
      "do",
      "if",
      "private",
      "this",
      "break",
      "double",
      "implements",
      "protected",
      "throw",
      "byte",
      "else",
      "import",
      "public",
      "throws",
      "case",
      "enum",
      "instanceof",
      "return",
      "transient",
      "catch",
      "extends",
      "int",
      "short",
      "try",
      "char",
      "final",
      "interface",
      "static",
      "void",
      "class",
      "finally",
      "long",
      "strictfp",
      "volatile",
      "const",
      "float",
      "native",
      "super",
      "while",
      "true",
      "false",
      "yield",
      "record",
      "sealed",
      "non-sealed",
      "permits"
    ],
    operators: [
      "=",
      ">",
      "<",
      "!",
      "~",
      "?",
      ":",
      "==",
      "<=",
      ">=",
      "!=",
      "&&",
      "||",
      "++",
      "--",
      "+",
      "-",
      "*",
      "/",
      "&",
      "|",
      "^",
      "%",
      "<<",
      ">>",
      ">>>",
      "+=",
      "-=",
      "*=",
      "/=",
      "&=",
      "|=",
      "^=",
      "%=",
      "<<=",
      ">>=",
      ">>>="
    ],
    // we include these common regular expressions
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    digits: /\d+(_+\d+)*/,
    octaldigits: /[0-7]+(_+[0-7]+)*/,
    binarydigits: /[0-1]+(_+[0-1]+)*/,
    hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,
    // The main tokenizer for our languages
    tokenizer: {
      root: [
        // Special keyword with a dash
        ["non-sealed", "keyword.non-sealed"],
        // identifiers and keywords
        [
          /[a-zA-Z_$][\w$]*/,
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
        // @ annotations.
        [/@\s*[a-zA-Z_\$][\w\$]*/, "annotation"],
        // numbers
        [/(@digits)[eE]([\-+]?(@digits))?[fFdD]?/, "number.float"],
        [/(@digits)\.(@digits)([eE][\-+]?(@digits))?[fFdD]?/, "number.float"],
        [/0[xX](@hexdigits)[Ll]?/, "number.hex"],
        [/0(@octaldigits)[Ll]?/, "number.octal"],
        [/0[bB](@binarydigits)[Ll]?/, "number.binary"],
        [/(@digits)[fFdD]/, "number.float"],
        [/(@digits)[lL]?/, "number"],
        // delimiter: after number because of .\d floats
        [/[;,.]/, "delimiter"],
        // strings
        [/"([^"\\]|\\.)*$/, "string.invalid"],
        // non-teminated string
        [/"""/, "string", "@multistring"],
        [/"/, "string", "@string"],
        // characters
        [/'[^\\']'/, "string"],
        [/(')(@escapes)(')/, ["string", "string.escape", "string"]],
        [/'/, "string.invalid"]
      ],
      whitespace: [
        [/[ \t\r\n]+/, ""],
        [/\/\*\*(?!\/)/, "comment.doc", "@javadoc"],
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
      javadoc: [
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
      multistring: [
        [/[^\\"]+/, "string"],
        [/@escapes/, "string.escape"],
        [/\\./, "string.escape.invalid"],
        [/"""/, "string", "@pop"],
        [/./, "string"]
      ]
    }
  };
  return __toCommonJS(java_exports);
})();
return moduleExports;
});
