import KernelOutputType, { DataTypeEnum } from '@interfaces/KernelOutputType';
import { PaginateArrowRight } from '@oracle/icons';
import { FloatingIndicatorStyle, INDICATOR_SIZE, RowStyle, RowContentStyle, TOGGLE_SCROLLBAR_OFFSET_CLASS, TOGGLE_CLASSNAME } from './index.style';
import { SCROLLBAR_WIDTH_SMALL } from '@oracle/styles/scrollbars';
import { addClassNames, removeClassNames } from '@utils/elements';

function OutputRow({
  children,
  dataType,
  output,
}: {
  children: JSX.Element | JSX.Element[];
  dataType: DataTypeEnum;
  output: KernelOutputType;
}) {
  return (
    <RowStyle>
      <RowContentStyle >
        {children}
      </RowContentStyle>
    </RowStyle>
  );
}

export default OutputRow;
