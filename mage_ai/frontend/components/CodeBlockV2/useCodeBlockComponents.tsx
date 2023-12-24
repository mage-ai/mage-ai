import CodeBlockHeader from './Header';
import useDBT from './dbt/useCodeBlockProps';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { UseCodeBlockComponentProps, UseCodeBlockComponentType } from './constants';

export default function useCodeBlockComponents({
  ...props
}: UseCodeBlockComponentProps): UseCodeBlockComponentType {
  const {
    type,
  } = props?.block || {
    type: null,
  };

  if (BlockTypeEnum.DBT === type) {
    const codeBlockProps = useDBT(props);

    return {
      header: (
        <CodeBlockHeader
          {...props}
          {...codeBlockProps?.header}
        />
      ),
    };
  }

  return {
    editor: null,
    extraDetails: null,
    footer: null,
    header: null,
    headerTabs: null,
    output: null,
    outputTabs: null,
    tags: null,
  };
}
