import List from '@mana/elements/List';
import { MIN_WIDTH} from './utils';
import { hashCode } from '@utils/string';
import { isObject } from '@utils/hash';

type RowProps = {
  columnWidths: any[];
  columns: any[];
  index: number;
  indexes: number[];
  row: any;
  style: any;
};

export default function Row({ columns, indexes, index, row, style, columnWidths }: RowProps) {
  const { cells, original } = row;

  return (
    <div
      {...row.getRowProps({
        style: {
          ...style,
          width: 'auto',
        },
      })}
      className="tr"
    >
      {cells.map((cell, idx: number) => {
        const settings = columns[idx];
        const cellProps = cell.getCellProps();
        const cellStyle: {
          [key: string]: number | string;
        } = {
          ...cellProps.style,
        };

        let cellValue = cell.render('Cell');
        let cellValueDisplay = null;

        cellStyle.padding = 'var(--padding-xs)';
        cellStyle.width = columnWidths[idx];

        if (settings?.index) {
          cellStyle.left = 0;
          cellStyle.position = 'sticky';
          cellStyle.textAlign = 'center';
          cellValueDisplay = cellValue;
        } else {
          cellValue = original[idx - indexes[idx]];

          if (isObject(cellValue) && !Array.isArray(cellValue)) {
            // console.log(0);
            try {
              cellValueDisplay = (
                <pre
                  className="json-object"
                  style={{ paddingRight: MIN_WIDTH }}
                >
                  {JSON.stringify(cellValue, null, 2)}
                </pre>
              );
            } catch (error) {
              console.error(error)
              cellValueDisplay = String(cellValue);
            }
          } else if (Array.isArray(cellValue)) {
            cellStyle.padding = '';

            const isObjArr = cellValue.some(o => !Array.isArray(o) && isObject(o));

            cellValueDisplay = (
              <List
                asRows
                itemClassName={() => 'td-list-item'}
                items={!isObjArr ? cellValue : undefined}
                monospace
                parseItems
                secondary
                small
              >
                {isObjArr && cellValue?.map((val1, idx1: number) => (
                  <pre
                    className="json-object"
                    key={`${hashCode(String(val1))}-${idx}-${idx1}`}
                    style={{ paddingRight: MIN_WIDTH }}
                  >
                    {JSON.stringify(val1, null, 2)}
                  </pre>
                ))}
              </List>
            );
          } else if (cellValue === true) {
            // console.log(2);
            cellValueDisplay = 'True';
          } else if (cellValue === false) {
            // console.log(3);
            cellValueDisplay = 'False';
          } else if (cellValue === null || cellValue === 'null') {
            // console.log(4);
            cellValueDisplay = 'None';
          } else if (typeof cellValue === 'string') {
            // console.log(5);
            cellValueDisplay = cellValue.replace(/\n/g, '\\n');
          } else {
            // console.log(6);
            cellValueDisplay = cellValue;
          }
        }

        return (
          <div
            {...cellProps}
            className={[
              `td ${settings?.index ? 'td-index-column' : ''}`,
              'td-monospace',
            ].filter(Boolean).join(' ')}
            key={`${idx}-${String(cellValue)}`}
            style={cellStyle}
          >
            {cellValueDisplay}
          </div>
        );
      })}
    </div>
  );
}
