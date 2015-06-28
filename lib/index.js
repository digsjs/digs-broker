'use strict';

let DigsMQTTBroker = require('./digs-mqtt-broker');
let pkg = require('../package.json');

function digsBroker(digs, opts) {
  opts = opts || {};

  let broker = new DigsMQTTBroker(opts.port, opts.host);
  return broker.listen()
    .return(broker);
}

digsBroker.metadata = {
  name: 'digsBroker',
  dependencies: [],
  defaults: {},
  version: pkg.version
};

digsBroker.DigsMQTTBroker = DigsMQTTBroker;

module.exports = digsBroker;
