import ApplicationForm from '../ApplicationForm';
import ApplicationItemDetail from '../ApplicationItemDetail';
import { ApplicationProps } from './constants';
import { CommandCenterItemType } from '@interfaces/CommandCenterType';
import { ItemApplicationTypeEnum } from '@interfaces/CommandCenterType';

function ItemApplication({
  ...props
}: ApplicationProps) {
  const {
    application,
    applicationsRef,
    item,
  } = props || {
    applicationsRef: null,
    item: null,
  };
  const applicationType = application?.application_type;

  if (ItemApplicationTypeEnum.DETAIL === applicationType) {
    return <ApplicationItemDetail {...props} />
  } else if (ItemApplicationTypeEnum.FORM === applicationType) {
    return <ApplicationForm {...props} />
  }

  return null;
}

export default ItemApplication;
