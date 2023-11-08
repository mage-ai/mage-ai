import { loader } from '@monaco-editor/react';

import {
  NUMBER_OF_BUFFER_LINES,
  SINGLE_LINE_HEIGHT,
} from './index.style';

const monacoThemes = {
  'all-hallows-eve': 'All Hallows Eve',
  'birds-of-paradise': 'Birds of Paradise',
  'brilliance-black': 'Brilliance Black',
  'brilliance-dull': 'Brilliance Dull',
  'chrome-devtools': 'Chrome DevTools',
  'clouds-midnight': 'Clouds Midnight',
  'espresso-libre': 'Espresso Libre',
  'kuroir-theme': 'Kuroir Theme',
  'magicwb--amiga-': 'MagicWB (Amiga)',
  'merbivore-soft': 'Merbivore Soft',
  'monokai-bright': 'Monokai Bright',
  'night-owl': 'Night Owl',
  'oceanic-next': 'Oceanic Next',
  'pastels-on-dark': 'Pastels on Dark',
  'slush-and-poppies': 'Slush and Poppies',
  'solarized-dark': 'Solarized-dark',
  'solarized-light': 'Solarized-light',
  'textmate--mac-classic-': 'Textmate (Mac Classic)',
  'tomorrow-night': 'Tomorrow-Night',
  'tomorrow-night-blue': 'Tomorrow-Night-Blue',
  'tomorrow-night-bright': 'Tomorrow-Night-Bright',
  'tomorrow-night-eighties': 'Tomorrow-Night-Eighties',
  'upstream-sunburst': 'Upstream Sunburst',
  'vibrant-ink': 'Vibrant Ink',
  'xcode-default': 'Xcode_default',
  active4d: 'Active4D',
  amy: 'Amy',
  blackboard: 'Blackboard',
  clouds: 'Clouds',
  cobalt: 'Cobalt',
  dawn: 'Dawn',
  dreamweaver: 'Dreamweaver',
  eiffel: 'Eiffel',
  github: 'GitHub',
  idle: 'IDLE',
  idlefingers: 'idleFingers',
  iplastic: 'iPlastic',
  katzenmilch: 'Katzenmilch',
  krtheme: 'krTheme',
  lazy: 'LAZY',
  merbivore: 'Merbivore',
  monoindustrial: 'monoindustrial',
  monokai: 'Monokai',
  spacecadet: 'SpaceCadet',
  sunburst: 'Sunburst',
  tomorrow: 'Tomorrow',
  twilight: 'Twilight',
  zenburnesque: 'Zenburnesque',
};

export const defineTheme = theme => new Promise<boolean>((loaded) => {
  Promise.all([
    loader.init(),
    import(`monaco-themes/themes/${monacoThemes[theme]}.json`),
  ]).then(([monaco, themeData]) => {
    `
      {
        "editor.foreground": "#F8F8F8",
        "editor.background": "#141414",
        "editor.selectionBackground": "#DDF0FF33",
        "editor.lineHighlightBackground": "#FFFFFF08",
        "editorCursor.foreground": "#A7A7A7",
        "editorWhitespace.foreground": "#FFFFFF40"
      }
    `;
    themeData.colors['editor.background'] = '#000000';
    themeData.colors['editor.foreground'] = '#FFFFFF';
    monaco.editor.defineTheme(theme, themeData);
    // @ts-ignore
    loaded(true);
  }).catch(() => {
    loaded(false);
  });
});

export function calculateHeightFromContent(content: string) {
  const lines = content.split('\n').length;
  // Need a buffer of 2 lines or else when adding new lines too fast,
  // the contents of the editor will jump up a bit
  return (lines + NUMBER_OF_BUFFER_LINES) * SINGLE_LINE_HEIGHT;
}
