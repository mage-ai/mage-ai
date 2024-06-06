/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.49.0(383fdf3fc0e1e1a024068b8d0fd4f3dcbae74d04)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/
define("vs/basic-languages/pla/pla", ["require"],(require)=>{
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

  // src/basic-languages/pla/pla.ts
  var pla_exports = {};
  __export(pla_exports, {
    conf: () => conf,
    language: () => language
  });
  var conf = {
    comments: {
      lineComment: "#"
    },
    brackets: [
      ["[", "]"],
      ["<", ">"],
      ["(", ")"]
    ],
    autoClosingPairs: [
      { open: "[", close: "]" },
      { open: "<", close: ">" },
      { open: "(", close: ")" }
    ],
    surroundingPairs: [
      { open: "[", close: "]" },
      { open: "<", close: ">" },
      { open: "(", close: ")" }
    ]
  };
  var language = {
    defaultToken: "",
    tokenPostfix: ".pla",
    brackets: [
      { open: "[", close: "]", token: "delimiter.square" },
      { open: "<", close: ">", token: "delimiter.angle" },
      { open: "(", close: ")", token: "delimiter.parenthesis" }
    ],
    keywords: [
      ".i",
      ".o",
      ".mv",
      ".ilb",
      ".ob",
      ".label",
      ".type",
      ".phase",
      ".pair",
      ".symbolic",
      ".symbolic-output",
      ".kiss",
      ".p",
      ".e",
      ".end"
    ],
    // regular expressions
    comment: /#.*$/,
    identifier: /[a-zA-Z]+[a-zA-Z0-9_\-]*/,
    plaContent: /[01\-~\|]+/,
    // The main tokenizer for our languages
    tokenizer: {
      root: [
        // comments and whitespace
        { include: "@whitespace" },
        [/@comment/, "comment"],
        // keyword
        [
          /\.([a-zA-Z_\-]+)/,
          {
            cases: {
              "@eos": { token: "keyword.$1" },
              "@keywords": {
                cases: {
                  ".type": { token: "keyword.$1", next: "@type" },
                  "@default": { token: "keyword.$1", next: "@keywordArg" }
                }
              },
              "@default": { token: "keyword.$1" }
            }
          }
        ],
        // identifiers
        [/@identifier/, "identifier"],
        // PLA row
        [/@plaContent/, "string"]
      ],
      whitespace: [[/[ \t\r\n]+/, ""]],
      type: [{ include: "@whitespace" }, [/\w+/, { token: "type", next: "@pop" }]],
      keywordArg: [
        // whitespace
        [
          /[ \t\r\n]+/,
          {
            cases: {
              "@eos": { token: "", next: "@pop" },
              "@default": ""
            }
          }
        ],
        // comments
        [/@comment/, "comment", "@pop"],
        // brackets
        [
          /[<>()\[\]]/,
          {
            cases: {
              "@eos": { token: "@brackets", next: "@pop" },
              "@default": "@brackets"
            }
          }
        ],
        // numbers
        [
          /\-?\d+/,
          {
            cases: {
              "@eos": { token: "number", next: "@pop" },
              "@default": "number"
            }
          }
        ],
        // identifiers
        [
          /@identifier/,
          {
            cases: {
              "@eos": { token: "identifier", next: "@pop" },
              "@default": "identifier"
            }
          }
        ],
        // delimiter
        [
          /[;=]/,
          {
            cases: {
              "@eos": { token: "delimiter", next: "@pop" },
              "@default": "delimiter"
            }
          }
        ]
      ]
    }
  };
  return __toCommonJS(pla_exports);
})();
return moduleExports;
});
