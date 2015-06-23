'use strict';

let mqtt = require('mqtt'),
  Promise = require('bluebird'),
  _ = require('lodash'),
  DigsEmitter = require('digs-common/digs-emitter');

let debug = require('debug')('digs:digs-broker:broker');

const PING_NOTIFICATION_DEBOUNCE_MS = 30000,
  ID_PREFIX = 'digs-broker-';

class DigsBroker extends mqtt.Server {
  constructor(port, host) {
    super();

    this._port = port;
    this._host = host;
    this.id = _.uniqueId(ID_PREFIX);

    debug(`${this}: Instantiated`);
  }

  listen(port, host) {
    return new Promise(function (resolve, reject) {
      this.on('error', reject);
      super.listen(port || this._port, host || this._host, function () {
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
        debug(`${this}: Internal broker listening on ${address.address}:
        ${address.port}`);

        return this;
      });
  }

  toString() {
    return DigsEmitter.prototype.toString.call(this);
  }

  _notifyPing(client) {
    debug(`${this}: <${client.constructor.name}#${client.id}> is alive`);
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
        let qos = subscription.qos,
          topic = subscription.topic,
          rx = new RegExp(topic.replace('+', '[^\/]+').replace('#', '.+') +
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
        debug(`${this}: ${client} published topic ${packet.topic} w/ payload:`,
          packet.payload);
      } else {
        debug(`${this}: ${client} attempted to published topic ${packet.topic}
          but nobody was listening`);
      }
    }.bind(this));

    client.on('pingreq', function () {
      this.notifyPing(client);
      client.pingresp();
    }.bind(this));

    client.on('disconnect', function () {
      end(client);
    }.bind(this));

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

module.exports = DigsBroker;
