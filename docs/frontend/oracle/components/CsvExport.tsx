import styled from 'styled-components';

type CsvExportProps = {
  csvData: string;
  filename?: string;
  linkRef: any;
};

const HiddenLink = styled.a<{
  download: string;
  href: string;
  ref: any;
  target: string;
}>`
  visibility: hidden;
`;

function CsvExport({
  csvData,
  filename = 'export.csv',
  linkRef,
}: CsvExportProps) {
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  return (
    <HiddenLink
      download={filename}
      href={url}
      ref={linkRef}
      target="_self"
    />
  );
}

export default CsvExport;
