import NextLink from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';

import AuthToken from '@api/utils/AuthToken';
import Breadcrumbs, { BreadcrumbType as BreadcrumbTypeOrig } from '@components/Breadcrumbs';
import Button from '@oracle/elements/Button';
import Circle from '@oracle/elements/Circle';
import ClickOutside from '@oracle/components/ClickOutside';
import ClientOnly from '@hocs/ClientOnly';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu, { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import GitActions from '@components/VersionControl/GitActions';
import GradientLogoIcon from '@oracle/icons/GradientLogo';
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
import { Branch, Slack } from '@oracle/icons';
import {
  HeaderStyle,
  LOGO_HEIGHT,
} from './index.style';
import { LinkStyle } from '@components/PipelineDetail/FileHeaderMenu/index.style';
import { REQUIRE_USER_AUTHENTICATION } from '@utils/session';
import { UNIT } from '@oracle/styles/units/spacing';
import { redirectToUrl } from '@utils/url';
import { useModal } from '@context/Modal';

export type BreadcrumbType = BreadcrumbTypeOrig;

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
  const [highlightedMenuIndex, setHighlightedMenuIndex] = useState<number>(null);
  const [confirmationDialogueOpen, setConfirmationDialogueOpen] = useState<boolean>(false);
  const [confirmationAction, setConfirmationAction] = useState(null);

  const menuRef = useRef(null);
  const refUserMenu = useRef(null);
  const router = useRouter();

  const {
    data: dataGitBranch,
    mutate: fetchBranch,
  } = api.git_branches.detail(
    'test',
    {
      _format: 'with_basic_details',
    },
    {
      revalidateOnFocus: false,
    });
  const {
    is_git_integration_enabled: gitIntegrationEnabled,
    name: branch,
  } = useMemo(() => dataGitBranch?.['git_branch'] || {}, [dataGitBranch]);

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
      label: () => 'Settings',
      linkProps: {
        href: '/settings/workspace/preferences',
      },
      uuid: 'user_settings',
    },
  ];
  if (REQUIRE_USER_AUTHENTICATION()) {
    userDropdown.push(
    {
      label: () => 'Sign out',
      onClick: () => logout(),
      uuid: 'sign_out',
    });
  }

  const [showModal, hideModal] = useModal(() => (
    <GitActions
      branch={branch}
      fetchBranch={fetchBranch}
    />
  ),{}, [branch, fetchBranch], {
    background: true,
    uuid: 'git_actions',
  });

  const branchName = useMemo(() => {
    if (branch?.length >= 21) {
      return `${branch.slice(0, 21)}...`;
    }

    return branch;
  }, [branch]);

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

            <Breadcrumbs
              breadcrumbs={breadcrumbs}
            />
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

            {gitIntegrationEnabled && branch && (
              <Spacing ml={2}>
                <KeyboardShortcutButton
                  blackBorder
                  block
                  compact
                  noHoverUnderline
                  onClick={showModal}
                  sameColorAsText
                  uuid="Header/GitActions"
                >
                  <FlexContainer alignItems="center">
                    <Branch size={1.5 * UNIT} />
                    <Spacing ml={1} />
                    <Text monospace small>
                      {branchName}
                    </Text>
                  </FlexContainer>
                </KeyboardShortcutButton>
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
                beforeElement={<Slack />}
                blackBorder
                compact
                inline
                linkProps={{
                  as: 'https://www.mage.ai/chat',
                  href: 'https://www.mage.ai/chat',
                }}
                noHoverUnderline
                openNewTab
                sameColorAsText
                uuid="Header/live_chat"
              >
                Live help
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

            {(loggedIn || !REQUIRE_USER_AUTHENTICATION()) && (
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
