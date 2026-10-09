import Image from 'next/image';
import React from 'react';
import { UNIT } from '@oracle/styles/units/spacing';

interface ImageOutputProps {
  data: string;
  height?: number;
  mimeType?: string;
  uuid?: string;
}

function ImageOutput({
  data,
  height = UNIT * 60,
  mimeType = 'image/png',
  uuid,
}: ImageOutputProps): JSX.Element {
  const src = `data:${mimeType};base64,${data.replace(/^\s+|\s+$/g, '')}`;

  return (
    <div
      style={{
        backgroundColor: '#000000',
        height,
        overflow: 'auto',
        position: 'relative',
      }}
    >
      <Image
        alt={`Image ${uuid ? `${uuid} ` : ''}from code output`}
        layout="fill"
        src={src}
        unoptimized
      />
    </div>
  );
}

export default ImageOutput;
