import NextLink from 'next/link';

import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import { ChevronRight } from '@oracle/icons';
import { UNIT, WIDTH_OF_SINGLE_CHARACTER_MONOSPACE } from '@oracle/styles/units/spacing';

export type BreadcrumbType = {
  bold?: boolean;
  danger?: boolean;
  label: () => string;
  linkProps?: {
    href: string;
    as?: string;
  };
  loading?: boolean;
  monospace?: boolean;
  onClick?: () => void;
  options?: {
    label?: () => string;
    onClick?: (val?: any) => void;
    selected?: boolean;
    uuid: string;
  }[];
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
    loading,
    monospace = true,
    onClick,
    options,
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

    let titleEl = (
      <Text
        bold={bold}
        danger={danger}
        default={!bold}
        monospace={monospace}
        noWrapping
      >
        {title}
      </Text>
    );

    if (options?.length >= 1) {
      const selectedOption = options?.find(({ selected }) => !!selected);
      let maxWidth;
      if (selectedOption) {
        maxWidth = (selectedOption?.uuid?.length || 0) * WIDTH_OF_SINGLE_CHARACTER_MONOSPACE;
        if (maxWidth) {
          // Padding for after icon (chevron down icon)
          maxWidth += 3 * UNIT;

          if (loading) {
            // Width of spinner
            maxWidth += 2 * UNIT;
          }
        }
      }

      titleEl = (
        <FlexContainer alignItems="center">
          <Select
            afterIcon={loading ? <Spinner inverted small /> : null}
            danger={danger}
            defaultTextColor={!bold}
            maxWidth={maxWidth ? maxWidth : null}
            monospace={monospace}
            noBackground
            noBorder
            onChange={(e) => {
              const value = e.target.value;
              const option = options?.find(({ uuid }) => uuid === value);
              if (option && option?.onClick) {
                option?.onClick?.(value);
              }
            }}
            paddingHorizontal={0}
            paddingVertical={0}
            value={selectedOption?.uuid || ''}
          >
            {options?.map(({
              label: labelOption,
              selected,
              uuid,
            }) => {
              const display = labelOption ? labelOption?.() : uuid;

              return (
                <option key={uuid} value={uuid}>
                  {selected ? uuid : display}
                </option>
              );
            })}
          </Select>
        </FlexContainer>
      );
    }

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
