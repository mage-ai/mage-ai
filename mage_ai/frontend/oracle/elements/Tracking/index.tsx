// import { Amplitude } from '@amplitude/react-amplitude';

import EventPropertiesType, { buildEventProperties } from '@interfaces/EventPropertiesType';
import UserPropertiesType, { buildUserProperties } from '@interfaces/UserPropertiesType';

type TrackingProps = {
  children: any;
  eventProperties?: EventPropertiesType;
  userProperties?: UserPropertiesType;
};

function Tracking({
  children,
  eventProperties,
  userProperties,
}: TrackingProps) {
  return children(eventType => false);

  // return (
  //   <Amplitude
  //     eventProperties={buildEventProperties({
  //       ...(eventProperties || {}),
  //     })}
  //     userProperties={buildUserProperties(userProperties)}
  //   >
  //     {children}
  //   </Amplitude>
  // );
}

export default Tracking;
