import { useEffect, useRef, useState } from 'react';

import Checkbox from '@oracle/elements/Checkbox';
import Dashboard from '@components/Dashboard';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { LOCAL_STORAGE_KEY_AUTOMATICALLY_NAME_BLOCKS } from '@storage/constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { get, set } from '@storage/localStorage';

function Settings() {
  const [automaticallyNameBlocks, setAutomaticallyNameBlocks] = useState<boolean>(
    !!get(LOCAL_STORAGE_KEY_AUTOMATICALLY_NAME_BLOCKS),
  );

  return (
    <Dashboard
      title="User settings"
      uuid="user/settings"
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
    </Dashboard>
  );
}

export default Settings;
