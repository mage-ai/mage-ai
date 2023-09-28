import React, { useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { ThemeContext } from 'styled-components';
import { dark as darkStyle } from 'react-syntax-highlighter/dist/cjs/styles/prism';

import dark from '@oracle/styles/themes/dark';
import {
  MONO_FONT_FAMILY_REGULAR as FONT_FAMILY_REGULAR,
} from '@oracle/styles/fonts/primary';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT } from '@oracle/styles/units/spacing';

type CodeBlockProps = {
  language: string;
  maxWidth?: number;
  showLineNumbers?: boolean;
  small?: boolean;
  source: string;
  wrapLines?: boolean;
};

function CodeBlock({
  language,
  maxWidth,
  showLineNumbers,
  small,
  source,
  wrapLines,
}: CodeBlockProps) {
  const themeContext: ThemeType = useContext(ThemeContext);

  function Code({ value }: { value: any }) {
    return (
      <SyntaxHighlighter
        customStyle={{
          backgroundColor: (themeContext.background || dark.background).popup,
          border: 'none',
          borderRadius: 'none',
          boxShadow: 'none',
          fontFamily: FONT_FAMILY_REGULAR,
          fontSize: small ? 12 : 14,
          marginBottom: 0,
          marginTop: 0,
          maxWidth,
          paddingBottom: UNIT * 2,
          paddingTop: UNIT * 2,
        }}
        language={language}
        lineNumberStyle={{
          color: (themeContext.content || dark.content).muted,
        }}
        showLineNumbers={showLineNumbers}
        style={darkStyle}
        useInlineStyles
        wrapLines={wrapLines}
      >
        {value}
      </SyntaxHighlighter>

    );
  }
  return (
    <ReactMarkdown
      components={{
        code: ({ children }) => (
          <Code value={children} />
        ),
      }}
    >
      {source}
    </ReactMarkdown>
  );
}

export default CodeBlock;
