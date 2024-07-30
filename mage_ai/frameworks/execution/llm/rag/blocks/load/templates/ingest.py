TEMPLATES = """
api:
  description: 'Fetch data from an external API'
  name: 'API Data Loader'
  path: data_loaders/ingest/api.py
  type: data_loader
  inputs:
    number:
      style:
        input_type: number
      type: text_field
    text:
      style:
        monospace: true
      type: text_field
  variables:
    endpoint:
      description: 'API Endpoint URL'
      name: 'Endpoint URL'
      input: text
      required: true
      types:
        - string
    auth_token:
      description: 'Authentication Token for the API' # Optional if the API requires authentication
      name: 'Authentication Token'
      input: text
      required: false
      types:
        - string
    # params:
    #   description: 'Query parameters as a JSON object'
    #   name: 'Query Parameters'
    #   input: text
    #   required: false
    #   types:
    #     - dictionary
    # headers:
    #   description: 'Custom headers as a JSON object'
    #   name: 'Custom Headers'
    #   input: text
    #   required: false
    #   types:
    #     - dictionary
    method:
      description: 'HTTP method to use (GET, POST, etc.)'
      name: 'HTTP Method'
      input: text
      required: true
      types:
        - string
      value: 'GET'  # Default value as GET
    timeout:
      description: 'Request timeout in seconds'
      name: 'Timeout'
      input: number
      required: false
      types:
        - integer
      value: 30  # Default value of 30 seconds
    parser:
      description: Parse the API response using dot notation.
      name: Parser
      input: text
      required: false
      types:
        - string
files:
  description: 'Load files'
  name: 'Local file loader'
  path: data_loaders/ingest/files.py
  type: data_loader
  inputs:
    text:
      # Only if the input type is dropdown_menu, provide a list of options for the user to choose from
      # Don’t include this unless the input’s type is dropdown_menu
      options:
        - label: Cosine similarity # The display label for the option
          value: cosine # The value that will be passed to the pipeline when the user selects this option
        - label: Dot product
          value: dot_product
      style:
        input_type: null # If the variable associated to this input is a float or integer, set this value to number
        multiline: false # Use a multiline input field; set to true if the input is a long text like code, etc.
        monospace: true # Use monospace font for the input field; set to true if the input is related to code or a number
      type: text_field # The type of input to display to the user, can be 1 of these values: checkbox, code, dropdown_menu, switch, text_field
  variables:
    path:
      description: 'Directory path to load files from' # Description of the variable and what it’s used for
      name: 'Directory Path' # Display name of the variable
      input: text # UUID of the associated input field
      required: true # Required field
      types: # Can be 1 or more of these values: boolean, date, datetime, dictionary, float, integer, list, string
        - string
    exclude_pattern:
      name: 'Exclude Pattern'
      description: 'Pattern to exclude specific files'
      input: text
      required: false
      types:
        - string
      value: "*.db|.local/*"
    include_pattern:
      name: 'Include Pattern'
      description: 'Pattern to include specific files'
      input: text
      required: false
      types:
        - string
github:
  description: 'Fetch GitHub repository'
  name: 'GitHub repository loader'
  path: data_loaders/ingest/github.py
  type: data_loader
  inputs:
    text:
      style:
        monospace: true
      type: text_field
  variables:
    repo_url:
      description: 'URL of the GitHub repository'
      name: 'Repository URL'
      input: text
      required: true
      types:
        - string
    branch:
      description: 'Name of the branch'
      name: 'Branch name'
      input: text
      required: false
      types:
        - string
      value: master # Default value
    path:
      description: 'Directory or file path within the repository'
      name: 'Repository path'
      input: text
      required: false
      types:
        - string
    file_extension:
      description: 'Filter files by extension (e.g., .txt)'
      name: 'File extension filter'
      input: text
      required: false
      types:
        - string
      value: ".py" # Default value
"""
