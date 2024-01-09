import  { useMemo, useState } from 'react';

import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Circle from '@oracle/elements/Circle';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Tooltip from '@oracle/components/Tooltip';
import { ApplicationExpansionUUIDEnum, ApplicationManagerApplication } from '@storage/ApplicationManager/constants';
import { HeaderStyle} from '../index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

const TOOLTIP_PROPS = {
  block: true,
  lightBackground: true,
  size: null,
  visibleDelay: 300,
  widthFitContent: true,
};

function Header({
  applications,
  closeApplication,
  resetLayout,
}: {
  applications: ApplicationManagerApplication[];
  closeApplication: (uuidApp: ApplicationExpansionUUIDEnum) => void;
  resetLayout: (uuidApp: ApplicationExpansionUUIDEnum) => void;
  setSelectedTab?: (tab: TabType) => void;
}) {
  const tabs = useMemo(() => applications?.map(({
    applicationConfiguration,
    uuid,
  }) => ({
    label: () => applicationConfiguration?.item?.title,
    uuid,
  })), [applications]);

  const [selectedTab, setSelectedTab] = useState<TabType>(tabs?.length >= 1 ? tabs?.[0] : null);
  const application = useMemo(() => applications?.find((app) => app.uuid === selectedTab?.uuid), [
    applications,
    selectedTab,
  ]);

  return (
    <HeaderStyle>
      <FlexContainer alignItems="center">
        <Flex>
          <div style={{ paddingLeft: PADDING_UNITS * UNIT }} />

          <Tooltip {...TOOLTIP_PROPS} label="Close application">
            <Button
              iconOnly
              noBackground
              noBorder
              noPadding
              onClick={() => application && closeApplication(application?.uuid)}
            >
              <Circle danger size={1.5 * UNIT} />
            </Button>
          </Tooltip>

          <div style={{ paddingLeft: 1.25 * UNIT }} />

          <Tooltip {...TOOLTIP_PROPS} label="Minimize application">
            <Button
              iconOnly
              noBackground
              noBorder
              noPadding
              onClick={() => console.log('minimize')}
            >
              <Circle warning size={1.5 * UNIT} />
            </Button>
          </Tooltip>

          <div style={{ paddingLeft: 1.25 * UNIT }} />

          <Tooltip {...TOOLTIP_PROPS} label="Reset size and position of application">
            <Button
              iconOnly
              noBackground
              noBorder
              noPadding
              onClick={() => application && resetLayout(application?.uuid)}
            >
              <Circle success size={1.5 * UNIT} />
            </Button>
          </Tooltip>

          <div style={{ paddingLeft: PADDING_UNITS * UNIT }} />
        </Flex>

        {applications?.length >= 1 && (
          <ButtonTabs
            allowScroll
            large
            onClickTab={(tab: TabType) => {
              setSelectedTab?.(tab);
            }}
            selectedTabUUID={selectedTab?.uuid}
            tabs={tabs}
            underlineColor="#4877FF"
            underlineStyle
            uppercase={false}
          />
        )}
      </FlexContainer>
    </HeaderStyle>
  );
}

export default Header;
