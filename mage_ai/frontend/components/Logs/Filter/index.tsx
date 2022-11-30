import { ThemeContext } from 'styled-components';
import { useCallback, useMemo, useContext } from 'react';

import BlockType from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import Circle from '@oracle/elements/Circle';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { BeforeStyle } from '@components/PipelineDetail/shared/index.style';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { FilterRowStyle } from './index.style';
import { LIMIT_PARAM, LOG_FILE_COUNT_INTERVAL, OFFSET_PARAM } from '../Toolbar/constants';
import { LogLevelEnum, LOG_LEVELS } from '@interfaces/LogType';
import { LogLevelIndicatorStyle } from '../index.style';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { UNIT } from '@oracle/styles/units/spacing';
import { capitalize } from '@utils/string';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { goToWithQuery } from '@utils/routing';
import { remove } from '@utils/array';

export type FilterQueryType = {
  'block_run_id[]'?: string[];
  'block_type[]'?: string[];
  'block_uuid[]'?: string[];
  end_timestamp?: string;
  'level[]'?: string[];
  'pipeline_run_id[]'?: string[];
  'pipeline_schedule_id[]'?: string[];
  start_timestamp?: string;
};

type FilterProps = {
  blocks: BlockType[];
  query: FilterQueryType;
};

