/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.49.0(383fdf3fc0e1e1a024068b8d0fd4f3dcbae74d04)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/
define("vs/basic-languages/rust/rust", ["require"],(require)=>{
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

  // src/basic-languages/rust/rust.ts
  var rust_exports = {};
  __export(rust_exports, {
    conf: () => conf,
    language: () => language
  });
  var conf = {
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
      { open: "[", close: "]" },
      { open: "{", close: "}" },
      { open: "(", close: ")" },
      { open: '"', close: '"', notIn: ["string"] }
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
        start: new RegExp("^\\s*#pragma\\s+region\\b"),
        end: new RegExp("^\\s*#pragma\\s+endregion\\b")
      }
    }
  };
  var language = {
    tokenPostfix: ".rust",
    defaultToken: "invalid",
    keywords: [
      "as",
      "async",
      "await",
      "box",
      "break",
      "const",
      "continue",
      "crate",
      "dyn",
      "else",
      "enum",
      "extern",
      "false",
      "fn",
      "for",
      "if",
      "impl",
      "in",
      "let",
      "loop",
      "match",
      "mod",
      "move",
      "mut",
      "pub",
      "ref",
      "return",
      "self",
      "static",
      "struct",
      "super",
      "trait",
      "true",
      "try",
      "type",
      "unsafe",
      "use",
      "where",
      "while",
      "catch",
      "default",
      "union",
      "static",
      "abstract",
      "alignof",
      "become",
      "do",
      "final",
      "macro",
      "offsetof",
      "override",
      "priv",
      "proc",
      "pure",
      "sizeof",
      "typeof",
      "unsized",
      "virtual",
      "yield"
    ],
    typeKeywords: [
      "Self",
      "m32",
      "m64",
      "m128",
      "f80",
      "f16",
      "f128",
      "int",
      "uint",
      "float",
      "char",
      "bool",
      "u8",
      "u16",
      "u32",
      "u64",
      "f32",
      "f64",
      "i8",
      "i16",
      "i32",
      "i64",
      "str",
      "Option",
      "Either",
      "c_float",
      "c_double",
      "c_void",
      "FILE",
      "fpos_t",
      "DIR",
      "dirent",
      "c_char",
      "c_schar",
      "c_uchar",
      "c_short",
      "c_ushort",
      "c_int",
      "c_uint",
      "c_long",
      "c_ulong",
      "size_t",
      "ptrdiff_t",
      "clock_t",
      "time_t",
      "c_longlong",
      "c_ulonglong",
      "intptr_t",
      "uintptr_t",
      "off_t",
      "dev_t",
      "ino_t",
      "pid_t",
      "mode_t",
      "ssize_t"
    ],
    constants: ["true", "false", "Some", "None", "Left", "Right", "Ok", "Err"],
    supportConstants: [
      "EXIT_FAILURE",
      "EXIT_SUCCESS",
      "RAND_MAX",
      "EOF",
      "SEEK_SET",
      "SEEK_CUR",
      "SEEK_END",
      "_IOFBF",
      "_IONBF",
      "_IOLBF",
      "BUFSIZ",
      "FOPEN_MAX",
      "FILENAME_MAX",
      "L_tmpnam",
      "TMP_MAX",
      "O_RDONLY",
      "O_WRONLY",
      "O_RDWR",
      "O_APPEND",
      "O_CREAT",
      "O_EXCL",
      "O_TRUNC",
      "S_IFIFO",
      "S_IFCHR",
      "S_IFBLK",
      "S_IFDIR",
      "S_IFREG",
      "S_IFMT",
      "S_IEXEC",
      "S_IWRITE",
      "S_IREAD",
      "S_IRWXU",
      "S_IXUSR",
      "S_IWUSR",
      "S_IRUSR",
      "F_OK",
      "R_OK",
      "W_OK",
      "X_OK",
      "STDIN_FILENO",
      "STDOUT_FILENO",
      "STDERR_FILENO"
    ],
    supportMacros: [
      "format!",
      "print!",
      "println!",
      "panic!",
      "format_args!",
      "unreachable!",
      "write!",
      "writeln!"
    ],
    operators: [
      "!",
      "!=",
      "%",
      "%=",
      "&",
      "&=",
      "&&",
      "*",
      "*=",
      "+",
      "+=",
      "-",
      "-=",
      "->",
      ".",
      "..",
      "...",
      "/",
      "/=",
      ":",
      ";",
      "<<",
      "<<=",
      "<",
      "<=",
      "=",
      "==",
      "=>",
      ">",
      ">=",
      ">>",
      ">>=",
      "@",
      "^",
      "^=",
      "|",
      "|=",
      "||",
      "_",
      "?",
      "#"
    ],
    escapes: /\\([nrt0\"''\\]|x\h{2}|u\{\h{1,6}\})/,
    delimiters: /[,]/,
    symbols: /[\#\!\%\&\*\+\-\.\/\:\;\<\=\>\@\^\|_\?]+/,
    intSuffixes: /[iu](8|16|32|64|128|size)/,
    floatSuffixes: /f(32|64)/,
    tokenizer: {
      root: [
        // Raw string literals
        [/r(#*)"/, { token: "string.quote", bracket: "@open", next: "@stringraw.$1" }],
        [
          /[a-zA-Z][a-zA-Z0-9_]*!?|_[a-zA-Z0-9_]+/,
          {
            cases: {
              "@typeKeywords": "keyword.type",
              "@keywords": "keyword",
              "@supportConstants": "keyword",
              "@supportMacros": "keyword",
              "@constants": "keyword",
              "@default": "identifier"
            }
          }
        ],
        // Designator
        [/\$/, "identifier"],
        // Lifetime annotations
        [/'[a-zA-Z_][a-zA-Z0-9_]*(?=[^\'])/, "identifier"],
        // Byte literal
        [/'(\S|@escapes)'/, "string.byteliteral"],
        // Strings
        [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],
        { include: "@numbers" },
        // Whitespace + comments
        { include: "@whitespace" },
        [
          /@delimiters/,
          {
            cases: {
              "@keywords": "keyword",
              "@default": "delimiter"
            }
          }
        ],
        [/[{}()\[\]<>]/, "@brackets"],
        [/@symbols/, { cases: { "@operators": "operator", "@default": "" } }]
      ],
      whitespace: [
        [/[ \t\r\n]+/, "white"],
        [/\/\*/, "comment", "@comment"],
        [/\/\/.*$/, "comment"]
      ],
      comment: [
        [/[^\/*]+/, "comment"],
        [/\/\*/, "comment", "@push"],
        ["\\*/", "comment", "@pop"],
        [/[\/*]/, "comment"]
      ],
      string: [
        [/[^\\"]+/, "string"],
        [/@escapes/, "string.escape"],
        [/\\./, "string.escape.invalid"],
        [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }]
      ],
      stringraw: [
        [/[^"#]+/, { token: "string" }],
        [
          /"(#*)/,
          {
            cases: {
              "$1==$S2": { token: "string.quote", bracket: "@close", next: "@pop" },
              "@default": { token: "string" }
            }
          }
        ],
        [/["#]/, { token: "string" }]
      ],
      numbers: [
        //Octal
        [/(0o[0-7_]+)(@intSuffixes)?/, { token: "number" }],
        //Binary
        [/(0b[0-1_]+)(@intSuffixes)?/, { token: "number" }],
        //Exponent
        [/[\d][\d_]*(\.[\d][\d_]*)?[eE][+-][\d_]+(@floatSuffixes)?/, { token: "number" }],
        //Float
        [/\b(\d\.?[\d_]*)(@floatSuffixes)?\b/, { token: "number" }],
        //Hexadecimal
        [/(0x[\da-fA-F]+)_?(@intSuffixes)?/, { token: "number" }],
        //Integer
        [/[\d][\d_]*(@intSuffixes?)?/, { token: "number" }]
      ]
    }
  };
  return __toCommonJS(rust_exports);
})();
return moduleExports;
});
