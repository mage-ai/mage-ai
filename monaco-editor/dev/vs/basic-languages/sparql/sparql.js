/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.49.0(383fdf3fc0e1e1a024068b8d0fd4f3dcbae74d04)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/
define("vs/basic-languages/sparql/sparql", ["require"],(require)=>{
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

  // src/basic-languages/sparql/sparql.ts
  var sparql_exports = {};
  __export(sparql_exports, {
    conf: () => conf,
    language: () => language
  });
  var conf = {
    comments: {
      lineComment: "#"
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"]
    ],
    autoClosingPairs: [
      { open: "'", close: "'", notIn: ["string"] },
      { open: '"', close: '"', notIn: ["string"] },
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" }
    ]
  };
  var language = {
    defaultToken: "",
    tokenPostfix: ".rq",
    brackets: [
      { token: "delimiter.curly", open: "{", close: "}" },
      { token: "delimiter.parenthesis", open: "(", close: ")" },
      { token: "delimiter.square", open: "[", close: "]" },
      { token: "delimiter.angle", open: "<", close: ">" }
    ],
    keywords: [
      "add",
      "as",
      "asc",
      "ask",
      "base",
      "by",
      "clear",
      "construct",
      "copy",
      "create",
      "data",
      "delete",
      "desc",
      "describe",
      "distinct",
      "drop",
      "false",
      "filter",
      "from",
      "graph",
      "group",
      "having",
      "in",
      "insert",
      "limit",
      "load",
      "minus",
      "move",
      "named",
      "not",
      "offset",
      "optional",
      "order",
      "prefix",
      "reduced",
      "select",
      "service",
      "silent",
      "to",
      "true",
      "undef",
      "union",
      "using",
      "values",
      "where",
      "with"
    ],
    builtinFunctions: [
      "a",
      "abs",
      "avg",
      "bind",
      "bnode",
      "bound",
      "ceil",
      "coalesce",
      "concat",
      "contains",
      "count",
      "datatype",
      "day",
      "encode_for_uri",
      "exists",
      "floor",
      "group_concat",
      "hours",
      "if",
      "iri",
      "isblank",
      "isiri",
      "isliteral",
      "isnumeric",
      "isuri",
      "lang",
      "langmatches",
      "lcase",
      "max",
      "md5",
      "min",
      "minutes",
      "month",
      "now",
      "rand",
      "regex",
      "replace",
      "round",
      "sameterm",
      "sample",
      "seconds",
      "sha1",
      "sha256",
      "sha384",
      "sha512",
      "str",
      "strafter",
      "strbefore",
      "strdt",
      "strends",
      "strlang",
      "strlen",
      "strstarts",
      "struuid",
      "substr",
      "sum",
      "timezone",
      "tz",
      "ucase",
      "uri",
      "uuid",
      "year"
    ],
    // describe tokens
    ignoreCase: true,
    tokenizer: {
      root: [
        // resource indicators
        [/<[^\s\u00a0>]*>?/, "tag"],
        // strings
        { include: "@strings" },
        // line comment
        [/#.*/, "comment"],
        // special chars with special meaning
        [/[{}()\[\]]/, "@brackets"],
        [/[;,.]/, "delimiter"],
        // (prefixed) name
        [/[_\w\d]+:(\.(?=[\w_\-\\%])|[:\w_-]|\\[-\\_~.!$&'()*+,;=/?#@%]|%[a-f\d][a-f\d])*/, "tag"],
        [/:(\.(?=[\w_\-\\%])|[:\w_-]|\\[-\\_~.!$&'()*+,;=/?#@%]|%[a-f\d][a-f\d])+/, "tag"],
        // identifiers, builtinFunctions and keywords
        [
          /[$?]?[_\w\d]+/,
          {
            cases: {
              "@keywords": { token: "keyword" },
              "@builtinFunctions": { token: "predefined.sql" },
              "@default": "identifier"
            }
          }
        ],
        // operators
        [/\^\^/, "operator.sql"],
        [/\^[*+\-<>=&|^\/!?]*/, "operator.sql"],
        [/[*+\-<>=&|\/!?]/, "operator.sql"],
        // symbol
        [/@[a-z\d\-]*/, "metatag.html"],
        // whitespaces
        [/\s+/, "white"]
      ],
      strings: [
        [/'([^'\\]|\\.)*$/, "string.invalid"],
        // non-terminated single-quoted string
        [/'$/, "string.sql", "@pop"],
        [/'/, "string.sql", "@stringBody"],
        [/"([^"\\]|\\.)*$/, "string.invalid"],
        // non-terminated single-quoted string
        [/"$/, "string.sql", "@pop"],
        [/"/, "string.sql", "@dblStringBody"]
      ],
      // single-quoted strings
      stringBody: [
        [/[^\\']+/, "string.sql"],
        [/\\./, "string.escape"],
        [/'/, "string.sql", "@pop"]
      ],
      // double-quoted strings
      dblStringBody: [
        [/[^\\"]+/, "string.sql"],
        [/\\./, "string.escape"],
        [/"/, "string.sql", "@pop"]
      ]
    }
  };
  return __toCommonJS(sparql_exports);
})();
return moduleExports;
});
