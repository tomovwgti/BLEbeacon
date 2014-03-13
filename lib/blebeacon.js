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

    console.log('Target');
    console.dir(device);
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
        self.startScanning();
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

            var accuracy = Math.pow(12.0, 1.5 * ((rssi / measuredPower) - 1)); // 使ってない
            var proximity = null;
            /* 距離計算は以下に基づく
               RSSI = A - 10Nlogd
               A : 1m離れた位置でのdBm
               N : 理想値は2
               d : 距離
               RSSI : 受信測定値
            */
            var N = 1.5; // 環境によって設定値を変える必要あり（実測での感覚）
            var distance = Math.pow(10, (measuredPower - rssi) / (10 * N));

            if (rssi >= measuredPower) {
                proximity = 'immediate';
            } else if (distance > 1.0 && distance <= 5.0) {
                proximity = 'near';
            } else if (distance > 5.0 && distance < 10.0) {
                proximity = 'far';
            } else {
                proximity = 'unknown';
            }

            console.log('measuredPower: ' + measuredPower);
            console.log('RSSI:          ' + rssi);
            console.log('distance:      ' + distance);
            console.log('proximity:     ' + proximity);
            console.log('');

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

//    console.dir(devScanMap);
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