import { ThemeContext } from 'styled-components';
import { useMemo, useContext } from 'react';

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
import { LogLevelEnum, LOG_LEVELS } from '@interfaces/LogType';
import { LogLevelIndicatorStyle } from '../index.style';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { UNIT } from '@oracle/styles/units/spacing';
import { capitalize } from '@utils/string';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { goToWithFilters } from '@utils/routing';

export enum FilterQueryParamEnum {
  BLOCK_RUN_ID = 'block_run_id[]',
  BLOCK_TYPE = 'block_type[]',
  BLOCK_UUID = 'block_uuid[]',
  LEVEL = 'level[]',
  PIPELINE_RUN_ID = 'pipeline_run_id[]',
  PIPELINE_SCHEDULE_ID = 'pipeline_schedule_id[]',
}

export type FilterQueryType = {
  [FilterQueryParamEnum.BLOCK_RUN_ID]?: string[];
  [FilterQueryParamEnum.BLOCK_TYPE]?: string[];
  [FilterQueryParamEnum.BLOCK_UUID]?: string[];
  [FilterQueryParamEnum.LEVEL]?: string[];
  [FilterQueryParamEnum.PIPELINE_RUN_ID]?: string[];
  [FilterQueryParamEnum.PIPELINE_SCHEDULE_ID]?: string[];
  end_timestamp?: string;
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
  const queryLevels: string[] = useMemo(() => query[FilterQueryParamEnum.LEVEL], [query]);
  const queryBlockTypes: string[] = useMemo(() => query[FilterQueryParamEnum.BLOCK_TYPE], [query]);
  const queryBlockUUIDs: string[] = useMemo(() => query[FilterQueryParamEnum.BLOCK_UUID], [query]);
  const queryPipelineScheduleIDs: string[] =
    useMemo(() => query[FilterQueryParamEnum.PIPELINE_SCHEDULE_ID], [query]);
  const queryPipelineRunIDs: string[] = useMemo(() => query[FilterQueryParamEnum.PIPELINE_RUN_ID], [query]);
  const queryBlockRunIDs: string[] = useMemo(() => query[FilterQueryParamEnum.BLOCK_RUN_ID], [query]);

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
              onClick={() => goToWithFilters(query, { level }, { isList: true })}
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
              onClick={() => goToWithFilters(query, { block_type: blockType }, { isList: true })}
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
              onClick={() => goToWithFilters(
                query,
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
                    color={getColorsForBlockType(
                      block.type,
                      { blockColor: block.color, theme: themeContext },
                    ).accent}
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
                onClick={() => goToWithFilters(query, { pipeline_schedule_id: pipelineScheduleID }, { isList: true })}
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
                onClick={() => goToWithFilters(query, { pipeline_run_id: id }, { isList: true })}
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
                onClick={() => goToWithFilters(query, { block_run_id: id }, { isList: true })}
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
