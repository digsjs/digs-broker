'use strict';

let mqtt = require('mqtt');
let Promise = require('bluebird');
let _ = require('lodash');
let Joi = require('joi');
let DigsEmitter = require('digs-common/digs-emitter');

let debug = require('debug')('digs-plugin:digs-mqtt-broker');

const PING_NOTIFICATION_DEBOUNCE_MS = 30000;
const ID_PREFIX = 'digs-mqtt-broker-';
const DEFAULT_PORT = 1883;

class DigsMQTTBroker extends mqtt.Server {
  constructor(port, hostname) {
    super();

    this._port = port || DEFAULT_PORT;
    this._hostname = hostname;
    this.id = _.uniqueId(ID_PREFIX);

    debug(`${this}: Instantiated`);
  }

  listen(port, hostname) {
    port = port || this._port;
    hostname = hostname || this._hostname;
    let superListen = super.listen.bind(this);
    return new Promise(function (resolve, reject) {
      this.on('error', reject);
      superListen(port || this._port, hostname || this._hostname, function () {
        this.removeListener('error', reject);
        resolve();
      });
    }.bind(this))
      .bind(this)
      .then(function () {
        this._clients = {};
        this.on('client', this._onClient);
        this.notifyPing =
          _.debounce(this._notifyPing, PING_NOTIFICATION_DEBOUNCE_MS);

        let address = this.address();
        if (address.address !== '::') {
          debug(`${this}: Internal broker listening on ${address.address}:` +
            `${address.port}`);
        } else {
          debug(`${this}: Internal broker listening on port ${address.port}`);
        }

        return this;
      });
  }

  toString() {
    return DigsEmitter.prototype.toString.call(this);
  }

  _notifyPing(client) {
    debug(`${this}: ${client} is alive`);
  }

  _onClient(client) {

    let end = function end(client) {
      client.stream.end();
      debug(`${this}: ${client} disconnected`);
    }.bind(this);

    client.toString = function toString() {
      return DigsEmitter.prototype.toString.call(this);
    };

    client.on('connect', function (packet) {
      this._clients[packet.clientId] = client;
      client.id = packet.clientId;
      debug(`${this}: ${client} connected`);
      client.subscriptions = [];
      client.connack({
        returnCode: 0
      });
    }.bind(this));

    client.on('subscribe', function (packet) {
      let topics = _.pluck(packet.subscriptions, 'topic');
      debug(`${this}: ${client} subscribing to topic(s): ${topics}`);

      let granted = _.map(packet.subscriptions, function (subscription) {
        let qos = subscription.qos;
        let topic = subscription.topic;
        let rx = new RegExp(topic.replace('+', '[^\/]+').replace('#', '.+') +
          '$');

        client.subscriptions.push(rx);
        return qos;
      });

      client.suback({
        messageId: packet.messageId,
        granted: granted
      });
    }.bind(this));

    client.on('publish', function (packet) {
      if (_.size(_(this._clients)
          .pluck('subscriptions')
          .filter(function (subscription) {
            return subscription.test(packet.topic);
          }))) {
        client.publish({
          topic: packet.topic,
          payload: packet.payload
        });
        debug(`${this}: ${client} published topic "${packet.topic}" w/ ` +
          `payload:`, packet.payload);
      } else {
        debug(`${this}: ${client} attempted to published topic ` +
          `"${packet.topic}" but nobody was listening`);
      }
    }.bind(this));

    client.on('pingreq', function () {
      this.notifyPing(client);
      client.pingresp();
    }.bind(this));

    client.on('disconnect', function () {
      end(client);
    });

    client.on('close', function () {
      delete this._clients[client.id];
      debug(`${this}: deleted reference to ${client}`);
    }.bind(this));

    client.on('error', function (e) {
      debug(`${this}: ${client} errored: ${e}`);
      end(client);
    }.bind(this));
  }
}

DigsMQTTBroker.schemata = [
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

module.exports = DigsMQTTBroker;
