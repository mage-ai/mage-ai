import React, { useEffect, useMemo, useState } from 'react';
import NextLink from 'next/link';
import { toast } from 'react-toastify';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Checkbox from '@oracle/elements/Checkbox';
import ClickOutside from '@oracle/components/ClickOutside';
import Divider from '@oracle/elements/Divider';
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
import VariableRow from '@components/Sidekick/GlobalVariables/VariableRow';
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
import { VariableType } from '@interfaces/PipelineVariableType';
import { goToWithQuery } from '@utils/routing';
import { onSuccess } from '@api/utils/response';
import { queryFromUrl } from '@utils/url';

const TAB_GIT_SYNC = {
  label: () => 'One-way Git Sync',
  uuid: 'git_sync',
};

const TAB_GIT_INTEGRATION = {
  label: () => 'Git Actions',
  uuid: 'git_integration',
};

const TABS = [
  TAB_GIT_SYNC,
  TAB_GIT_INTEGRATION,
];

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
  const { data: dataSyncs, mutate: fetchSyncs } = api.syncs.list();
  const [sync, setSync] = useState<SyncType>(null);
  const [userGitSettings, setUserGitSettings] = useState<UserGitSettingsType>(null);
  const [errors, setErrors] = useState<ErrorsType>(null);

  useEffect(() => {
    if (dataSyncs) {
      const initialSync = dataSyncs?.syncs?.[0];
      setUserGitSettings(initialSync?.user_git_settings);
      setSync(initialSync);
    }
  }, [dataSyncs]);

  const showSyncOperations = useMemo(() => {
    if (dataSyncs) {
      const config = dataSyncs?.syncs?.[0];
      return !!config?.branch;
    }
    return false;
  }, [dataSyncs]);

  const {
    data: dataGitBranch,
    mutate: fetchBranch,
  } = api.git_branches.detail('test',
    {
      _format: 'with_basic_details',
    },
    {
      revalidateOnFocus: false,
    },
  );

  const {
    is_git_integration_enabled: gitIntegrationEnabled,
  } = useMemo(() => dataGitBranch?.['git_branch'] || {}, [dataGitBranch]);

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

  const [deleteSecret] = useMutation(
    (name: string) => api.secrets.useDelete(name)(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchSyncs();
          },
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            // @ts-ignore
            setErrorMessages((errorMessages) => errorMessages.concat(message));
          },
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

  const tabsToUse = useMemo(() => TABS, []);

  const [selectedTab, setSelectedTab] = useState<TabType>();

  useEffect(() => {
    if (!selectedTab) {
      setSelectedTab(gitIntegrationEnabled ? TAB_GIT_INTEGRATION : TAB_GIT_SYNC);
    }
  }, [gitIntegrationEnabled, selectedTab]);

  const userGitFields = useMemo(() => {
    let updateSettings: React.Dispatch<
      React.SetStateAction<SyncType | UserGitSettingsType>
    > = setSync;
    let settings: SyncType | UserGitSettingsType = sync;

    if (selectedTab?.uuid === TAB_GIT_INTEGRATION.uuid && requireUserAuthentication) {
      updateSettings = setUserGitSettings;
      settings = userGitSettings;
    }

    const secretValues = 
      Object.entries(settings || {})
        .filter(([field, value]) => (field.endsWith('_secret_name') && !!value));

    return (
      <>
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
                    </Link> in terminal to get base64 encoded public key and paste the result here. The key will be stored as a Mage secret. You will see the secret below if you have already added it.
                  </Text>
                </Spacing>
              );
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
                    </Link> instead. The key will be stored as a Mage secret. You will see the secret below if you have already added it.
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
        <Spacing mb={1} mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
          <Headline level={5}>
            Git secrets
          </Headline>
        </Spacing>
        {secretValues && secretValues.length > 0 ? (
          secretValues.map(([_, value]) => (
            <VariableRow
              deleteVariable={() => deleteSecret(value)}
              hideEdit
              key={value}
              obfuscate
              variable={{
                uuid: value,
                value: 'placeholder',
              } as VariableType}
            />
          ))
        ) : (
          <Text>You have no Git secrets saved for {selectedTab?.label?.()}</Text>
        )}
      </>
    );
  }, [
    additionalGitFields,
    deleteSecret,
    requireUserAuthentication,
    selectedTab,
    setUserGitSettings,
    setSync,
    sync,
    userGitSettings,
  ]);

  const q: { tab?: string } = queryFromUrl();
  useEffect(() => {
    if (q?.tab) {
      setSelectedTab(tabsToUse.find(({ uuid }) => uuid === q?.tab));
    }
  }, [q, tabsToUse]);

  const gitSyncFields = useMemo(() => (
    <>
      <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
        <Text inline>
          To learn more about One-way git sync, click{' '}
        </Text>
        <Link
          bold
          href="https://docs.mage.ai/production/data-sync/git-sync"
          openNewWindow>
          here
        </Link>
      </Spacing>
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
  ), [sync, userGitFields]);

  const gitIntegrationFields = useMemo(() => (
    <>
      <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
        {!gitIntegrationEnabled && (
          <Spacing mb={1}>
            <Text bold warning>
              When One-way git sync is enabled, you will be unable to access the Git Actions modal.
              If you want to bypass this safeguard, set the GIT_ENABLE_GIT_INTEGRATION environment
              variable.
            </Text>
          </Spacing>
        )}
        <Text bold>
          We recommend using the <NextLink
            as="/version-control"
            href="/version-control"
          >
            <Link bold inline>version control app</Link>
          </NextLink> unless you have a specific need to use the Git Actions modal.
        </Text>
      </Spacing>
      <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
        <Text>
          These fields are required to help Mage configure your Git settings. These settings
          will be specific to your user.
        </Text>
      </Spacing>
      {userGitFields}
    </>
  ), [gitIntegrationEnabled, userGitFields]);

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
          <Divider light />
        </Spacing>
        <ButtonTabs
          onClickTab={({ uuid }) => {
            goToWithQuery({ tab: uuid });
          }}
          selectedTabUUID={selectedTab?.uuid}
          tabs={tabsToUse}
          underlineStyle
        />
        <Divider light />

        <Spacing ml={2}>
          {TAB_GIT_SYNC.uuid === selectedTab?.uuid && gitSyncFields}

          {TAB_GIT_INTEGRATION.uuid === selectedTab?.uuid && gitIntegrationFields}
        </Spacing>

        <Spacing mt={UNITS_BETWEEN_SECTIONS}>
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
