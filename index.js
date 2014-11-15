var ghOAuth = require('github-oauth')
var parallel = require('run-parallel')
var request = require('request')
var debug = require('debug')('issues-me')
var url = require('url')
  
var auth = ghOAuth({
  githubClient: process.env['GITHUB_CLIENT'],
  githubSecret: process.env['GITHUB_SECRET'],
  baseURL: 'http://localhost:5000',
  loginURI: '/login',
  callbackURI: '/callback',
  scope: 'user' // optional, default scope is set to user
})

require('http').createServer(function(req, res) {
  if (req.url.match(/login/)) return auth.login(req, res)
  if (req.url.match(/callback/)) return auth.callback(req, res)
  res.end('/login')
}).listen(5000)

auth.on('error', function(err, res) {
  console.error('there was a login error', err)
  res.end()
})

auth.on('token', function(token, res) {
  // assumes :user/orgs isnt paginated
  var repos = []
  getAll('/user/repos', function(results) {
    var filtered = results.filter(function(repo) {
      if (repo.permissions.push) return true
    }).map(function(repo) {
      return repo.full_name
    })
    repos = repos.concat(filtered)
    getPushableOrgRepos()
  })
  
  function getPushableOrgRepos() {
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
        res.end(JSON.stringify(repos))
      })
    })
  }
  
  function req(route, cb) {
    var u = 'https://api.github.com' + route
    var headers = {
      "Authorization": "token " + token.access_token,
      "User-Agent": "nodejs"
    }
    debug(u)
    request.get({url:u, json: true, headers: headers}, function (err, getResp, data) {
      if (err) return res.end(err)
      if (getResp.statusCode > 299) return res.end(JSON.stringify({status: getResp.statusCode, body: data}))
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
})
