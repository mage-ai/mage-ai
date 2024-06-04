import themes, { NAMESPACE } from '.';
import IDEThemeType, { IDEThemeEnum } from './interfaces';

export default function initializeThemes(
  monaco: typeof import('monaco-editor'),
  theme?: IDEThemeEnum = IDEThemeEnum.BASE,
) {
  Object.entries(themes).forEach(([key, value]) => {
    const themeName = `${NAMESPACE}-${key}`;
    monaco.editor.defineTheme(themeName, value as IDEThemeType);
  });

  if (theme) {
    const themeName = `${NAMESPACE}-${theme}`;
    monaco.editor.setTheme(themeName);
    console.log(`[IDE] Theme: ${themeName}`);
  }
}
