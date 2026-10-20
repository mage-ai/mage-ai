import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Panel from '@oracle/components/Panel';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';

type RowType = {
  key: string;
  textProps?: {
    monospace?: boolean;
  };
  value: any;
};

type InformationTableProps = {
  rows: RowType[];
};

function InformationTable({
  rows,
}: InformationTableProps) {
  return (
    <>
      {rows?.map(({
        key,
        textProps,
        value,
      }: {
        key: string;
        textProps?: {
          monospace?: boolean;
        };
        value: any;
      }) => (
        <div key={key}>
          <Divider light />

          <Spacing p={PADDING_UNITS}>
            <FlexContainer alignItems="center">
              <FlexContainer flexDirection="column">
                <Text
                  default
                  large
                >
                  {key}
                </Text>
              </FlexContainer>

              <Spacing mr={PADDING_UNITS} />

              <Flex flex={1} justifyContent="flex-end">
                <Text default large {...textProps}>
                  {value}
                </Text>
              </Flex>
            </FlexContainer>
          </Spacing>
        </div>
      ))}
    </>
  );
}

export default InformationTable;
