import { useMemo } from 'react';

import ClickOutside from '@oracle/components/ClickOutside';
import FeatureSetType from '@interfaces/FeatureSetType';
import Menu, { LinkType } from '@oracle/components/Menu';
import { COLUMN_TYPE_ICON_MAPPING } from '@components/constants';
import { Insights } from '@oracle/icons';
import { sortByKey } from '@utils/array';

type ColumnListMenuProps = {
  columns: string[];
  left?: number;
  featureSet: FeatureSetType;
  onClickColumn: (col: string) => void;
  setVisible: (visible: boolean) => void;
  top?: number;
  visible: boolean;
};

const ALL_COLUMNS = 'all_columns';

function ColumnListMenu({
  columns,
  featureSet,
  left,
  onClickColumn,
  setVisible,
  top,
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
      onClick: () => {
        onClickColumn(null);
        setVisible(false);
      },
      uuid: ALL_COLUMNS,
    },
  ];

  const columnLinks: LinkType[] = (columns || []).map(
    (col: string) => {
      const columnType = columnTypesByFeatureUUID[col];
      const Icon = COLUMN_TYPE_ICON_MAPPING[columnType];

      return {
        beforeIcon: <Icon />,
        label: col,
        onClick: () => {
          onClickColumn(col);
          setVisible(false);
        },
        uuid: col,
      };
    },
  );
  const sortedLinks = useMemo(() => sortByKey(
    columnLinks,
    ({ uuid }) => uuid,
  ), [columnLinks]);

  return (
    <ClickOutside
      disableEscape
      onClickOutside={() => setVisible(false)}
      open={visible}
    >
      <Menu
        left={left}
        linkGroups={[
          {
            links: allColumnsLink.concat(sortedLinks),
            uuid: 'columns',
          },
        ]}
        top={top}
      />
    </ClickOutside>
  );
}

export default ColumnListMenu;
