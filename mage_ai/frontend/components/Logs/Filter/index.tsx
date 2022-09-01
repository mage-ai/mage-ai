import { ThemeContext } from 'styled-components';
import { useCallback, useContext } from 'react';

import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import Circle from '@oracle/elements/Circle';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { FilterRowStyle } from './index.style';
import { LogLevelEnum, LOG_LEVELS } from '@interfaces/LogType';
import { LogLevelIndicatorStyle } from '../index.style';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { UNIT } from '@oracle/styles/units/spacing';
import { capitalize } from '@utils/string';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { goToWithQuery } from '@utils/routing';
import { remove } from '@utils/array';

function Filter({
  query,
}) {
  const themeContext = useContext(ThemeContext);
  const goTo = useCallback((q1, { isList }) => {
    let q2 = { ...query };

    if (isList) {
      Object.entries(q1).forEach(([k1, v]) => {
        const k2 = `${k1}[]`;
        const arr = q2[k2];
        if (arr) {
          if (arr.includes(v)) {
            q2[k2] = remove(arr, val => val === v);
          } else {
            q2[k2] = arr.concat(v);
          }
        } else {
          q2[k2] = [v];
        }
      });
    } else {
      q2 = {
        ...q2,
        ...q1,
      };
    }

    goToWithQuery(q2);
  }, [
    query,
  ]);

  return (
    <Spacing p={PADDING_UNITS}>
      <Spacing mb={3}>
        <Spacing mb={1}>
          <Text bold default large>
            Log level
          </Text>
        </Spacing>

        {LOG_LEVELS.map((level: LogLevelEnum) => (
          <Button
            noBackground
            noBorder
            noPadding
            key={level}
            onClick={() => goTo({ level }, { isList: true })}
          >
            <FilterRowStyle>
              <FlexContainer alignItems="center">
                <Checkbox
                  checked={query['level[]']?.includes(level)}
                />
                <Spacing mr={1} />
                <LogLevelIndicatorStyle {...{[level.toLowerCase()]: true}} />
                <Spacing mr={1} />
                <Text>
                  {capitalize(level.toLowerCase())}
                </Text>
              </FlexContainer>
            </FilterRowStyle>
          </Button>
        ))}
      </Spacing>

      <Spacing mb={3}>
        <Spacing mb={1}>
          <Text bold default large>
            Block type
          </Text>
        </Spacing>

        {[
          BlockTypeEnum.DATA_LOADER,
          BlockTypeEnum.TRANSFORMER,
          BlockTypeEnum.DATA_EXPORTER,
        ].map((blockType: BlockTypeEnum) => (
          <Button
            noBackground
            noBorder
            noPadding
            key={blockType}
            onClick={() => goTo({ block_type: blockType }, { isList: true })}
          >
            <FilterRowStyle>
              <FlexContainer alignItems="center">
                <Checkbox
                  checked={query['block_type[]']?.includes(blockType)}
                />
                <Spacing mr={1} />
                <Circle
                  color={getColorsForBlockType(blockType, { theme: themeContext }).accent}
                  size={UNIT * 1.5}
                  square
                />
                <Spacing mr={1} />
                <Text muted monospace>
                  {blockType}
                </Text>
              </FlexContainer>
            </FilterRowStyle>
          </Button>
        ))}
      </Spacing>
    </Spacing>
  );
}

export default Filter;
