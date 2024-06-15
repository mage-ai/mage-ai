import ThemeType from '@mana/themes/interfaces';
import base from './base';

// https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor.IDiffEditorConstructionOptions.html
export default function diff(
  themeContext: ThemeType,
  options?: {
    [key: string]: any;
  },
): any {
  return {
    ...base(themeContext, options),
    useInlineViewWhenSpaceIsLimited: true,
  };
}
