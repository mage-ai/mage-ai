/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.49.0(383fdf3fc0e1e1a024068b8d0fd4f3dcbae74d04)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/


// src/basic-languages/hcl/hcl.contribution.ts
import { registerLanguage } from "../_.contribution.js";
registerLanguage({
  id: "hcl",
  extensions: [".tf", ".tfvars", ".hcl"],
  aliases: ["Terraform", "tf", "HCL", "hcl"],
  loader: () => {
    if (false) {
      return new Promise((resolve, reject) => {
        __require(["vs/basic-languages/hcl/hcl"], resolve, reject);
      });
    } else {
      return import("./hcl.js");
    }
  }
});
