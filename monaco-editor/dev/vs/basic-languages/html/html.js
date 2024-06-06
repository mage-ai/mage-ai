/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.49.0(383fdf3fc0e1e1a024068b8d0fd4f3dcbae74d04)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/
define("vs/basic-languages/html/html", ["require"],(require)=>{
"use strict";
var moduleExports = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined")
      return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __commonJS = (cb, mod) => function __require2() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
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
  var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/fillers/monaco-editor-core-amd.ts
  var require_monaco_editor_core_amd = __commonJS({
    "src/fillers/monaco-editor-core-amd.ts"(exports, module) {
      var api = __toESM(__require("vs/editor/editor.api"));
      module.exports = api;
    }
  });

  // src/basic-languages/html/html.ts
  var html_exports = {};
  __export(html_exports, {
    conf: () => conf,
    language: () => language
  });

  // src/fillers/monaco-editor-core.ts
  var monaco_editor_core_exports = {};
  __reExport(monaco_editor_core_exports, __toESM(require_monaco_editor_core_amd()));

  // src/basic-languages/html/html.ts
  var EMPTY_ELEMENTS = [
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "keygen",
    "link",
    "menuitem",
    "meta",
    "param",
    "source",
    "track",
    "wbr"
  ];
  var conf = {
    wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g,
    comments: {
      blockComment: ["<!--", "-->"]
    },
    brackets: [
      ["<!--", "-->"],
      ["<", ">"],
      ["{", "}"],
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
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "<", close: ">" }
    ],
    onEnterRules: [
      {
        beforeText: new RegExp(
          `<(?!(?:${EMPTY_ELEMENTS.join("|")}))([_:\\w][_:\\w-.\\d]*)([^/>]*(?!/)>)[^<]*$`,
          "i"
        ),
        afterText: /^<\/([_:\w][_:\w-.\d]*)\s*>$/i,
        action: {
          indentAction: monaco_editor_core_exports.languages.IndentAction.IndentOutdent
        }
      },
      {
        beforeText: new RegExp(
          `<(?!(?:${EMPTY_ELEMENTS.join("|")}))(\\w[\\w\\d]*)([^/>]*(?!/)>)[^<]*$`,
          "i"
        ),
        action: { indentAction: monaco_editor_core_exports.languages.IndentAction.Indent }
      }
    ],
    folding: {
      markers: {
        start: new RegExp("^\\s*<!--\\s*#region\\b.*-->"),
        end: new RegExp("^\\s*<!--\\s*#endregion\\b.*-->")
      }
    }
  };
  var language = {
    defaultToken: "",
    tokenPostfix: ".html",
    ignoreCase: true,
    // The main tokenizer for our languages
    tokenizer: {
      root: [
        [/<!DOCTYPE/, "metatag", "@doctype"],
        [/<!--/, "comment", "@comment"],
        [/(<)((?:[\w\-]+:)?[\w\-]+)(\s*)(\/>)/, ["delimiter", "tag", "", "delimiter"]],
        [/(<)(script)/, ["delimiter", { token: "tag", next: "@script" }]],
        [/(<)(style)/, ["delimiter", { token: "tag", next: "@style" }]],
        [/(<)((?:[\w\-]+:)?[\w\-]+)/, ["delimiter", { token: "tag", next: "@otherTag" }]],
        [/(<\/)((?:[\w\-]+:)?[\w\-]+)/, ["delimiter", { token: "tag", next: "@otherTag" }]],
        [/</, "delimiter"],
        [/[^<]+/]
        // text
      ],
      doctype: [
        [/[^>]+/, "metatag.content"],
        [/>/, "metatag", "@pop"]
      ],
      comment: [
        [/-->/, "comment", "@pop"],
        [/[^-]+/, "comment.content"],
        [/./, "comment.content"]
      ],
      otherTag: [
        [/\/?>/, "delimiter", "@pop"],
        [/"([^"]*)"/, "attribute.value"],
        [/'([^']*)'/, "attribute.value"],
        [/[\w\-]+/, "attribute.name"],
        [/=/, "delimiter"],
        [/[ \t\r\n]+/]
        // whitespace
      ],
      // -- BEGIN <script> tags handling
      // After <script
      script: [
        [/type/, "attribute.name", "@scriptAfterType"],
        [/"([^"]*)"/, "attribute.value"],
        [/'([^']*)'/, "attribute.value"],
        [/[\w\-]+/, "attribute.name"],
        [/=/, "delimiter"],
        [
          />/,
          {
            token: "delimiter",
            next: "@scriptEmbedded",
            nextEmbedded: "text/javascript"
          }
        ],
        [/[ \t\r\n]+/],
        // whitespace
        [/(<\/)(script\s*)(>)/, ["delimiter", "tag", { token: "delimiter", next: "@pop" }]]
      ],
      // After <script ... type
      scriptAfterType: [
        [/=/, "delimiter", "@scriptAfterTypeEquals"],
        [
          />/,
          {
            token: "delimiter",
            next: "@scriptEmbedded",
            nextEmbedded: "text/javascript"
          }
        ],
        // cover invalid e.g. <script type>
        [/[ \t\r\n]+/],
        // whitespace
        [/<\/script\s*>/, { token: "@rematch", next: "@pop" }]
      ],
      // After <script ... type =
      scriptAfterTypeEquals: [
        [
          /"module"/,
          {
            token: "attribute.value",
            switchTo: "@scriptWithCustomType.text/javascript"
          }
        ],
        [
          /'module'/,
          {
            token: "attribute.value",
            switchTo: "@scriptWithCustomType.text/javascript"
          }
        ],
        [
          /"([^"]*)"/,
          {
            token: "attribute.value",
            switchTo: "@scriptWithCustomType.$1"
          }
        ],
        [
          /'([^']*)'/,
          {
            token: "attribute.value",
            switchTo: "@scriptWithCustomType.$1"
          }
        ],
        [
          />/,
          {
            token: "delimiter",
            next: "@scriptEmbedded",
            nextEmbedded: "text/javascript"
          }
        ],
        // cover invalid e.g. <script type=>
        [/[ \t\r\n]+/],
        // whitespace
        [/<\/script\s*>/, { token: "@rematch", next: "@pop" }]
      ],
      // After <script ... type = $S2
      scriptWithCustomType: [
        [
          />/,
          {
            token: "delimiter",
            next: "@scriptEmbedded.$S2",
            nextEmbedded: "$S2"
          }
        ],
        [/"([^"]*)"/, "attribute.value"],
        [/'([^']*)'/, "attribute.value"],
        [/[\w\-]+/, "attribute.name"],
        [/=/, "delimiter"],
        [/[ \t\r\n]+/],
        // whitespace
        [/<\/script\s*>/, { token: "@rematch", next: "@pop" }]
      ],
      scriptEmbedded: [
        [/<\/script/, { token: "@rematch", next: "@pop", nextEmbedded: "@pop" }],
        [/[^<]+/, ""]
      ],
      // -- END <script> tags handling
      // -- BEGIN <style> tags handling
      // After <style
      style: [
        [/type/, "attribute.name", "@styleAfterType"],
        [/"([^"]*)"/, "attribute.value"],
        [/'([^']*)'/, "attribute.value"],
        [/[\w\-]+/, "attribute.name"],
        [/=/, "delimiter"],
        [
          />/,
          {
            token: "delimiter",
            next: "@styleEmbedded",
            nextEmbedded: "text/css"
          }
        ],
        [/[ \t\r\n]+/],
        // whitespace
        [/(<\/)(style\s*)(>)/, ["delimiter", "tag", { token: "delimiter", next: "@pop" }]]
      ],
      // After <style ... type
      styleAfterType: [
        [/=/, "delimiter", "@styleAfterTypeEquals"],
        [
          />/,
          {
            token: "delimiter",
            next: "@styleEmbedded",
            nextEmbedded: "text/css"
          }
        ],
        // cover invalid e.g. <style type>
        [/[ \t\r\n]+/],
        // whitespace
        [/<\/style\s*>/, { token: "@rematch", next: "@pop" }]
      ],
      // After <style ... type =
      styleAfterTypeEquals: [
        [
          /"([^"]*)"/,
          {
            token: "attribute.value",
            switchTo: "@styleWithCustomType.$1"
          }
        ],
        [
          /'([^']*)'/,
          {
            token: "attribute.value",
            switchTo: "@styleWithCustomType.$1"
          }
        ],
        [
          />/,
          {
            token: "delimiter",
            next: "@styleEmbedded",
            nextEmbedded: "text/css"
          }
        ],
        // cover invalid e.g. <style type=>
        [/[ \t\r\n]+/],
        // whitespace
        [/<\/style\s*>/, { token: "@rematch", next: "@pop" }]
      ],
      // After <style ... type = $S2
      styleWithCustomType: [
        [
          />/,
          {
            token: "delimiter",
            next: "@styleEmbedded.$S2",
            nextEmbedded: "$S2"
          }
        ],
        [/"([^"]*)"/, "attribute.value"],
        [/'([^']*)'/, "attribute.value"],
        [/[\w\-]+/, "attribute.name"],
        [/=/, "delimiter"],
        [/[ \t\r\n]+/],
        // whitespace
        [/<\/style\s*>/, { token: "@rematch", next: "@pop" }]
      ],
      styleEmbedded: [
        [/<\/style/, { token: "@rematch", next: "@pop", nextEmbedded: "@pop" }],
        [/[^<]+/, ""]
      ]
      // -- END <style> tags handling
    }
  };
  return __toCommonJS(html_exports);
})();
return moduleExports;
});
