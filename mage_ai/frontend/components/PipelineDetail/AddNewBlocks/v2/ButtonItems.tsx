import { useCallback, useMemo, useRef } from 'react';

import Button from '@oracle/elements/Button';
import CustomDesignType from '@interfaces/CustomDesignType';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import MarkdownPen from '@oracle/icons/custom/MarkdownPen';
import PenWriting from '@oracle/icons/custom/PenWriting';
import Spacing from '@oracle/elements/Spacing';
import Tooltip from '@oracle/components/Tooltip';
import {
  AISparkle,
  AlertTriangle,
  ArrowsAdjustingFrameSquare,
  BlockBlank,
  BlockCubePolygon,
  BlockGeneric,
  CircleWithArrowUp,
  CubeWithArrowDown,
  DBT as DBTIcon,
  File as FileIcon,
  FrameBoxSelection,
  HexagonAll,
  Sensor,
  TemplateShapes,
} from '@oracle/icons';
import {
  BLOCK_TYPE_NAME_MAPPING,
  BlockLanguageEnum,
  BlockRequestPayloadType,
  BlockTypeEnum,
} from '@interfaces/BlockType';
import { BLOCK_TYPE_ICON_MAPPING } from '@components/CustomTemplates/BrowseTemplates/constants';
import { BUTTON_ITEMS_DEFAULT, ITEMS_MORE } from './constants';
import { ButtonWrapper, ICON_SIZE } from './index.style';
import { DataIntegrationTypeEnum, TemplateTypeEnum } from '@interfaces/BlockTemplateType';
import { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import { capitalize } from '@utils/string';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { getdataSourceMenuItems } from '../utils';
import { PipelineTypeEnum } from '@interfaces/PipelineType';

type ItemSettingsOptions = {
  index: number;
};

export type ButtonItemsProps = {
  addNewBlock: (block: BlockRequestPayloadType) => void;
  blockIdx: number;
  blockTemplatesByBlockType: {
    [blockType: string]: {
      [language: string]: FlyoutMenuItemType;
    };
  };
  buttonMenuOpenIndex?: number;
  closeButtonMenu: () => void;
  compact?: boolean;
  design?: CustomDesignType;
  itemsDBT: FlyoutMenuItemType[];
  pipelineType: PipelineTypeEnum;
  setAddNewBlockMenuOpenIdx?: (cb: any) => void;
  setButtonMenuOpenIndex: (value: number) => void;
  showBrowseTemplates?: (opts?: {
    addNew?: boolean;
    addNewBlock: (block: BlockRequestPayloadType) => void;
    blockType?: BlockTypeEnum;
    language?: BlockLanguageEnum;
  }) => void;
  showGlobalDataProducts?: (opts?: {
    addNewBlock?: (block: BlockRequestPayloadType) => Promise<any>;
  }) => void;
};

function ButtonItems({
  addNewBlock,
  blockIdx,
  blockTemplatesByBlockType,
  buttonMenuOpenIndex,
  closeButtonMenu,
  compact,
  design,
  itemsDBT,
  pipelineType,
  setAddNewBlockMenuOpenIdx,
  setButtonMenuOpenIndex,
  showBrowseTemplates,
  showGlobalDataProducts,
}: ButtonItemsProps) {
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const ref3 = useRef(null);
  const ref4 = useRef(null);
  const ref5 = useRef(null);
  const ref6 = useRef(null);
  const ref7 = useRef(null);

  const refsMapping = [
    ref1,
    ref2,
    ref3,
    ref4,
    ref5,
    ref6,
    ref7,
  ];

  const itemUUIDs = useMemo(() => {
    const base = [ITEMS_MORE];

    // const addSettings = design?.pages?.pipelines?.edit?.buttons?.block?.add;
    // if (addSettings) {
    //   // @ts-ignore
    //   return base.concat(addSettings?.items);
    // }

    // @ts-ignore
    return base.concat(BUTTON_ITEMS_DEFAULT);
  }, [
    design,
  ]);

  const handleBlockZIndex = useCallback((newButtonMenuOpenIndex: number) =>
    setAddNewBlockMenuOpenIdx?.(idx => (
      (idx === null || buttonMenuOpenIndex !== newButtonMenuOpenIndex)
        ? blockIdx
        : null
    )),
    [blockIdx, buttonMenuOpenIndex, setAddNewBlockMenuOpenIdx],
  );

  const itemsDataLoader = useMemo(() => getdataSourceMenuItems(
    addNewBlock,
    BlockTypeEnum.DATA_LOADER,
    pipelineType,
    {
      blockTemplatesByBlockType,
      v2: true,
    },
  )?.find(({
    uuid,
  }) => uuid === `${BlockTypeEnum.DATA_LOADER}/${BlockLanguageEnum.PYTHON}`)?.items,
  [
    addNewBlock,
    blockTemplatesByBlockType,
    pipelineType,
  ]);
  const itemsDataLoaderSource = useMemo(() => getdataSourceMenuItems(
    addNewBlock,
    BlockTypeEnum.DATA_LOADER,
    pipelineType,
    {
      blockTemplatesByBlockType,
      dataIntegrationType: DataIntegrationTypeEnum.SOURCES,
      v2: true,
    },
  )?.find(({
    uuid,
  }) => uuid === `${BlockTypeEnum.DATA_LOADER}/${DataIntegrationTypeEnum.SOURCES}`)?.items,
  [
    addNewBlock,
    blockTemplatesByBlockType,
    pipelineType,
  ]);

  const itemsDataExporter = useMemo(() => getdataSourceMenuItems(
    addNewBlock,
    BlockTypeEnum.DATA_EXPORTER,
    pipelineType,
    {
      blockTemplatesByBlockType,
      v2: true,
    },
  )?.find(({
      uuid,
  }) => uuid === `${BlockTypeEnum.DATA_EXPORTER}/${BlockLanguageEnum.PYTHON}`)?.items,
  [
    addNewBlock,
    blockTemplatesByBlockType,
    pipelineType,
  ]);
  const itemsDataExporterDestination = useMemo(() => getdataSourceMenuItems(
    addNewBlock,
    BlockTypeEnum.DATA_EXPORTER,
    pipelineType,
    {
      blockTemplatesByBlockType,
      dataIntegrationType: DataIntegrationTypeEnum.DESTINATIONS,
      v2: true,
    },
  )?.find(({
    uuid,
  }) => uuid === `${BlockTypeEnum.DATA_EXPORTER}/${DataIntegrationTypeEnum.DESTINATIONS}`)?.items,
  [
    addNewBlock,
    blockTemplatesByBlockType,
    pipelineType,
  ]);

  const itemsTransformer = useMemo(() => getdataSourceMenuItems(
    addNewBlock,
    BlockTypeEnum.TRANSFORMER,
    pipelineType,
    {
      blockTemplatesByBlockType,
      v2: true,
    },
  )?.find(({
    uuid,
  }) => uuid === `${BlockTypeEnum.TRANSFORMER}/${BlockLanguageEnum.PYTHON}`)?.items, [
    addNewBlock,
    blockTemplatesByBlockType,
    pipelineType,
  ]);

  const itemsSensors = useMemo(() => getdataSourceMenuItems(
    addNewBlock,
    BlockTypeEnum.SENSOR,
    pipelineType,
    {
      blockTemplatesByBlockType,
      v2: true,
    },
  )?.find(({
      uuid,
  }) => uuid === `${BlockTypeEnum.SENSOR}/${BlockLanguageEnum.PYTHON}`)?.items,
  [
    addNewBlock,
    blockTemplatesByBlockType,
    pipelineType,
  ]);

  const buildNonPythonItems = useCallback((blockType: BlockTypeEnum) => [
    {
      isGroupingTitle: true,
      label: () => 'SQL',
      uuid: `${BlockLanguageEnum.SQL}/${blockType}/group`,
    },
    {
      label: () => 'Base template (generic)',
      onClick: () => {
        addNewBlock({
          language: BlockLanguageEnum.SQL,
          type: blockType,
        });
      },
      uuid: `${BlockLanguageEnum.SQL}/${blockType}/Base template (generic)`,
    },
    {
      isGroupingTitle: true,
      label: () => 'R',
      uuid: `${BlockLanguageEnum.R}/${blockType}/group`,
    },
    {
      label: () => 'Base template (generic)',
      onClick: () => {
        addNewBlock({
          language: BlockLanguageEnum.R,
          type: blockType,
        });
      },
      uuid: `${BlockLanguageEnum.R}/${blockType}/Base template (generic)`,
    },
  ], [
    addNewBlock,
  ]);

  const itemsTemplates = useMemo(() => {
    const dataLoaderGroupItems = [
      {
        isGroupingTitle: true,
        label: () => 'Python',
        uuid: `${BlockLanguageEnum.PYTHON}${BlockTypeEnum.DATA_LOADER}/group`,
      },
      // @ts-ignore
    ].concat(
      itemsDataLoader,
    ).concat(
      // @ts-ignore
      buildNonPythonItems(BlockTypeEnum.DATA_LOADER),
    );

    if (itemsDataLoaderSource) {
      dataLoaderGroupItems.push(...[
        {
          isGroupingTitle: true,
          label: () => 'Data integrations',
          uuid: `${BlockTypeEnum.DATA_LOADER}/${TemplateTypeEnum.DATA_INTEGRATION}/group`,
        },
        {
          // @ts-ignore
          items: itemsDataLoaderSource,
          label: () => capitalize(DataIntegrationTypeEnum.SOURCES),
          uuid: `${BlockTypeEnum.DATA_LOADER}/${TemplateTypeEnum.DATA_INTEGRATION}/${DataIntegrationTypeEnum.SOURCES}`,
        },
      ]);
    }

    const dataExporterGroupItems =[
      {
        isGroupingTitle: true,
        label: () => 'Python',
        uuid: `${BlockLanguageEnum.PYTHON}${BlockTypeEnum.DATA_EXPORTER}/group`,
      },
      // @ts-ignore
    ].concat(itemsDataExporter).concat(buildNonPythonItems(BlockTypeEnum.DATA_EXPORTER));

    if (itemsDataExporterDestination) {
      dataExporterGroupItems.push(...[
        {
          isGroupingTitle: true,
          label: () => 'Data integrations',
          uuid: `${BlockTypeEnum.DATA_EXPORTER}/${TemplateTypeEnum.DATA_INTEGRATION}/group`,
        },
        {
          // @ts-ignore
          items: itemsDataExporterDestination,
          label: () => capitalize(DataIntegrationTypeEnum.DESTINATIONS),
          uuid: `${BlockTypeEnum.DATA_EXPORTER}/${TemplateTypeEnum.DATA_INTEGRATION}/${DataIntegrationTypeEnum.DESTINATIONS}`,
        },
      ]);
    }

    return [
      {
        beforeIcon: (
          <CubeWithArrowDown
            fill={getColorsForBlockType(
              BlockTypeEnum.DATA_LOADER,
            ).accent}
            size={ICON_SIZE}
          />
        ),
        items: dataLoaderGroupItems,
        label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.DATA_LOADER],
        uuid: `${BlockTypeEnum.DATA_LOADER}/${BlockLanguageEnum.PYTHON}`,
      },
      {
        beforeIcon: (
          <FrameBoxSelection
            fill={getColorsForBlockType(
              BlockTypeEnum.TRANSFORMER,
            ).accent}
            size={ICON_SIZE}
          />
        ),
        items: [
          {
            isGroupingTitle: true,
            label: () => 'Python',
            uuid: `${BlockLanguageEnum.PYTHON}${BlockTypeEnum.TRANSFORMER}/group`,
          },
          // @ts-ignore
        ].concat(itemsTransformer).concat(buildNonPythonItems(BlockTypeEnum.TRANSFORMER)),
        label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.TRANSFORMER],
        uuid: `${BlockTypeEnum.TRANSFORMER}/${BlockLanguageEnum.PYTHON}`,
      },
      {
        beforeIcon: (
          <CircleWithArrowUp
            fill={getColorsForBlockType(
              BlockTypeEnum.DATA_EXPORTER,
            ).accent}
            size={ICON_SIZE}
          />
        ),
        items: dataExporterGroupItems,
        label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.DATA_EXPORTER],
        uuid: `${BlockTypeEnum.DATA_EXPORTER}/${BlockLanguageEnum.PYTHON}`,
      },
      {
        beforeIcon: (
          <Sensor
            fill={getColorsForBlockType(
              BlockTypeEnum.SENSOR,
            ).accent}
            size={ICON_SIZE}
          />
        ),
        items: [
          {
            isGroupingTitle: true,
            label: () => 'Python',
            uuid: `${BlockLanguageEnum.PYTHON}${BlockTypeEnum.SENSOR}/group`,
          },
          // @ts-ignore
        ].concat(itemsSensors),
        label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.SENSOR],
        uuid: `${BlockTypeEnum.SENSOR}/${BlockLanguageEnum.PYTHON}`,
      },
      {
        beforeIcon: (
          <DBTIcon
            fill={getColorsForBlockType(
              BlockTypeEnum.DBT,
            ).accent}
            size={ICON_SIZE}
          />
        ),
        items: itemsDBT,
        label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.DBT],
        uuid: BlockTypeEnum.DBT,
      },
      {
        beforeIcon: (
          <HexagonAll
            size={ICON_SIZE}
          />
        ),
        label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.GLOBAL_DATA_PRODUCT],
        onClick: () => showGlobalDataProducts({
          // @ts-ignore
          addNewBlock,
        }),
        uuid: BlockTypeEnum.GLOBAL_DATA_PRODUCT,
      },
      {
        isGroupingTitle: true,
        label: () => 'Custom templates',
        uuid: 'custom_templates',
      },
      {
        beforeIcon: <TemplateShapes default size={ICON_SIZE} />,
        label: () => 'Browse templates',
        onClick: () => showBrowseTemplates({
          addNewBlock,
        }),
        uuid: 'browse_templates',
      },
      {
        beforeIcon: <ArrowsAdjustingFrameSquare default size={ICON_SIZE} />,
        label: () => 'Create new template',
        onClick: () => showBrowseTemplates({
          addNew: true,
          addNewBlock,
        }),
        uuid: 'create_template',
      },
    ];
  }, [
    addNewBlock,
    buildNonPythonItems,
    itemsDataExporter,
    itemsDataExporterDestination,
    itemsDataLoader,
    itemsDataLoaderSource,
    itemsDBT,
    itemsSensors,
    itemsTransformer,
    showBrowseTemplates,
    showGlobalDataProducts,
  ]);

  const itemsCustom = useMemo(() => [
    {
      beforeIcon: <BlockGeneric default size={ICON_SIZE} />,
      label: () => 'Python block',
      onClick: () => {
        addNewBlock({
          language: BlockLanguageEnum.PYTHON,
          type: BlockTypeEnum.CUSTOM,
        });
      },
      uuid: 'Python',
    },
    {
      beforeIcon: <BlockGeneric default size={ICON_SIZE} />,
      label: () => 'SQL block',
      onClick: () => {
        addNewBlock({
          language: BlockLanguageEnum.SQL,
          type: BlockTypeEnum.CUSTOM,
        });
      },
      uuid: 'SQL',
    },
    {
      beforeIcon: <BlockGeneric default size={ICON_SIZE} />,
      label: () => 'R block',
      onClick: () => {
        addNewBlock({
          language: BlockLanguageEnum.R,
          type: BlockTypeEnum.CUSTOM,
        });
      },
      uuid: 'R',
    },
    {
      beforeIcon: <PenWriting default size={ICON_SIZE} />,
      label: () => 'Scratchpad',
      onClick: () => {
        addNewBlock({
          language: BlockLanguageEnum.PYTHON,
          type: BlockTypeEnum.SCRATCHPAD,
        });
      },
      uuid: 'scratchpad',
    },
  ], [
    addNewBlock,
  ]);

  const getItemConfiguration = useCallback(({
    index,
  }: ItemSettingsOptions) => Object.entries({
    [BlockTypeEnum.CUSTOM]: {
      Icon: BlockBlank,
      items: itemsCustom,
      tooltip: 'Add a blank custom block or scratchpad block',
    },
    [BlockTypeEnum.MARKDOWN]: {
      Icon: MarkdownPen,
      onClick: (e) => {
        e.preventDefault();
        addNewBlock({
          language: BlockLanguageEnum.MARKDOWN,
          type: BlockTypeEnum.MARKDOWN,
        });
      },
      tooltip: 'Add a markdown block for documentation',
    },
    [ITEMS_MORE]: {
      Icon: TemplateShapes,
      customSubmenuHeights: {
        [[
          BlockTypeEnum.DATA_EXPORTER,
          TemplateTypeEnum.DATA_INTEGRATION,
          DataIntegrationTypeEnum.DESTINATIONS,
        ].join('/')]: 504,
        [[
          BlockTypeEnum.DATA_LOADER,
          TemplateTypeEnum.DATA_INTEGRATION,
          DataIntegrationTypeEnum.SOURCES,
        ].join('/')]: 504,
      },
      items: itemsTemplates,
      tooltip: 'Add a block from a template',
      uuid: 'Templates',
    },
  }).reduce((acc, [k, v]) => ({
    ...acc,
    [k]: {
      Icon: BLOCK_TYPE_ICON_MAPPING[k],
      index,
      onClick: (e) => {
        e.preventDefault();
        setButtonMenuOpenIndex(val => val === index ? null : index);
        handleBlockZIndex(index);
      },
      title: BLOCK_TYPE_NAME_MAPPING[k],
      uuid: v?.uuid || k,
      ...v,
    },
  }), {}), [
    handleBlockZIndex,
    itemsCustom,
    itemsTemplates,
    setButtonMenuOpenIndex,
  ]);

  const buildButton = useCallback(({
    Icon,
    customSubmenuHeights,
    index,
    items,
    onClick,
    title,
    tooltip,
    uuid,
  }: {
    Icon: any;
    customSubmenuHeights?: {
      [key: string]: number;
    },
    index: number;
    items?: FlyoutMenuItemType[];
    onClick?: (e?: any) => void;
    title?: string;
    tooltip?: string;
    uuid: string;
  }) => {
    return (
      <ButtonWrapper
        compact={compact}
        increasedZIndex={index === buttonMenuOpenIndex}
        key={uuid}
      >
        <FlyoutMenuWrapper
          customSubmenuHeights={customSubmenuHeights}
          disableKeyboardShortcuts
          items={items}
          onClickCallback={closeButtonMenu}
          open={index === buttonMenuOpenIndex}
          parentRef={refsMapping[index]}
          uuid={title}
        >
          <Tooltip
            block
            label={tooltip}
            size={null}
            widthFitContent
          >
            <Button
              beforeIcon={
                <Icon
                  secondary={index === buttonMenuOpenIndex}
                  size={ICON_SIZE}
                />
              }
              noBackground
              noBorder
              noPadding
              onClick={(e) => {
                console.log('WTFFFFFFFFFFFFFFFFFFF', uuid, index)
                onClick?.(e);
              }}
            >
              {title || uuid}
            </Button>
          </Tooltip>
        </FlyoutMenuWrapper>
      </ButtonWrapper>
    );
  }, [
    buttonMenuOpenIndex,
    closeButtonMenu,
    compact,
  ]);

  console.log(itemUUIDs)

  return (
    <>
      {itemUUIDs?.reduce((acc, uuid: string, index: number) => acc.concat([
        buildButton(getItemConfiguration({
          index,
        })[uuid]),
        <Spacing key={`spacing-${uuid}-${index}`} mr={3} />
      ]), [])}
    </>
  );
}

export default ButtonItems;
