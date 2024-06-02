import NextHead from 'next/head';
import { useContext } from 'react';
import { ThemeContext } from 'styled-components';

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

      {children}
    </NextHead>
  );
};

export default Head;
