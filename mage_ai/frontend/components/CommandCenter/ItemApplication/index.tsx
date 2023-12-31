import ApplicationForm from '../ApplicationForm';
import ApplicationItemDetail from '../ApplicationItemDetail';
import { ApplicationProps } from './constants';
import { CommandCenterItemType } from '@interfaces/CommandCenterType';
import { ItemApplicationTypeEnum } from '@interfaces/CommandCenterType';

function ItemApplication({
  ...props
}: ApplicationProps) {
  const {
    applicationsRef,
    item,
  } = props || {
    applicationsRef: null,
    item: null,
  };
  const application = item?.applications?.[applicationsRef?.current?.length - 1];
  const applicationType = application?.application_type;

  if (ItemApplicationTypeEnum.DETAIL === applicationType) {
    return <ApplicationItemDetail {...props} />
  } else if (ItemApplicationTypeEnum.FORM === applicationType) {
    return <ApplicationForm {...props} />
  }

  return null;
}

export default ItemApplication;
