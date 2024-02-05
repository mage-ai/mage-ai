import NextLink from 'next/link';
import { ThemeContext } from 'styled-components';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
import LaunchKeyboardShortcutText from '@components/CommandCenter/LaunchKeyboardShortcutText';
import Loading, { LoadingStyleEnum } from '@oracle/components/Loading';
import Link from '@oracle/elements/Link';
import Mage8Bit from '@oracle/icons/custom/Mage8Bit';
import PopupMenu from '@oracle/components/PopupMenu';
import ProjectType, { FeatureUUIDEnum } from '@interfaces/ProjectType';
import ServerTimeDropdown from '@components/ServerTimeDropdown';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import useCustomDesign from '@utils/models/customDesign/useCustomDesign';
import useDelayFetch from '@api/utils/useDelayFetch';
import useProject from '@utils/models/project/useProject';
import { BLUE_TRANSPARENT, YELLOW } from '@oracle/styles/colors/main';
import { BranchAlt, Planet, Slack, UFO } from '@oracle/icons';
import {
  ButtonInputStyle,
  CUSTOM_LOGO_HEIGHT,
  HeaderStyle,
  LOGO_HEIGHT,
  MediaStyle,
} from './index.style';
import { CommandCenterStateEnum } from '@interfaces/CommandCenterType';
import { CustomEventUUID, CUSTOM_EVENT_NAME_COMMAND_CENTER_STATE_CHANGED } from '@utils/events/constants';
import { LinkStyle } from '@components/PipelineDetail/FileHeaderMenu/index.style';
import { MONO_FONT_FAMILY_BOLD } from '@oracle/styles/fonts/primary';
import { REQUIRE_USER_AUTHENTICATION, getUser } from '@utils/session';
import { PADDING, PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { getSetSettings } from '@storage/CommandCenter/utils';
import { launchCommandCenter } from '@components/CommandCenter/utils';
import { pauseEvent } from '@utils/events';
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

  const [commandCenterState, setCommandCenterState] = useState<CommandCenterStateEnum>(null);
  const [enableCommandCenterLoading, setEnableCommandCenterLoading] = useState<boolean>(false);
  const [userMenuVisible, setUserMenuVisible] = useState<boolean>(false);
  const [highlightedMenuIndex, setHighlightedMenuIndex] = useState<number>(null);
  const [confirmationDialogueOpen, setConfirmationDialogueOpen] = useState<boolean>(false);
  const [confirmationAction, setConfirmationAction] = useState(null);

  const menuRef = useRef(null);
  const projectRef = useRef(null);
  const refUserMenu = useRef(null);
  const router = useRouter();

  const loggedIn = AuthToken.isLoggedIn();
  const {
    data: dataGitBranch,
    mutate: fetchBranch,
  } = useDelayFetch(api.git_branches.detail,
    'test',
    {
      _format: 'with_basic_details',
    },
    {
      revalidateOnFocus: false,
    }, {
      pauseFetch: REQUIRE_USER_AUTHENTICATION() && !loggedIn,
    },
    {
      delay: 11000,
    },
  );
  const {
    is_git_integration_enabled: gitIntegrationEnabled,
    name: branch,
  } = useMemo(() => dataGitBranch?.['git_branch'] || {}, [dataGitBranch]);

  const {
    design,
  } = useCustomDesign();

  const {
    featureEnabled,
    featureUUIDs,
    isLoadingUpdate,
    project: projectInit,
    rootProject,
    updateProject,
  } = useProject();
  const project = useMemo(() => projectProp || projectInit, [projectInit, projectProp]);
  const version = useMemo(() => versionProp || project?.version, [project, versionProp]);
  const commandCenterEnabled = useMemo(() =>
    CommandCenterStateEnum.CLOSED === commandCenterState
    || CommandCenterStateEnum.OPEN === commandCenterState
    || featureEnabled?.(featureUUIDs?.COMMAND_CENTER), [
    commandCenterState,
    featureEnabled,
    featureUUIDs,
  ]);
  projectRef.current = project;

  const launchCommandCenterWrapper = useCallback(() => {
    if (commandCenterEnabled) {
      launchCommandCenter();
    } else {
      setEnableCommandCenterLoading(true);
      updateProject({
        features: {
          ...(project?.features || {}),
          [featureUUIDs?.COMMAND_CENTER]: true,
        },
      }).then((response) => {
        if (response?.data?.error) {
          setEnableCommandCenterLoading(false);
          showError({
            errors: response?.data?.error,
            response,
          });
        } else {
          if (typeof window !== 'undefined') {
            const eventCustom = new CustomEvent(CustomEventUUID.COMMAND_CENTER_ENABLED);
            window.dispatchEvent(eventCustom);
          }
        }
      });
    }
  }, [commandCenterEnabled, featureUUIDs, project, updateProject]);

  const logout = () => {
    AuthToken.logout(() => {
      api.sessions.updateAsyncServer(null, 1)
        .then(() => {
          redirectToUrl('/sign-in');
        })
        .catch(() => {
          redirectToUrl('/');
        });
    });
  };

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
      crumb.loading = isLoadingUpdate && !enableCommandCenterLoading;
      crumb.options = Object.keys(rootProject?.projects || {}).map((projectName: string) => ({
        onClick: () => {
          updateProject({
            activate_project: projectName,
          }).then((response) => {
            if (response?.data?.error) {
              showError({
                errors: response?.data?.error,
                response,
              });
            } else {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }
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
      if (media) {
        const image = new Image();
        const imageSrc = media?.url || media?.file_path;

        if (typeof imageSrc !== 'undefined' && imageSrc !== null) {
          image.src = imageSrc;
          image.onload = () => {
            setCustomMediaSize(image);
          };

          return image;
        }
      }
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
    {
      label: () => 'Launch command center',
      onClick: (e) => {
        pauseEvent(e);
        launchCommandCenterWrapper();
      },
      uuid: 'Launch command center',
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

  useEffect(() => {
    const handleState = ({
      detail,
    }) => {
      if (detail?.state) {
        setCommandCenterState(detail?.state);

        if (CommandCenterStateEnum.MOUNTED === detail?.state) {
          // Only launch this if it was previously disabled.
          // The feature can be enabled by clicking the button in the header.
          if (!projectRef?.current?.features?.[FeatureUUIDEnum.COMMAND_CENTER]) {
            setTimeout(() => {
              launchCommandCenter();
              setEnableCommandCenterLoading(false);
            }, 1);
          }
        }
      }
    };

    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.addEventListener(CUSTOM_EVENT_NAME_COMMAND_CENTER_STATE_CHANGED, handleState);
    }

    return () => {
      if (typeof window !== 'undefined') {
        // @ts-ignore
        window.removeEventListener(CUSTOM_EVENT_NAME_COMMAND_CENTER_STATE_CHANGED, handleState);
      }
    };
  }, []);

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

          {!!project && (
            <Flex flex={1} alignItems="center" justifyContent="center">
              <Spacing ml={PADDING_UNITS} />

              <Button
                noBackground
                noBorder
                noPadding
                onClick={(e) => {
                  pauseEvent(e);
                  launchCommandCenterWrapper();
                }}
              >
                <ButtonInputStyle active={CommandCenterStateEnum.OPEN === commandCenterState}>
                  <FlexContainer alignItems="center">
                    <>
                      {CommandCenterStateEnum.OPEN === commandCenterState
                        ? <UFO muted size={2 * UNIT} />
                        : <Planet
                          size={2 * UNIT}
                          success={!enableCommandCenterLoading && !commandCenterEnabled}
                          warning={enableCommandCenterLoading}
                        />
                      }
                    </>

                    <div style={{ marginRight: 1.5 * UNIT }} />

                    {CommandCenterStateEnum.OPEN !== commandCenterState && (
                      <Text default noWrapping weightStyle={4}>
                        {commandCenterEnabled
                          ? 'Command Center'
                          : enableCommandCenterLoading
                            ? 'Launching Command Center' : 'Launch Command Center'
                        }
                      </Text>
                    )}
                    {CommandCenterStateEnum.OPEN === commandCenterState && (
                      <Text muted noWrapping>
                        Command Center launched
                      </Text>
                    )}

                    {enableCommandCenterLoading && (
                      <>
                        <div style={{ marginRight: 1.5 * UNIT }} />
                        <Loading
                          color={themeContext?.accent?.warning}
                          loadingStyle={LoadingStyleEnum.BLOCKS}
                          width={1.5 * UNIT}
                        />
                      </>
                    )}

                    {commandCenterEnabled && (
                      <>
                        <div style={{ marginRight: 1.5 * UNIT }} />
                        <LaunchKeyboardShortcutText compact settings={getSetSettings()} small />
                      </>
                    )}
                  </FlexContainer>
                </ButtonInputStyle>
              </Button>

              <Spacing mr={PADDING_UNITS} />
            </Flex>
          )}

          <Flex alignItems="center">
            {gitIntegrationEnabled && branch && (
              <Spacing mr={1}>
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
                    <BranchAlt size={1.5 * UNIT} />
                    <Spacing ml={1} />
                    <Text monospace noWrapping small>
                      {branchName}
                    </Text>
                  </FlexContainer>
                </KeyboardShortcutButton>
              </Spacing>
            )}

            {latestVersion && version && latestVersion !== version && (
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
            )}

            {version && typeof(version) !== 'undefined' && (
              <Spacing px={1}>
                <Link
                  href="https://www.mage.ai/changelog"
                  monospace
                  noWrapping
                  openNewWindow
                  sameColorAsText
                  small
                >
                  {`v${version}`}
                </Link>
              </Spacing>
            )}

            <Spacing ml={1}>
              <ServerTimeDropdown
                projectName={project?.name}
              />
            </Spacing>

            <Spacing ml={1}>
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
                <Spacing ml={1} />

                <ClickOutside
                  onClickOutside={() => setUserMenuVisible(false)}
                  open
                  style={{
                    position: 'relative',
                  }}
                >
                  <FlexContainer alignItems="flex-end" flexDirection="column">
                    <KeyboardShortcutButton
                      compact
                      highlightOnHoverAlt
                      inline
                      noBackground
                      noHoverUnderline
                      onClick={() => setUserMenuVisible(true)}
                      ref={refUserMenu}
                      uuid="Header/menu"
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
                    </KeyboardShortcutButton>

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
