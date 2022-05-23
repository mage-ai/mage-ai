import NextLink from 'next/link';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link, { LinkProps } from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { ArrowRight } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';

export type BreadcrumbType = {
  as?: string;
  bold?: boolean;
  hideIcon?: boolean;
  highlighted?: boolean;
  href?: string;
  label: string;
  large?: boolean;
  linkProps?: LinkProps;
  onClick?: () => void;
  selected?: boolean;
};

function Breadcrumb({
  as,
  bold,
  hideIcon,
  highlighted,
  href,
  label,
  large,
  linkProps,
  onClick,
  selected,
}: BreadcrumbType) {
  const buildEl = (textOnly: boolean = false) => (
    <FlexContainer alignItems="center">
      <Flex>
        <Spacing mr={{ xs: 1 }}>
          {!textOnly && label}

          {textOnly && (
            <Text bold={selected} large={large}>
              {label}
            </Text>
          )}
        </Spacing>
      </Flex>
      {!hideIcon && (
        <Flex>
          <ArrowRight muted size={UNIT * 1.75} />
        </Flex>
      )}
    </FlexContainer>
  );

  const sharedLinkProps = {
    ...linkProps,
    block: true,
    bold: bold || selected,
    large,
    sameColorAsText: !highlighted,
  };

  return (
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
  );
}

export default Breadcrumb;
