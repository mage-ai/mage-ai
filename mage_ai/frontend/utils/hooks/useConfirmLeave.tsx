import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import Panel from '@oracle/components/Panel';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { useModal } from '@context/Modal';

const useConfirmLeave = ({
  shouldWarn,
  warningMessage,
}: {
  shouldWarn: boolean;
  warningMessage?: string;
}) => {
  const router = useRouter();
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [navigationConfig, setNavigationConfig] = useState<{
    isModalOpen: boolean;
    nextRoute: string | null;
  }>({
    isModalOpen: false,
    nextRoute: null,
  });

  // Use beforeunload to prevent closing the tab, refreshing the page or moving outside the Next app
  useEffect(() => {
    const handleWindowClose = (e: BeforeUnloadEvent) => {
      if (!shouldWarn) return;
      e.preventDefault();
      const event = e || window.event;
      return (event.returnValue = 'Are you sure you want to leave?');
    };

    window.addEventListener('beforeunload', handleWindowClose);
    return () => {
      window.removeEventListener('beforeunload', handleWindowClose);
    };
  }, [shouldWarn]);

  // Use routeChangeStart to prevent navigation inside of the Next app
  useEffect(() => {
    const onRouteChangeStart = (route: string) => {
      if (!shouldWarn || hasConfirmed) return;
      else {
        setNavigationConfig({
          isModalOpen: true,
          nextRoute: route,
        });
        router.events.emit('routeChangeError');
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw 'navigation aborted';
      }
    };
    router.events.on('routeChangeStart', onRouteChangeStart);
    const cleanUp = () =>
      router.events.off('routeChangeStart', onRouteChangeStart);

    if (hasConfirmed) {
      if (!navigationConfig.nextRoute) return;
      void router.push(navigationConfig.nextRoute);
      return cleanUp;
    }

    return cleanUp;
  }, [navigationConfig, hasConfirmed, router, shouldWarn]);

  const [showModal, hideModal] = useModal(() => (
    <Panel>
      <Text>
        {warningMessage}
      </Text>

      <Spacing mt={2}>
        <FlexContainer alignItems="center">
          <Button
            onClick={() => setHasConfirmed(true)}
            primary
          >
            Leave
          </Button>

          <Spacing mr={1} />

          <Button
            onClick={() => {
              setNavigationConfig({
                isModalOpen: false,
                nextRoute: null,
              });
            }}
            secondary
          >
            Cancel
          </Button>
        </FlexContainer>
      </Spacing>
    </Panel>
  ), {
  }, [
    warningMessage,
  ], {
    background: true,
    hideCallback: () => {
      setNavigationConfig({
        isModalOpen: false,
        nextRoute: null,
      });
    },
    uuid: 'stale_pipeline_message',
  });

  useEffect(() => {
    if (navigationConfig.isModalOpen) {
      showModal();
    } else {
      hideModal();
    }
  }, [
    hideModal,
    navigationConfig.isModalOpen,
    showModal,
  ]);

  const ConfirmLeaveModal = () => (
    <div />
  );

  return {
    ConfirmLeaveModal,
  };
};

export default useConfirmLeave;
