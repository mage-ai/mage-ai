import NextLink from 'next/link';

import ClientOnly from '@hocs/ClientOnly';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link, { LinkProps } from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';

export type BreadcrumbType = {
  as?: string;
  bold?: boolean;
  hideIcon?: boolean;
  href?: string;
  label: string;
  large?: boolean;
  linkProps?: LinkProps;
  onClick?: () => void;
  selected?: boolean;
  title?: string;
};

function Breadcrumb({
  as,
  bold,
  hideIcon,
  href,
  label,
  large,
  linkProps,
  onClick,
  selected,
  title,
}: BreadcrumbType) {
  const buildEl = (textOnly: boolean = false) => (
    <FlexContainer alignItems="center">
      <Flex>
        <Spacing mr={{ xs: 1 }}>
          {!textOnly && label}

          {textOnly && (
            <Text
              bold
              headline={large}
              primary={!selected}
              title={title}
            >
              {label}
            </Text>
          )}
        </Spacing>
      </Flex>
      {!hideIcon && (
        <Flex>
          <Text large={large} muted> / </Text>
        </Flex>
      )}
    </FlexContainer>
  );

  const sharedLinkProps = {
    ...linkProps,
    block: true,
    bold: bold || selected,
    headline: large,
    title,
  };

  return (
    <ClientOnly>
      <Spacing mr={{ xs: 1 }}>
        {!href && !onClick && buildEl(true)}

        {href && !onClick && (
          <NextLink as={as} href={href} passHref>
            <Link
              {...sharedLinkProps}
            >
              {buildEl()}
            </Link>
          </NextLink>
        )}
        {!href && onClick && (
          <Link
            {...sharedLinkProps}
            onClick={onClick}
          >
            {buildEl()}
          </Link>
        )}
      </Spacing>
    </ClientOnly>
  );
}

export default Breadcrumb;
