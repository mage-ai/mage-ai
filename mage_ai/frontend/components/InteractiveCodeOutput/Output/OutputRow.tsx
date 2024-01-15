import KernelOutputType from '@interfaces/KernelOutputType';

function OutputRow({
  children,
  output,
}: {
  children: JSX.Element | JSX.Element[];
  output: KernelOutputType;
}) {
  return (
    <>
      {children}
    </>
  );
}

export default OutputRow;
