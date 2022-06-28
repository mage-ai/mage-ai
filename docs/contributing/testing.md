# Testing

## Testing from branch

Install `mage-ai` library from your branch:

```bash
$ pip3 install git+https://github.com/mage-ai/mage-ai.git@branch_name#egg=mage-ai
```

Build the front-end code:

```bash
$ cd mage_ai/frontend
$ yarn install
$ yarn export_prod
```

## Front-end
To check proper types in TypeScript, run:

```bash
$ ./scripts/test.sh
```
