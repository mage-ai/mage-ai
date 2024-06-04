import themes, { NAMESPACE } from '../themes';

import setupPython from '../languages/python';
import useWebsocket, { WebsocketOperationsType } from '../lsps/useWebsocket';
import { IDEThemeEnum } from '../themes/interfaces';
import { getLanguageServerUrl } from '@api/utils/url';

export default function useSetup(uuid: string): WebsocketOperationsType & {
  initializeThemes: (monaco: typeof import('monaco-editor'), theme?: IDEThemeEnum) => void;
  setupPython: (monaco: typeof import('monaco-editor')) => void;
} {
  const {
    cleanup,
    connectWebsocket,
    restartLanguageClient,
  } = useWebsocket(uuid, getLanguageServerUrl());

  function initializeThemes(monaco: typeof import('monaco-editor'), theme?: IDEThemeEnum) {
    Object.entries(themes).forEach(([key, value]) => {
      const themeName = `${NAMESPACE}-${key}`;
      monaco.editor.defineTheme(themeName, value);
    });

    if (theme) {
      const themeName = `${NAMESPACE}-${theme}`;
      monaco.editor.setTheme(themeName);
      console.log(`[IDE] Theme: ${themeName}`);
    }
  }


  return {
    cleanup,
    connectWebsocket,
    initializeThemes,
    restartLanguageClient,
    setupPython,
  };
}
