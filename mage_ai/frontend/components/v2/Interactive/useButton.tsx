import { useCallback, useMemo, useRef } from 'react';

import Button, { ButtonProps } from '@mana/elements/Button';
import styles from '@styles/scss/components/Button/Interactive/useButton.module.scss';
import { randomSimpleHashGenerator } from '@utils/string';


export default function useButton({
  button1Props,
  button2Props,
  onClick,
  uuid: uuidProp,
  value,
}: {
  button1Props?: {
    Icon?: ButtonProps['Icon'],
  };
  button2Props?: {
    Icon?: ButtonProps['Icon'],
  };
  onClick?: (value: boolean) => void;
  uuid?: string;
  value?: boolean;
}): {
  container: JSX.Element;
  handleClick: () => void;
} {
  const uuidRef = useRef(uuidProp || randomSimpleHashGenerator());
  const valueRef = useRef(value);

  function buttonID(id: number): string {
    return `button-${uuidRef.current}-${id}`;
  }

  const handleClick = useCallback(() => {
    const value = !valueRef.current;
    valueRef.current = value;

    if (onClick) {
      onClick?.(value);
    }

    const element1 = document.getElementById(buttonID(1));
    if (element1) {
      element1.classList.add(value ? styles.hidden : styles.visible);
      element1.classList.remove(value ? styles.visible : styles.hidden);
    }
    const element2 = document.getElementById(buttonID(2));
    if (element2) {
      element2.classList.add(value ? styles.visible : styles.hidden);
      element2.classList.remove(value ? styles.hidden : styles.visible);
    }
  }, [onClick]);

  return {
    container: (
      <div className={styles.container}>
        <Button
          {...button1Props}
          className={valueRef?.current ? styles.hidden : styles.visible}
          id={buttonID(1)}
          onClick={handleClick}
        />
        <Button
          {...button2Props}
          className={valueRef?.current ? styles.visible : styles.hidden}
          id={buttonID(2)}
          onClick={handleClick}
        />
      </div>
    ),
    handleClick,
  };
}
