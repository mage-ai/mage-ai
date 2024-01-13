import Ansi from 'ansi-to-react';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import {
  CommandCenterActionType,
  CommandCenterItemType,
  KeyValueType,
  ObjectTypeEnum,
} from '@interfaces/CommandCenterType';
import { OutputContentStyle } from '../index.style';

function ItemOutput({
  action,
  actionResults,
  item,
  results,
}: {
  action?: CommandCenterActionType;
  actionResults?: KeyValueType;
  item?: CommandCenterItemType;
  results?: {
    [key: string]: {
      value: KeyValueType;
    }[];
  };
}) {
  const {
    object_type: objectType,
  } = item;

  let outputElement;

  if ([
    ObjectTypeEnum.BRANCH,
    ObjectTypeEnum.PROJECT,
    ObjectTypeEnum.REMOTE,
    ObjectTypeEnum.VERSION_CONTROL_FILE,
  ].includes(objectType)) {
    const arr: any[] = actionResults?.[objectType] as any[];
    const result = arr?.[arr?.length - 1];
    let output = result?.value?.output;
    if (output) {
      if (!Array.isArray(output)) {
        console.log('Output is not an array: ', output);
        output = [String(output)];
      }
      const lines = output.map((line: string, idx: number) => (
        <Text
          key={`${line}-${idx}`}
          monospace
          preWrap
          small
        >
          <Ansi>
            {line}
          </Ansi>
        </Text>
      ));

      outputElement = (
        <div>
          {lines}
        </div>
      );
    }
  }

  return (
    <OutputContentStyle>
      {outputElement}
    </OutputContentStyle>
  );
}

export default ItemOutput;
