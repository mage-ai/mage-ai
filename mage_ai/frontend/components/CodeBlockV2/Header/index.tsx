import * as osPath from 'path';
import { useMemo } from 'react';

import Circle from '@oracle/elements/Circle';
import CodeBlockHeaderProps from '../constants';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import { BLOCK_TYPE_ICON_MAPPING } from '@components/CustomTemplates/BrowseTemplates/constants';
import { BLOCK_TYPE_NAME_MAPPING, LANGUAGE_DISPLAY_MAPPING } from '@interfaces/BlockType';
import { HeaderStyle } from './index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';

function CodeBlockHeader({
  block,
  selected,
  subtitle,
  theme,
  title,
}: CodeBlockHeaderProps) {
  const {
    color: blockColor,
    language,
    type,
    uuid,
  } = block;

  const color = getColorsForBlockType(type, {
    blockColor,
    theme,
  })
  const Icon = BLOCK_TYPE_ICON_MAPPING[type];

  const titleEls = useMemo(() => {
    const arr = [];

    const titleParts = (title || uuid)?.split(osPath.sep);
    const titlePartsCount = titleParts?.length || 0;

    titleParts?.forEach((part: string, idx: number) => {
      if (idx >= 1) {
        arr.push(
          <div key={`${part}-spacing`} style={{ paddingLeft: UNIT / 4, paddingRight: UNIT / 4 }}>
            <Text muted>
              /
            </Text>
          </div>
        );
      }

      arr.push(
        <Text key={part} default={idx < titlePartsCount - 1} weightStyle={4}>
          {part}
        </Text>
      );
    });

    return arr;
  }, [
    title,
    uuid,
  ]);

  return (
    <HeaderStyle>
      <FlexContainer alignItems="center">
        <Tooltip
          block
          label={[
            LANGUAGE_DISPLAY_MAPPING[language],
            BLOCK_TYPE_NAME_MAPPING[type],
          ].filter(i => i).join(' ')}
          size={null}
          widthFitContent
        >
          <Circle
            color={color?.accent}
            size={UNIT * 5}
            square
          >
            <Icon active size={UNIT * 2.5} />
          </Circle>
        </Tooltip>

        <Spacing mr={PADDING_UNITS} />

        <FlexContainer flexDirection="column">
          <FlexContainer alignItems="center" flexDirection="row">
            {titleEls}
          </FlexContainer>
          {subtitle && (
            <Text default monospace small>
              {subtitle}
            </Text>
          )}
        </FlexContainer>
      </FlexContainer>
    </HeaderStyle>
  );
}

export default CodeBlockHeader;
