import { useEffect, useRef, useState } from 'react';

import { ApplicationProps } from '../ItemApplication/constants';

function ApplicationItemDetail({
  executeAction,
  focusedItemIndex,
  invokeRequest,
  item,
  itemsRef,
  refError,
  removeApplication,
}: ApplicationProps) {
  const refUUID = useRef(null);

  const application = item?.application;
  const action = application?.action;

  const [modelState, setModel] = useState(null);
  const model = refUUID?.current === item?.uuid ? modelState : null;

  useEffect(() => {
    invokeRequest({
      action,
      focusedItemIndex,
      item,
    }).then(() => {
      const itemRef = itemsRef?.current?.[focusedItemIndex];
      setModel(itemRef?.actionResults?.[action?.uuid]?.[action?.request?.response_resource_key]);
    });
  }, [action, focusedItemIndex, invokeRequest, item]);

  console.log(model);

  return (
    <>
    </>
  );
}

export default ApplicationItemDetail;
