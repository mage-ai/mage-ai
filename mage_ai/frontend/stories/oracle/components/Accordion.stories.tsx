import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

import Accordion, { AccordionProps } from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import Text from '@oracle/elements/Text';
import ThemeBlock from '../../ThemeBlock';

export default {
  component: Accordion,
  title: 'Oracle/Components/Accordion',
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    {/*@ts-ignore*/}
    <Accordion {...props} />
  </ThemeBlock>
);

const Template: StoryFn<AccordionProps> = (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});
Regular.args = {
  children: [
    <AccordionPanel key={1} title="Class in session">
      <Text>
        There was a rush of air as several figures seemed to slide from the shadows,
        stepping out of the surrounding mesas at impossible angles.
        They were dressed in dark clothes, metal masks hovering where their faces should be.
        A sickly purple light coalesced in each of their raised hands—all of which were pointed at
        the man with the fox-thing. Slowly, he raised his hands in surrender.
      </Text>
    </AccordionPanel>,
    <AccordionPanel key={2} title="Lessons">
      <Text>
        He wasn&#39;t excited about facing Extus again—not after failing his mission.
        But he would worry about that when he got out alive.
        Tavver had seen true darkness in that professor&#39;s violet eyes.
        She&#39;d meant to kill him—and for what?
        So that Extus could have some dusty old book he remembered from however many years ago?
      </Text>
    </AccordionPanel>,
    <AccordionPanel key={3} title="Extracurriculars">
      <Text>
        Looking out the window over his desk,
        Will could see the winds of autumn stirring fallen leaves across the courtyard.
        Students in the blue and red of Prismari passed by,
        laughing and chatting, sipping on hot drinks.
        When his eyes finally drifted back to the Ethics of Aetheric Manipulation assignment,
        the questions had yet to complete themselves.
        He sighed and picked up his pencil again just as the door to his dorm room creaked open.
        Rowan came in, her hair windblown and disordered, smiling about who-knew-what.
      </Text>
    </AccordionPanel>,
  ],
};
