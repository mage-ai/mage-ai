/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.49.0(383fdf3fc0e1e1a024068b8d0fd4f3dcbae74d04)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/
define("vs/basic-languages/azcli/azcli", ["require"],(require)=>{
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

  // src/basic-languages/azcli/azcli.ts
  var azcli_exports = {};
  __export(azcli_exports, {
    conf: () => conf,
    language: () => language
  });
  var conf = {
    comments: {
      lineComment: "#"
    }
  };
  var language = {
    defaultToken: "keyword",
    ignoreCase: true,
    tokenPostfix: ".azcli",
    str: /[^#\s]/,
    tokenizer: {
      root: [
        { include: "@comment" },
        [
          /\s-+@str*\s*/,
          {
            cases: {
              "@eos": { token: "key.identifier", next: "@popall" },
              "@default": { token: "key.identifier", next: "@type" }
            }
          }
        ],
        [
          /^-+@str*\s*/,
          {
            cases: {
              "@eos": { token: "key.identifier", next: "@popall" },
              "@default": { token: "key.identifier", next: "@type" }
            }
          }
        ]
      ],
      type: [
        { include: "@comment" },
        [
          /-+@str*\s*/,
          {
            cases: {
              "@eos": { token: "key.identifier", next: "@popall" },
              "@default": "key.identifier"
            }
          }
        ],
        [
          /@str+\s*/,
          {
            cases: {
              "@eos": { token: "string", next: "@popall" },
              "@default": "string"
            }
          }
        ]
      ],
      comment: [
        [
          /#.*$/,
          {
            cases: {
              "@eos": { token: "comment", next: "@popall" }
            }
          }
        ]
      ]
    }
  };
  return __toCommonJS(azcli_exports);
})();
return moduleExports;
});
