var events = require('events');
var util = require('util');
var sets = require('simplesets');

var debug = require('debug')('BLEbeacon');
var noble = require('noble');

var EXPECTED_MANUFACTURER_DATA_LENGTH = 25;
var APPLE_COMPANY_IDENTIFIER = 0x004c; // https://www.bluetooth.org/en-us/specification/assigned-numbers/company-identifiers
var IBEACON_TYPE = 0x02;
var EXPECTED_IBEACON_DATA_LENGTH = 0x15;

var devCurrentSet;
var devScanSet = new sets.Set();
var devCurrentMap = new Object();
var devScanMap = new Object();

var BLEbeacon = function() {
    this._uuid = null;
    this._major = null;
    this._minor = null;

    this._discovered = {};

    noble.on('discover', this.onDiscover.bind(this));
};

util.inherits(BLEbeacon, events.EventEmitter);

// ターゲットデバイスの設定
BLEbeacon.prototype.setBeacon = function(device) {
    this._uuid = device.uuid;
    this._major = device.major;
    this._minor = device.minor;
}

// 現在保持しているデバイスを返す
BLEbeacon.prototype.getBeacons = function() {
    return devCurrentMap;
}

// デバイスのスキャン
BLEbeacon.prototype.startScanning = function() {

    var timeout = 10000; // スキャン・ストップは10s
    var self = this;

    if (noble.state === 'poweredOn') {
        noble.startScanning();
    } else {
        noble.on('stateChange', function() {
        noble.startScanning();
        });
    }

    setTimeout(function() {
        self.stopScanning();
        // 差分チェックをする
        compareDevices(self);

        setTimeout(function() {
            self.startScanning();
        }, 2000);
    }, timeout);
};

BLEbeacon.prototype.stopScanning = function() {
    debug('stopScanning');
    noble.stopScanning();
};

BLEbeacon.prototype.onDiscover = function(peripheral) {
    debug('onDiscover: %s', peripheral);

    var manufacturerData = peripheral.advertisement.manufacturerData;
    var rssi = peripheral.rssi;
    var name = peripheral.advertisement.localName;

    debug('onDiscover: manufacturerData = %s, rssi = %d', manufacturerData ?  manufacturerData.toString('hex') : null, rssi);

    if (manufacturerData &&
        EXPECTED_MANUFACTURER_DATA_LENGTH === manufacturerData.length &&
        APPLE_COMPANY_IDENTIFIER === manufacturerData.readUInt16LE(0) &&
        IBEACON_TYPE === manufacturerData.readUInt8(2) &&
        EXPECTED_IBEACON_DATA_LENGTH === manufacturerData.readUInt8(3)) {

        var uuid = manufacturerData.slice(4, 20).toString('hex');
        var major = manufacturerData.readUInt16BE(20);
        var minor = manufacturerData.readUInt16BE(22);
        var measuredPower = manufacturerData.readInt8(24);

        debug('onDiscover: uuid = %s, major = %d, minor = %d, measuredPower = %d', uuid, major, minor, measuredPower);

        // ターゲットデバイスかどうか
        if ((!this._uuid || this._uuid === uuid) &&
            (!this._major || this._major === major) &&
            (!this._minor || this._minor === minor)) {

            var accuracy = Math.pow(12.0, 1.5 * ((rssi / measuredPower) - 1));
            var proximity = null;

            // ここの値の調整は結局、受信側のBTデバイスの感度に依存するため、
            // 使用するデバイスによって調整する必要がある
            if (accuracy < 0) {
                proximity = 'unknown';
            } else if (accuracy < 0.5) {
                proximity = 'immediate';
            } else if (accuracy < 4.0) {
                proximity = 'near';
            } else {
                proximity = 'far';
            }

            var beacon = this._discovered[peripheral.uuid];

            if (!beacon) {
                beacon = {};
            }

            beacon.name = name;
            beacon.uuid = uuid;
            beacon.major = major;
            beacon.minor = minor;
            beacon.measuredPower = measuredPower;
            beacon.rssi = rssi;
            beacon.accuracy = accuracy;
            beacon.proximity = proximity;

            this._discovered[peripheral.uuid] = beacon;

            debug('onDiscover: bleacon = %s', JSON.stringify(beacon));

            // 見つかったデバイスのkeyを作成
            var key = beacon.name + beacon.uuid + beacon.major + beacon.minor;

            // unknownの場合は登録しない
            if (beacon.proximity === 'unknown') {
                return;
            }

            var device = JSON.stringify(beacon);
            // スキャンで発見したデバイスを登録
            devScanSet.add(key);
            devScanMap[key] = (new Function("return " + device))();

            this.emit('discover', beacon);
        }
    }
};

// デバイスの比較
function compareDevices(object) {
    // 最初は比較しないので
    if (devCurrentSet !== undefined ) {

        // どちらにも存在するデバイスのProximityに変化があったか？
        var equalSet = devCurrentSet.intersection(devScanSet);
        checkProximity(object, equalSet);

        // 新しいデバイスを発見した
        var newSet = devScanSet.difference(devCurrentSet);
        var size = newSet.size();
        for (var i = 0; i < size; i++) {
            var key = newSet.pop();
            object.emit('appear', devScanMap[key]);
        }

        // デバイスが居なくなった
        var deleteSet = devCurrentSet.difference(devScanSet);
        size = deleteSet.size();
        for (var i = 0; i < size; i++) {
            var key = deleteSet.pop();
            object.emit('disappear', devCurrentMap[key]);
        }
    }

    // 現在のデバイスを更新
    devCurrentMap = devScanMap;
    devCurrentSet = devScanSet;
    devScanMap = new Object();
    devScanSet = new sets.Set();
}

// Proximityの変化があったかチェック
function checkProximity(object, equalSet) {
    var size = equalSet.size();

    for (var i = 0; i < size; i++) {
        var key = equalSet.pop();
        if (devCurrentMap[key].proximity !== devScanMap[key].proximity) {
            // Proximityが変化した
            console.log(key + ': change ' + devCurrentMap[key].proximity + ' to ' + devScanMap[key].proximity);
            object.emit('proximity', devScanMap[key]);
        }
    }
}

module.exports = BLEbeacon;