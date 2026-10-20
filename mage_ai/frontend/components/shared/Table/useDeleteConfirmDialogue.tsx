import React, { createRef, useRef, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import PopupMenu from '@oracle/components/PopupMenu';
import Spacing from '@oracle/elements/Spacing';
import {
  DELETE_CONFIRM_WIDTH,
  DELETE_CONFIRM_LEFT_OFFSET_DIFF,
  DELETE_CONFIRM_TOP_OFFSET_DIFF,
  DELETE_CONFIRM_TOP_OFFSET_DIFF_FIRST,
} from '@components/shared/Table/constants';
import { ICON_SIZE_SMALL } from '@oracle/styles/units/icons';
import { Trash } from '@oracle/icons';
import { onSuccess } from '@api/utils/response';
import { useError } from '@context/Error';

type UseDeleteConfirmDialogueProps = {
  fetchItems: () => void;
  mutationFn: (variables: any) => any;
  path: string;
  pipelineUUID?: string;
};

function useDeleteConfirmDialogue({
  fetchItems,
  mutationFn,
  path,
  pipelineUUID,
}: UseDeleteConfirmDialogueProps): {
  deleteButton: (
    itemToDeleteId: number,
    itemIndex: number,
    message: string,
  ) => JSX.Element;
} {
  const router = useRouter();
  const deleteButtonRefs = useRef({});
  const [deleteConfirmationOpenIdx, setDeleteConfirmationOpenIdx] = useState<number>(null);
  const [confirmDialogueTopOffset, setConfirmDialogueTopOffset] = useState<number>(0);
  const [confirmDialogueLeftOffset, setConfirmDialogueLeftOffset] = useState<number>(0);

  const [showError] = useError(null, {}, [], {
    uuid: `${path}/${pipelineUUID}/delete/error`,
  });

  const [deleteItem] = useMutation(
    (id: number) => mutationFn(id)(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchItems?.();
            if (pipelineUUID) {
              router.push(
                `/pipelines/[pipeline]/${path}`,
                `/pipelines/${pipelineUUID}/${path}`,
              );
            }
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const deleteButton = (
    itemToDeleteId: number,
    itemIndex: number,
    message: string,
  ) => {
    deleteButtonRefs.current[itemToDeleteId] = createRef();

    return (
      <Spacing mr={1}>
        <Button
          default
          iconOnly
          noBackground
          onClick={() => {
            setDeleteConfirmationOpenIdx(itemToDeleteId);
            setConfirmDialogueTopOffset(deleteButtonRefs.current[itemToDeleteId]?.current?.offsetTop || 0);
            setConfirmDialogueLeftOffset(deleteButtonRefs.current[itemToDeleteId]?.current?.offsetLeft || 0);
          }}
          ref={deleteButtonRefs.current[itemToDeleteId]}
          title="Delete"
        >
          <Trash default size={ICON_SIZE_SMALL} />
        </Button>
        <ClickOutside
          onClickOutside={() => setDeleteConfirmationOpenIdx(null)}
          open={deleteConfirmationOpenIdx === itemToDeleteId}
        >
          <PopupMenu
            danger
            left={(confirmDialogueLeftOffset || 0) - DELETE_CONFIRM_LEFT_OFFSET_DIFF}
            onCancel={() => setDeleteConfirmationOpenIdx(null)}
            onClick={() => {
              setDeleteConfirmationOpenIdx(null);
              deleteItem(itemToDeleteId);
            }}
            title={message}
            top={(confirmDialogueTopOffset || 0)
              - (itemIndex <= 1 ? DELETE_CONFIRM_TOP_OFFSET_DIFF_FIRST : DELETE_CONFIRM_TOP_OFFSET_DIFF)
            }
            width={DELETE_CONFIRM_WIDTH}
          />
        </ClickOutside>
      </Spacing>
    );
  };

  return {
    deleteButton,
  };
}

export default useDeleteConfirmDialogue;