function Filter({
  blocks,
  query,
}: FilterProps) {
  const themeContext = useContext(ThemeContext);
  const goTo = useCallback((
    q1: any,
    { isList, resetLimitParams }: { isList: boolean, resetLimitParams?: boolean },
  ) => {
    let q2 = { ...query };

    if (isList) {
      Object.entries(q1).forEach(([k1, v]) => {
        const value = String(v);
        const k2 = `${k1}[]`;
        let arr = q2[k2];
        if (arr && Array.isArray(arr)) {
          arr = arr.map(String);
          if (arr.includes(value)) {
            q2[k2] = remove(arr, val => val === value);
          } else {
            q2[k2] = arr.concat(value);
          }
        } else {
          q2[k2] = [value];
        }
      });
    } else {
      q2 = {
        ...q2,
        ...q1,
      };
    }

    if (resetLimitParams) {
      q2[LIMIT_PARAM] = LOG_FILE_COUNT_INTERVAL;
      q2[OFFSET_PARAM] = 0;
    }

    goToWithQuery(q2);
  }, [
    query,
  ]);

  const queryLevels: string[] = useMemo(() => query['level[]'], [query]);
  const queryBlockTypes: string[] = useMemo(() => query['block_type[]'], [query]);
  const queryBlockUUIDs: string[] = useMemo(() => query['block_uuid[]'], [query]);
  const queryPipelineScheduleIDs: string[] =
    useMemo(() => query['pipeline_schedule_id[]'], [query]);
  const queryPipelineRunIDs: string[] = useMemo(() => query['pipeline_run_id[]'], [query]);
  const queryBlockRunIDs: string[] = useMemo(() => query['block_run_id[]'], [query]);

  return (
    <BeforeStyle>
      <Spacing p={PADDING_UNITS}>
        <Spacing mb={3}>
          <Spacing mb={1}>
            <Text bold default large>
              Log level
            </Text>
          </Spacing>

          {LOG_LEVELS.map((level: LogLevelEnum) => (
            <Button
              key={level}
              noBackground
              noBorder
              noPadding
              onClick={() => goTo({ level }, { isList: true })}
            >
              <FilterRowStyle>
                <FlexContainer alignItems="center">
                  <Checkbox
                    checked={Array.isArray(queryLevels) && queryLevels?.includes(String(level))}
                  />
                  <Spacing mr={1} />
                  <LogLevelIndicatorStyle {...{ [level.toLowerCase()]: true }} />
                  <Spacing mr={1} />
                  <Text disableWordBreak>
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
              key={blockType}
              noBackground
              noBorder
              noPadding
              onClick={() => goTo({ block_type: blockType }, { isList: true })}
            >
              <FilterRowStyle>
                <FlexContainer alignItems="center">
                  <Checkbox
                    checked={Array.isArray(queryBlockTypes)
                      && queryBlockTypes?.includes(String(blockType))
                    }
                  />
                  <Spacing mr={1} />
                  <Circle
                    color={getColorsForBlockType(blockType, { theme: themeContext }).accent}
                    size={UNIT * 1.5}
                    square
                  />
                  <Spacing mr={1} />
                  <Text disableWordBreak muted monospace>
                    {blockType}
                  </Text>
                </FlexContainer>
              </FilterRowStyle>
            </Button>
          ))}
        </Spacing>

        <Spacing mb={3}>
          <Spacing mb={1}>
            <Text bold default large>
              Block
            </Text>
          </Spacing>

          {blocks.filter(({ type }) => BlockTypeEnum.SCRATCHPAD !== type).map((block: BlockType) => (
            <Button
              key={block.uuid}
              noBackground
              noBorder
              noPadding
              onClick={() => goTo(
                { block_uuid: block.uuid },
                { isList: true, resetLimitParams: true },
              )}
            >
              <FilterRowStyle>
                <FlexContainer alignItems="center">
                  <Checkbox
                    checked={Array.isArray(queryBlockUUIDs)
                      && queryBlockUUIDs?.includes(String(block.uuid))
                    }
                  />
                  <Spacing mr={1} />
                  <Circle
                    color={getColorsForBlockType(block.type, { theme: themeContext }).accent}
                    size={UNIT * 1.5}
                    square
                  />
                  <Spacing mr={1} />
                  <Text disableWordBreak monospace muted>
                    {block.uuid}
                  </Text>
                </FlexContainer>
              </FilterRowStyle>
            </Button>
          ))}
        </Spacing>

        {queryPipelineScheduleIDs?.length && (
          <Spacing mb={3}>
            <Spacing mb={1}>
              <Text bold default large>
                Trigger
              </Text>
            </Spacing>

            {queryPipelineScheduleIDs.map((pipelineScheduleID: string) => (
              <Button
                noBackground
                noBorder
                noPadding
                key={`pipeline-schedule-${pipelineScheduleID}`}
                onClick={() => goTo({ pipeline_schedule_id: pipelineScheduleID }, { isList: true })}
              >
                <FilterRowStyle>
                  <FlexContainer alignItems="center">
                    <Checkbox
                      checked={Array.isArray(queryPipelineScheduleIDs)
                        && queryPipelineScheduleIDs?.includes(pipelineScheduleID)
                      }
                    />
                    <Spacing mr={1} />
                    <Text disableWordBreak monospace>
                      {pipelineScheduleID}
                    </Text>
                  </FlexContainer>
                </FilterRowStyle>
              </Button>
            ))}
          </Spacing>
        )}

        {queryPipelineRunIDs?.length && (
          <Spacing mb={3}>
            <Spacing mb={1}>
              <Text bold default large>
                Pipeline run
              </Text>
            </Spacing>

            {queryPipelineRunIDs.map((id: string) => (
              <Button
                key={`pipeline-run-${id}`}
                noBackground
                noBorder
                noPadding
                onClick={() => goTo({ pipeline_run_id: id }, { isList: true })}
              >
                <FilterRowStyle>
                  <FlexContainer alignItems="center">
                    <Checkbox
                      checked={Array.isArray(queryPipelineRunIDs)
                        && queryPipelineRunIDs?.includes(id)
                      }
                    />
                    <Spacing mr={1} />
                    <Text disableWordBreak monospace>
                      {id}
                    </Text>
                  </FlexContainer>
                </FilterRowStyle>
              </Button>
            ))}
          </Spacing>
        )}

        {queryBlockRunIDs?.length && (
          <Spacing mb={3}>
            <Spacing mb={1}>
              <Text bold default large>
                Block run
              </Text>
            </Spacing>

            {queryBlockRunIDs.map((id: string) => (
              <Button
                key={`block-run-${id}`}
                noBackground
                noBorder
                noPadding
                onClick={() => goTo({ block_run_id: id }, { isList: true })}
              >
                <FilterRowStyle>
                  <FlexContainer alignItems="center">
                    <Checkbox
                      checked={Array.isArray(queryBlockRunIDs)
                        && queryBlockRunIDs?.includes(id)
                      }
                    />
                    <Spacing mr={1} />
                    <Text disableWordBreak monospace>
                      {id}
                    </Text>
                  </FlexContainer>
                </FilterRowStyle>
              </Button>
            ))}
          </Spacing>
        )}
      </Spacing>
    </BeforeStyle>
  );
}

export default Filter;
