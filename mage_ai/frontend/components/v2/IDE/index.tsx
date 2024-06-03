import { useContext, useEffect, useState, useRef } from 'react';
import { useMonaco, loader } from '@monaco-editor/react';
import { ThemeContext } from 'styled-components';

import configurationsBase from './configurations/base';
import { IDEStyled } from './index.style';
import { getHost } from '@api/utils/url';
import { useMemo } from 'react';
import IDEThemeType, { IDEThemeEnum } from './themes/interfaces';
import themes, { NAMESPACE } from './themes';
import providerPython from './tokens/providers/python';
import mockCode from './mocks/code';

/*
 * In order to load the Monaco Editor locally and avoid fetching it from a CDN
 * (the default CDN is https://cdn.jsdelivr.net), the monaco-editor bundle was
 * copied into the "public" folder from node_modules, and we called the
 * loader.config method below to reference it.
 *
 * We can also use this method to load the Monaco Editor from a different
 * CDN like Cloudflare.
 */
try {
  loader.config({
    paths: {
      // Load Monaco Editor from "public" directory
      vs: `${getHost()}/monaco-editor/min/vs`,
      // Load Monaco Editor from different CDN
      // vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.33.0/min/vs',
    },
  });
} catch (e) {
  console.error('Failed to configure Monaco Editor loader', e);
}

type IDEProps = {
  theme?: IDEThemeEnum;
  uuid: string;
};

function MateriaIDE({ theme: themeSelected = IDEThemeEnum.BASE, uuid }: IDEProps) {
  const editorCount = useRef(0);
  const renderCount = useRef(0);
  const useEffectCount = useRef(0);

  const themeContext = useContext(ThemeContext);
  const editorRef = useRef(null);
  const monaco = useMonaco();

  const editorContainerID = useMemo(() => `editor-container-${uuid}`, [uuid]);
  const configurations = useMemo(() => configurationsBase(themeContext, {
    value: mockCode,
  }), [themeContext]);

  useEffect(() => {
    useEffectCount.current += 1;
    console.log(`[IDE] Use effect: ${useEffectCount?.current}`);

    if (monaco) {
      monaco.languages.setMonarchTokensProvider('python', providerPython);

      monaco.languages.setLanguageConfiguration('python', {
          // brackets: [
          //     // Your defined brackets
          //     ['{', '}'],
          //     ['[', ']'],
          //     ['(', ')'],
          //     ['<' , '>'],
          //     ['"', '"'],
          //     ['_', '_'],
          //     ['**', '**'],
          //     ['**_', '_**'],
          //     ['{{', '}}'],
          //     ['`', '`'],
          //     ['#ifndef', '#endif'],
          //     ['<%', '%>'],
          //     ['${', '}'],
          //     ['$', ')'],
          // ],
          // autoClosingPairs: [
          //     // Optionally define auto-closing pairs
          //     { open: '{', close: '}', notIn: ['string'] },
          //     { open: '[', close: ']', notIn: ['string'] },
          //     { open: '(', close: ')', notIn: ['string'] },
          //     { open: '<', close: '>' },
          //     { open: '"', close: '"' },
          //     { open: '_', close: '_' },
          //     { open: '**', close: '**' },
          //     { open: '**_', close: '_**' },
          //     { open: '{{', close: '}}' },
          //     { open: '`', close: '`' },
          //     { open: '#ifndef', close: '#endif' },
          //     { open: '<%', close: '%>' },
          //     { open: '${', close: '}' },
          //     { open: '$(', close: ')' },
          // ],
          // surroundingPairs: [
          //     // Define pairs that trigger when surrounding selections
          //     { open: '{', close: '}' },
          //     { open: '[', close: ']' },
          //     { open: '(', close: ')' },
          //     { open: '<', close: '>' },
          //     { open: '"', close: '"' },
          //     { open: '_', close: '_' },
          //     { open: '**', close: '**' },
          //     { open: '**_', close: '_**' },
          //     { open: '{{', close: '}}' },
          //     { open: '`', close: '`' },
          //     { open: '#ifndef', close: '#endif' },
          //     { open: '<%', close: '%>' },
          //     { open: '${', close: '}' },
          //     { open: '$(', close: ')' },
          // ],
          colorizedBracketPairs: [],
      });

      Object.entries(themes).forEach(([key, value]) => {
        const themeName = `${NAMESPACE}-${key}`;
        monaco.editor.defineTheme(themeName, value);
      });
      if (themeSelected) {
        const themeName = `${NAMESPACE}-${themeSelected}`;
        monaco.editor.setTheme(themeName);
        console.log(`[IDE] Theme: ${themeName}`);
      }
    }

    if (monaco && editorContainerID && !editorRef?.current) {
      const element = document.getElementById(editorContainerID);
      if (element !== null) {
        editorRef.current = monaco.editor.create(
          document.getElementById(editorContainerID),
          configurations,
        );
        editorCount.current += 1;
        console.log(`[IDE] Editor: ${editorCount?.current}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monaco]);

  renderCount.current += 1;
  console.log(`[IDE] Rendered: ${renderCount?.current}`);
  return (
    <>
      <IDEStyled>
        <div id={editorContainerID} style={{ height: '100vh' }} />
      </IDEStyled>
    </>
  );
}

export default MateriaIDE;
