import NextHead from 'next/head';
import React from 'react';

const STYLE_ROOT_ID = 'dynamic-style-root';

type HeadProps = {
  title?: string;
};

const Head = ({ title }: HeadProps) => (
  <NextHead>
    <title>{title}</title>

    <link href="/images/favicons/pro.ico" rel="icon" />

    <style id={STYLE_ROOT_ID} />

    <meta
      content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=0"
      name="viewport"
    />
  </NextHead>
);

export default React.memo(Head, (p1, p2) => p1.title === p2.title);
