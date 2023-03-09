import React from 'react';
import { useGlobalState } from '@storage/state';

type ApiReloaderProps = {
  children: any;
  uuid?: string;
  uuids?: string[];
};

function ApiReloader({
  children,
  uuid,
  uuids = [],
}: ApiReloaderProps) {
  const [apiReloads] = useGlobalState('apiReloads');
  const allUuids = [...uuids];
  if (uuid) {
    allUuids.push(uuid);
  }
  const ts = allUuids.map((id: string) => String(apiReloads[id]) || '-').join('_');

  return React.cloneElement(children, {
    key: ts,
  });
}

export default ApiReloader;
