export const pythonLanguageExtension = {
  aliases: ['Python', 'python'],
  extensions: ['.py'],
  id: 'python',
  mimetypes: ['text/x-python'],
};

export default function configuration() {
  return {
    brackets: [
      // Your defined brackets
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
      ['<', '>'],
      ['"', '"'],
      ['_', '_'],
      ['**', '**'],
      ['**_', '_**'],
      ['{{', '}}'],
      ['`', '`'],
      ['#ifndef', '#endif'],
      ['<%', '%>'],
      ['${', '}'],
      ['$', ')'],
    ],
    autoClosingPairs: [
      // Optionally define auto-closing pairs
      { open: '{', close: '}', notIn: ['string'] },
      { open: '[', close: ']', notIn: ['string'] },
      { open: '(', close: ')', notIn: ['string'] },
      { open: '<', close: '>' },
      { open: '"', close: '"' },
      { open: '_', close: '_' },
      { open: '**', close: '**' },
      { open: '**_', close: '_**' },
      { open: '{{', close: '}}' },
      { open: '`', close: '`' },
      { open: '#ifndef', close: '#endif' },
      { open: '<%', close: '%>' },
      { open: '${', close: '}' },
      { open: '$(', close: ')' },
    ],
    surroundingPairs: [
      // Define pairs that trigger when surrounding selections
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '<', close: '>' },
      { open: '"', close: '"' },
      { open: '_', close: '_' },
      { open: '**', close: '**' },
      { open: '**_', close: '_**' },
      { open: '{{', close: '}}' },
      { open: '`', close: '`' },
      { open: '#ifndef', close: '#endif' },
      { open: '<%', close: '%>' },
      { open: '${', close: '}' },
      { open: '$(', close: ')' },
    ],
    colorizedBracketPairs: [['{', '}']],
  };
}
