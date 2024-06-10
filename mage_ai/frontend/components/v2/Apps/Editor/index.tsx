import React from 'react';

import Button from '@mana/elements/Button';
import Divider from '@mana/elements/Divider';
import Tag from '@mana/components/Tag';
import Text from '@mana/elements/Text';
import { ModeEnum } from '@mana/themes/modes';
import { Row, Col } from '@mana/components/Container';
import icons from '@mana/icons';
import { range } from '@utils/array';
import { setThemeSettings } from '@mana/themes/utils';

const { Settings } = icons;

import { randomSimpleHashGenerator } from '@utils/string';

export function createUUID() {
  return `grid-item-${randomSimpleHashGenerator()}`;
}

const TXT = `I’ve found several existing blocks that can potentially be reused.
Take a look and let me know if anything works, you can also ask me to simply choose the best one.`;

function EditorApp() {
  return (
    <>
      <Row direction='column' nogutter>
        <Col xs='content'>
          <Row>
            <Col>
              <Text>{range((Number(new Date()) % 2) + 1).reduce(acc => TXT + ' ' + acc, '')}</Text>
            </Col>
            <Col xs='content'>
              <Tag>Block</Tag>
            </Col>
          </Row>
          <Divider short />
          <Row>
            <Col>
              <Text monospace>
                {range((Number(new Date()) % 2) + 1).reduce(acc => TXT + ' ' + acc, '')}
              </Text>
            </Col>
          </Row>
        </Col>
      </Row>

      <Button
        Icon={Settings}
        onClick={() =>
          setThemeSettings(({ mode }) => ({
            mode: ModeEnum.LIGHT === mode ? ModeEnum.DARK : ModeEnum.LIGHT,
          }))
        }
        primary
        small
      >
        Theme
      </Button>
    </>
  );
}

export default EditorApp;
