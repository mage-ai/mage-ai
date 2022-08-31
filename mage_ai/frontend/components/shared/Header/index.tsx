import NextLink from 'next/link';
import { useMemo } from 'react';

import Circle from '@oracle/elements/Circle';
import ClientOnly from '@hocs/ClientOnly';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import GradientText from '@oracle/elements/Text/GradientText';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Link from '@oracle/elements/Link';
import GradientLogoIcon from '@oracle/icons/GradientLogo';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import {
  HeaderStyle,
  LOGO_HEIGHT,
} from './index.style';
import { PURPLE } from '@oracle/styles/colors/main';
import { UNIT } from '@oracle/styles/units/spacing';

export type BreadcrumbType = {
  gradientColor?: string;
  label: () => string;
  linkProps?: {
    href: string;
    as: string;
  };
};

type HeaderProps = {
  breadcrumbs: BreadcrumbType[];
  version?: string;
};

function Header({
  breadcrumbs,
  version,
}: HeaderProps) {
  const breadcrumbEls = useMemo(() => {
    const count = breadcrumbs.length;
    const arr = [];

    breadcrumbs.forEach(({
      gradientColor,
      label,
      linkProps,
    }, idx: Number) => {
      const showDivider = count >= 2 && idx >= 1;
      const title = label();
      const titleEl = (
        <Text monospace>
          {showDivider && (
            <Text inline monospace muted={!gradientColor}>
              &nbsp;
              /
              &nbsp;
            </Text>
          )}
          {title}
        </Text>
      );
      let el = (
        <Spacing
          key={`breadcrumb-${title}`}
          ml={idx === 0 ? 2 : 0}
        >
          {gradientColor && (
            <GradientText backgroundGradient={gradientColor}>
              {titleEl}
            </GradientText>
          )}
          {!gradientColor && titleEl}
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
              noHoverUnderline
              noOutline
              sameColorAsText
            >
              {el}
            </Link>
          </NextLink>
        );
      }

      arr.push(el);
    });

    return arr;
  }, [breadcrumbs]);


  return (
    <HeaderStyle>
      <ClientOnly>
        <FlexContainer
          alignItems="center"
          fullHeight
          justifyContent="space-between"
        >
          <Flex alignItems="center">
            <Tooltip
              label={`Version ${version}`}
              height={LOGO_HEIGHT}
              size={null}
              visibleDelay={300}
              widthFitContent
            >
              <NextLink
                as="/"
                href="/"
                passHref
              >
                <Link
                  block
                  height={LOGO_HEIGHT}
                  noHoverUnderline
                  noOutline
                >
                  <GradientLogoIcon height={LOGO_HEIGHT} />
                </Link>
              </NextLink>
            </Tooltip>

            {breadcrumbEls}
          </Flex>

          <Flex alignItems="center">
            <Spacing mr={2}>
              <KeyboardShortcutButton
                blackBorder
                block
                compact
                noHoverUnderline
                openNewTab
                linkProps={{
                  as: 'https://www.mage.ai/chat',
                  href: 'https://www.mage.ai/chat',
                }}
                sameColorAsText
                uuid="Header/live_chat"
              >
                Live chat
              </KeyboardShortcutButton>
            </Spacing>

            <Circle
              color={PURPLE}
              size={4 * UNIT}
            >
              🤖
            </Circle>
          </Flex>
        </FlexContainer>
      </ClientOnly>
    </HeaderStyle>
  );
}

export default Header;
