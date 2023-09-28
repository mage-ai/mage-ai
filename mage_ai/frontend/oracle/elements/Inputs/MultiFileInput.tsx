import styled from 'styled-components';
import { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

const DropzoneStyle = styled.div`
  &:hover {
    cursor: pointer;
  }
`;

type MultiFileInputProps = {
  children: any;
  inputOnChange?: (e: any) => void;
  inputProps?: {
    [key: string]: number | string;
  } & {
    onChange?: (event: any) => void;
  };
  onDragActiveChange?: (isDragActive: boolean) => void;
  setFiles: (files: any[]) => void;
};

function MultiFileInput({
  children,
  inputOnChange,
  inputProps,
  onDragActiveChange,
  setFiles,
}: MultiFileInputProps) {
  const onDrop = useCallback((acceptedFiles) => {
    setFiles(acceptedFiles);
  }, [
    setFiles,
  ]);

  const {
    getInputProps,
    getRootProps,
    isDragActive,
  } = useDropzone({ onDrop });
  const {
    accept,
    autoComplete,
    multiple,
    onChange,
    onClick,
    // @ts-ignore
    ref,
    style,
    tabIndex,
    type,
  } = getInputProps();
  const finalInputProps = {
    ...inputProps,
    accept,
    autoComplete,
    multiple,
    onChange: (e) => {
      inputOnChange?.(e);
      inputProps?.onChange(e);
      onChange(e);
    },
    onClick,
    ref,
    style,
    tabIndex,
    type,
  };

  useEffect(() => {
    onDragActiveChange?.(isDragActive);
  }, [
    isDragActive,
    onDragActiveChange,
  ]);

  return (
    <DropzoneStyle
      {...getRootProps()}
    >
      <input
        {...finalInputProps}
        // @ts-ignore
        directory=""
        webkitdirectory=""
      />
      {children}
    </DropzoneStyle>
  );
}

export default MultiFileInput;
