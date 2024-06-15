import type { CSSProperties, FC } from 'react';
import { memo } from 'react';

const styles: CSSProperties = {
  border: '1px dashed gray',
  padding: '0.5rem 1rem',
  cursor: 'move',
};

export interface BoxProps {
  title: string
  yellow?: boolean
  preview?: boolean
}

const BlockNode: FC<BoxProps> = memo(function Box({ title, yellow, preview }) {
  const backgroundColor = yellow ? 'yellow' : 'white';
  return (
    <div
      role={preview ? 'BoxPreview' : 'Box'}
      style={{ ...styles, backgroundColor }}
    >
      {title}
    </div>
  );
});

export default BlockNode;
