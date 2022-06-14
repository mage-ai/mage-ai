import { useMemo } from 'react';

import ClickOutside from '@oracle/components/ClickOutside';
import FeatureSetType from '@interfaces/FeatureSetType';
import Menu, { LinkType } from '@oracle/components/Menu';
import { COLUMN_TYPE_ICON_MAPPING } from '@components/constants';
import { Insights } from '@oracle/icons';
import { sortByKey } from '@utils/array';

type ColumnListMenuProps = {
  columns: string[];
  featureSet: FeatureSetType;
  onClickColumn: (col: string) => void;
  setVisible: (visible: boolean) => void;
  visible: boolean;
};

const ALL_COLUMNS = 'all_columns';

function ColumnListMenu({
  columns,
  featureSet,
  onClickColumn,
  setVisible,
  visible,
}: ColumnListMenuProps) {
  const {
    metadata,
  } = featureSet;
  const columnTypesByFeatureUUID = metadata?.column_types || {};

  const allColumnsLink: LinkType[] = [
    {
      beforeIcon: <Insights />,
      label: 'All columns',
      onClick: () => onClickColumn(null),
      uuid: ALL_COLUMNS,
    },
  ];

  const columnLinks: LinkType[] = columns.map(
    (col: string) => {
      const columnType = columnTypesByFeatureUUID[col];
      const Icon = COLUMN_TYPE_ICON_MAPPING[columnType];

      return {
        beforeIcon: <Icon />,
        label: col,
        onClick: () => onClickColumn(col),
        uuid: col,
      };
    },
  );

  const sortedLinks = useMemo(() => sortByKey(
    allColumnsLink.concat(columnLinks),
    ({ uuid }) => uuid,
  ), [columns]);

  return (
    <ClickOutside
      disableEscape
      onClickOutside={() => setVisible(false)}
      open={visible}
    >
      <Menu
        linkGroups={[
          {
            links: sortedLinks,
            uuid: 'columns',
          },
        ]}
        // right={UNIT * PADDING_UNITS}
      />
    </ClickOutside>
  );
}

export default ColumnListMenu;
