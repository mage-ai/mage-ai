import React from 'react';

import Text from '@oracle/elements/Text';
import { ViewKeyEnum } from './constants';

export type SidekickProps = {
  activeView?: string;
  views: {
    key: string;
    label: string;
  }[];
};

function Sidekick({
  activeView,
}: SidekickProps) {
  return (
    <>
      {activeView === ViewKeyEnum.TREE &&
        <Text>
          Tree
        </Text>
      }
      {activeView === ViewKeyEnum.DATA &&
        <Text>
          Data
        </Text>
      }
      {activeView === ViewKeyEnum.REPORTS &&
        <Text>
          Reports
        </Text>
      }
      {activeView === ViewKeyEnum.GRAPHS &&
        <Text>
          Graphs
        </Text>
      }
    </>
  );
}

export default Sidekick;
