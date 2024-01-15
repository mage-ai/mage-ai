import KernelOutputType, { DataTypeEnum } from '@interfaces/KernelOutputType';

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
    <>
      {children}
    </>
  );
}

export default OutputRow;
