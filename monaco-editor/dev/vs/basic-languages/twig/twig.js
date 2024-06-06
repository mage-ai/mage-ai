/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.49.0(383fdf3fc0e1e1a024068b8d0fd4f3dcbae74d04)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/
define("vs/basic-languages/twig/twig", ["require"],(require)=>{
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

  // src/basic-languages/twig/twig.ts
  var twig_exports = {};
  __export(twig_exports, {
    conf: () => conf,
    language: () => language
  });
  var conf = {
    wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g,
    comments: {
      blockComment: ["{#", "#}"]
    },
    brackets: [
      ["{#", "#}"],
      ["{%", "%}"],
      ["{{", "}}"],
      ["(", ")"],
      ["[", "]"],
      // HTML
      ["<!--", "-->"],
      ["<", ">"]
    ],
    autoClosingPairs: [
      { open: "{# ", close: " #}" },
      { open: "{% ", close: " %}" },
      { open: "{{ ", close: " }}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ],
    surroundingPairs: [
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      // HTML
      { open: "<", close: ">" }
    ]
  };
  var language = {
    defaultToken: "",
    tokenPostfix: "",
    ignoreCase: true,
    keywords: [
      // (opening) tags
      "apply",
      "autoescape",
      "block",
      "deprecated",
      "do",
      "embed",
      "extends",
      "flush",
      "for",
      "from",
      "if",
      "import",
      "include",
      "macro",
      "sandbox",
      "set",
      "use",
      "verbatim",
      "with",
      // closing tags
      "endapply",
      "endautoescape",
      "endblock",
      "endembed",
      "endfor",
      "endif",
      "endmacro",
      "endsandbox",
      "endset",
      "endwith",
      // literals
      "true",
      "false"
    ],
    tokenizer: {
      root: [
        // whitespace
        [/\s+/],
        // Twig Tag Delimiters
        [/{#/, "comment.twig", "@commentState"],
        [/{%[-~]?/, "delimiter.twig", "@blockState"],
        [/{{[-~]?/, "delimiter.twig", "@variableState"],
        // HTML
        [/<!DOCTYPE/, "metatag.html", "@doctype"],
        [/<!--/, "comment.html", "@comment"],
        [/(<)((?:[\w\-]+:)?[\w\-]+)(\s*)(\/>)/, ["delimiter.html", "tag.html", "", "delimiter.html"]],
        [/(<)(script)/, ["delimiter.html", { token: "tag.html", next: "@script" }]],
        [/(<)(style)/, ["delimiter.html", { token: "tag.html", next: "@style" }]],
        [/(<)((?:[\w\-]+:)?[\w\-]+)/, ["delimiter.html", { token: "tag.html", next: "@otherTag" }]],
        [/(<\/)((?:[\w\-]+:)?[\w\-]+)/, ["delimiter.html", { token: "tag.html", next: "@otherTag" }]],
        [/</, "delimiter.html"],
        [/[^<{]+/]
        // text
      ],
      /**
       * Comment Tag Handling
       */
      commentState: [
        [/#}/, "comment.twig", "@pop"],
        [/./, "comment.twig"]
      ],
      /**
       * Block Tag Handling
       */
      blockState: [
        [/[-~]?%}/, "delimiter.twig", "@pop"],
        // whitespace
        [/\s+/],
        // verbatim
        // Unlike other blocks, verbatim ehas its own state
        // transition to ensure we mark its contents as strings.
        [
          /(verbatim)(\s*)([-~]?%})/,
          ["keyword.twig", "", { token: "delimiter.twig", next: "@rawDataState" }]
        ],
        { include: "expression" }
      ],
      rawDataState: [
        // endverbatim
        [
          /({%[-~]?)(\s*)(endverbatim)(\s*)([-~]?%})/,
          ["delimiter.twig", "", "keyword.twig", "", { token: "delimiter.twig", next: "@popall" }]
        ],
        [/./, "string.twig"]
      ],
      /**
       * Variable Tag Handling
       */
      variableState: [[/[-~]?}}/, "delimiter.twig", "@pop"], { include: "expression" }],
      stringState: [
        // closing double quoted string
        [/"/, "string.twig", "@pop"],
        // interpolation start
        [/#{\s*/, "string.twig", "@interpolationState"],
        // string part
        [/[^#"\\]*(?:(?:\\.|#(?!\{))[^#"\\]*)*/, "string.twig"]
      ],
      interpolationState: [
        // interpolation end
        [/}/, "string.twig", "@pop"],
        { include: "expression" }
      ],
      /**
       * Expression Handling
       */
      expression: [
        // whitespace
        [/\s+/],
        // operators - math
        [/\+|-|\/{1,2}|%|\*{1,2}/, "operators.twig"],
        // operators - logic
        [/(and|or|not|b-and|b-xor|b-or)(\s+)/, ["operators.twig", ""]],
        // operators - comparison (symbols)
        [/==|!=|<|>|>=|<=/, "operators.twig"],
        // operators - comparison (words)
        [/(starts with|ends with|matches)(\s+)/, ["operators.twig", ""]],
        // operators - containment
        [/(in)(\s+)/, ["operators.twig", ""]],
        // operators - test
        [/(is)(\s+)/, ["operators.twig", ""]],
        // operators - misc
        [/\||~|:|\.{1,2}|\?{1,2}/, "operators.twig"],
        // names
        [
          /[^\W\d][\w]*/,
          {
            cases: {
              "@keywords": "keyword.twig",
              "@default": "variable.twig"
            }
          }
        ],
        // numbers
        [/\d+(\.\d+)?/, "number.twig"],
        // punctuation
        [/\(|\)|\[|\]|{|}|,/, "delimiter.twig"],
        // strings
        [/"([^#"\\]*(?:\\.[^#"\\]*)*)"|\'([^\'\\]*(?:\\.[^\'\\]*)*)\'/, "string.twig"],
        // opening double quoted string
        [/"/, "string.twig", "@stringState"],
        // misc syntactic constructs
        // These are not operators per se, but for the purposes of lexical analysis we
        // can treat them as such.
        // arrow functions
        [/=>/, "operators.twig"],
        // assignment
        [/=/, "operators.twig"]
      ],
      /**
       * HTML
       */
      doctype: [
        [/[^>]+/, "metatag.content.html"],
        [/>/, "metatag.html", "@pop"]
      ],
      comment: [
        [/-->/, "comment.html", "@pop"],
        [/[^-]+/, "comment.content.html"],
        [/./, "comment.content.html"]
      ],
      otherTag: [
        [/\/?>/, "delimiter.html", "@pop"],
        [/"([^"]*)"/, "attribute.value.html"],
        [/'([^']*)'/, "attribute.value.html"],
        [/[\w\-]+/, "attribute.name.html"],
        [/=/, "delimiter.html"],
        [/[ \t\r\n]+/]
        // whitespace
      ],
      // -- BEGIN <script> tags handling
      // After <script
      script: [
        [/type/, "attribute.name.html", "@scriptAfterType"],
        [/"([^"]*)"/, "attribute.value.html"],
        [/'([^']*)'/, "attribute.value.html"],
        [/[\w\-]+/, "attribute.name.html"],
        [/=/, "delimiter.html"],
        [
          />/,
          {
            token: "delimiter.html",
            next: "@scriptEmbedded",
            nextEmbedded: "text/javascript"
          }
        ],
        [/[ \t\r\n]+/],
        // whitespace
        [
          /(<\/)(script\s*)(>)/,
          ["delimiter.html", "tag.html", { token: "delimiter.html", next: "@pop" }]
        ]
      ],
      // After <script ... type
      scriptAfterType: [
        [/=/, "delimiter.html", "@scriptAfterTypeEquals"],
        [
          />/,
          {
            token: "delimiter.html",
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
          /"([^"]*)"/,
          {
            token: "attribute.value.html",
            switchTo: "@scriptWithCustomType.$1"
          }
        ],
        [
          /'([^']*)'/,
          {
            token: "attribute.value.html",
            switchTo: "@scriptWithCustomType.$1"
          }
        ],
        [
          />/,
          {
            token: "delimiter.html",
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
            token: "delimiter.html",
            next: "@scriptEmbedded.$S2",
            nextEmbedded: "$S2"
          }
        ],
        [/"([^"]*)"/, "attribute.value.html"],
        [/'([^']*)'/, "attribute.value.html"],
        [/[\w\-]+/, "attribute.name.html"],
        [/=/, "delimiter.html"],
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
        [/type/, "attribute.name.html", "@styleAfterType"],
        [/"([^"]*)"/, "attribute.value.html"],
        [/'([^']*)'/, "attribute.value.html"],
        [/[\w\-]+/, "attribute.name.html"],
        [/=/, "delimiter.html"],
        [
          />/,
          {
            token: "delimiter.html",
            next: "@styleEmbedded",
            nextEmbedded: "text/css"
          }
        ],
        [/[ \t\r\n]+/],
        // whitespace
        [
          /(<\/)(style\s*)(>)/,
          ["delimiter.html", "tag.html", { token: "delimiter.html", next: "@pop" }]
        ]
      ],
      // After <style ... type
      styleAfterType: [
        [/=/, "delimiter.html", "@styleAfterTypeEquals"],
        [
          />/,
          {
            token: "delimiter.html",
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
            token: "attribute.value.html",
            switchTo: "@styleWithCustomType.$1"
          }
        ],
        [
          /'([^']*)'/,
          {
            token: "attribute.value.html",
            switchTo: "@styleWithCustomType.$1"
          }
        ],
        [
          />/,
          {
            token: "delimiter.html",
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
            token: "delimiter.html",
            next: "@styleEmbedded.$S2",
            nextEmbedded: "$S2"
          }
        ],
        [/"([^"]*)"/, "attribute.value.html"],
        [/'([^']*)'/, "attribute.value.html"],
        [/[\w\-]+/, "attribute.name.html"],
        [/=/, "delimiter.html"],
        [/[ \t\r\n]+/],
        // whitespace
        [/<\/style\s*>/, { token: "@rematch", next: "@pop" }]
      ],
      styleEmbedded: [
        [/<\/style/, { token: "@rematch", next: "@pop", nextEmbedded: "@pop" }],
        [/[^<]+/, ""]
      ]
    }
  };
  return __toCommonJS(twig_exports);
})();
return moduleExports;
});
