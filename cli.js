#!/usr/bin/env node
var openPRs = require('./')
var minimist = require('minimist')
var ndjson = require('ndjson')
var opts = minimist(process.argv.slice(2))

var token = process.env['GITHUB_OPENPR_TOKEN']
if (!token) {
  console.error('Must set GITHUB_OPENPR_TOKEN env variable')
  process.exit(1)
}

var prStream = openPRs(token, opts)
prStream.pipe(ndjson.serialize()).pipe(process.stdout)

