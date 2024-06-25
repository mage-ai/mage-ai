TEMPLATES = """
### Fixed
fixed:
  description: 'Load fixed-size chunks from text.'
  name: 'Fixed-size chunk loader'
  path: transformers/chunking/fixed.py
  type: transformer
  inputs:
    text:
      style:
        input_type: null
        multiline: false
        monospace: true
      type: text_field
  variables:
    chunk_size:
      description: 'Size of each chunk.'
      name: 'Chunk size'
      input: text
      required: true
      types:
        - integer
      value: 1000  # Default value

### Sentence
sentence:
  description: 'Load sentence-based chunks from text.'
  name: 'Sentence chunk loader'
  path: transformers/chunking/sentence.py
  type: transformer
  inputs:
    text:
      style:
        input_type: null
        multiline: false
        monospace: true
      type: text_field
  variables:
    sentence_splitter:
      description: 'Splitter used for separating sentences.'
      name: 'Sentence splitter'
      input: text
      required: true
      types:
        - string

### Paragraph
paragraph:
  description: 'Load paragraph-based chunks from text.'
  name: 'Paragraph chunk loader'
  path: transformers/chunking/paragraph.py
  type: transformer
  inputs:
    text:
      style:
        input_type: null
        multiline: false
        monospace: true
      type: text_field
  variables:
    paragraph_splitter:
      description: 'Splitter used for separating paragraphs.'
      name: 'Paragraph splitter'
      input: text
      required: true
      types:
        - string

### Overlapping
overlapping:
  description: 'Load overlapping chunks from text.'
  name: 'Overlapping chunk loader'
  path: transformers/chunking/overlapping.py
  type: transformer
  inputs:
    text:
      style:
        input_type: null
        multiline: false
        monospace: true
      type: text_field
  variables:
    overlap_size:
      description: 'Size of overlap between adjacent chunks.'
      name: 'Overlap size'
      input: text
      required: true
      types:
        - integer
      value: 200  # Default value

### Token
token:
  description: 'Load token-based chunks from text.'
  name: 'Token chunk loader'
  path: transformers/chunking/token.py
  type: transformer
  inputs:
    text:
      style:
        input_type: null
        multiline: false
        monospace: true
      type: text_field
  variables:
    token_count:
      description: 'Number of tokens in each chunk.'
      name: 'Token count'
      input: text
      required: true
      types:
        - integer
      value: 100  # Default value

### Sliding Window
sliding_window:
  description: 'Load chunks from text using a sliding window approach.'
  name: 'Sliding window chunk loader'
  path: transformers/chunking/sliding_window.py
  type: transformer
  inputs:
    text:
      style:
        input_type: null
        multiline: false
        monospace: true
      type: text_field
  variables:
    window_size:
      description: 'Size of the sliding window.'
      name: 'Window size'
      input: text
      required: true
      types:
        - integer
      value: 1000  # Default value
    stride:
      description: 'Stride length for the sliding window.'
      name: 'Stride length'
      input: text
      required: true
      types:
        - integer
      value: 500  # Default value

### Delimiter
delimiter:
  description: 'Load chunks from text based on a specified delimiter.'
  name: 'Delimiter chunk loader'
  path: transformers/chunking/delimiter.py
  type: transformer
  inputs:
    text:
      style:
        input_type: null
        multiline: false
        monospace: true
      type: text_field
  variables:
    delimiter:
      description: 'Delimiter used to separate chunks.'
      name: 'Delimiter'
      input: text
      required: true
      types:
        - string
      value: '\n\n'  # Default value

### Semantic
semantic:
  description: 'Load semantic-based chunks from text using a pre-trained model.'
  name: 'Semantic chunk loader'
  path: transformers/chunking/semantic.py
  type: transformer
  inputs:
    text:
      style:
        input_type: null
        multiline: false
        monospace: true
      type: text_field
  variables:
    model_path:
      description: 'Path to the pre-trained semantic model.'
      name: 'Model path'
      input: text
      required: true
      types:
        - string

### Length
length:
  description: 'Load length-based chunks from text.'
  name: 'Length-based chunk loader'
  path: transformers/chunking/length.py
  type: transformer
  inputs:
    text:
      style:
        input_type: null
        multiline: false
        monospace: true
      type: text_field
  variables:
    max_length:
      description: 'Maximum length of each chunk.'
      name: 'Max length'
      input: text
      required: true
      types:
        - integer
      value: 1000  # Default value

### N-Gram
n_gram:
  description: 'Load N-gram-based chunks from text.'
  name: 'N-gram chunk loader'
  path: transformers/chunking/n_gram.py
  type: transformer
  inputs:
    text:
      style:
        input_type: number
        multiline: false
        monospace: true
      type: text_field
  variables:
    n:
      description: 'N value for n-grams.'
      name: 'N value'
      input: text
      required: true
      types:
        - integer
      value: 3  # Default value
"""
