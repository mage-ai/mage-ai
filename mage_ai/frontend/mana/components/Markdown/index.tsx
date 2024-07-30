import Divider from '@mana/elements/Divider';
import Headline from '@mana/elements/Headline';
import Link from '@mana/elements/Link';
import ReactMarkdown from 'react-markdown';
import Text from '@mana/elements/Text';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { MarkdownContainer, MarkdownType } from './index.style';
import { PluggableList } from 'react-markdown/lib/react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { cb as CodeStyle } from 'react-syntax-highlighter/dist/esm/styles/prism';

function Markdown({
  children,
  ...rest
}: {
  children: string;
} & MarkdownType) {
  return (
    <MarkdownContainer {...rest}>
      <ReactMarkdown
        components={{
          a: ({ children, href }) => (
            <Link href={href} inline target="_blank" {...rest?.a}>
              {children}
            </Link>
          ),
          code: ({ inline, className, children: code, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                PreTag="div"
                language={match[1]}
                style={CodeStyle}
                {...props}
                {...rest?.code}
              >
                {String(code ?? '').replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (

              <Text inline monospace style={{ whiteSpace: 'pre' }} {...props} {...rest?.code}>
                {children}
              </Text>
            );
          },
          em: ({ children }) => (
            <Text inline italic {...rest?.em}>
              {children}
            </Text>
          ),
          h1: ({ children }) => (
            <Headline h={1} {...rest?.h1}>
              {children}
            </Headline>
          ),
          h2: ({ children }) => (
            <Headline h={2} {...rest?.h2}>
              {children}
            </Headline>
          ),
          h3: ({ children }) => (
            <Headline h={3} {...rest?.h3}>
              {children}
            </Headline>
          ),
          h4: ({ children }) => (
            <Headline h={4} {...rest?.h4}>
              {children}
            </Headline>
          ),
          h5: ({ children }) => (
            <Headline h={5} {...rest?.h5}>
              {children}
            </Headline>
          ),
          hr: () => <Divider {...rest?.hr} />,
          p: ({ children }) => <Text {...rest?.p}>{children}</Text>,
          pre: ({ children }) => (
            <Text pre {...rest?.pre}>
              {children}
            </Text>
          ),
          span: ({ children }) => (
            <Text inline {...rest?.span}>
              {children}
            </Text>
          ),
          strong: ({ children }) => (
            <Text bold inline {...rest?.strong}>
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
