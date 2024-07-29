import AppManagerLayout from '../../AppManager';
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
import useManager from '@components/v2/Apps/useManager';
import { CanvasProps } from '@components/v2/Apps/PipelineCanvas/CanvasV2';
import { PanelType } from '@components/v2/Apps/interfaces';
import { useCallback, useMemo, useRef } from 'react';
import { ItemType } from '@components/v2/Apps/Browser/System/interfaces';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { useDragControls } from 'framer-motion';
import ContextProvider from '@context/v2/ContextProvider';
import { capitalizeRemoveUnderscoreLower, removeExtensionFromFilename } from '@utils/string';

interface PipelineDetailProps {
  framework: PipelineExecutionFrameworkType;
  useExecuteCode: any;
  useRegistration: any;
  pipeline: PipelineType;
}

const PipelineCanvas = dynamic(() => import('@components/v2/Apps/PipelineCanvas'), { ssr: false });

function PipelineBuilder({ removeContextMenu, renderContextMenu, ...rest }: PipelineDetailProps & CanvasProps) {
  const appToolbarRef = useRef<HTMLDivElement>(null);
  const appManagerContainerRef = useRef<HTMLDivElement>(null);
  const appManagerWrapperRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const draggableItemRef = useRef<HTMLDivElement>(null);
  const draggableItemRootRef = useRef<Root>(null);
  const draggingItemRef = useRef<any>(null);

  const dragControls = useDragControls();

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
    removeContextMenu,
    renderContextMenu,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  function handleDragEnd(event, info) {
    event.preventDefault();
    event.stopPropagation();

    console.log('ADD', event, info, draggingItemRef.current)

    handlePointerUp(event);
    draggingItemRef.current = null;
  }

  function handlePointerUp(event: any) {
    // draggableItemRef.current.classList.add(stylesPipelineBuilderPage.hidden);
    if (draggableItemRootRef.current) {
      draggableItemRootRef.current.render(null);
    }
  }

  function handleDragStart(event: any, info, opts?: any) {
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
      draggableItemRootRef.current = createRoot(draggableItemRef.current);
    }
    console.log(draggableItemRootRef.current)
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

    draggingItemRef.current = item;
    // draggableItemRef.current.classList.remove(stylesPipelineBuilderPage.hidden);

    dragControls.start(event, {
      snapToCursor: true,
    });
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
      onPointerDown: (event: any, info) => {
        handleDragStart(event, info, {
          item,
          ...opts,
        });
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={[stylesHeader.content, stylesPipelineBuilderPage.container].join(' ')}>
      <motion.div
        className={[
          stylesPipelineBuilderPage.draggableItem,
          // stylesPipelineBuilderPage.hidden,
        ].join(' ')}
        drag
        dragControls={dragControls}
        dragMomentum={false}
        dragPropagation={false}
        onDragEnd={handleDragEnd}
        onPointerUp={handlePointerUp}
        ref={draggableItemRef}
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
