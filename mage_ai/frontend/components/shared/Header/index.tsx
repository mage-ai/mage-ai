import NextLink from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';

import Circle from '@oracle/elements/Circle';
import ClickOutside from '@oracle/components/ClickOutside';
import ClientOnly from '@hocs/ClientOnly';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import GradientText from '@oracle/elements/Text/GradientText';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Link from '@oracle/elements/Link';
import PopupMenu from '@oracle/components/PopupMenu';
import GradientLogoIcon from '@oracle/icons/GradientLogo';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import {
  HeaderStyle,
  LOGO_HEIGHT,
} from './index.style';
import { LinkStyle } from '@components/PipelineDetail/FileHeaderMenu/index.style';
import { PURPLE } from '@oracle/styles/colors/main';
import { UNIT } from '@oracle/styles/units/spacing';

export type BreadcrumbType = {
  bold?: boolean;
  gradientColor?: string;
  label: () => string;
  linkProps?: {
    href: string;
    as: string;
  };
};

export type MenuItemType = {
  label: () => string;
  onClick: () => void;
  openConfirmationDialogue?: boolean;
  uuid: string;
};

type HeaderProps = {
  breadcrumbs: BreadcrumbType[];
  menuItems?: MenuItemType[];
  version?: string;
};

function Header({
  breadcrumbs,
  menuItems,
  version,
}: HeaderProps) {
  const [highlightedMenuIndex, setHighlightedMenuIndex] = useState(null);
  const [confirmationDialogueOpen, setConfirmationDialogueOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState(null);
  const menuRef = useRef(null);
  const router = useRouter();
  const { pipeline: pipelineUUID } = router.query;
  const breadcrumbEls = useMemo(() => {
    const count = breadcrumbs.length;
    const arr = [];

    breadcrumbs.forEach(({
      bold,
      gradientColor,
      label,
      linkProps,
    }, idx: number) => {
      const title = label();
      const showDivider = count >= 2 && idx >= 1;

      if (showDivider) {
        arr.push(
          <Text
            inline
            key={`divider-${title}`}
            monospace
            muted
          >
            &nbsp;
            /
            &nbsp;
          </Text>
        );
      }

      const titleEl = (
        <Text
          bold={bold}
          default={!bold}
          monospace
        >
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
              default={!bold}
              noOutline
              sameColorAsText={bold}
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
              height={LOGO_HEIGHT}
              label={`Version ${version}`}
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

            {menuItems &&
              <>
                <ClickOutside
                  onClickOutside={() => setHighlightedMenuIndex(null)}
                  open
                  style={{
                    position: 'relative',
                  }}
                >
                  <FlexContainer>
                    <LinkStyle
                      highlighted={highlightedMenuIndex === 0}
                      onClick={() => setHighlightedMenuIndex(val => val === 0 ? null : 0)}
                      onMouseEnter={() => setHighlightedMenuIndex(val => val !== null ? 0 : null)}
                      ref={menuRef}
                    >
                      <Text>
                        Menu
                      </Text>
                    </LinkStyle>

                    <FlyoutMenu
                      alternateBackground
                      items={menuItems}
                      onClickCallback={() => setHighlightedMenuIndex(null)}
                      open={highlightedMenuIndex === 0}
                      parentRef={menuRef}
                      setConfirmationAction={setConfirmationAction}
                      setConfirmationDialogueOpen={setConfirmationDialogueOpen}
                      uuid="PipelineDetail/Header/menu"
                    />
                  </FlexContainer>
                </ClickOutside>

                <ClickOutside
                  onClickOutside={() => setConfirmationDialogueOpen(false)}
                  open={confirmationDialogueOpen}
                >
                  <PopupMenu
                    danger
                    onCancel={() => setConfirmationDialogueOpen(false)}
                    onClick={confirmationAction}
                    right={UNIT * 16}
                    subtitle="This is irreversible and will immediately delete everything associated with the pipeline, including its blocks, triggers, runs, logs, and history."
                    title={`Are you sure you want to delete the pipeline ${pipelineUUID}?`}
                    width={UNIT * 40}
                  />
                </ClickOutside>

                <Spacing mr={2} />
              </>
            }

            <Spacing mr={2}>
              <Text default>
                {`V${version}`}
              </Text>
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
