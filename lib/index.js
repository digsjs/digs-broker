'use strict';

let DigsBroker = require('./digs-broker'),
  Joi = require('joi');

let debug = require('debug')('digs:digs-broker');

function digsBroker(opts) {
  let broker, type;

  opts = opts || {};

  type = opts.type;

  if ((broker = digsBroker.brokers[type])) {
    debug(`Selected broker type: ${type}`);
    return broker(_.omit(opts, 'type'));
  }

  return Promise.reject('not implemented');
}

digsBroker.brokers = {
  internal: function internal(opts) {
    let broker = new DigsBroker(opts.port, opts.host);
    return broker.start();
  }
};

digsBroker.schemata = [
  Joi.number()
    .integer()
    .min(0)
    .max(Math.pow(2, 16) - 1)
    .label('port')
    .description('Port on which to run internal MQTT broker')
    .tags('mqtt'),
  Joi.alternatives()
    .try(Joi.string()
      .hostname(),
    Joi.string()
      .ip())
    .label('host')
    .description('Host or IP address on which to run internal MQTT broker')
    .tags('mqtt')
];

digsBroker.DEFAULT_OPTS = {
  type: 'internal'
};

module.exports = digsBroker;
