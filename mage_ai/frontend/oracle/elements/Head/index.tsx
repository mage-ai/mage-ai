import NextHead from 'next/head';

type HeadProps = {
  children?: any;
  defaultTitle?: string;
  title?: string;
};

const Head = ({
  children,
  defaultTitle = 'Mage',
  title,
}: HeadProps) => (
  <NextHead>
    <title>
      {title ? `${title} | ${defaultTitle}` : defaultTitle}
    </title>

    {children}
  </NextHead>
);

export default Head;
