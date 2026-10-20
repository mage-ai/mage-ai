import React, { useCallback } from 'react';
import styled from 'styled-components';
import { useDropzone } from 'react-dropzone';

import LineReader from '@utils/LineReader.js';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';

const DropzoneStyle = styled.div<{
  danger?: boolean;
  inverted?: boolean;
}>`
  border-radius: ${BORDER_RADIUS}px;

  &:hover {
    cursor: pointer;
  }

  ${props => !props.danger && `
    border: 1px dashed ${(props.theme.content || dark.content).disabled};
  `}

  ${props => props.inverted && `
    border: 1px dashed ${(props.theme.monotone || dark.monotone).grey400} !important;
  `}

  ${props => props.danger && `
    border: 1px dashed ${(props.theme.interactive || dark.interactive).dangerBorder} !important;
  `}
`;

type FileInputProps = {
  children?: any;
  danger?: boolean;
  files?: any[];
  inputOnChange?: (e: any) => void;
  inputProps?: any,
  inverted?: boolean;
  numberOfLinesToRead?: number;
  onDrop?: (acceptedFiles: any[]) => void;
  onReadCSV?: (data: any) => void;
  onReadJSON?: (data: any) => void;
};

function FileInput({
  children,
  danger,
  files = [],
  inputOnChange,
  inputProps,
  inverted,
  numberOfLinesToRead = 40,
  onDrop: onDropProps,
  onReadCSV,
  onReadJSON,
}: FileInputProps) {
  const onDrop = useCallback((acceptedFiles) => {
    acceptedFiles.forEach((file) => {
      if (file.type.includes('json')) {
        // This method reads the entire file into memory, then allows parsing.
        const reader = new FileReader();
        reader.onabort = () => console.log('file reading was aborted');
        reader.onerror = () => console.log('file reading has failed');
        reader.onload = () => {
          // Do whatever you want with the file contents
          // const binaryStr = reader.result
          onReadJSON?.(reader.result);
        };
        // reader.readAsArrayBuffer(file);
        reader.readAsText(file);
      } else {
        const lines = [];
        let linesRead = 0;
        let calledOnReadCsv = false;

        // This method only reads line by line.
        new LineReader(file).readLines((line) => {
          if (linesRead > numberOfLinesToRead) {
            return;
          } else {
            if (linesRead < numberOfLinesToRead) {
              lines.push(line);
            } else {
              onReadCSV?.(lines.join('\n'));
              calledOnReadCsv = true;
            }
            linesRead += 1;
          }
        }, () => {
          if (!calledOnReadCsv) {
            onReadCSV?.(lines.join('\n'));
          }
        });
      }
    });
    onDropProps?.(acceptedFiles);
  }, [
    onDropProps,
    onReadCSV,
    onReadJSON,
  ]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });
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

  const acceptFiles = [];
  if (onReadCSV) {
    acceptFiles.push(...[
      '.csv',
      '.tsv',
    ]);
  }
  if (onReadJSON) {
    acceptFiles.push('.json');
  }

  return (
    <DropzoneStyle
      danger={danger}
      inverted={inverted}
      {...getRootProps()}
    >
      <Spacing p={{ xs: 5, md: 8 }}>
        <input {...finalInputProps} accept={acceptFiles.join(',')} />

        <Text center inverted={inverted}>
          {isDragActive
            ? 'Drop CSV file here...'
            : files.length >= 1
              ? files[0].name
              : children
          }
        </Text>
      </Spacing>
    </DropzoneStyle>
  );
}

export default FileInput;
