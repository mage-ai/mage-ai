import AppManagerLayout from '../../AppManager';
import { CUBIC } from '@mana/animations/ease';
import { KeyEnum } from '@mana/events/enums';
import useKeyboardShortcuts from '@mana/hooks/shortcuts/useKeyboardShortcuts';
import AnimatedBorder, { SVG_XY_OFFSET } from '@components/v2/shared/AnimatedBorder';
import { Root, createRoot } from 'react-dom/client';
import { motion } from 'framer-motion';
import TeleportBlock from '@components/v2/Canvas/Nodes/Blocks/TeleportBlock';
import FileBrowser from '@components/v2/FileBrowser';
import Grid from '@mana/components/Grid';
import PipelineExecutionFrameworkType from '@interfaces/PipelineExecutionFramework/interfaces';
import PipelineType from '@interfaces/PipelineType';
import dynamic from 'next/dynamic';
import stylesHeader from '@styles/scss/layouts/Header/Header.module.scss';
import stylesPipelineBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import stylesPipelineBuilderPage from '@styles/scss/pages/PipelineBuilder/PipelineBuilder.module.scss';
import { doesRectIntersect } from '@utils/rects';
import useManager from '@components/v2/Apps/useManager';
import { CanvasProps } from '@components/v2/Apps/PipelineCanvas/CanvasV2';
import { PanelType } from '@components/v2/Apps/interfaces';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ItemType } from '@components/v2/Apps/Browser/System/interfaces';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import { useAnimationControls, useDragControls } from 'framer-motion';
import ContextProvider from '@context/v2/ContextProvider';
import { capitalizeRemoveUnderscoreLower, removeExtensionFromFilename } from '@utils/string';
import { DragInfo } from '@mana/shared/interfaces';
import { RectType } from '@components/v2/Canvas/interfaces';

interface PipelineDetailProps {
  framework: PipelineExecutionFrameworkType;
  useExecuteCode: any;
  useRegistration: any;
  pipeline: PipelineType;
}

const PipelineCanvas = dynamic(() => import('@components/v2/Apps/PipelineCanvas'), { ssr: false });

