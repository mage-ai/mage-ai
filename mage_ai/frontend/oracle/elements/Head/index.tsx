import NextHead from 'next/head';

type HeadProps = {
  children?: any;
  defaultTitle?: string;
  title?: string;
};

const Head = ({ children, defaultTitle = 'Mage', title }: HeadProps) => (
  <NextHead>
    <link href="/favicon.ico" rel="icon" />

    <title>{title ? `${title} | ${defaultTitle}` : defaultTitle}</title>

    {children}
  </NextHead>
);

export default Head;
