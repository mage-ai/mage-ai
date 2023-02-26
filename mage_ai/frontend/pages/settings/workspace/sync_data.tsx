import React, { useState } from 'react';
import { toast } from 'react-toastify';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import PrivateRoute from '@components/shared/PrivateRoute';
import SettingsDashboard from '@components/settings/Dashboard';
import Spacing from '@oracle/elements/Spacing';
import SyncType, {
  SyncTypeEnum,
  SYNC_FIELDS,
} from '@interfaces/SyncType';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import { LOCAL_STORAGE_KEY_SYNC_CONFIG } from '@storage/constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import {
  SECTION_ITEM_UUID_SYNC_DATA,
  SECTION_UUID_WORKSPACE,
} from '@components/settings/Dashboard/constants';
import { get, set } from '@storage/localStorage';
import { onSuccess } from '@api/utils/response';
import { useMutation } from 'react-query';

export interface SyncFieldType {
  autoComplete?: string;
  disabled?: boolean;
  label: string;
  required?: boolean;
  type?: string;
  uuid: string;
}

function SyncData() {
  const [syncFields, setSyncFields] = useState<SyncType>(
    get(LOCAL_STORAGE_KEY_SYNC_CONFIG)
  );

  const [runSync, { isLoading: isLoadingRunSync }] = useMutation(
    api.syncs.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (res) => {
            if (res['success']) {
              console.log('Data synced!')
            }
          },
          onErrorCallback: ({
            error: {
              message,
              type,
            },
          }) => {
            toast.error(
              message,
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: type,
              },
            );
          },
        }
      )
    }
  );

  return (
    <SettingsDashboard
      uuidItemSelected={SECTION_ITEM_UUID_SYNC_DATA}
      uuidWorkspaceSelected={SECTION_UUID_WORKSPACE}
    >
      <Spacing p={PADDING_UNITS}>
        <Headline level={5}>
          Sync data with Git
        </Headline>
        <Text>
          You can sync your project with a remote Git repository. Running the sync from this page will
          run a one time sync with the remote repository. This will overwrite your
          existing data, so make sure you've committed or backed up your current changes.
          <Text inline> You will also need to <Link href="https://docs.mage.ai/developing-in-the-cloud/setting-up-git">
            set up your SSH key
          </Link> if you have not done that already. </Text>
        </Text>
        <FlexContainer alignItems="center">
          <form>
            {SYNC_FIELDS[SyncTypeEnum.GIT].map(({
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
                    setSyncFields(prev => ({
                      ...prev,
                      [uuid]: e.target.value,
                    }));
                  }}
                  primary
                  required={required}
                  setContentOnMount
                  type={type}
                  value={syncFields?.[uuid] || ''}
                />
              </Spacing>
            ))}
          </form>
        </FlexContainer>
        <Spacing mt={2}>
          <Button
            loading={isLoadingRunSync}
            onClick={() => {
              const sync = {
                ...syncFields,
                type: 'git',
              };
              // @ts-ignore
              runSync({ sync });
              set(LOCAL_STORAGE_KEY_SYNC_CONFIG, sync);
            }}
            primary
          >
            Run Sync
          </Button>
        </Spacing>
      </Spacing>
    </SettingsDashboard>
  );
}

SyncData.getInitialProps = async () => ({});

export default PrivateRoute(SyncData);
