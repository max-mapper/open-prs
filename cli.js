#!/usr/bin/env node
var openPRs = require('./')
var minimist = require('minimist')
var ndjson = require('ndjson')
var opts = minimist(process.argv.slice(2))

var enterpriseUrl = process.env['GITHUB_OPENPR_ENTERPRISE_URL']
var token = process.env['GITHUB_OPENPR_TOKEN']
if (!token) {
  console.error('Must set GITHUB_OPENPR_TOKEN env variable')
  process.exit(1)
}

opts.url = enterpriseUrl

var prStream = openPRs(token, opts)
prStream.pipe(ndjson.serialize()).pipe(process.stdout)

