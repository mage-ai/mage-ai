/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.49.0(383fdf3fc0e1e1a024068b8d0fd4f3dcbae74d04)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/


// src/basic-languages/dart/dart.contribution.ts
import { registerLanguage } from "../_.contribution.js";
registerLanguage({
  id: "dart",
  extensions: [".dart"],
  aliases: ["Dart", "dart"],
  mimetypes: ["text/x-dart-source", "text/x-dart"],
  loader: () => {
    if (false) {
      return new Promise((resolve, reject) => {
        __require(["vs/basic-languages/dart/dart"], resolve, reject);
      });
    } else {
      return import("./dart.js");
    }
  }
});
