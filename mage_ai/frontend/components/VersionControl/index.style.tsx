import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { MONO_FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { ThemeType } from '@oracle/styles/themes/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

export const DiffContainerStyle = styled.div`
  pre {
    font-family: ${MONO_FONT_FAMILY_REGULAR};
  }
`;

export const DIFF_STYLES = {
  codeFoldGutter: {}, // style object
  content: {}, // style object
  contentText: {}, // style object
  diffAdded: {}, // style object
  diffContainer: {}, // style object
  diffRemoved: {}, // style object
  emptyGutter: {}, // style object
  emptyLine: {}, // style object
  gutter: {}, // style object
  highlightedGutter: {}, // style object
  highlightedLine: {}, // style object
  line: {}, // style object
  lineNumber: {}, // style object
  marker: {}, // style object
  splitView: {}, // style object
  titleBlock: {}, // style object
  variables: {
    dark: {
      addedBackground: '#044B53',
      addedColor: 'white',
      addedGutterBackground: '#034148',
      addedGutterColor: '#8c8c8c',
      codeFoldBackground: '#262831',
      codeFoldContentColor: '#555a7b',
      codeFoldGutterBackground: '#21232b',
      diffViewerBackground: '#2e303c',
      diffViewerColor: '#FFF',
      diffViewerTitleBackground: '#2f323e',
      diffViewerTitleBorderColor: '#353846',
      diffViewerTitleColor: '#555a7b',
      emptyLineBackground: '#363946',
      gutterBackground: '#2c2f3a',
      gutterBackgroundDark: '#262933',
      gutterColor: '#464c67',
      highlightBackground: '#2a3967',
      highlightGutterBackground: '#2d4077',
      removedBackground: '#632F34',
      removedColor: 'white',
      removedGutterBackground: '#632b30',
      removedGutterColor: '#8c8c8c',
      wordAddedBackground: '#055d67',
      wordRemovedBackground: '#7d383f',
    },
    light: {
      addedBackground: '#e6ffed',
      addedColor: '#24292e',
      addedGutterBackground: '#cdffd8',
      addedGutterColor: '#212529',
      codeFoldBackground: '#f1f8ff',
      codeFoldContentColor: '#212529',
      codeFoldGutterBackground: '#dbedff',
      diffViewerBackground: '#fff',
      diffViewerColor: '212529',
      diffViewerTitleBackground: '#fafbfc',
      diffViewerTitleBorderColor: '#eee',
      diffViewerTitleColor: '#212529',
      emptyLineBackground: '#fafbfc',
      gutterBackground: '#f7f7f7',
      gutterBackgroundDark: '#f3f1f1',
      gutterColor: '#212529',
      highlightBackground: '#fffbdd',
      highlightGutterBackground: '#fff5b1',
      removedBackground: '#ffeef0',
      removedColor: '#24292e',
      removedGutterBackground: '#ffdce0',
      removedGutterColor: '#212529',
      wordAddedBackground: '#acf2bd',
      wordRemovedBackground: '#fdb8c0',
    },
  },
  wordAdded: {}, // style object
  wordDiff: {}, // style object
  wordRemoved: {}, // style object
};
