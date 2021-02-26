# Zenn Metadata Updater Action

This action allows caching dependencies and build outputs to improve workflow execution time.

## Usage

### Pre-requisites
Create a workflow `.yml` file in your repositories `.github/workflows` directory. An [example workflow](#example-workflow) is available below. For more information, reference the GitHub Help Documentation for [Creating a workflow file](https://help.github.com/en/articles/configuring-a-workflow#creating-a-workflow-file).

### Inputs

* `github-token` - A GITHUB_TOKEN.
* `dry-run` - A boolean, if true, no push or pull request will be created.
* `title` - A title of Zenn article.
* `emoji` - An emoji of Zenn article.
* `type` - A type of Zenn article.
* `topics` - A list of topic of Zenn article.
* `published` - A boolean of published of Zenn article. (default: true)
* `force-push` - A boolean, if true, override the push to the existing branch. (default: false)


### Outputs
nothing


### Example workflow

```yaml
name: Create published=true pull request
on:
  pull_request:
    branches:
      - main
    types: [closed]

jobs:
  create-pr:
    runs-on: ubuntu-latest
    if: github.event.pull_request.merged == true
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 2
        # Todo: fetch-depth=2の理由書く
      - uses: korosuke613/zenn-metadata-updater-action@v0.1.0
        with:
          published: true
          force-push: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## License
The scripts and documentation in this project are released under the [MIT License](LICENSE)