import NextLink from 'next/link';

import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { ChevronRight } from '@oracle/icons';

export type BreadcrumbType = {
  bold?: boolean;
  danger?: boolean;
  label: () => string;
  linkProps?: {
    href: string;
    as?: string;
  };
  onClick?: () => void;
};

type BreadcrumbsProps = {
  breadcrumbs?: BreadcrumbType[];
  noMarginLeft?: boolean;
};

function Breadcrumbs({
  breadcrumbs,
  noMarginLeft,
}: BreadcrumbsProps) {
  const count = breadcrumbs.length;
  const arr = [];

  breadcrumbs.forEach(({
    bold,
    danger,
    label,
    linkProps,
    onClick,
  }, idx: number) => {
    const title = label();
    const showDivider = count >= 2 && idx >= 1;

    if (showDivider) {
      arr.push(
        <Spacing
          key={`divider-${title}`}
          mx={1}
        >
          <ChevronRight muted />
        </Spacing>,
      );
    }

    const titleEl = (
      <Text
        bold={bold}
        danger={danger}
        default={!bold}
        monospace
      >
        {title}
      </Text>
    );
    let el = (
      <Spacing
        key={`breadcrumb-${title}`}
        ml={(!noMarginLeft && idx === 0) ? 2 : 0}
      >
        {titleEl}
      </Spacing>
    );

    if (linkProps) {
      el = (
        <NextLink
          {...linkProps}
          key={`breadcrumb-link-${title}`}
          passHref
        >
          <Link
            block
            default={!bold}
            noOutline
            sameColorAsText={bold}
          >
            {el}
          </Link>
        </NextLink>
      );
    } else if (onClick) {
      el = (
        <Link
          block
          default={!bold}
          noOutline
          onClick={onClick}
          preventDefault
          sameColorAsText={bold}
        >
          {el}
        </Link>
      );
    }

    arr.push(el);
  });

  return (
    <FlexContainer alignItems="center">
      {arr}
    </FlexContainer>
  );
}

export default Breadcrumbs;
