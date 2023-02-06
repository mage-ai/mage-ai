import { useState } from 'react';

import Checkbox from '@oracle/elements/Checkbox';
import FlexContainer from '@oracle/components/FlexContainer';
import PrivateRoute from '@components/shared/PrivateRoute';
import SettingsDashboard from '@components/settings/Dashboard';
import Spacing from '@oracle/elements/Spacing';
import { LOCAL_STORAGE_KEY_AUTOMATICALLY_NAME_BLOCKS } from '@storage/constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import {
  SECTION_ITEM_UUID_PREFERENCES,
  SECTION_UUID_WORKSPACE,
} from '@components/settings/Dashboard/constants';
import { get, set } from '@storage/localStorage';

function Preferences() {
  const [automaticallyNameBlocks, setAutomaticallyNameBlocks] = useState<boolean>(
    !!get(LOCAL_STORAGE_KEY_AUTOMATICALLY_NAME_BLOCKS),
  );

  return (
    <SettingsDashboard
      uuidItemSelected={SECTION_ITEM_UUID_PREFERENCES}
      uuidWorkspaceSelected={SECTION_UUID_WORKSPACE}
    >
      <Spacing p={PADDING_UNITS}>
        <FlexContainer alignItems="center">
          <Checkbox
            checked={automaticallyNameBlocks}
            label="Automatically use randomly generated name for blocks created in the future"
            onClick={() => {
              setAutomaticallyNameBlocks(!automaticallyNameBlocks);
              set(LOCAL_STORAGE_KEY_AUTOMATICALLY_NAME_BLOCKS, !automaticallyNameBlocks);
            }}
          />
        </FlexContainer>
      </Spacing>
    </SettingsDashboard>
  );
}

Preferences.getInitialProps = async () => ({});

export default PrivateRoute(Preferences);
