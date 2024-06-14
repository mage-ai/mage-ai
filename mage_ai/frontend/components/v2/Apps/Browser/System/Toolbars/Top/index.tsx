import React from 'react';

import Button from '@mana/elements/Button';
import TextInput from '@mana/elements/Input/TextInput';

function ToolbarTop() {
  return (
    <>
      <Button
        onClick={() => {
          console.log('browse');
        }}
        small
      >
        Browse
      </Button>

      <TextInput basic monospace placeholder="/" small />
    </>
  );
}

export default ToolbarTop;
