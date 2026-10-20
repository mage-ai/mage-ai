import NextHead from 'next/head';
import { useRouter } from 'next/router';

type HeadProps = {
  children?: any;
  defaultTitle?: string;
  title?: string;
};

const Head = ({ children, defaultTitle = 'Mage', title }: HeadProps) => {
  const router = useRouter();

  return (
    <NextHead>
      <link href={`${router?.basePath}/favicon.ico`} rel="icon" />

      <title>{title ? `${title} | ${defaultTitle}` : defaultTitle}</title>

      {children}
    </NextHead>
  );
};

export default Head;
