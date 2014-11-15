I want to see a list of all repositories that have **open pull requests** that I am allowed to merge

Unfortunately GitHub provides no way to view this on GitHub.com and also has no easy API for querying this

This repo implements the following:

- Get all repos for a user (handles pagination)
- Get all orgs for a user
- For each org, loop through all repos in that org (handles pagination)
- For each repo, if the user can push to it, collect that repo
- Combine the list of the users repos with the list of the users pushable organization repos
- For each repo in this merged list, get all pull requests, filter by open (handles pagination)
- Finally, we have a list of all open pull requests that the user can merge
