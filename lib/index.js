'use strict';

let DigsMQTTBroker = require('./digs-mqtt-broker');
let pkg = require('../package.json');

function digsMqttBroker(digs, opts) {
  opts = opts || {};

  let broker = new DigsMQTTBroker(opts.port, opts.host);
  return broker.listen();
}

digsMqttBroker.metadata = {
  name: pkg.name,
  dependencies: [],
  defaults: {},
  version: pkg.version
};

digsMqttBroker.DigsMQTTBroker = DigsMQTTBroker;

module.exports = digsMqttBroker;
