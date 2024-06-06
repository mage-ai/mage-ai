/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.49.0(383fdf3fc0e1e1a024068b8d0fd4f3dcbae74d04)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/
define("vs/basic-languages/msdax/msdax", ["require"],(require)=>{
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

  // src/basic-languages/msdax/msdax.ts
  var msdax_exports = {};
  __export(msdax_exports, {
    conf: () => conf,
    language: () => language
  });
  var conf = {
    comments: {
      lineComment: "//",
      blockComment: ["/*", "*/"]
    },
    brackets: [
      ["[", "]"],
      ["(", ")"],
      ["{", "}"]
    ],
    autoClosingPairs: [
      { open: '"', close: '"', notIn: ["string", "comment"] },
      { open: "'", close: "'", notIn: ["string", "comment"] },
      { open: "[", close: "]", notIn: ["string", "comment"] },
      { open: "(", close: ")", notIn: ["string", "comment"] },
      { open: "{", close: "}", notIn: ["string", "comment"] }
    ]
  };
  var language = {
    defaultToken: "",
    tokenPostfix: ".msdax",
    ignoreCase: true,
    brackets: [
      { open: "[", close: "]", token: "delimiter.square" },
      { open: "{", close: "}", token: "delimiter.brackets" },
      { open: "(", close: ")", token: "delimiter.parenthesis" }
    ],
    keywords: [
      // Query keywords
      "VAR",
      "RETURN",
      "NOT",
      "EVALUATE",
      "DATATABLE",
      "ORDER",
      "BY",
      "START",
      "AT",
      "DEFINE",
      "MEASURE",
      "ASC",
      "DESC",
      "IN",
      // Datatable types
      "BOOLEAN",
      "DOUBLE",
      "INTEGER",
      "DATETIME",
      "CURRENCY",
      "STRING"
    ],
    functions: [
      // Relational
      "CLOSINGBALANCEMONTH",
      "CLOSINGBALANCEQUARTER",
      "CLOSINGBALANCEYEAR",
      "DATEADD",
      "DATESBETWEEN",
      "DATESINPERIOD",
      "DATESMTD",
      "DATESQTD",
      "DATESYTD",
      "ENDOFMONTH",
      "ENDOFQUARTER",
      "ENDOFYEAR",
      "FIRSTDATE",
      "FIRSTNONBLANK",
      "LASTDATE",
      "LASTNONBLANK",
      "NEXTDAY",
      "NEXTMONTH",
      "NEXTQUARTER",
      "NEXTYEAR",
      "OPENINGBALANCEMONTH",
      "OPENINGBALANCEQUARTER",
      "OPENINGBALANCEYEAR",
      "PARALLELPERIOD",
      "PREVIOUSDAY",
      "PREVIOUSMONTH",
      "PREVIOUSQUARTER",
      "PREVIOUSYEAR",
      "SAMEPERIODLASTYEAR",
      "STARTOFMONTH",
      "STARTOFQUARTER",
      "STARTOFYEAR",
      "TOTALMTD",
      "TOTALQTD",
      "TOTALYTD",
      "ADDCOLUMNS",
      "ADDMISSINGITEMS",
      "ALL",
      "ALLEXCEPT",
      "ALLNOBLANKROW",
      "ALLSELECTED",
      "CALCULATE",
      "CALCULATETABLE",
      "CALENDAR",
      "CALENDARAUTO",
      "CROSSFILTER",
      "CROSSJOIN",
      "CURRENTGROUP",
      "DATATABLE",
      "DETAILROWS",
      "DISTINCT",
      "EARLIER",
      "EARLIEST",
      "EXCEPT",
      "FILTER",
      "FILTERS",
      "GENERATE",
      "GENERATEALL",
      "GROUPBY",
      "IGNORE",
      "INTERSECT",
      "ISONORAFTER",
      "KEEPFILTERS",
      "LOOKUPVALUE",
      "NATURALINNERJOIN",
      "NATURALLEFTOUTERJOIN",
      "RELATED",
      "RELATEDTABLE",
      "ROLLUP",
      "ROLLUPADDISSUBTOTAL",
      "ROLLUPGROUP",
      "ROLLUPISSUBTOTAL",
      "ROW",
      "SAMPLE",
      "SELECTCOLUMNS",
      "SUBSTITUTEWITHINDEX",
      "SUMMARIZE",
      "SUMMARIZECOLUMNS",
      "TOPN",
      "TREATAS",
      "UNION",
      "USERELATIONSHIP",
      "VALUES",
      "SUM",
      "SUMX",
      "PATH",
      "PATHCONTAINS",
      "PATHITEM",
      "PATHITEMREVERSE",
      "PATHLENGTH",
      "AVERAGE",
      "AVERAGEA",
      "AVERAGEX",
      "COUNT",
      "COUNTA",
      "COUNTAX",
      "COUNTBLANK",
      "COUNTROWS",
      "COUNTX",
      "DISTINCTCOUNT",
      "DIVIDE",
      "GEOMEAN",
      "GEOMEANX",
      "MAX",
      "MAXA",
      "MAXX",
      "MEDIAN",
      "MEDIANX",
      "MIN",
      "MINA",
      "MINX",
      "PERCENTILE.EXC",
      "PERCENTILE.INC",
      "PERCENTILEX.EXC",
      "PERCENTILEX.INC",
      "PRODUCT",
      "PRODUCTX",
      "RANK.EQ",
      "RANKX",
      "STDEV.P",
      "STDEV.S",
      "STDEVX.P",
      "STDEVX.S",
      "VAR.P",
      "VAR.S",
      "VARX.P",
      "VARX.S",
      "XIRR",
      "XNPV",
      // Scalar
      "DATE",
      "DATEDIFF",
      "DATEVALUE",
      "DAY",
      "EDATE",
      "EOMONTH",
      "HOUR",
      "MINUTE",
      "MONTH",
      "NOW",
      "SECOND",
      "TIME",
      "TIMEVALUE",
      "TODAY",
      "WEEKDAY",
      "WEEKNUM",
      "YEAR",
      "YEARFRAC",
      "CONTAINS",
      "CONTAINSROW",
      "CUSTOMDATA",
      "ERROR",
      "HASONEFILTER",
      "HASONEVALUE",
      "ISBLANK",
      "ISCROSSFILTERED",
      "ISEMPTY",
      "ISERROR",
      "ISEVEN",
      "ISFILTERED",
      "ISLOGICAL",
      "ISNONTEXT",
      "ISNUMBER",
      "ISODD",
      "ISSUBTOTAL",
      "ISTEXT",
      "USERNAME",
      "USERPRINCIPALNAME",
      "AND",
      "FALSE",
      "IF",
      "IFERROR",
      "NOT",
      "OR",
      "SWITCH",
      "TRUE",
      "ABS",
      "ACOS",
      "ACOSH",
      "ACOT",
      "ACOTH",
      "ASIN",
      "ASINH",
      "ATAN",
      "ATANH",
      "BETA.DIST",
      "BETA.INV",
      "CEILING",
      "CHISQ.DIST",
      "CHISQ.DIST.RT",
      "CHISQ.INV",
      "CHISQ.INV.RT",
      "COMBIN",
      "COMBINA",
      "CONFIDENCE.NORM",
      "CONFIDENCE.T",
      "COS",
      "COSH",
      "COT",
      "COTH",
      "CURRENCY",
      "DEGREES",
      "EVEN",
      "EXP",
      "EXPON.DIST",
      "FACT",
      "FLOOR",
      "GCD",
      "INT",
      "ISO.CEILING",
      "LCM",
      "LN",
      "LOG",
      "LOG10",
      "MOD",
      "MROUND",
      "ODD",
      "PERMUT",
      "PI",
      "POISSON.DIST",
      "POWER",
      "QUOTIENT",
      "RADIANS",
      "RAND",
      "RANDBETWEEN",
      "ROUND",
      "ROUNDDOWN",
      "ROUNDUP",
      "SIGN",
      "SIN",
      "SINH",
      "SQRT",
      "SQRTPI",
      "TAN",
      "TANH",
      "TRUNC",
      "BLANK",
      "CONCATENATE",
      "CONCATENATEX",
      "EXACT",
      "FIND",
      "FIXED",
      "FORMAT",
      "LEFT",
      "LEN",
      "LOWER",
      "MID",
      "REPLACE",
      "REPT",
      "RIGHT",
      "SEARCH",
      "SUBSTITUTE",
      "TRIM",
      "UNICHAR",
      "UNICODE",
      "UPPER",
      "VALUE"
    ],
    tokenizer: {
      root: [
        { include: "@comments" },
        { include: "@whitespace" },
        { include: "@numbers" },
        { include: "@strings" },
        { include: "@complexIdentifiers" },
        [/[;,.]/, "delimiter"],
        [/[({})]/, "@brackets"],
        [
          /[a-z_][a-zA-Z0-9_]*/,
          {
            cases: {
              "@keywords": "keyword",
              "@functions": "keyword",
              "@default": "identifier"
            }
          }
        ],
        [/[<>=!%&+\-*/|~^]/, "operator"]
      ],
      whitespace: [[/\s+/, "white"]],
      comments: [
        [/\/\/+.*/, "comment"],
        [/\/\*/, { token: "comment.quote", next: "@comment" }]
      ],
      comment: [
        [/[^*/]+/, "comment"],
        [/\*\//, { token: "comment.quote", next: "@pop" }],
        [/./, "comment"]
      ],
      numbers: [
        [/0[xX][0-9a-fA-F]*/, "number"],
        [/[$][+-]*\d*(\.\d*)?/, "number"],
        [/((\d+(\.\d*)?)|(\.\d+))([eE][\-+]?\d+)?/, "number"]
      ],
      strings: [
        [/N"/, { token: "string", next: "@string" }],
        [/"/, { token: "string", next: "@string" }]
      ],
      string: [
        [/[^"]+/, "string"],
        [/""/, "string"],
        [/"/, { token: "string", next: "@pop" }]
      ],
      complexIdentifiers: [
        [/\[/, { token: "identifier.quote", next: "@bracketedIdentifier" }],
        [/'/, { token: "identifier.quote", next: "@quotedIdentifier" }]
      ],
      bracketedIdentifier: [
        [/[^\]]+/, "identifier"],
        [/]]/, "identifier"],
        [/]/, { token: "identifier.quote", next: "@pop" }]
      ],
      quotedIdentifier: [
        [/[^']+/, "identifier"],
        [/''/, "identifier"],
        [/'/, { token: "identifier.quote", next: "@pop" }]
      ]
    }
  };
  return __toCommonJS(msdax_exports);
})();
return moduleExports;
});
