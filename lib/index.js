'use strict';

let DigsBroker = require('./digs-broker');
let pkg = require('../package.json');

function digsBroker(digs, opts) {
  opts = opts || {};

  let broker = new DigsBroker(opts.port, opts.host);
  return broker.listen()
    .return(broker);
}

digsBroker.metadata = {
  name: 'digsBroker',
  dependencies: [],
  defaults: {},
  version: pkg.version
};

digsBroker.DigsBroker = DigsBroker;

module.exports = digsBroker;
