import { useEffect, useRef } from 'react';

export default function useWaitUntilAttempt() {
  const attemptsRef = useRef<Record<string, number>>({});
  const timeout0Ref = useRef(factory());
  const timeout1Ref = useRef(factory());

  function handler({
    abortIfInvalid = false,
    maxAttempts = 10,
    onAttempt,
    pollInterval = 1000,
    uuid,
    waitUntil,
  }: {
    abortIfInvalid?: boolean;
    maxAttempts?: number;
    onAttempt: (data?: any) => void;
    pollInterval?: number;
    uuid: string;
    waitUntil: () => [boolean, any] | [boolean];
  }) {
    attemptsRef.current[uuid] = maxAttempts;
    if (timeout0Ref.current.timeouts.length === 0 && timeout1Ref.current.timeouts.length === 0) {
      timeout0Ref.current.reset();
      timeout1Ref.current.reset();
    }

    const timeout = timeout0Ref.current.timeouts.pop() || timeout1Ref.current.timeouts.pop();

    function process(timeoutInner) {
      console.log('process', uuid)
      clearTimeout(timeoutInner?.current);
      timeoutInner.current = null;
      attemptsRef.current[uuid] -= 1;

      const limitReached = attemptsRef.current[uuid] <= 0;
      if (limitReached && abortIfInvalid) return;

      const [ready, data] = waitUntil();
      // console.log('ready', ready)

      if (ready || (limitReached && !abortIfInvalid)) {
        onAttempt(data);
      } else {
        timeoutInner.current = setTimeout(() => {
          process(timeoutInner);
        }, pollInterval);
      }
    }

    process(timeout);
  }

  return handler;
}

function factory() {
  const timeout0Ref = useRef(null);
  const timeout1Ref = useRef(null);
  const timeout2Ref = useRef(null);
  const timeout3Ref = useRef(null);
  const timeout4Ref = useRef(null);
  const timeout5Ref = useRef(null);
  const timeout6Ref = useRef(null);
  const timeout7Ref = useRef(null);
  const timeout8Ref = useRef(null);
  const timeout9Ref = useRef(null);

  const timeouts = useRef([
    timeout0Ref,
    timeout1Ref,
    timeout2Ref,
    timeout3Ref,
    timeout4Ref,
    timeout5Ref,
    timeout6Ref,
    timeout7Ref,
    timeout8Ref,
    timeout9Ref,
  ]);

  useEffect(() => {
    return () => {
      reset(false);
    };
  }, []);

  function reset(reload = true) {
    clearTimeout(timeout0Ref.current);
    timeout0Ref.current = null;
    clearTimeout(timeout1Ref.current);
    timeout1Ref.current = null;
    clearTimeout(timeout2Ref.current);
    timeout2Ref.current = null;
    clearTimeout(timeout3Ref.current);
    timeout3Ref.current = null;
    clearTimeout(timeout4Ref.current);
    timeout4Ref.current = null;
    clearTimeout(timeout5Ref.current);
    timeout5Ref.current = null;
    clearTimeout(timeout6Ref.current);
    timeout6Ref.current = null;
    clearTimeout(timeout7Ref.current);
    timeout7Ref.current = null;
    clearTimeout(timeout8Ref.current);
    timeout8Ref.current = null;
    clearTimeout(timeout9Ref.current);
    timeout9Ref.current = null;

    if (reload) {
      timeouts.current = [
        timeout0Ref,
        timeout1Ref,
        timeout2Ref,
        timeout3Ref,
        timeout4Ref,
        timeout5Ref,
        timeout6Ref,
        timeout7Ref,
        timeout8Ref,
        timeout9Ref,
      ];
    }
  }

  return {
    reset,
    timeouts: timeouts.current,
  };
}
