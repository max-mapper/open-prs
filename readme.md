# open-prs

CLI utility to show you all the PRs (pull requests) that you are able to merge. Pull request metadata are streamed from the GitHub API and written to STDOUT as JSON.

Unfortunately GitHub provides no easy way to view this data on GitHub.com. Additionally, the GitHub API does not have an easy API for querying this information.

This repo implements the following algorithm:

- Get all repos for a user (handles pagination)
- Get all orgs for a user
- For each org, loop through all repos in that org (handles pagination)
- For each repo, if the user can push to it, collect that repo
- For each repo from both the user and the users orgs, get all pull requests, filter by open (handles pagination)
- Finally, we have all open pull requests that the user can merge

If you have an idea for a more efficient way to retrieve this data from the GitHub API let me know in an issue. As of the time of this writing, it takes **665** API requests to the GitHub API to get all pull requests that are mergeable by my account.

## Usage

`open-prs` is a command line module, so you must install it with `-g` so that npm will create a symlink to the `open-prs` executable in your systems executable bin path.

```
$ npm i open-prs -g
```

You will need a GitHub token to use this. Set the environment variable `GITHUB_OPENPR_TOKEN` to your token, or pass it in at run-time by doing `GITHUB_OPENPR_TOKEN=foobar open-prs`.

To get a token, visit your GitHub account settings page, go to Applications and create a new App Specific Token. 

To get your open PRs, simple run `open-prs` on the command line:

```
$ open-prs
```

The full data for each pull request will be written out to STDOUT as [newline delimited JSON](http://ndjson.org). Note that the GitHub API returns a lot of JSON data for each pull request, so it may be useful to filter out the data using a tool like [`jsonfilter`](http://npmjs.org/jsonfilter), e.g.:

```
$ open-prs | jsonfilter id
21197053
24495873
23005875
20863714
17739157
16625731
16573081
14961125
11174354
10250946
22931678
22263238
```

## caching

You can pass the `--cache` flag to cache all responses, which is useful for offline use. Note that the cache currently has no expiration functionality.
