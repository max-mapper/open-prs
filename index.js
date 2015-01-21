var requestdb = require('requestdb')
var request = require('request')
var through = require('through2')
var debug = require('debug')('open-prs')
var url = require('url')
var tmp = require('os').tmpdir()
var path = require('path')

module.exports = function(token, opts) {
  var API_URL = opts.url || 'https://api.github.com'

  if (opts.cache) request = requestdb(opts.cacheDir || path.join(tmp, 'open-prs-cache'))

  // fetches user owned repos + repos user is a collaborator on
  // does not include repos owned by an org
  var repoStream = createPaginatedStream('/user/repos')

  // fetches repos owned by an org that the user is a member of
  var orgStream = createPushableOrgRepoStream()

  // filters out all repos that the user cannot push to (and therefore cant merge PRs on)
  var filterStream = through.obj(function(repo, enc, next) {
    if (repo.permissions.push) this.push(repo.full_name)
    next()
  })

  // through stream that takes in a repo and emits all open PRs in that repo
  var getPullsStream = through.obj(function(repo, enc, next) {
    var pullsStream = createPaginatedStream('/repos/' + repo + '/pulls')
    pullsStream.pipe(through.obj(function(pull, enc, next) {
      getPullsStream.push(pull)
      next()
    }))
    pullsStream.on('error', function(err) {
      getPullsStream.destroy(err)
    })
    pullsStream.on('end', function(err) {
      next()
    })
  })

  // TODO find better solution for multi readable -> single writable
  repoStream.pipe(filterStream, {end: false})
  orgStream.pipe(filterStream, {end: false})
  filterStream.pipe(getPullsStream)

  return getPullsStream

  function req(route, cb) {
    var u = API_URL + route
    var headers = {
      "Authorization": "token " + token,
      "User-Agent": "nodejs"
    }
    debug(u)
    request.get({url:u, json: true, headers: headers}, function (err, getResp, data) {
      if (err) {
        console.error(err)
        return process.exit(1)
      }
      var stat = getResp.statusCode
        if (stat === 403) return cb([], getResp)
      if (stat > 299) {
        console.error({status: getResp.statusCode, body: data})
        process.exit(1)
      }
      cb(data, getResp)
    })
  }

  function createPushableOrgRepoStream() {
    var orgStream = through.obj()
    // assumes user/orgs isnt paginated
    req('/user/orgs', function(orgs) {
      var pending = 0
      orgs.slice(0, 2).forEach(function(org) {
        pending++
        var pageStream = createPaginatedStream('/orgs/' + org.login + '/repos')
        pageStream.pipe(orgStream, {end: false})
        pageStream.on('end', function() {
          if (--pending === 0) orgStream.end()
        })
      })
    })
    return orgStream
  }

  function createPaginatedStream(route) {
    var stream = through.obj()
    doRequest(route)
    return stream

    function doRequest(apiURL) {
      req(apiURL, function(data, getResp) {
        data.forEach(function(item) { stream.push(item) })
        var link = getResp.headers.link
        if (link && link.indexOf('rel="next"') > -1) {
          var next = link.split(';')[0]
          next = next.slice(1, next.length - 1)
          var parsed = url.parse(next)
          var nextURL = parsed.path
          doRequest(nextURL)
        } else {
          stream.end()
        }
      })
    }
  }
}


