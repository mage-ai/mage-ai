import NextLink from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';

import AuthToken from '@api/utils/AuthToken';
import Button from '@oracle/elements/Button';
import Circle from '@oracle/elements/Circle';
import ClickOutside from '@oracle/components/ClickOutside';
import ClientOnly from '@hocs/ClientOnly';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu, { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import GradientLogoIcon from '@oracle/icons/GradientLogo';
import GradientText from '@oracle/elements/Text/GradientText';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Link from '@oracle/elements/Link';
import Mage8Bit from '@oracle/icons/custom/Mage8Bit';
import PopupMenu from '@oracle/components/PopupMenu';
import ProjectType from '@interfaces/ProjectType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import { BLUE_TRANSPARENT } from '@oracle/styles/colors/main';
import {
  HeaderStyle,
  LOGO_HEIGHT,
} from './index.style';
import { LinkStyle } from '@components/PipelineDetail/FileHeaderMenu/index.style';
import { REQUIRE_USER_AUTHENTICATION } from '@utils/session';
import { UNIT } from '@oracle/styles/units/spacing';
import { redirectToUrl } from '@utils/url';

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

export type HeaderProps = {
  breadcrumbs?: BreadcrumbType[];
  menuItems?: MenuItemType[];
  project?: ProjectType;
  version?: string;
};

function Header({
  breadcrumbs: breadcrumbsProp,
  menuItems,
  project: projectProp,
  version: versionProp,
}: HeaderProps) {
  const [userMenuVisible, setUserMenuVisible] = useState<boolean>(false);
  const [highlightedMenuIndex, setHighlightedMenuIndex] = useState(null);
  const [confirmationDialogueOpen, setConfirmationDialogueOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState(null);

  const menuRef = useRef(null);
  const refUserMenu = useRef(null);
  const router = useRouter();

  const {
    data: dataProjects,
  } = api.projects.list({}, { revalidateOnFocus: false }, { pauseFetch: !!projectProp });
  const project = useMemo(() => projectProp || dataProjects?.projects?.[0], [dataProjects, projectProp]);
  const version = useMemo(() => versionProp || project?.version, [project, versionProp]);

  const loggedIn = AuthToken.isLoggedIn();
  const logout = () => {
    AuthToken.logout(() => {
      api.sessions.updateAsync(null, 1)
        .then(() => {
          redirectToUrl('/sign-in');
        })
        .catch(() => {
          redirectToUrl('/');
        });
    });
  };

  const breadcrumbs = useMemo(() => breadcrumbsProp || [{
    bold: true,
    label: () => project?.name,
    linkProps: {
      href: '/',
      sameColorText: true,
    },
  }], [breadcrumbsProp, project]);
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

  const { latest_version: latesetVersion } = project || {};

  const logoLink = useMemo(() => (
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
  ), []);

  const userDropdown: FlyoutMenuItemType[] = [
    {
      label: () => 'User settings',
      linkProps: {
        href: '/settings/workspace/preferences',
      },
      uuid: 'user_settings',
    },
  ];
  if (REQUIRE_USER_AUTHENTICATION) {
    userDropdown.push(
    {
      label: () => 'Sign out',
      onClick: () => logout(),
      uuid: 'sign_out',
    });
  }

  return (
    <HeaderStyle>
      <ClientOnly>
        <FlexContainer
          alignItems="center"
          fullHeight
          justifyContent="space-between"
        >
          <Flex alignItems="center">
            {version && (
              <Tooltip
                height={LOGO_HEIGHT}
                label={`Version ${version}`}
                size={null}
                visibleDelay={300}
                widthFitContent
              >
                {logoLink}
              </Tooltip>
            )}

            {!version && logoLink}

            {breadcrumbEls}
          </Flex>

          <Flex alignItems="center">
            {latesetVersion && version && latesetVersion !== version && (
              <Spacing ml={2}>
                <Button
                  borderLess
                  linkProps={{
                    href: 'https://docs.mage.ai/about/releases',
                  }}
                  noHoverUnderline
                  primary
                  target="_blank"
                >
                  <Text>
                    🚀 Download new version <Text
                      bold
                      inline
                      monospace
                    >
                      {latesetVersion}
                    </Text>
                  </Text>
                </Button>
              </Spacing>
            )}

            {version && typeof(version) !== 'undefined' && (
              <Spacing ml={2}>
                <Link
                  default
                  href="https://www.mage.ai/changelog"
                  monospace
                  openNewWindow
                >
                  {`v${version}`}
                </Link>
              </Spacing>
            )}

            <Spacing ml={2}>
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
                <Spacing ml={2} />

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
                      rightOffset={0}
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
              </>
            }

            {(loggedIn || !REQUIRE_USER_AUTHENTICATION) && (
              <>
                <Spacing ml={2} />

                <ClickOutside
                  onClickOutside={() => setUserMenuVisible(false)}
                  open
                  style={{
                    position: 'relative',
                  }}
                >
                  <FlexContainer>
                    <LinkStyle
                      onClick={() => setUserMenuVisible(true)}
                      ref={refUserMenu}
                    >
                      <Circle
                        color={BLUE_TRANSPARENT}
                        size={4 * UNIT}
                      >
                        <Mage8Bit />
                      </Circle>
                    </LinkStyle>

                    <FlyoutMenu
                      alternateBackground
                      items={userDropdown}
                      onClickCallback={() => setUserMenuVisible(false)}
                      open={userMenuVisible}
                      parentRef={refUserMenu}
                      rightOffset={0}
                      uuid="shared/Header/user_menu"
                    />
                  </FlexContainer>
                </ClickOutside>
              </>
            )}
          </Flex>
        </FlexContainer>
      </ClientOnly>
    </HeaderStyle>
  );
}

export default Header;
