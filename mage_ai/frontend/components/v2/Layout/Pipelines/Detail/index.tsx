import AppManagerLayout from '../../AppManager';
import FileBrowser from '@components/v2/FileBrowser';
import Grid from '@mana/components/Grid';
import PipelineExecutionFrameworkType from '@interfaces/PipelineExecutionFramework/interfaces';
import PipelineType from '@interfaces/PipelineType';
import dynamic from 'next/dynamic';
import stylesHeader from '@styles/scss/layouts/Header/Header.module.scss';
import stylesPipelineBuilder from '@styles/scss/pages/PipelineBuilder/PipelineBuilder.module.scss';
import useManager from '@components/v2/Apps/useManager';
import { CanvasProps } from '@components/v2/Apps/PipelineCanvas/CanvasV2';
import { PanelType } from '@components/v2/Apps/interfaces';
import { useRef } from 'react';

interface PipelineDetailProps {
  framework: PipelineExecutionFrameworkType;
  useExecuteCode: any;
  useRegistration: any;
  pipeline: PipelineType;
}

const PipelineCanvas = dynamic(() => import('@components/v2/Apps/PipelineCanvas'), { ssr: false });

function PipelineBuilder({ removeContextMenu, renderContextMenu, ...rest }: PipelineDetailProps & CanvasProps) {
  const appManagerContainerRef = useRef<HTMLDivElement>(null);
  const appManagerWrapperRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  function handleAddPanel(panel: PanelType, count: number) {
    if (count > 0) {
      appManagerWrapperRef.current.classList.add(stylesPipelineBuilder.active);
      appManagerWrapperRef.current.classList.remove(stylesPipelineBuilder.inactive);

      canvasWrapperRef.current.classList.add(stylesPipelineBuilder.inactive);
      canvasWrapperRef.current.classList.remove(stylesPipelineBuilder.active);
    }
  }

  function handleRemovePanel(panel: PanelType, count: number) {
    if (count === 0) {
      appManagerWrapperRef.current.classList.remove(stylesPipelineBuilder.active);
      appManagerWrapperRef.current.classList.add(stylesPipelineBuilder.inactive);

      canvasWrapperRef.current.classList.remove(stylesPipelineBuilder.inactive);
      canvasWrapperRef.current.classList.add(stylesPipelineBuilder.active);
    }
  }

  const { addPanel } = useManager({
    containerRef: appManagerContainerRef,
    onAddPanel: handleAddPanel,
    onRemovePanel: handleRemovePanel,
  });

  return (
    <div className={[stylesHeader.content, stylesPipelineBuilder.container].join(' ')}>
      <FileBrowser
        addPanel={addPanel}
        removeContextMenu={removeContextMenu}
        renderContextMenu={renderContextMenu}
      />

      <div
        className={[
          stylesPipelineBuilder.wrapper,
          stylesPipelineBuilder.active,
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
          removeContextMenu={removeContextMenu}
          renderContextMenu={renderContextMenu}
          wrapperRef={canvasWrapperRef}
        />
      </div>

      <AppManagerLayout
        className={[
          stylesPipelineBuilder.appManager,
          stylesPipelineBuilder.inactive,
        ].filter(Boolean).join(' ')}
        containerRef={appManagerContainerRef}
        ref={appManagerWrapperRef}
      />
    </div>
  );
}

export default PipelineBuilder;
