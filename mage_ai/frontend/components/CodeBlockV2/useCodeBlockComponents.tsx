import { useMemo } from 'react';

// import CodeBlockEditor from './Editor';
import CodeBlockHeader from './Header';
import useDBT from './dbt/useCodeBlockProps';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { UseCodeBlockComponentProps, UseCodeBlockComponentType } from './constants';

export default function useCodeBlockComponents({
  ...props
}: UseCodeBlockComponentProps): UseCodeBlockComponentType {
  const {
    block,
    executionState,
    interruptKernel,
    runBlockAndTrack,
    selected,
    status,
    theme,
  } = props;
  const {
    type,
  } = block || {
    type: null,
  };

  const codeBlockProps = useMemo(() => {
    if (BlockTypeEnum.DBT === type) {
      return useDBT(props);
    }
  }, [
    block,
    executionState,
    selected,
    status,
  ]);

  const editor = useMemo(() => {
    if (codeBlockProps?.editor) {
      return (
        <CodeBlockEditor
          block={block}
          selected={selected}
          theme={theme}
          {...(codeBlockProps?.editor || {})}
        />
      );
    }

    return null;
  }, [
    codeBlockProps,
  ]);

  const header = useMemo(() => {
    if (codeBlockProps?.header) {
      return (
        <CodeBlockHeader
          block={block}
          executionState={executionState}
          interruptKernel={interruptKernel}
          runBlockAndTrack={runBlockAndTrack}
          selected={selected}
          status={status}
          theme={theme}
          {...(codeBlockProps?.header || {})}
        />
      );
    }
  }, [
    codeBlockProps,
  ]);


  return {
    editor,
    extraDetails: null,
    footer: null,
    header,
    headerTabs: null,
    output: null,
    outputTabs: null,
    tags: null,
  };
}
