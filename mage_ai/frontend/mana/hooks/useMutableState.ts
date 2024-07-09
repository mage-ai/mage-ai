import { useRef, useState } from 'react';

const useMutableState = <T extends unknown>(initialValue: T): [T, (newValue: T) => void, () => void] => {
  const ref = useRef(initialValue);
  const [_, setRenderToggle] = useState(false);

  const setMutableState = (newValue: T) => {
    ref.current = newValue;
  };

  const forceRender = () => {
    setRenderToggle((prev) => !prev);
  };

  return [ref.current, setMutableState, forceRender];
};

export default useMutableState;
