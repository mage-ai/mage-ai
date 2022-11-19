import { useEffect, useMemo, useState } from 'react';

import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Headline from '@oracle/elements/Headline';
import SchemaTable, { SchemaTableProps } from './SchemaTable';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { CatalogType } from '@interfaces/IntegrationSourceType';
import { SectionStyle } from '../index.style';
import { TableContainerStyle } from '../index.style';
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

  const summaryTableMemo = useMemo(() => {
    const columns = [
      { uuid: 'Stream' },
      { uuid: 'Replication Method' },
      { uuid: 'Destination Table' },
      { uuid: 'Bookmark Props' },
      { uuid: 'Key Props' },
      { uuid: 'Unique Constraints' },
      { uuid: 'Unique Conflict Method' },
      { uuid: 'Partition Keys' },
    ];

    return (
      <TableContainerStyle>
        <Table
          alignTop
          columnBorders
          columnFlex={columns.map(_ => 1)}
          columns={columns}
          rows={streams.map(({
            replication_method: replicationMethod,
            destination_table: destinationTable,
            bookmark_properties: bookmarkProps,
            key_properties: keyProps,
            unique_constraints: uniqueConstraints,
            unique_conflict_method: uniqueConflictMethod,
            partition_keys: partitionKeys,
            tap_stream_id: streamId,
          }) => {
            const values = [
              streamId,
              replicationMethod,
              destinationTable,
              bookmarkProps,
              keyProps,
              uniqueConstraints,
              uniqueConflictMethod,
              partitionKeys,
            ];

            return values.map((value: string | string[], idx: number) => (
              <Text
                bold={idx === 0}
                key={idx}
              >
                {Array.isArray(value)
                  ? value.join(', ')
                  : value
                }
              </Text>
            ));
          })}
          stickyFirstColumn
          stickyHeader
          wrapColumns
        />
      </TableContainerStyle>
    );
  }, [streams]);

  return (
    <>
      <ButtonTabs
        allowScroll
        noPadding
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

      {streams.length > 1 && (
        <Spacing mt={1}>
          <SectionStyle>
            <Headline level={4}>
              Streams Summary
            </Headline>
            <Spacing mt={1} />
            {summaryTableMemo}
          </SectionStyle>
        </Spacing>
      )}
    </>
  );
}

export default SchemaSettings;
