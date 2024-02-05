import  { forwardRef, useMemo, useState } from 'react';

import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Tooltip from '@oracle/components/Tooltip';
import { ApplicationManagerApplication } from '@storage/ApplicationManager/constants';
import { ApplicationExpansionUUIDEnum } from '@interfaces/CommandCenterType';
import {
  CloseWindow,
  CloseWindowFilled,
  CollapseWindow,
  CollapseWindowFilled,
  ExpandWindow,
  ExpandWindowFilled,
} from '@oracle/icons';
import { ButtonStyle, HeaderStyle, getApplicationColors } from '../index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { pauseEvent } from '@utils/events';

const TOOLTIP_PROPS = {
  appearBefore: true,
  block: true,
  lightBackground: true,
  size: null,
  visibleDelay: 300,
  widthFitContent: true,
};

const BUTTON_STYLE_PROPS = {
  onMouseEnter: (e) => {
    if (e?.currentTarget?.querySelector('.empty')) {
      e.currentTarget.querySelector('.empty').style.display = 'block';
    }
    if (e?.currentTarget?.querySelector('.filled')) {
      e.currentTarget.querySelector('.filled').style.display = 'none';
    }
  },
  onMouseLeave: (e) => {
    if (e?.currentTarget?.querySelector('.empty')) {
      e.currentTarget.querySelector('.empty').style.display = 'none';
    }
    if (e?.currentTarget?.querySelector('.filled')) {
      e.currentTarget.querySelector('.filled').style.display = 'block';
    }
  },
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
    <HeaderStyle id={`${selectedTab?.uuid}-header`} ref={ref}>
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
            underlineColor={getApplicationColors(selectedTab?.uuid as ApplicationExpansionUUIDEnum)?.accent}
            underlineStyle
            uppercase={false}
          />
        )}

        <Flex>
          <div style={{ paddingLeft: PADDING_UNITS * UNIT }} />

          <Tooltip {...TOOLTIP_PROPS} label="Maximize application">
            <ButtonStyle {...BUTTON_STYLE_PROPS}>
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
                <>
                  <div className="empty" style={{ display: 'none' }}>
                    <ExpandWindow success size={2 * UNIT} />
                  </div>
                  <div className="filled">
                    <ExpandWindowFilled success size={2 * UNIT} />
                  </div>
                </>
              </Button>
            </ButtonStyle>
          </Tooltip>

          <div style={{ paddingLeft: 1 * UNIT }} />

          <Tooltip {...TOOLTIP_PROPS} label="Minimize application">
            <ButtonStyle {...BUTTON_STYLE_PROPS}>
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
                <>
                  <div className="empty" style={{ display: 'none' }}>
                    <CollapseWindow warning size={2 * UNIT} />
                  </div>
                  <div className="filled">
                    <CollapseWindowFilled warning size={2 * UNIT} />
                  </div>
                </>
              </Button>
            </ButtonStyle>
          </Tooltip>

          <div style={{ paddingLeft: 1 * UNIT }} />

          <Tooltip {...TOOLTIP_PROPS} label="Close application">
            <ButtonStyle {...BUTTON_STYLE_PROPS}>
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
                <>
                  <div className="empty" style={{ display: 'none' }}>
                    <CloseWindow danger size={2 * UNIT} />
                  </div>
                  <div className="filled">
                    <CloseWindowFilled danger size={2 * UNIT} />
                  </div>
                </>
              </Button>
            </ButtonStyle>
          </Tooltip>

          <div style={{ paddingLeft: PADDING_UNITS * UNIT }} />
        </Flex>
      </FlexContainer>
    </HeaderStyle>
  );
}

export default forwardRef(Header);
