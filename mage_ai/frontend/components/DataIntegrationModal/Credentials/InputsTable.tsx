import BlockType from '@interfaces/BlockType';
import FlexContainer from '@oracle/components/FlexContainer';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { Check, Close } from '@oracle/icons';
import { ConfigurationDataIntegrationInputType } from '@interfaces/ChartBlockType';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';

export type InputBlockType = {
  block: BlockType;
  input: ConfigurationDataIntegrationInputType;
};

type InputsTableProps = {
  inputsBlocks: InputBlockType[];
};

function InputsTable({
  inputsBlocks,
}: InputsTableProps) {
  return (
    <Table
      columnFlex={[null, 1, null, 1, null]}
      columns={[
        {
          uuid: 'Position',
        },
        {
          uuid: 'Block',
        },
        {
          center: true,
          uuid: 'Catalog',
        },
        {
          center: true,
          uuid: 'Streams',
        },
        {
          rightAligned: true,
          uuid: 'Argument shape',
        },
      ]}
      rows={inputsBlocks?.map(({
        block: {
          color,
          type: bType,
          uuid,
        },
        input: {
          catalog,
          streams,
        },
      }, idx: number) => {
        const hasStreams = streams?.length >= 1;
        const {
          accent,
        } = getColorsForBlockType(bType, {
          blockColor: color,
        });

        return [
          <Text default key={`position-${uuid}`} monospace>
            {idx}
          </Text>,
          <Text color={accent} key={`block-${uuid}`} monospace>
            {uuid}
          </Text>,
          <FlexContainer justifyContent="center" key={`catalog-${uuid}`}>
            {catalog
              ? <Check success />
              : <Close muted />
            }
          </FlexContainer>,
          <FlexContainer justifyContent="center" key={`selected-streams-${uuid}`}>
            {!hasStreams && <Close key={`catalog-${uuid}`} muted />}
            {hasStreams && streams?.includes(uuid)
              ? <Check success />
              : (
                <Text center default monospace small>
                  {streams?.join(', ')}
                </Text>
              )
            }
          </FlexContainer>,
          <Text default key={`shape-${uuid}`} monospace rightAligned>
            {catalog && !hasStreams && 'Dict'}
            {!catalog && hasStreams && 'Union[Dict, pd.DataFrame]'}
            {catalog && hasStreams && 'Tuple[Union[Dict, pd.DataFrame], Dict]'}
          </Text>,
        ];
      })}
    />
  );
}

export default InputsTable;
