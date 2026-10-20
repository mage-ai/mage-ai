import { ColorsType } from '../colors';

export function rules(colors: ColorsType): Record<string, Record<string, string>> {
  return {
    // Purple types
    type: { foreground: '#6B50D7' },
    'type.class': { foreground: '#6B50D7', fontStyle: 'bold' },
    'type.class.class_definition': { foreground: '#6B50D7' },
    'type.primitive': { foreground: '#B026FF' },
    'type.primitive.class_definition': { foreground: '#B026FF' },

    // Constants: brown
    constant: { foreground: '#E3D4C2' },
    'string.quote.double.triple': { foreground: '#BFA78B', fontStyle: 'italic' },
    'string.quote.single.triple': { foreground: '#BFA78B', fontStyle: 'italic' },
    comment: { foreground: '#AF8859', fontStyle: 'italic' },
    'comment.doc': { foreground: '#AF8859', fontStyle: 'italic' },

    // Blue: functions, instance variables
    constructor: { foreground: '#BDCEFF' },
    attribute: { foreground: '#81A1FF' },
    property: { foreground: '#81A1FF' },
    'function.name': { foreground: '#517DFF', fontStyle: 'italic' },
    'function.decorator': { foreground: '#2A60FE' },
    'string.link': { foreground: '#4F6AC4', fontStyle: 'underline' },

    // Darkened reds: keywords
    'keyword.class': { foreground: '#9A1900', fontStyle: 'italic' },
    namespace: { foreground: '#CC8899' },
    'keyword.as': { foreground: '#CC7381', fontStyle: 'italic' },
    'keyword.from': { foreground: '#CC2F50', fontStyle: 'italic' },
    keyword: { foreground: '#CC0033' },
    'keyword.import': { foreground: '#A60023', fontStyle: 'italic' },

    // Variables
    'variable.self': { foreground: '#B98D95' }, // Peach
    'punctuation.dot': { foreground: '#C7CDDA' }, // Gray light
    variable: { foreground: '#A1A1A1' }, // Gray medium
    enum: { foreground: '#70747C' }, // Gray dark

    // Darkened pinks: brackets
    'brackets.square': { foreground: '#CC6699', background: '#CC6699' },
    'brackets.round': { foreground: '#CC33A5', background: '#CC33A5' },
    'brackets.curly': { foreground: '#990066', background: '#990066' },
    'brackets.square.python': { foreground: '#CC6699', background: '#CC6699' },
    'brackets.round.python': { foreground: '#CC33A5', background: '#CC33A5' },
    'brackets.curly.python': { foreground: '#990066', background: '#990066' },

    // Invalid/Delimiters: orange
    'punctuation.delimiter': { foreground: '#FF9933' },
    'punctuation.comma': { foreground: '#FF6700' },
    'string.invalid': { foreground: '#F6540B', fontStyle: 'italic underline' },

    // Literals/Operator: yellow
    operator: { foreground: '#CBFE00' },
    'literal.none': { foreground: '#FFE662' },
    'literal.boolean': { foreground: '#FFDA19' },
    'literal.number': { foreground: '#F6C000' },

    // Green
    'string.regex.delimiter': { foreground: '#C6EEDB' },
    string: { foreground: '#7AA300' },
    'string.regex': { foreground: '#9DDFBF' },
    'string.escape': { foreground: '#6BBF96' },
    'string.quote.double': { foreground: '#37A46F' },
    'string.quote.single': { foreground: '#00954C' },
  };
}
