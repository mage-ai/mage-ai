import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

type ClickOutsideProps = {
  additionalRef?: any;
  children?: any;
  completeClickToClose?: boolean;
  disableClickOutside?: boolean;
  disableEscape?: boolean;
  isOpen?: boolean;
  onClick?: (event: any) => void;
  onClickOutside?: (event: any) => void;
  open?: boolean;
  style?: {
    [key: string]: number | string;
  };
};

function ClickOutside({
  additionalRef,
  children,
  completeClickToClose = false,
  disableClickOutside = false,
  disableEscape,
  isOpen,
  onClick,
  onClickOutside,
  open: openProp,
  style: styleProp,
}: ClickOutsideProps) {
  const node = useRef();
  const [openState, setOpen] = useState(isOpen);
  const open = openProp || openState;

  const handleClickOutside = useCallback(e => {
    // @ts-ignore
    if ((node && node?.current?.contains?.(e.target))
    || (additionalRef && additionalRef.current.contains(e.target))
    || disableClickOutside) {
      return;
    }
    if (onClickOutside) {
      onClickOutside(e);
    } else {
      setOpen(false);
    }
  }, [
    additionalRef,
    disableClickOutside,
    node,
    onClickOutside,
  ]);

  useEffect(() => {
    const clickType = completeClickToClose ? 'click' : 'mousedown';
    if (open) {
      document.addEventListener(clickType, handleClickOutside);
    } else {
      document.removeEventListener(clickType, handleClickOutside);
    }

    return () => {
      document.removeEventListener(clickType, handleClickOutside);
    };
  }, [completeClickToClose, handleClickOutside, open]);

  const handleUserKeyPress = useCallback(e => {
    const { key } = e;

    if (key === 'Escape' && open && onClickOutside) {
      onClickOutside(e);
      e.preventDefault();
    }
  }, [open, onClickOutside]);

  useEffect(() => {
    if (!disableEscape && typeof window !== 'undefined') {
      window.addEventListener('keydown', handleUserKeyPress);

      return () => {
        window.removeEventListener('keydown', handleUserKeyPress);
      };
    }
  }, [
    disableEscape,
    handleUserKeyPress,
  ]);

  return (
    <div
      onClick={onClick}
      ref={node}
      style={styleProp}
    >
      {open && children}
    </div>
  );
}

export default ClickOutside;
