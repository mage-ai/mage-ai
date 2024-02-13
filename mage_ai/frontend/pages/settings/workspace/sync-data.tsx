import React, { useEffect, useMemo, useState } from 'react';
import NextLink from 'next/link';
import { toast } from 'react-toastify';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import ClickOutside from '@oracle/components/ClickOutside';
import ErrorPopup from '@components/ErrorPopup';
import ErrorsType from '@interfaces/ErrorsType';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import PrivateRoute from '@components/shared/PrivateRoute';
import Select from '@oracle/elements/Inputs/Select';
import SettingsDashboard from '@components/settings/Dashboard';
import Spacing from '@oracle/elements/Spacing';
import SyncType, {
  AuthType,
  GIT_FIELDS,
  HTTPS_GIT_FIELDS,
  SSH_GIT_FIELDS,
  SYNC_FIELDS,
  UserGitSettingsType,
} from '@interfaces/SyncType';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import {
  PADDING_UNITS,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import {
  SECTION_ITEM_UUID_GIT_SETTINGS,
  SECTION_UUID_WORKSPACE,
} from '@components/settings/Dashboard/constants';
import { onSuccess } from '@api/utils/response';

export interface SyncFieldType {
  autoComplete?: string;
  disabled?: boolean;
  label: string;
  labelDescription?: string;
  required?: boolean;
  type?: string;
  uuid: string;
}

function SyncData() {
  const { data: dataSyncs } = api.syncs.list();
  const [sync, setSync] = useState<SyncType>(null);
  const [userGitSettings, setUserGitSettings] = useState<UserGitSettingsType>(null);
  const [errors, setErrors] = useState<ErrorsType>(null);

  const [showSyncSettings, setShowSyncSettings] = useState<boolean>(null);

  useEffect(() => {
    if (dataSyncs) {
      const initialSync = dataSyncs?.syncs?.[0];
      setUserGitSettings(initialSync?.user_git_settings);
      setSync(initialSync);
      setShowSyncSettings(!!initialSync?.branch);
    }
  }, [dataSyncs]);

  const showSyncOperations = useMemo(() => {
    if (dataSyncs) {
      const config = dataSyncs?.syncs?.[0];
      return !!config?.branch;
    }
    return false;
  }, [dataSyncs]);

  const [createSync, { isLoading: isLoadingCreateSync }] = useMutation(
    api.syncs.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({ sync }) => {
            if (sync) {
              setSync(sync);
              window.location.reload();
              toast.success(
                'Sync saved',
                {
                  position: toast.POSITION.BOTTOM_RIGHT,
                  toastId: 'data_sync_success',
                },
              );
            }
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const [runSync, { isLoading: isLoadingRunSync }] = useMutation(
    api.syncs.useUpdate('git'),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({ sync }) => {
            if (sync) {
              toast.success(
                'Success!',
                {
                  position: toast.POSITION.BOTTOM_RIGHT,
                  toastId: 'data_sync_success',
                },
              );
            }
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const authType = useMemo(() => sync?.auth_type || AuthType.SSH, [sync?.auth_type]);
  const additionalGitFields = useMemo(() => {
    if (authType === AuthType.HTTPS) {
      return HTTPS_GIT_FIELDS;
    }
    return SSH_GIT_FIELDS;
  }, [authType]);
  
  const { data } = api.statuses.list();
  const requireUserAuthentication =
    useMemo(() => data?.statuses?.[0]?.require_user_authentication, [data]);

  const userGitFields = useMemo(() => {
    let updateSettings: React.Dispatch<
      React.SetStateAction<SyncType | UserGitSettingsType>
    > = setSync;
    let settings: SyncType | UserGitSettingsType = sync;

    if (!showSyncSettings && requireUserAuthentication) {
      updateSettings = setUserGitSettings;
      settings = userGitSettings;
    }

    return (
      <form>
        {additionalGitFields.map(({
          autoComplete,
          disabled,
          label,
          labelDescription,
          required,
          type,
          uuid,
        }: SyncFieldType) => {
          let description;
          if (uuid === 'ssh_public_key') {
            description = (
              <Spacing mb={1}>
                <Text small>
                  Run <Link
                    onClick={() => {
                      navigator.clipboard.writeText('cat ~/.ssh/id_ed25519.pub | base64 | tr -d \\\\n && echo');
                      toast.success(
                        'Successfully copied to clipboard.',
                        {
                          position: toast.POSITION.BOTTOM_RIGHT,
                          toastId: uuid,
                        },
                      );
                    }}
                    small
                  >
                    cat ~/.ssh/id_ed25519.pub | base64 | tr -d \\n && echo
                  </Link> in terminal to get base64 encoded public key and paste the result here. The key will be stored as a Mage secret.
                </Text>
              </Spacing>
            )
          } else if (uuid === 'ssh_private_key') {
            description = (
              <Spacing mb={1}>
                <Text small>
                  Follow same steps as the public key, but run <Link
                    onClick={() => {
                      navigator.clipboard.writeText('cat ~/.ssh/id_ed25519 | base64 | tr -d \\\\n && echo');
                      toast.success(
                        'Successfully copied to clipboard.',
                        {
                          position: toast.POSITION.BOTTOM_RIGHT,
                          toastId: uuid,
                        },
                      );
                    }}
                    small
                  >
                    cat ~/.ssh/id_ed25519 | base64 | tr -d \\n && echo
                  </Link> instead. The key will be stored as a Mage secret.
                </Text>
              </Spacing>
            );
          } else {
            description = labelDescription && (
              <Spacing mb={1}>
                <Text small>
                  {labelDescription}
                </Text>
              </Spacing>
            );
          }
          return (
            <Spacing key={uuid} mt={2}>
              {description}

              <TextInput  
                autoComplete={autoComplete}
                disabled={disabled}
                label={label}
                // @ts-ignore
                onChange={e => {
                  updateSettings(prev => ({
                    ...prev,
                    [uuid]: e.target.value,
                  }));
                }}
                primary
                required={required}
                setContentOnMount
                type={type}
                value={settings?.[uuid] || ''}
              />
            </Spacing>
          );
        })}
      </form>
    );
  }, [
    additionalGitFields,
    requireUserAuthentication,
    setUserGitSettings,
    setSync,
    showSyncSettings,
    sync,
    userGitSettings,
  ]);

  return (
    <SettingsDashboard
      uuidItemSelected={SECTION_ITEM_UUID_GIT_SETTINGS}
      uuidWorkspaceSelected={SECTION_UUID_WORKSPACE}
    >
      <Spacing
        p={PADDING_UNITS}
        style={{
          width: '600px',
        }}
      >
        <Headline>
          Git repository settings
        </Headline>
        <Text>
          If you are using Github and want to use a more feature rich integration, you can check out
          the <NextLink
            as="/version-control"
            href="/version-control"
          >
            <Link inline>version control app</Link>
          </NextLink>.
        </Text>
        <Link>
        </Link>
        <Spacing mt={1}>
          <Text bold>
            Authentication type
          </Text>
        </Spacing>
        <Spacing mt={1}>
          <Select
            compact
            label="Authentication type"
            onChange={(e) => {
              const type = e.target.value;
              setSync(prev => ({
                ...prev,
                auth_type: type,
              }));
            }}
            value={authType}
          >
            {Object.entries(AuthType).map(([k, v]) => (
              <option key={v} value={v}>
                {k}
              </option>
            ))}
          </Select>
        </Spacing>
        <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
          {authType === AuthType.SSH && (
            <Text bold>
              You will need to <Link href="https://docs.mage.ai/development/git/configure#generate-ssh-token" openNewWindow>
                set up your SSH key
              </Link> if you have not done so already.
            </Text>
          )}
        </Spacing>

        <form>
          {GIT_FIELDS.map(({
            autoComplete,
            disabled,
            label,
            labelDescription,
            required,
            type,
            uuid,
          }: SyncFieldType) => (
            <Spacing key={uuid} mt={2}>
              {labelDescription && (
                <Spacing mb={1}>
                  <Text small>
                    {labelDescription}
                  </Text>
                </Spacing>
              )}
              <TextInput
                autoComplete={autoComplete}
                disabled={disabled}
                label={label}
                // @ts-ignore
                onChange={e => {
                  setSync(prev => ({
                    ...prev,
                    [uuid]: e.target.value,
                  }));
                }}
                primary
                required={required}
                setContentOnMount
                type={type}
                value={sync?.[uuid] || ''}
              />
            </Spacing>
          ))}
        </form>

        <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
          <FlexContainer alignItems="center">
            <Spacing mr={1}>
              <Checkbox
                checked={!!showSyncSettings}
                onClick={() => setShowSyncSettings(prev => {
                  // @ts-ignore
                  const newVal = !prev;
                  if (!newVal) {
                    setSync(prevSync => ({
                      ...prevSync,
                      branch: null,
                      sync_on_pipeline_run: false,
                      sync_on_start: false,
                    }));
                  }
                  return newVal;
                })}
              />
            </Spacing>
            <Text bold>
              Use <Link
                bold
                href="https://docs.mage.ai/production/data-sync/git-sync"
                openNewWindow>
                One-way git sync
              </Link> (Click link for more info)
            </Text>
          </FlexContainer>
        </Spacing>

        {showSyncSettings ? (
          <>
            <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
              <Text bold>
                Sync with a specified branch. These settings
                will be saved at the project level.
              </Text>
            </Spacing>
            <form>
              {SYNC_FIELDS.map(({
                autoComplete,
                disabled,
                label,
                required,
                type,
                uuid,
              }: SyncFieldType) => (
                <Spacing key={uuid} mt={2}>
                  <TextInput
                    autoComplete={autoComplete}
                    disabled={disabled}
                    label={label}
                    // @ts-ignore
                    onChange={e => {
                      setSync(prev => ({
                        ...prev,
                        [uuid]: e.target.value,
                      }));
                    }}
                    primary
                    required={required}
                    setContentOnMount
                    type={type}
                    value={sync?.[uuid] || ''}
                  />
                </Spacing>
              ))}
            </form>
            <FlexContainer alignItems="center">
              <Spacing mt={2}>
                <Checkbox
                  checked={sync?.sync_submodules}
                  label="Include submodules"
                  onClick={() => {
                    setSync(prev => ({
                      ...prev,
                      sync_submodules: !sync?.sync_submodules,
                    }));
                  }}
                />
              </Spacing>
            </FlexContainer>
            <Spacing mt={2}>
              <Headline level={5}>
                Additional sync settings
              </Headline>
            </Spacing>
            <FlexContainer alignItems="center">
              <Spacing mt={2}>
                <Checkbox
                  checked={sync?.sync_on_pipeline_run}
                  label="Sync before each trigger run"
                  onClick={() => {
                    setSync(prev => ({
                      ...prev,
                      sync_on_pipeline_run: !sync?.sync_on_pipeline_run,
                    }));
                  }}
                />
              </Spacing>
            </FlexContainer>
            <FlexContainer alignItems="center">
              <Spacing mt={2}>
                <Checkbox
                  checked={sync?.sync_on_start}
                  label="Sync on server start up"
                  onClick={() => {
                    setSync(prev => ({
                      ...prev,
                      sync_on_start: !sync?.sync_on_start,
                    }));
                  }}
                />
              </Spacing>
            </FlexContainer>
            <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
              <Text bold>
                Configure the Git authentication credentials that will be used to sync with
                the specified Git repository.
              </Text>
            </Spacing>
            {userGitFields}
          </>
        ) : (
          <>
            <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
              <Text bold>
                These fields are required to help Mage configure your Git settings. These settings
                will be specific to your user.
              </Text>
            </Spacing>
            {userGitFields}
          </>
        )}

        <Spacing mt={2}>
          <Button
            loading={isLoadingCreateSync}
            // @ts-ignore
            onClick={() => createSync({
              sync: {
                ...sync,
                user_git_settings: userGitSettings,
              },
            })}
            primary
          >
            Save repository settings
          </Button>
        </Spacing>

        {errors && (
          <ClickOutside
            disableClickOutside
            isOpen
            onClickOutside={() => setErrors?.(null)}
          >
            <ErrorPopup
              {...errors}
              onClose={() => setErrors?.(null)}
            />
          </ClickOutside>
        )}
        
        {showSyncOperations && (
          <Spacing mt={UNITS_BETWEEN_SECTIONS}>
            <Headline>
              Synchronize code from remote repository
            </Headline>

            <Spacing mt={1}>
              <Text>
                Running the sync from this page will
                run a one time sync with the remote repository.
                <br />
                This may <Text bold danger inline>overwrite</Text> your
                existing data, so make sure you’ve committed or backed up your current changes.
              </Text>
              <Spacing mt={2} />
              <Text>
                Reset will tell Mage to try to clone your repository from remote. This will
                also <Text bold danger inline>overwrite</Text> all your local changes and 
                reset any settings you may have configured for your local Git repo. This may be
                helpful if you are having issues syncing your repository.
              </Text>
            </Spacing>

            <Spacing mt={2}>
              <FlexContainer>
                <Button
                  loading={isLoadingRunSync}
                  // @ts-ignore
                  onClick={() => runSync({
                    sync: {
                      action_type: 'sync_data',
                    },
                  })}
                  warning
                >
                  Synchronize code
                </Button>
                <Spacing ml={2}/>
                <Button
                  danger
                  loading={isLoadingRunSync}
                  // @ts-ignore
                  onClick={() => runSync({
                    sync: {
                      action_type: 'reset',
                    },
                  })}
                >
                  Reset repository
                </Button>
              </FlexContainer>
            </Spacing>
          </Spacing>
        )}
      </Spacing>
    </SettingsDashboard>
  );
}

SyncData.getInitialProps = async () => ({});

export default PrivateRoute(SyncData);
