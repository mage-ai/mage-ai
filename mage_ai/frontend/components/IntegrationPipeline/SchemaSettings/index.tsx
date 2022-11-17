import { useEffect, useMemo, useState } from 'react';

import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import SchemaTable, { SchemaTableProps } from './SchemaTable';
import Spacing from '@oracle/elements/Spacing';
import { SectionStyle } from '../index.style';
import {
  CatalogType,
} from '@interfaces/IntegrationSourceType';
import { find, indexBy, sortByKey } from '@utils/array';

type SchemaSettingsProps = {
  catalog: CatalogType;
  setSelectedStream: (stream: string) => void;
} & SchemaTableProps;

function SchemaSettings({
  catalog,
  setSelectedStream,
  ...props
}: SchemaSettingsProps) {
  const [selectedTab, setSelectedTab] = useState<TabType>(null);

  const streams = useMemo(() => catalog?.streams || [], [catalog]);
  const tabs = useMemo(() => sortByKey(streams, 'stream').map(({ stream }) => ({ uuid: stream })), [
    streams,
  ]);
  const streamsByStream = useMemo(() => indexBy(streams, ({ stream }) => stream), [streams]);
  const selectedStream = useMemo(() => streamsByStream[selectedTab?.uuid], [
    selectedTab,
    streamsByStream,
  ]);

  useEffect(() => {
    if (tabs.length > 0) {
      if (!selectedTab || !find(tabs, ({ uuid }) => selectedTab.uuid === uuid)) {
        setSelectedTab(tabs[0]);
      }
    }
  }, [
    selectedTab,
    setSelectedTab,
    tabs,
  ]);

  return (
    <>
      <ButtonTabs
        onClickTab={(tab) => {
          setSelectedTab(tab);
          setSelectedStream(tab.uuid);
        }}
        selectedTabUUID={selectedTab?.uuid}
        tabs={tabs}
      />

      {selectedStream && (
        <Spacing mt={1}>
          <SectionStyle>
            <SchemaTable
              {...props}
              stream={selectedStream}
            />
          </SectionStyle>
        </Spacing>
      )}
    </>
  );
}

export default SchemaSettings;
