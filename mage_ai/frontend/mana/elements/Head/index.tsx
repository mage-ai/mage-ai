import NextHead from 'next/head';
import { ThemeContext } from 'styled-components';
import { useContext } from 'react';

const STYLE_ROOT_ID = 'dynamic-style-root';

type HeadProps = {
  children?: any;
  defaultTitle?: string;
  title?: string;
};

const Head = ({ children, defaultTitle = 'Mage Pro', title }: HeadProps) => {
  const theme = useContext(ThemeContext);

  return (
    <NextHead>
      <title>{title ? `${title} | ${defaultTitle}` : defaultTitle}</title>

      <link href="/favicon-pro.ico" rel="icon" />

      <style>{`
        html body {
          background-color: ${theme?.backgrounds?.body};
        }
      `}</style>

      <style id={STYLE_ROOT_ID} />

      {children}
    </NextHead>
  );
};

export default Head;