function PipelineBuilder({ pipeline, removeContextMenu, renderContextMenu, ...rest }: PipelineDetailProps & CanvasProps) {
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const dropzoneMountRef = useRef<HTMLDivElement>(null);
  const dropzoneRootRef = useRef<Root>(null);
  const activeDropzoneRef = useRef<RectType>(null);

  const appToolbarRef = useRef<HTMLDivElement>(null);
  const appManagerContainerRef = useRef<HTMLDivElement>(null);
  const appManagerWrapperRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const draggableItemElementRef = useRef<HTMLDivElement>(null);
  const draggableItemRootRef = useRef<Root>(null);
  const selectedItemRef = useRef<{
    block: BlockType;
    item: ItemType;
  }>(null);
  const rectsMappingRef = useRef<Record<string, RectType>>({});
  const onItemDropHandlersRef = useRef<Record<string, (
    event: any,
    item: ItemType,
    block?: BlockType,
  ) => void>>({});

  const dragControls = useDragControls();
  const animationControls = useAnimationControls();

  const { deregisterCommands, registerCommands } = useKeyboardShortcuts({
    target: draggableItemElementRef,
  });

  function hide(refs: React.MutableRefObject<HTMLDivElement>[]) {
    refs?.forEach((ref) => {
      ref.current.classList.remove(stylesPipelineBuilderPage.active);
      ref.current.classList.add(stylesPipelineBuilderPage.inactive);
    });
  }

  function show(refs: React.MutableRefObject<HTMLDivElement>[]) {
    refs?.forEach((ref) => {
      ref.current.classList.add(stylesPipelineBuilderPage.active);
      ref.current.classList.remove(stylesPipelineBuilderPage.inactive);
    });
  }

  function handleAddPanel(panel: PanelType, count: number) {
    if (count > 0) {
      show([appManagerWrapperRef]);
      hide([appToolbarRef, canvasWrapperRef]);
    }
  }

  function handleRemovePanel(panel: PanelType, count: number) {
    if (count === 0) {
      hide([appManagerWrapperRef]);
      show([appToolbarRef, canvasWrapperRef]);
    }
  }

  const { addPanel } = useManager({
    containerRef: appManagerContainerRef,
    onAddPanel: handleAddPanel,
    onRemovePanel: handleRemovePanel,
  });

  const sharedProps = useMemo(() => ({
    appToolbarRef,
    pipeline,
    removeContextMenu,
    renderContextMenu,
    setOnItemDrop: (uuid: string, handler: (item: ItemType, block?: BlockType) => void) => {
      onItemDropHandlersRef.current[uuid] = handler;
    },
  }), [pipeline, removeContextMenu, renderContextMenu]);

  function handleUpdateRects(rectsMapping: Record<string, RectType>) {
    rectsMappingRef.current = rectsMapping;
  }

  function resetDropzone() {
    dropzoneMountRef?.current
      && dropzoneMountRef?.current?.classList?.add?.(stylesPipelineBuilderPage.hidden);

    activeDropzoneRef.current = null;

    if (dropzoneRootRef?.current) {
      dropzoneRootRef.current.render(null);
    }
  }

  function resetDragging() {
    animationControls.set({
      x: 0,
      y: 0
    });

    draggableItemElementRef.current.style.display = 'none';
    draggableItemElementRef.current.style.opacity = '0';
    draggableItemElementRef.current.style.pointerEvents = 'none';
    draggableItemElementRef.current.style.transform = 'translate(0px, 0px)';
    draggableItemElementRef.current.style.transformOrigin = '0 0';
    draggableItemElementRef.current.style.visibility = 'hidden';

    resetDropzone();
  }

  function getItemRect(event: any, info?: DragInfo) {
    const x = info?.point?.x ?? event?.pageX ?? {};
    const y = info?.point?.y ?? event?.pageY ?? {};

    const itemRect = draggableItemElementRef.current?.getBoundingClientRect();
    const rect = {
      height: itemRect?.height,
      left: x - (itemRect?.width / 2),
      top: y - (itemRect?.height / 2),
      width: itemRect?.width,
    };

    return rect;
  }

  function getIntersectingData(selectedItem: any, event: any, info?: DragInfo) {
    const rect = getItemRect(event, info);

    const intersectingRect =
      Object.values(rectsMappingRef.current ?? {}).find(r => doesRectIntersect(r as RectType, rect));

    const block = {
      configuration: {
        file_source: {
          path: selectedItem?.item?.path,
        },
      },
      language: selectedItem?.item?.language,
      name: selectedItem?.block?.name,
      type: selectedItem?.block?.type,
    } as any;

    if (intersectingRect && intersectingRect?.block) {
      const { block: block2 } = intersectingRect;
      if (!block2?.type || BlockTypeEnum.GROUP === block2?.type) {
        block.groups = [block2?.uuid];
      } else {
        block.upstream_blocks = [block2?.uuid];
        if (block2?.groups) {
          block.groups = block2?.groups;
        }
      }
    }

    return {
      block,
      intersectingRect,
      rect,
    };
  }

  function handleDragging(event: any, info: DragInfo) {
    if (!selectedItemRef.current) return;
    const {
      block,
      intersectingRect,
    } = getIntersectingData(selectedItemRef.current, event, info);

    if (intersectingRect) {
      if (!activeDropzoneRef.current
        || ['left', 'top', 'width', 'height'].some(key => activeDropzoneRef.current[key] !== intersectingRect[key])
      ) {
        dropzoneMountRef?.current
          && dropzoneMountRef?.current?.classList?.remove?.(stylesPipelineBuilderPage.hidden);

        if (!dropzoneRootRef.current) {
          dropzoneRootRef.current = createRoot(dropzoneMountRef.current);
        }

        const padding = 80;
        let height = intersectingRect?.height ?? 0;
        let width =  intersectingRect?.width ?? 0;
        width += SVG_XY_OFFSET / 2;

        let left = intersectingRect?.left ?? 0;
        let top = intersectingRect?.top ?? 0;
        left -= padding / 2;
        left -= SVG_XY_OFFSET / 2;
        top -= padding / 2;
        top -= SVG_XY_OFFSET / 2;

        dropzoneRootRef.current.render(
          <AnimatedBorder
            padding={padding}
            ref={dropzoneRef}
            left={left}
            top={top}
            height={height}
            transition={{
              duration: 1,
              ease: CUBIC,
            }}
            width={width}
            zIndex={15}
          />
        );
      }
      activeDropzoneRef.current = intersectingRect;
    } else if (activeDropzoneRef.current) {
      resetDropzone();
    }
  }

  function handleDragEnd(event: any, info: DragInfo) {
    if (!selectedItemRef.current) return;

    handlePointerUp(event, info);
  }

  function handlePointerUp(event: any, info?: DragInfo) {
    if (!selectedItemRef.current) return;

    event?.preventDefault();
    event?.stopPropagation();

    const selectedItem = selectedItemRef.current;
    selectedItemRef.current = null;

    const {
      block,
    } = getIntersectingData(selectedItem, event, info);

    // console.log(rectsMappingRef.current, intersectingRect, rect, onItemDropHandlersRef.current)

    Object
      .values(onItemDropHandlersRef.current ?? {})
      .forEach(handler => handler(event, selectedItem?.item, block));

    if (draggableItemRootRef.current) {
      draggableItemRootRef.current.render(null);
    }

    resetDragging();
  }

  function handleDragStart(event: any, opts?: any) {
    event.preventDefault();
    event.stopPropagation();

    const {
      blockType,
      isBlockFile,
      isFolder,
      item,
      path,
    } = opts || {};

    const block = {
      ...item,
      name: capitalizeRemoveUnderscoreLower(removeExtensionFromFilename(item?.name ?? item?.uuid)),
      type: blockType,
    };

    if (!draggableItemRootRef.current) {
      draggableItemRootRef.current = createRoot(draggableItemElementRef.current);
    }

    draggableItemRootRef.current.render(
      <ContextProvider>
        <TeleportBlock
          block={block}
          node={{
            block,
          }}
        />
      </ContextProvider>,
    );
    selectedItemRef.current = { block, item };

    dragControls.start(event);
    resetDragging();

    draggableItemElementRef.current.style.display = '';
    draggableItemElementRef.current.style.opacity = '1';
    draggableItemElementRef.current.style.pointerEvents = 'all';
    draggableItemElementRef.current.style.visibility = 'visible';

    setTimeout(() => {
      const { height, width } = draggableItemElementRef.current.getBoundingClientRect();
      const { pageX, pageY } = event;

      // draggableItemElementRef.current.style.transform = 'translate(0px, 0px)';
      // draggableItemElementRef.current.style.transformOrigin = '0 0';

      draggableItemElementRef.current.style.left = `${pageX - width / 2}px`;
      draggableItemElementRef.current.style.top = `${pageY - height / 2}px`;
    }, 1);
  }

  const itemDragSettingsMemo = useCallback((item: ItemType, opts?: {
    blockType?: BlockTypeEnum;
    isBlockFile?: boolean;
    isFolder?: boolean;
    path?: string;
  }) => {
    const {
      blockType,
      isBlockFile,
      isFolder,
      path,
    } = opts || {};

    if (!isBlockFile) return;

    return {
      drag: false,
      // dragControls,
      // dragMomentum
      // dragPropagation
      // initial
      // role
      // style
      // onDrag
      // onDragEnd
      // onPointerUp
      onPointerDown: (event: any) => {
        handleDragStart(event, {
          item,
          ...opts,
        });
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    registerCommands({
      escape: {
        handler: (event: any) => {
          selectedItemRef.current = null;
          resetDragging();
          handlePointerUp(event);
        },
        predicate: { key: KeyEnum.ESCAPE },
      },
    })

    return () => {
      deregisterCommands();
    }
  }, []);

  return (
    <div className={[stylesHeader.content, stylesPipelineBuilderPage.container].join(' ')}>
      <div ref={dropzoneMountRef} />

      <motion.div
        animate={animationControls}
        className={[
          stylesPipelineBuilderPage.draggableItem,
        ].join(' ')}
        drag
        dragControls={dragControls}
        dragMomentum={false}
        dragPropagation={false}
        onDrag={handleDragging}
        onDragEnd={handleDragEnd}
        onPointerUp={handlePointerUp}
        ref={draggableItemElementRef}
      />

      <FileBrowser
        {...sharedProps}
        addPanel={addPanel}
        itemDragSettings={itemDragSettingsMemo}
      />

      <div
        className={[
          stylesPipelineBuilderPage.appToolbar,
          stylesPipelineBuilderPage.appToolbarBottom,
        ].join(' ')}
      >
        <div ref={appToolbarRef} />
      </div>

      <div
        className={[
          stylesPipelineBuilder.wrapper,
          stylesPipelineBuilderPage.active,
        ].filter(Boolean).join(' ')}
        ref={canvasWrapperRef}
        style={{
          height: '100vh',
          overflow: 'visible',
          position: 'relative',
          width: '100vw',
        }}
      >
        <PipelineCanvas
          {...rest as any}
          {...sharedProps}
          onUpdateRects={handleUpdateRects}
          wrapperRef={canvasWrapperRef}
        />
      </div>

      <AppManagerLayout
        className={[
          stylesPipelineBuilderPage.appManager,
          stylesPipelineBuilderPage.inactive,
        ].filter(Boolean).join(' ')}
        containerRef={appManagerContainerRef}
        ref={appManagerWrapperRef}
      />
    </div>
  );
}

export default PipelineBuilder;
