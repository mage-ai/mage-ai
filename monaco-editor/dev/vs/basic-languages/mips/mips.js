/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.49.0(383fdf3fc0e1e1a024068b8d0fd4f3dcbae74d04)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/
define("vs/basic-languages/mips/mips", ["require"],(require)=>{
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

  // src/basic-languages/mips/mips.ts
  var mips_exports = {};
  __export(mips_exports, {
    conf: () => conf,
    language: () => language
  });
  var conf = {
    wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#%\^\&\*\(\)\=\$\-\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
    comments: {
      blockComment: ["###", "###"],
      lineComment: "#"
    },
    folding: {
      markers: {
        start: new RegExp("^\\s*#region\\b"),
        end: new RegExp("^\\s*#endregion\\b")
      }
    }
  };
  var language = {
    defaultToken: "",
    ignoreCase: false,
    tokenPostfix: ".mips",
    regEx: /\/(?!\/\/)(?:[^\/\\]|\\.)*\/[igm]*/,
    keywords: [
      ".data",
      ".text",
      "syscall",
      "trap",
      "add",
      "addu",
      "addi",
      "addiu",
      "and",
      "andi",
      "div",
      "divu",
      "mult",
      "multu",
      "nor",
      "or",
      "ori",
      "sll",
      "slv",
      "sra",
      "srav",
      "srl",
      "srlv",
      "sub",
      "subu",
      "xor",
      "xori",
      "lhi",
      "lho",
      "lhi",
      "llo",
      "slt",
      "slti",
      "sltu",
      "sltiu",
      "beq",
      "bgtz",
      "blez",
      "bne",
      "j",
      "jal",
      "jalr",
      "jr",
      "lb",
      "lbu",
      "lh",
      "lhu",
      "lw",
      "li",
      "la",
      "sb",
      "sh",
      "sw",
      "mfhi",
      "mflo",
      "mthi",
      "mtlo",
      "move"
    ],
    // we include these common regular expressions
    symbols: /[\.,\:]+/,
    escapes: /\\(?:[abfnrtv\\"'$]|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    // The main tokenizer for our languages
    tokenizer: {
      root: [
        // identifiers and keywords
        [/\$[a-zA-Z_]\w*/, "variable.predefined"],
        [
          /[.a-zA-Z_]\w*/,
          {
            cases: {
              this: "variable.predefined",
              "@keywords": { token: "keyword.$0" },
              "@default": ""
            }
          }
        ],
        // whitespace
        [/[ \t\r\n]+/, ""],
        // Comments
        [/#.*$/, "comment"],
        // regular expressions
        ["///", { token: "regexp", next: "@hereregexp" }],
        [/^(\s*)(@regEx)/, ["", "regexp"]],
        [/(\,)(\s*)(@regEx)/, ["delimiter", "", "regexp"]],
        [/(\:)(\s*)(@regEx)/, ["delimiter", "", "regexp"]],
        // delimiters
        [/@symbols/, "delimiter"],
        // numbers
        [/\d+[eE]([\-+]?\d+)?/, "number.float"],
        [/\d+\.\d+([eE][\-+]?\d+)?/, "number.float"],
        [/0[xX][0-9a-fA-F]+/, "number.hex"],
        [/0[0-7]+(?!\d)/, "number.octal"],
        [/\d+/, "number"],
        // delimiter: after number because of .\d floats
        [/[,.]/, "delimiter"],
        // strings:
        [/"""/, "string", '@herestring."""'],
        [/'''/, "string", "@herestring.'''"],
        [
          /"/,
          {
            cases: {
              "@eos": "string",
              "@default": { token: "string", next: '@string."' }
            }
          }
        ],
        [
          /'/,
          {
            cases: {
              "@eos": "string",
              "@default": { token: "string", next: "@string.'" }
            }
          }
        ]
      ],
      string: [
        [/[^"'\#\\]+/, "string"],
        [/@escapes/, "string.escape"],
        [/\./, "string.escape.invalid"],
        [/\./, "string.escape.invalid"],
        [
          /#{/,
          {
            cases: {
              '$S2=="': {
                token: "string",
                next: "root.interpolatedstring"
              },
              "@default": "string"
            }
          }
        ],
        [
          /["']/,
          {
            cases: {
              "$#==$S2": { token: "string", next: "@pop" },
              "@default": "string"
            }
          }
        ],
        [/#/, "string"]
      ],
      herestring: [
        [
          /("""|''')/,
          {
            cases: {
              "$1==$S2": { token: "string", next: "@pop" },
              "@default": "string"
            }
          }
        ],
        [/[^#\\'"]+/, "string"],
        [/['"]+/, "string"],
        [/@escapes/, "string.escape"],
        [/\./, "string.escape.invalid"],
        [/#{/, { token: "string.quote", next: "root.interpolatedstring" }],
        [/#/, "string"]
      ],
      comment: [
        [/[^#]+/, "comment"],
        [/#/, "comment"]
      ],
      hereregexp: [
        [/[^\\\/#]+/, "regexp"],
        [/\\./, "regexp"],
        [/#.*$/, "comment"],
        ["///[igm]*", { token: "regexp", next: "@pop" }],
        [/\//, "regexp"]
      ]
    }
  };
  return __toCommonJS(mips_exports);
})();
return moduleExports;
});
