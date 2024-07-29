import AppManagerLayout from '../../AppManager';
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
import { useMemo, useRef } from 'react';

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

  return (
    <div className={[stylesHeader.content, stylesPipelineBuilderPage.container].join(' ')}>
      <FileBrowser
        {...sharedProps}
        addPanel={addPanel}
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
