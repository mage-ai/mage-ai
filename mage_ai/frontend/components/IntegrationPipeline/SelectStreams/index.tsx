import { useState } from 'react';

import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Panel from '@oracle/components/Panel/v2';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import {
  CatalogType,
  StreamType,
} from '@interfaces/IntegrationSourceType';
import {
  HeaderRowStyle,
  TableContainerStyle,
} from '../index.style';
import { Search } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { indexBy } from '@utils/array';

type SelectStreamsProps = {
  catalog: CatalogType;
  isLoading: boolean;
  onActionCallback: (selectedStreams: {
    [key: string]: boolean;
  }) => void;
  streams: StreamType[];
};

function SelectStreams({
  catalog,
  isLoading,
  onActionCallback,
  streams,
}: SelectStreamsProps) {
  const selectedStreamsInit = indexBy(catalog?.streams || [], ({ stream }) => stream);
  const [selectedStreams, setSelectedStreams] = useState(selectedStreamsInit);

  return (
    <Panel>
      <HeaderRowStyle rounded>
        <Text bold large>
          Select streams to sync
        </Text>
      </HeaderRowStyle>

      {/* <HeaderRowStyle
        horizontalPadding={UNIT * 1.25}
      >
        <FlexContainer alignItems="center" justifyContent="space-between">
          <TextInput
            beforeIcon={<Search />}
            compact
            noBackground
            noBorder
            onChange={() => {}}
            value={null}
          />
          <Button
          
          >

          </Button>
        </FlexContainer>
      </HeaderRowStyle> */}

      <TableContainerStyle
        fitContent
        maxHeight="70vh"
      >
        <Table
          columnFlex={[null, null, 1]}
          columns={[
            {
              label: () => '',
              uuid: 'Selected',
            },
            {
              uuid: 'Stream',
            },
          ]}
          rows={streams.map((stream) => {
            const {
              stream: streamID,
            } = stream;
            const selected: boolean = !!selectedStreams[streamID];

            return [
              <Checkbox
                checked={selected}
                key={`selected-${streamID}`}
                onClick={() => {
                  setSelectedStreams(prev => ({
                    ...prev,
                    [streamID]: selected ? null : stream,
                  }));
                }}
              />,
              <Text key={`stream-${streamID}`}>
                {streamID}
              </Text>,
            ];
          })}
        />
      </TableContainerStyle>

      <Divider medium />
      <Spacing p={2}>
        <FlexContainer justifyContent="flex-end">
          <Button
            loading={isLoading}
            onClick={() => onActionCallback(selectedStreams)}
            primary
            small
          >
            Save and continue
          </Button>
        </FlexContainer>
      </Spacing>
    </Panel>
  );
}

export default SelectStreams;
