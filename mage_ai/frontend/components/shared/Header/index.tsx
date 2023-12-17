import NextLink from 'next/link';
import { ThemeContext } from 'styled-components';
import { useContext, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';
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
import ServerTimeDropdown from '@components/ServerTimeDropdown';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import useCustomDesign from '@utils/models/customDesign/useCustomDesign';
import useProject from '@utils/models/project/useProject';
import { BLUE_TRANSPARENT, YELLOW } from '@oracle/styles/colors/main';
import { Branch, Slack } from '@oracle/icons';
import {
  CUSTOM_LOGO_HEIGHT,
  HeaderStyle,
  LOGO_HEIGHT,
  MediaStyle,
} from './index.style';
import { LinkStyle } from '@components/PipelineDetail/FileHeaderMenu/index.style';
import { MONO_FONT_FAMILY_BOLD } from '@oracle/styles/fonts/primary';
import { REQUIRE_USER_AUTHENTICATION } from '@utils/session';
import { UNIT } from '@oracle/styles/units/spacing';
import { getUser } from '@utils/session';
import { onSuccess } from '@api/utils/response';
import { redirectToUrl } from '@utils/url';
import { useModal } from '@context/Modal';
import { useError } from '@context/Error';

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
  const [showError] = useError(null, {}, [], {
    uuid: 'shared/Header',
  });

  const themeContext = useContext(ThemeContext);
  const userFromLocalStorage = getUser();

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
    design,
  } = useCustomDesign();

  const {
    project: projectInit,
    rootProject,
  } = useProject();
  const project = useMemo(() => projectProp || projectInit, [projectInit, projectProp]);
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

  const [updateProject, { isLoading: isLoadingUpdateProject }]: any = useMutation(
    api.projects.useUpdate(project?.name),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const breadcrumbProjects = [];
  if (rootProject) {
    breadcrumbProjects.push({
      label: () => rootProject?.name,
      linkProps: {
        href: '/',
      },
    });
  }

  if (project) {
    const crumb: BreadcrumbType = {
      label: () => project?.name,
    };

    if (rootProject) {
      crumb.loading = isLoadingUpdateProject;
      crumb.options = Object.keys(rootProject?.projects || {}).map((projectName: string) => ({
        onClick: () => {
          updateProject({
            project: {
              activate_project: projectName,
            },
          });
        },
        selected: projectName === project?.name,
        uuid: projectName,
      }));
    } else {
      crumb.linkProps = {
        href: '/',
      };
    }

    breadcrumbProjects.push(crumb);
  }

  const breadcrumbs = useMemo(() => {
    // breadcrumbsProp || [{
    //   bold: true,
    //   label: () => project?.name,
    //   linkProps: {
    //     href: '/',
    //     sameColorText: true,
    //   },
    // }]

    return [
      ...breadcrumbProjects,
      ...(breadcrumbsProp || []),
    ];
  }, [
    breadcrumbProjects,
    breadcrumbsProp,
    project,
  ]);
  const { pipeline: pipelineUUID } = router.query;

  const { latest_version: latestVersion } = project || {};

  const [customMediaSize, setCustomMediaSize] = useState<{
    height?: number;
    width?: number;
  }>(null);
  const customDesignMedia = useMemo(() => {
    if (typeof window !== 'undefined') {
      const media = design?.components?.header?.media;
      const image = new Image();
      image.src = media?.url || media?.file_path;;
      image.onload = () => {
        setCustomMediaSize(image);
      };

      return image;
    }
  }, [
    design,
    setCustomMediaSize,
  ]);

  const logoLink = useMemo(() => {
    let logoHeight = LOGO_HEIGHT;
    let logoEl = <GradientLogoIcon height={LOGO_HEIGHT} />;

    if (design?.components?.header?.media) {
      const media = design?.components?.header?.media;
      if (customMediaSize !== null) {
        const ratio = (customMediaSize?.width || 1) / (customMediaSize?.height || 1);

        logoHeight = CUSTOM_LOGO_HEIGHT;
        logoEl = (
          <MediaStyle
            height={CUSTOM_LOGO_HEIGHT}
            width={CUSTOM_LOGO_HEIGHT * ratio}
            url={media?.url || media?.file_path}
          />
        );
      }
    }

    return (
      <NextLink
        as="/"
        href="/"
        passHref
      >
        <Link
          block
          height={logoHeight}
          noHoverUnderline
          noOutline
        >
          {logoEl}
        </Link>
      </NextLink>
    );
  }, [
    customMediaSize,
    design,
  ]);

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

  const hasAvatarEmoji = useMemo(() => {
    if (!userFromLocalStorage || !userFromLocalStorage?.avatar) {
      return false;
    }

    return !/[A-Za-z0-9]+/.exec(userFromLocalStorage?.avatar || '');
  }, [userFromLocalStorage]);

  const hasAvatarAndNotEmoji = useMemo(() => {
    if (!userFromLocalStorage || !userFromLocalStorage?.avatar) {
      return false;
    }

    return !!/[A-Za-z0-9]+/.exec(userFromLocalStorage?.avatar || '');
  }, [userFromLocalStorage]);

  const avatarMemo = useMemo(() => {
    if (!userFromLocalStorage || !userFromLocalStorage?.avatar) {
      return <Mage8Bit />;
    }

    const styleProps: {
      color?: string;
      fontFamily?: string;
      fontSize?: number;
      lineHeight?: string;
      position?: string;
      top?: number;
    } = {
      color: themeContext?.content?.active,
      fontFamily: MONO_FONT_FAMILY_BOLD,
    };

    if (hasAvatarAndNotEmoji) {
      styleProps.fontSize = 2 * UNIT;
      styleProps.lineHeight = `${2 * UNIT}px`;
      styleProps.position = 'relative';
      styleProps.top = 1;
    } else {
      styleProps.fontSize = 3 * UNIT;
    }

    return (
      // @ts-ignore
      <div style={styleProps}>
        {userFromLocalStorage?.avatar}
      </div>
    );
  }, [
    hasAvatarAndNotEmoji,
    userFromLocalStorage,
  ]);

  return (
    <HeaderStyle>
      <ClientOnly>
        <FlexContainer
          alignItems="center"
          fullHeight
          justifyContent="space-between"
        >
          <Flex alignItems="center">
            {logoLink}

            <Breadcrumbs
              breadcrumbs={breadcrumbs}
            />
          </Flex>

          <Flex alignItems="center">
            {gitIntegrationEnabled && branch && (
              <Spacing ml={1}>
                <KeyboardShortcutButton
                  compact
                  highlightOnHoverAlt
                  noBackground
                  noHoverUnderline
                  onClick={showModal}
                  sameColorAsText
                  title={branch}
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

            <Spacing ml={1}>
              <ServerTimeDropdown
                projectName={project?.name}
              />
            </Spacing>

            {version && typeof(version) !== 'undefined' && (
              <Spacing ml={2}>
                <Link
                  href="https://www.mage.ai/changelog"
                  monospace
                  openNewWindow
                  sameColorAsText
                  small
                >
                  {`v${version}`}
                </Link>
              </Spacing>
            )}

            {latestVersion && version && latestVersion !== version && (
              <Spacing ml={1}>
                <Button
                  backgroundColor={YELLOW}
                  borderLess
                  compact
                  linkProps={{
                    href: 'https://docs.mage.ai/about/releases',
                  }}
                  noHoverUnderline
                  pill
                  sameColorAsText
                  target="_blank"
                  title={`Update to version ${latestVersion}`}
                >
                  <Text black bold>Update</Text>
                </Button>
              </Spacing>
            )}

            <Spacing ml={3}>
              <KeyboardShortcutButton
                beforeElement={<Slack />}
                compact
                highlightOnHoverAlt
                inline
                linkProps={{
                  as: 'https://www.mage.ai/chat',
                  href: 'https://www.mage.ai/chat',
                }}
                noBackground
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
                  <FlexContainer alignItems="center" flexDirection="row">
                    <LinkStyle
                      onClick={() => setUserMenuVisible(true)}
                      ref={refUserMenu}
                    >
                      {hasAvatarEmoji && userFromLocalStorage?.avatar?.length >= 2
                        ? avatarMemo
                        : (
                          <Circle
                            color={BLUE_TRANSPARENT}
                            size={4 * UNIT}
                          >
                            {avatarMemo}
                          </Circle>
                        )
                      }
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
