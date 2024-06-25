import { PortType } from '../../interfaces';
import Text from '@mana/elements/Text';
import Circle from '@mana/elements/Circle';
import Grid from '@mana/components/Grid';
import { getBlockColor } from '@mana/themes/blocks';
import { useEffect, useMemo, useRef } from 'react';
import { DraggablePort } from '../../Draggable/DraggablePort';
import { DragAndDropHandlersType } from '../types';

type ConnectionProps = {
  draggable?: boolean;
  input: PortType;
  output: PortType;
  emphasized?: boolean;
  onMount?: (port: PortType, portRef: React.RefObject<HTMLDivElement>) => void;
} & DragAndDropHandlersType;

export default function Connection({
  draggable,
  input,
  handlers,
  output,
  onMount,
}: ConnectionProps) {
  const inputRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const inputColor = (
    getBlockColor(input?.target?.block?.type, {
      getColorName: true,
    })?.names?.base || 'gray'
  )?.toLowerCase();
  const outputColor = (
    getBlockColor(output?.target?.block?.type, {
      getColorName: true,
    })?.names?.base || 'gray'
  )?.toLowerCase();

  useEffect(() => {
    if (onMount) {
      input?.target && onMount(input, inputRef);
      output?.target && onMount(output, outputRef);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inputPort = useMemo(
    () => (
      <Circle
        backgroundColor={input ? inputColor : undefined}
        borderColor={input ? (inputColor ? undefined : 'gray') : 'red'}
        size={12}
      />
    ),
    [input, inputColor],
  );

  const outputPort = useMemo(
    () => (
      <Circle
        backgroundColor={output ? outputColor : undefined}
        borderColor={output ? (outputColor ? undefined : 'gray') : 'red'}
        size={12}
      />
    ),
    [output, outputColor],
  );

  return (
    <Grid
      alignItems="center"
      columnGap={8}
      templateColumns={[
        (input && output) || !(input && output) ? '1fr 1fr' : '',
        input && !output ? 'auto auto' : '',
        !input && output ? 'auto auto' : '',
      ].join(' ')}
      templateRows="1fr"
    >
      <Grid
        alignItems="center"
        columnGap={8}
        justifyItems="start"
        templateColumns="auto 1fr"
        templateRows="1fr"
      >
        <div ref={inputRef} style={{ height: 12, width: 12 }}>
          {!draggable && inputPort}
          {draggable && (
            <DraggablePort handlers={handlers} item={input} itemRef={inputRef}>
              {inputPort}
            </DraggablePort>
          )}
        </div>

        <Text italic={!input} muted small>
          {input?.target?.block?.name || input?.target?.block?.uuid || 'Input'}
        </Text>
      </Grid>

      <Grid
        alignItems="center"
        columnGap={8}
        justifyItems="end"
        templateColumns="1fr auto"
        templateRows="1fr"
      >
        <Text italic={!output} muted small>
          {output?.target?.block?.name || output?.target?.block?.uuid || 'Output'}
        </Text>

        <div ref={outputRef} style={{ height: 12, width: 12 }}>
          {!draggable && outputPort}
          {draggable && (
            <DraggablePort handlers={handlers} item={output} itemRef={outputRef}>
              {outputPort}
            </DraggablePort>
          )}
        </div>
      </Grid>
    </Grid>
  );
}
