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
import {
  BUTTON_ITEMS_DEFAULT,
  ITEMS_MORE,
  ITEMS_MORE_UUIDS_ORDERED,
  ITEM_BROWSE_TEMPLATES,
  ITEM_CREATE_TEMPLATE,
} from './constants';
import { ButtonWrapper, ICON_SIZE } from './index.style';
import { DataIntegrationTypeEnum, TemplateTypeEnum } from '@interfaces/BlockTemplateType';
import { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import { OpenBlockBrowserModalType } from '@components/BlockBrowser/constants';
import { PipelineTypeEnum } from '@interfaces/PipelineType';
import { capitalize } from '@utils/string';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { getdataSourceMenuItems } from '../utils';
import { ignoreKeys } from '@utils/hash';

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
} & OpenBlockBrowserModalType;

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

  const dataLoaderGroupItems = useMemo(() => {
    const arr = [
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
      arr.push(...[
        {
          isGroupingTitle: true,
          label: () => 'Data integrations',
          uuid: [
            BlockTypeEnum.DATA_LOADER,
            TemplateTypeEnum.DATA_INTEGRATION,
            'group',
          ].join('/'),
        },
        {
          // @ts-ignore
          items: itemsDataLoaderSource,
          label: () => capitalize(DataIntegrationTypeEnum.SOURCES),
          uuid: [
            BlockTypeEnum.DATA_LOADER,
            TemplateTypeEnum.DATA_INTEGRATION,
            DataIntegrationTypeEnum.SOURCES,
          ].join('/'),
        },
      ]);
    }

    return arr;
  }, [
    buildNonPythonItems,
    itemsDataLoader,
    itemsDataLoaderSource,
  ]);

  const dataExporterGroupItems = useMemo(() => {
    const arr =[
      {
        isGroupingTitle: true,
        label: () => 'Python',
        uuid: `${BlockLanguageEnum.PYTHON}${BlockTypeEnum.DATA_EXPORTER}/group`,
      },
      // @ts-ignore
    ].concat(itemsDataExporter).concat(buildNonPythonItems(BlockTypeEnum.DATA_EXPORTER));

    if (itemsDataExporterDestination) {
      arr.push(...[
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
    };

    return arr;
  }, [
    buildNonPythonItems,
    itemsDataExporter,
    itemsDataExporterDestination,
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

  const itemUUIDs = useMemo(() => {
    const base = [ITEMS_MORE];

    const items = design?.pages?.pipelines?.edit?.buttons?.block?.add?.items;
    if (items) {
      // @ts-ignore
      return base.concat(items);
    }

    // @ts-ignore
    return base.concat(BUTTON_ITEMS_DEFAULT);
  }, [
    design,
  ]);

  const itemsMoreUUIDs = useMemo(() => {
    const base = [];

    const items = design?.pages?.pipelines?.edit?.buttons?.block?.add?.items_more;
    if (items) {
      // @ts-ignore
      return base.concat(items);
    }

    // @ts-ignore
    return base.concat(ITEMS_MORE_UUIDS_ORDERED.filter(uuid => !itemUUIDs.includes(uuid)));
  }, [
    design,
    itemUUIDs,
  ]);

  const getItemConfiguration = useCallback(({
    index,
  }: ItemSettingsOptions) => Object.entries({
    [BlockTypeEnum.CUSTOM]: {
      Icon: BlockBlank,
      items: itemsCustom,
      tooltip: () => 'Add a blank custom block or scratchpad block',
    },
    [BlockTypeEnum.DATA_EXPORTER]: {
      Icon: CircleWithArrowUp,
      // beforeIcon: (
      //   <CircleWithArrowUp
      //     fill={getColorsForBlockType(
      //       BlockTypeEnum.DATA_EXPORTER,
      //     ).accent}
      //     size={ICON_SIZE}
      //   />
      // ),
      items: dataExporterGroupItems,
      label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.DATA_EXPORTER],
      uuid: `${BlockTypeEnum.DATA_EXPORTER}/${BlockLanguageEnum.PYTHON}`,
    },
    [BlockTypeEnum.SENSOR]: {
      Icon: Sensor,
      // beforeIcon: (
      //   <Sensor
      //     fill={getColorsForBlockType(
      //       BlockTypeEnum.SENSOR,
      //     ).accent}
      //     size={ICON_SIZE}
      //   />
      // ),
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
    [BlockTypeEnum.DATA_LOADER]: {
      Icon: CubeWithArrowDown,
      // beforeIcon: (
      //   <CubeWithArrowDown
      //     fill={getColorsForBlockType(
      //       BlockTypeEnum.DATA_LOADER,
      //     ).accent}
      //     size={ICON_SIZE}
      //   />
      // ),
      items: dataLoaderGroupItems,
      label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.DATA_LOADER],
      uuid: `${BlockTypeEnum.DATA_LOADER}/${BlockLanguageEnum.PYTHON}`,
    },
    [BlockTypeEnum.DBT]: {
      Icon: DBTIcon,
      // beforeIcon: (
      //   <DBTIcon
      //     fill={getColorsForBlockType(
      //       BlockTypeEnum.DBT,
      //     ).accent}
      //     size={ICON_SIZE}
      //   />
      // ),
      items: itemsDBT,
      label: () => 'dbt',
    },
    [BlockTypeEnum.GLOBAL_DATA_PRODUCT]: {
      Icon: HexagonAll,
      // beforeIcon: (
      //   <HexagonAll
      //     size={ICON_SIZE}
      //   />
      // ),
      onClick: () => showGlobalDataProducts({
        // @ts-ignore
        addNewBlock,
      }),
    },
    [BlockTypeEnum.MARKDOWN]: {
      Icon: MarkdownPen,
      onClick: (e) => {
        e?.preventDefault();
        addNewBlock({
          language: BlockLanguageEnum.MARKDOWN,
          type: BlockTypeEnum.MARKDOWN,
        });
      },
      tooltip: () => 'Add a markdown block for documentation',
    },
    [BlockTypeEnum.TRANSFORMER]: {
      Icon: FrameBoxSelection,
      // beforeIcon: (
      //   <FrameBoxSelection
      //     fill={getColorsForBlockType(
      //       BlockTypeEnum.TRANSFORMER,
      //     ).accent}
      //     size={ICON_SIZE}
      //   />
      // ),
      items: [
        {
          isGroupingTitle: true,
          label: () => 'Python',
          uuid: [BlockLanguageEnum.PYTHON, BlockTypeEnum.TRANSFORMER, 'group'].join('/'),
        },
        // @ts-ignore
      ].concat(itemsTransformer).concat(buildNonPythonItems(BlockTypeEnum.TRANSFORMER)),
      label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.TRANSFORMER],
      uuid: [BlockLanguageEnum.PYTHON, BlockTypeEnum.TRANSFORMER].join('/'),
    },
    [ITEMS_MORE]: {
      Icon: TemplateShapes,
      buildItems: () => itemsMoreUUIDs?.map((uuid: string, idx2) => {
        const config = getItemConfiguration({
          index: idx2 * 100,
        })[uuid];
        const { Icon } = config;

        if (Icon) {
          const isOtherItems = [
            ITEM_BROWSE_TEMPLATES,
            ITEM_CREATE_TEMPLATE,
            // @ts-ignore
          ].includes(uuid);
          // @ts-ignore
          const color = getColorsForBlockType(uuid)?.accent;

          config.beforeIcon = (
            <Icon
              default={isOtherItems}
              fill={isOtherItems ? null : color}
              size={ICON_SIZE}
            />
          );
        }

        return ignoreKeys(config, config.beforeIcon ? ['Icon'] : []);
      }),
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
      label: () => 'All blocks',
      tooltip: () => 'Add a block from a template',
    },
    [ITEM_BROWSE_TEMPLATES]: {
      Icon: TemplateShapes,
      // beforeIcon: <TemplateShapes default size={ICON_SIZE} />,
      label: () => 'Browse templates',
      onClick: () => showBrowseTemplates({
        addNewBlock,
      }),
    },
    [ITEM_CREATE_TEMPLATE]: {
      Icon: ArrowsAdjustingFrameSquare,
      // beforeIcon: <ArrowsAdjustingFrameSquare default size={ICON_SIZE} />,
      label: () => 'Create new template',
      onClick: () => showBrowseTemplates({
        addNew: true,
        addNewBlock,
      }),
    },
  }).reduce((acc, [k, v]) => ({
    ...acc,
    [k]: {
      Icon: BLOCK_TYPE_ICON_MAPPING[k],
      index,
      label: () => BLOCK_TYPE_NAME_MAPPING[k],
      onClick: (e) => {
        e?.preventDefault();
        // @ts-ignore
        setButtonMenuOpenIndex((val: number) => val === index ? null : index);
        handleBlockZIndex(index);
      },
      uuid: v?.uuid || k,
      ...v,
    },
  }), {}), [
    addNewBlock,
    dataExporterGroupItems,
    dataLoaderGroupItems,
    handleBlockZIndex,
    itemsCustom,
    itemsDBT,
    itemsMoreUUIDs,
    itemsSensors,
    itemsTransformer,
    setButtonMenuOpenIndex,
    showBrowseTemplates,
    showGlobalDataProducts,
  ]);

  const buildButton = useCallback(({
    Icon,
    beforeIcon,
    buildItems,
    customSubmenuHeights,
    index,
    items,
    label,
    onClick,
    tooltip,
    uuid,
  }: {
    Icon?: any;
    beforeIcon?: any;
    buildItems?: () => FlyoutMenuItemType[];
    customSubmenuHeights?: {
      [key: string]: number;
    },
    index: number;
    items?: FlyoutMenuItemType[];
    label?: () => string;
    onClick?: (e?: any) => void;
    tooltip?: string | (() => void);
    uuid: string;
  }) => {
    const buttonEl = (
      <Button
        beforeIcon={beforeIcon || Icon && (
          <Icon
            secondary={index === buttonMenuOpenIndex}
            size={ICON_SIZE}
          />
        )}
        noBackground
        noBorder
        noPadding
        onClick={(e) => {
          onClick?.(e);
        }}
      >
        {label?.() || uuid}
      </Button>
    );
    return (
      <ButtonWrapper
        compact={compact}
        increasedZIndex={index === buttonMenuOpenIndex}
        key={uuid}
      >
        <FlyoutMenuWrapper
          customSubmenuHeights={customSubmenuHeights}
          disableKeyboardShortcuts
          items={buildItems?.() || items}
          onClickCallback={closeButtonMenu}
          open={index === buttonMenuOpenIndex}
          parentRef={refsMapping[index]}
          uuid={uuid}
        >
          {tooltip
            ? (
              <Tooltip
                block
                label={(tooltip && typeof tooltip === 'function') ? tooltip() : tooltip}
                size={null}
                widthFitContent
              >
                {buttonEl}
              </Tooltip>
            )
            : buttonEl
          }
        </FlyoutMenuWrapper>
      </ButtonWrapper>
    );
  }, [
    buttonMenuOpenIndex,
    closeButtonMenu,
    compact,
  ]);

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
