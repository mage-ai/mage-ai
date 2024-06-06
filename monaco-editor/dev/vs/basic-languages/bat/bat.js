/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.49.0(383fdf3fc0e1e1a024068b8d0fd4f3dcbae74d04)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/
define("vs/basic-languages/bat/bat", ["require"],(require)=>{
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

  // src/basic-languages/bat/bat.ts
  var bat_exports = {};
  __export(bat_exports, {
    conf: () => conf,
    language: () => language
  });
  var conf = {
    comments: {
      lineComment: "REM"
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
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' }
    ],
    folding: {
      markers: {
        start: new RegExp("^\\s*(::\\s*|REM\\s+)#region"),
        end: new RegExp("^\\s*(::\\s*|REM\\s+)#endregion")
      }
    }
  };
  var language = {
    defaultToken: "",
    ignoreCase: true,
    tokenPostfix: ".bat",
    brackets: [
      { token: "delimiter.bracket", open: "{", close: "}" },
      { token: "delimiter.parenthesis", open: "(", close: ")" },
      { token: "delimiter.square", open: "[", close: "]" }
    ],
    keywords: /call|defined|echo|errorlevel|exist|for|goto|if|pause|set|shift|start|title|not|pushd|popd/,
    // we include these common regular expressions
    symbols: /[=><!~?&|+\-*\/\^;\.,]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    // The main tokenizer for our languages
    tokenizer: {
      root: [
        [/^(\s*)(rem(?:\s.*|))$/, ["", "comment"]],
        [/(\@?)(@keywords)(?!\w)/, [{ token: "keyword" }, { token: "keyword.$2" }]],
        // whitespace
        [/[ \t\r\n]+/, ""],
        // blocks
        [/setlocal(?!\w)/, "keyword.tag-setlocal"],
        [/endlocal(?!\w)/, "keyword.tag-setlocal"],
        // words
        [/[a-zA-Z_]\w*/, ""],
        // labels
        [/:\w*/, "metatag"],
        // variables
        [/%[^%]+%/, "variable"],
        [/%%[\w]+(?!\w)/, "variable"],
        // punctuations
        [/[{}()\[\]]/, "@brackets"],
        [/@symbols/, "delimiter"],
        // numbers
        [/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
        [/0[xX][0-9a-fA-F_]*[0-9a-fA-F]/, "number.hex"],
        [/\d+/, "number"],
        // punctuation: after number because of .\d floats
        [/[;,.]/, "delimiter"],
        // strings:
        [/"/, "string", '@string."'],
        [/'/, "string", "@string.'"]
      ],
      string: [
        [
          /[^\\"'%]+/,
          {
            cases: {
              "@eos": { token: "string", next: "@popall" },
              "@default": "string"
            }
          }
        ],
        [/@escapes/, "string.escape"],
        [/\\./, "string.escape.invalid"],
        [/%[\w ]+%/, "variable"],
        [/%%[\w]+(?!\w)/, "variable"],
        [
          /["']/,
          {
            cases: {
              "$#==$S2": { token: "string", next: "@pop" },
              "@default": "string"
            }
          }
        ],
        [/$/, "string", "@popall"]
      ]
    }
  };
  return __toCommonJS(bat_exports);
})();
return moduleExports;
});
