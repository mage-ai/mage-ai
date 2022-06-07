import FeatureSetType from '@interfaces/FeatureSetType';
import FlexContainer from '@oracle/components/FlexContainer'
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { COLUMN_TYPE_ICON_MAPPING } from '@components/constants';
import { ColumnRowStyle } from './ColumnListSidebar.style';
import { Insights } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';

type ColumnListSidebarProps = {
  featureSet: FeatureSetType;
  onClickColumn: (col: string) => void;
  selectedColumn?: string;
};

function ColumnListSidebar({
  featureSet,
  onClickColumn,
  selectedColumn,
}: ColumnListSidebarProps) {
  const {
    metadata,
    sample_data: sampleData,
  } = featureSet;
  const columnTypesByFeatureUUID = metadata?.column_types || {};
  const columns = sampleData?.columns || [];

  const rows: {
    Icon?: any;
    kicker?: () => string;
    label: () => string;
    uuid?: any;
  }[] = [
    {
      Icon: Insights,
      label: () => 'All columns',
      uuid: null,
    },
  ].concat(columns.map((col: string) => {
    const columnType = columnTypesByFeatureUUID[col];

    return {
      Icon: COLUMN_TYPE_ICON_MAPPING[columnType],
      label: () => col,
      uuid: col,
    };
  }));

  return (
    <FlexContainer flexDirection="column">
      {rows.map(({
        Icon,
        kicker,
        label,
        uuid,
      }) => (
        <Link
          block
          key={uuid || 'overview'}
          noHoverUnderline
          noOutline
          onClick={() => onClickColumn(uuid)}
          preventDefault
        >
          <ColumnRowStyle
            selected={selectedColumn === uuid || !(selectedColumn || uuid)}
          >
            <Spacing px={2} py={1}>
              {kicker && (
                <Spacing mb={1}>
                  <FlexContainer alignItems="center">
                    {!Icon && <Spacing mr={3} />}

                    <Text bold small>
                      {kicker()}
                    </Text>
                  </FlexContainer>
                </Spacing>
              )}

              <FlexContainer alignItems="center">
                {Icon && (
                  <div style={{ width: UNIT * 2 }}>
                    <Icon
                      size={UNIT * 2}
                    />
                  </div>
                )}

                {<Spacing mr={Icon ? 1 : 3} />}

                <Text>
                  {label()}
                </Text>
              </FlexContainer>
            </Spacing>
          </ColumnRowStyle>
        </Link>
      ))}
    </FlexContainer>
  );
}

export default ColumnListSidebar;
