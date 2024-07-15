import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { PluggableList } from 'react-markdown/lib/react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { cb as CodeStyle } from 'react-syntax-highlighter/dist/esm/styles/prism';

import Headline from '@oracle/elements/Headline';
import Link from '@mana/elements/Link';
import Text from '@mana/elements/Text';
import { MarkdownContainer } from './index.style';

type MarkdownProps = {
  children: string;
};

function Markdown({ children }: MarkdownProps) {
  return (
    <MarkdownContainer>
      <ReactMarkdown
        components={{
          a: ({ children, href }) => (
            <Link href={href} inline target="_blank">
              {children}
            </Link>
          ),
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                PreTag="div"
                language={match[1]}
                style={CodeStyle}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <Text
                inline
                monospace
                style={{ whiteSpace: 'pre' }}
                {...props}
              >
                {children}
              </Text>
            );
          },
          em: ({ children }) => (
            <Text inline italic>
              {children}
            </Text>
          ),
          h1: ({ children }) => <Headline level={1}>{children}</Headline>,
          h2: ({ children }) => <Headline level={2}>{children}</Headline>,
          h3: ({ children }) => <Headline level={3}>{children}</Headline>,
          h4: ({ children }) => <Headline level={4}>{children}</Headline>,
          h5: ({ children }) => <Headline level={5}>{children}</Headline>,
          p: ({ children }) => <Text>{children}</Text>,
          strong: ({ children }) => (
            <Text bold inline>
              {children}
            </Text>
          ),
        }}
        rehypePlugins={[rehypeRaw, rehypeSanitize] as PluggableList}
        remarkPlugins={[remarkGfm]}
      >
        {children}
      </ReactMarkdown>
    </MarkdownContainer>
  );
}

export default Markdown;
