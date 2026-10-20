import { useMemo } from 'react';

import BlockType, { BlockLanguageEnum, BlockTypeEnum, StatusTypeEnum } from '@interfaces/BlockType';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import { CHART_TYPES } from '@interfaces/ChartBlockType';
import {
  CHART_TEMPLATES,
  DEFAULT_SETTINGS_BY_CHART_TYPE,
} from '@components/ChartBlock/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import {
  capitalizeRemoveUnderscoreLower,
  randomSimpleHashGenerator,
} from '@utils/string';

type AddChartMenuProps = {
  addWidget: (widget: BlockType, opts?: {
    onCreateCallback?: (block: BlockType) => void;
  }) => Promise<any>;
  block?: BlockType;
  left?: number;
  rightOffset?: number;
  onClickCallback: () => void;
  open: boolean;
  parentRef: any;
  runBlock?: (payload: {
    block: BlockType;
    code?: string;
    disableReset?: boolean;
    runDownstream?: boolean;
    runUpstream?: boolean;
  }) => void;
  topOffset?: number;
};

function AddChartMenu({
  addWidget,
  block,
  left,
  rightOffset,
  onClickCallback,
  open,
  parentRef,
  runBlock,
  topOffset,
}: AddChartMenuProps) {
  const chartMenuItems = useMemo(() => CHART_TYPES.map((chartType: string) => {
    const widget = {
      configuration: {
        chart_type: chartType,
      },
      language: block.language,
      type: BlockTypeEnum.CHART,
      upstream_blocks: block ? [block.uuid] : null,
    };
    const defaultSettings = DEFAULT_SETTINGS_BY_CHART_TYPE[chartType];
    const configuration = defaultSettings?.configuration?.(widget) || {};
    const content = BlockLanguageEnum.SQL === block?.language
      ? null
      : defaultSettings?.content?.(widget) || null;

    let widgetName = chartType;
    if (block) {
      widgetName = `${block.uuid}_${widgetName}`;
    }

    return {
      label: () => capitalizeRemoveUnderscoreLower(chartType),
      onClick: () => addWidget({
        ...widget,
        configuration: {
          ...widget.configuration,
          ...configuration,
        },
        content,
        name: `${widgetName}_${randomSimpleHashGenerator()}`,
      }, {
        onCreateCallback: (widget: BlockType) => {
          if (block && BlockLanguageEnum.SQL !== block.language) {
            if ([StatusTypeEnum.EXECUTED, StatusTypeEnum.UPDATED].includes(block.status)) {
              runBlock?.({
                block: widget,
                code: content,
                disableReset: true,
              });
            } else {
              runBlock?.({
                block,
                runDownstream: true,
              });
            }
          }
        },
      }),
      uuid: chartType,
    };
  }), [
    addWidget,
    block,
    runBlock,
  ]);
  const chartTemplateMenuItems = useMemo(() => CHART_TEMPLATES.map(({
    label,
    widgetTemplate,
  }) => {
    const widget = {
      ...widgetTemplate({
        block,
      }),
      language: block.language,
      type: BlockTypeEnum.CHART,
      upstream_blocks: block ? [block.uuid] : null,
    };

    return {
      label,
      onClick: () => addWidget(widget, {
        onCreateCallback: (widget: BlockType) => {
          if (block && BlockLanguageEnum.SQL !== block.language) {
            if ([StatusTypeEnum.EXECUTED, StatusTypeEnum.UPDATED].includes(block.status)) {
              runBlock?.({
                block: widget,
                code: widget.content,
                disableReset: true,
              });
            } else {
              runBlock?.({
                block,
                runDownstream: true,
              });
            }
          }
        },
      }),
      uuid: label(),
    };
  }), [
    addWidget,
    block,
    runBlock,
  ]);

  const items = [
    {
      isGroupingTitle: true,
      label: () => 'Custom charts',
      uuid: 'custom_charts',
    },
    ...chartMenuItems,
  ];

  if (BlockLanguageEnum.SQL !== block.language) {
    items.push(...[
      {
        isGroupingTitle: true,
        label: () => 'Templates',
        uuid: 'chart_templates',
      },
      ...chartTemplateMenuItems,
    ]);
  }

  return (
    <FlyoutMenu
      items={items}
      left={left}
      onClickCallback={onClickCallback}
      open={open}
      parentRef={parentRef}
      rightOffset={rightOffset}
      topOffset={topOffset}
      uuid="CommandButtons/add_charts"
      width={UNIT * 25}
    />
  );
}

export default AddChartMenu;
