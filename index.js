#!/usr/bin/env node
var ghOAuth = require('github-oauth')
var parallel = require('run-parallel')
var requestdb = require('requestdb')
var debug = require('debug')('issues-me')
var url = require('url')
  
var request = requestdb('./cache')
var TOKEN = process.env['GITHUB_OPENPR_TOKEN']
if (!TOKEN) process.exit()

// assumes :user/orgs isnt paginated
var repos = []
getAll('/user/repos', function(results) {
  var filtered = results.filter(function(repo) {
    if (repo.permissions.push) return true
  }).map(function(repo) {
    return repo.full_name
  })
  repos = repos.concat(filtered)
  getPushableOrgRepos(function() {
    var reqs = []
    repos.forEach(function(repo) {
      reqs.push(getOpenPRs)
      function getOpenPRs(cb) {
        getAll('/repos/' + repo + '/pulls', function(results) {
          cb(null, results)
        })
      }
    })
    parallel(reqs, function(err, results) {
      var allRepos = []
      results.forEach(function(result) { allRepos = allRepos.concat(result) })
      allRepos.forEach(function(repo) { console.log(JSON.stringify(repo)) })
    })
  })
})

function getPushableOrgRepos(done) {
  req('/user/orgs', function(orgs) {
    var reqs = []
    orgs.slice(0, 2).forEach(function(org) {
      reqs.push(getOrgRepos)
      function getOrgRepos(cb) {
        getAll('/orgs/' + org.login + '/repos', function(results) {
          var filtered = results.filter(function(repo) {
            if (repo.permissions.push) return true
          }).map(function(repo) {
            return repo.full_name
          })
          cb(null, filtered)
        })
      }
    })
    parallel(reqs, function(err, results) {
      results.forEach(function(result) { repos = repos.concat(result) })
      done()
    })
  })
}
  
function req(route, cb) {
  var u = 'https://api.github.com' + route
  var headers = {
    "Authorization": "token " + TOKEN,
    "User-Agent": "nodejs"
  }
  debug(u)
  request.get({url:u, json: true, headers: headers}, function (err, getResp, data) {
    if (err) {
      console.error(data)
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

function getAll(route, cb) {
  var results = []
  doRequest(route)
    
  function doRequest(apiURL) {
    req(apiURL, function(data, getResp) {
      results = results.concat(data)
      var link = getResp.headers.link
      if (link && link.indexOf('rel="next"') > -1) {
        var next = link.split(';')[0]
        next = next.slice(1, next.length - 1)
        var parsed = url.parse(next)
        var nextURL = parsed.path
        doRequest(nextURL)
      } else {
        cb(results)
      }
    })          
  }
}
