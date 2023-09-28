import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import Text from '@oracle/elements/Text';
import dark from '@oracle/styles/themes/dark';
import { MarkdownContainer } from './index.style';

type MarkdownProps = {
  children: string;
};

function Markdown({
  children,
}: MarkdownProps) {
  return (
    <MarkdownContainer>
      <ReactMarkdown
        components={{
          a: ({ children, href }) => (
            <Link
              href={href}
              inline
              openNewWindow
              primary
            >
              {children}
            </Link>
          ),
          code: ({ children }) => (
            <Text
              backgroundColor={dark.interactive.defaultBorder}
              inline
              monospace
              pre
              // @ts-ignore
              style={{ fontSize: '13px' }}
            >
              {children}
            </Text>
          ),
          em: ({ children }) => <Text inline italic>{children}</Text>,
          h1: ({ children }) => <Headline level={1}>{children}</Headline>,
          h2: ({ children }) => <Headline level={2}>{children}</Headline>,
          h3: ({ children }) => <Headline level={3}>{children}</Headline>,
          h4: ({ children }) => <Headline level={4}>{children}</Headline>,
          h5: ({ children }) => <Headline level={5}>{children}</Headline>,
          p: ({ children }) => <Text>{children}</Text>,
          strong: ({ children }) => <Text bold inline>{children}</Text>,
        }}
        remarkPlugins={[remarkGfm]}
      >
        {children}
      </ReactMarkdown>
    </MarkdownContainer>
  );
}

export default Markdown;
