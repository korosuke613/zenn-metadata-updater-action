# Zenn Metadata Updater Action

This action allows caching dependencies and build outputs to improve workflow execution time.

## Usage

### Input
See action.yml

### Pre-requisites
Create a workflow `.yml` file in your repositories `.github/workflows` directory. An example workflow is available below. For more information, reference the GitHub Help Documentation for [Creating a workflow file](https://help.github.com/en/articles/configuring-a-workflow#creating-a-workflow-file).

#### Example workflow

[example-published-true.yml](.github/workflows/example-published-true.yml)
```yaml
name: Create published=true pull request
on:
  pull_request:
    branches:
      - main
    types: [closed]

permissions:
  contents: write
  pull-requests: write

jobs:
  create-pr:
    runs-on: ubuntu-latest
    if: github.event.pull_request.merged == true
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2 # Because if `fetch-depth >= 2` is not set, unchanged files will be updated.
      - uses: korosuke613/zenn-metadata-updater-action@v2
        with:
          published: true
```

[example-validate-metadata.yml](.github/workflows/example-validate-metadata.yml)
```yaml
name: Validate Zenn metadata
on:
  pull_request:
    branches:
      - main

permissions:
  contents: read

jobs:
  validate-zenn-metadata:
    name: Validate Zenn metadata
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2  # Because if `fetch-depth >= 2` is not set, unchanged files will be updated.
      - uses: korosuke613/zenn-metadata-updater-action@v2
        with:
          validate-only: true
```
## License
The scripts and documentation in this project are released under the [MIT License](LICENSE)
