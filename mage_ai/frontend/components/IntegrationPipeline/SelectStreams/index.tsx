import { useMemo, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import Panel from '@oracle/components/Panel/v2';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import {
  CatalogType,
  StreamType,
} from '@interfaces/IntegrationSourceType';
import { Filter, Search } from '@oracle/icons';
import {
  HeaderRowStyle,
  TableContainerStyle,
} from '../index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { getSelectedStreamIds } from '../utils';
import { indexBy } from '@utils/array';

type SelectStreamsProps = {
  catalog: CatalogType;
  isLoading: boolean;
  onActionCallback: (selectedStreams: {
    [key: string]: StreamType;
  }) => void;
  streams: StreamType[];
};

type StreamTypeWithMissingProp = StreamType & { isMissingStream?: boolean };

enum FilterSelectionEnum {
  ALL = 'All',
  SELECTED = 'Selected',
  NOT_SELECTED = 'Not selected',
}

const TABLE_WIDTH = UNIT * 45;
const WARNING_TEXT_WIDTH = TABLE_WIDTH - UNIT * 4;

function SelectStreams({
  catalog,
  isLoading,
  onActionCallback,
  streams,
}: SelectStreamsProps) {
  const selectedStreamsInit: { [key: string]: StreamType } = indexBy(catalog?.streams || [], ({ stream }) => stream);
  const missingSelectedStreams = useMemo(() => {
    const fetchedStreamsSet = new Set(streams.map(({ stream }) => stream));
    return Object.values(selectedStreamsInit)
      .filter(({ stream }) => !fetchedStreamsSet.has(stream))
      .map(stream => ({ ...stream, isMissingStream: true }));
  }, [selectedStreamsInit, streams]);

  const selectedStreamsWithoutDeleted = { ...selectedStreamsInit };
  missingSelectedStreams.forEach(({ stream }) => {
    delete selectedStreamsWithoutDeleted[stream];
  });

  const [selectedStreams, setSelectedStreams] = useState(selectedStreamsWithoutDeleted);
  const [filterText, setFilterText] = useState<string>(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState<boolean>(false);
  const [dropdownFilter, setDropdownFilter] = useState<FilterSelectionEnum>(FilterSelectionEnum.ALL);
  const filterButtonRef = useRef(null);

  const selectedStreamIds: string[] = getSelectedStreamIds(selectedStreams);
  const filteredSearchStreams = useMemo(() => {
    let filteredStreams: StreamTypeWithMissingProp[] = streams;
    filteredStreams = filteredStreams.filter(({ tap_stream_id }) => {
      if (dropdownFilter === FilterSelectionEnum.SELECTED) {
        return selectedStreamIds.includes(tap_stream_id);
      } else if (dropdownFilter === FilterSelectionEnum.NOT_SELECTED) {
        return !selectedStreamIds.includes(tap_stream_id);
      }

      return true;
    });

    return filterText
      ? filteredStreams.filter(({ tap_stream_id: stream }) => (
        stream?.toLowerCase().includes(filterText?.toLowerCase())
      )) : filteredStreams;
  }, [dropdownFilter, filterText, selectedStreamIds, streams]);

  const allStreamsSelected = useMemo(() =>
    streams.every(({ stream }) => !!selectedStreams[stream]),
    [selectedStreams, streams],
  );

  return (
    <Panel>
      <HeaderRowStyle rounded>
        <Text bold large>
          Select streams to sync
        </Text>
      </HeaderRowStyle>

      <HeaderRowStyle
        padding={UNIT * 1.25}
      >
        <FlexContainer alignItems="center" justifyContent="space-between">
          <TextInput
            beforeIcon={<Search />}
            compact
            noBackground
            noBorder
            onChange={e => setFilterText(e.target.value)}
            placeholder="Search"
            value={filterText}
          />
          <Spacing pr={1}>
            <FlyoutMenuWrapper
              items={[
                {
                  label: () => FilterSelectionEnum.ALL,
                  onClick: () => setDropdownFilter(FilterSelectionEnum.ALL),
                  uuid: 'all_streams',
                },
                {
                  label: () => FilterSelectionEnum.SELECTED,
                  onClick: () => setDropdownFilter(FilterSelectionEnum.SELECTED),
                  uuid: 'selected',
                },
                {
                  label: () => FilterSelectionEnum.NOT_SELECTED,
                  onClick: () => setDropdownFilter(FilterSelectionEnum.NOT_SELECTED),
                  uuid: 'unselected',
                },
              ]}
              onClickCallback={() => setFilterMenuOpen(false)}
              onClickOutside={() => setFilterMenuOpen(false)}
              open={filterMenuOpen}
              parentRef={filterButtonRef}
              uuid="SelectStreams/filter"
            >
              <Button
                beforeIcon={<Filter />}
                noBackground
                onClick={() => setFilterMenuOpen(prevState => !prevState)}
                ref={filterButtonRef}
              >
                <Text>
                  {dropdownFilter}
                </Text>
              </Button>
            </FlyoutMenuWrapper>
          </Spacing>
        </FlexContainer>
      </HeaderRowStyle>

      <TableContainerStyle
        height="55vh"
        hideHorizontalScrollbar
        width={`${TABLE_WIDTH}px`}
      >
        <Table
          borderCollapseSeparate
          columnFlex={[1, 6]}
          columns={[
            {
              label: () => (
                <Checkbox
                  checked={allStreamsSelected}
                  onClick={() => {
                    const allStreamsIndexed = indexBy(streams || [], ({ stream }) => stream);
                    if (allStreamsSelected) {
                      setSelectedStreams({});
                    } else {
                      setSelectedStreams(allStreamsIndexed);
                    }
                  }}
                />
              ),
              uuid: 'Selected',
            },
            {
              uuid: 'Stream name',
            },
          ]}
          rows={filteredSearchStreams.concat(missingSelectedStreams).map((stream) => {
            const {
              isMissingStream,
              stream: streamID,
            } = stream;
            const selected: boolean = !!selectedStreams[streamID];

            return [
              <Checkbox
                checked={selected}
                disabled={!selected && isMissingStream}
                key={`selected-${streamID}`}
                onClick={() => {
                  setSelectedStreams(prev => ({
                    ...prev,
                    [streamID]: selected ? null : stream,
                  }));
                }}
              />,
              <Text
                danger={isMissingStream}
                key={`stream-${streamID}`}
                title={streamID}
                width={TABLE_WIDTH - 48 - 32}
              >
                {streamID}{isMissingStream ? ' (no longer available)' : ''}
              </Text>,
            ];
          })}
          stickyHeader
        />
      </TableContainerStyle>

      <Divider medium />
      <Spacing p={2}>
        {selectedStreamIds?.length > 50 &&
          <Spacing pb={2}>
            <Text
              danger
              maxWidth={WARNING_TEXT_WIDTH}
              rightAligned
              whiteSpaceNormal
            >
              WARNING: Selecting too many streams (e.g. &gt;50)
              <br />
              may cause app performance issues.
            </Text>
          </Spacing>
        }
        {streams?.length === 0 &&
          <Spacing pb={2}>
            <Text
              bold
              maxWidth={WARNING_TEXT_WIDTH}
              warning
              whiteSpaceNormal
            >
              If you can successfully connect to the data source but no streams are
              displayed, check if the user has proper database/schema permissions.
            </Text>
          </Spacing>
        }
        <FlexContainer justifyContent="flex-end">
          <Button
            loading={isLoading}
            onClick={() => onActionCallback(selectedStreams)}
            primary
          >
            {`Confirm ${getSelectedStreamIds(selectedStreams).length} streams`}
          </Button>
        </FlexContainer>
      </Spacing>
    </Panel>
  );
}

export default SelectStreams;
