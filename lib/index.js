'use strict';

const pkg = require('../package.json');
const aedes = require('aedes')();
const common = require('digs-common');
const net = require('net');
const validator = common.validator;

function digsMqttBroker(digs, opts, done) {
  digs.log('digs-mqtt-broker', 'Initializing digs-mqtt-broker');

  validator.assert(opts, validator.object({
    port: validator.number().integer().default(1883),
    host: validator.string().default('localhost')
  }));

  const broker = net.createServer(aedes.handle);

  broker.listen(opts.port, opts.host, (err) => {
    if (err) {
      return done(err);
    }
    digs.expose('broker', broker);
    digs.log('digs-mqtt-broker',
      `Broker listening at ${opts.host}:${opts.port}`);
    done();
  });
}

digsMqttBroker.attributes = {
  pkg: pkg,
  dependencies: 'digs'
};

module.exports = digsMqttBroker;
