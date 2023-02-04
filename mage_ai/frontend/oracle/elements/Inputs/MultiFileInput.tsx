import styled from 'styled-components';
import { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

const DropzoneStyle = styled.div`
  background-color: red;
  &:hover {
    cursor: pointer;
  }
`;

type MultiFileInputProps = {
  children: any;
  inputOnChange?: (e: any) => void;
  inputProps?: {
    [key: string]: number | string;
  };
  onDragActiveChange?: (isDragActive: boolean) => void;
  onDrop?: (acceptedFiles: any[]) => void;
  setFiles: (files: any[]) => void;
};


function MultiFileInput({
  children,
  inputOnChange,
  inputProps,
  onDragActiveChange,
  onDrop: onDropProps,
  setFiles,
}: MultiFileInputProps) {
  const onDrop = useCallback((acceptedFiles) => {
    setFiles([...acceptedFiles]);
    onDropProps?.(acceptedFiles);
  }, [
    onDropProps,
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
