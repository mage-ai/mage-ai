import  { forwardRef, useMemo, useState } from 'react';

import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Circle from '@oracle/elements/Circle';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Tooltip from '@oracle/components/Tooltip';
import { ApplicationManagerApplication } from '@storage/ApplicationManager/constants';
import { ApplicationExpansionUUIDEnum } from '@interfaces/CommandCenterType';
import { ArrowsPointingInFromAllCorners, CloseV2, Minimize } from '@oracle/icons';
import { HeaderStyle} from '../index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { pauseEvent } from '@utils/events';

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
  maximizeApplication,
  minimizeApplication,
}: {
  applications: ApplicationManagerApplication[];
  closeApplication: (uuidApp: ApplicationExpansionUUIDEnum) => void;
  maximizeApplication: (uuidApp: ApplicationExpansionUUIDEnum) => void;
  minimizeApplication: (uuidApp: ApplicationExpansionUUIDEnum) => void;
  setSelectedTab?: (prevState: (value: TabType) => TabType) => void;
}, ref) {
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
    <HeaderStyle ref={ref}>
      <FlexContainer alignItems="center" justifyContent="space-between">
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

        <Flex>
          <div style={{ paddingLeft: PADDING_UNITS * UNIT }} />

          <Tooltip {...TOOLTIP_PROPS} label="Maximize application">
            <Button
              iconOnly
              noBackground
              noBorder
              noPadding
              onClick={(e) => {
                pauseEvent(e);
                application && maximizeApplication(application?.uuid);
              }}
            >
              <Circle borderOnly success size={1.75 * UNIT}>
                <ArrowsPointingInFromAllCorners success size={1 * UNIT} />
              </Circle>
            </Button>
          </Tooltip>

          <div style={{ paddingLeft: 1.25 * UNIT }} />

          <Tooltip {...TOOLTIP_PROPS} label="Minimize application">
            <Button
              iconOnly
              noBackground
              noBorder
              noPadding
              onClick={(e) => {
                pauseEvent(e);
                application && minimizeApplication(application?.uuid);
              }}
            >
              <Circle borderOnly warning size={1.75 * UNIT}>
                <Minimize warning size={1 * UNIT} />
              </Circle>
            </Button>
          </Tooltip>

          <div style={{ paddingLeft: 1.25 * UNIT }} />

          <Tooltip {...TOOLTIP_PROPS} label="Close application">
            <Button
              iconOnly
              noBackground
              noBorder
              noPadding
              onClick={(e) => {
                pauseEvent(e);
                application && closeApplication(application?.uuid);
              }}
            >
              <Circle danger borderOnly size={1.75 * UNIT}>
                <CloseV2 danger size={1 * UNIT} />
              </Circle>
            </Button>
          </Tooltip>

          <div style={{ paddingLeft: PADDING_UNITS * UNIT }} />
        </Flex>
      </FlexContainer>
    </HeaderStyle>
  );
}

export default forwardRef(Header);
