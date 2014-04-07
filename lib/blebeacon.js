var events = require('events');
var util = require('util');
var sets = require('simplesets');

var debug = require('debug')('BLEbeacon');
var noble = require('noble');

var EXPECTED_MANUFACTURER_DATA_LENGTH = 25;
var APPLE_COMPANY_IDENTIFIER = 0x004c; // https://www.bluetooth.org/en-us/specification/assigned-numbers/company-identifiers
var IBEACON_TYPE = 0x02;
var EXPECTED_IBEACON_DATA_LENGTH = 0x15;

var devCurrentSet = new sets.Set();
var devCurrentMap = new Object();
var devPrevSet = new sets.Set();
var devPrevMap = new Object();

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

    var timeout = 20000; // 消失確認時間間隔
    var self = this;

    if (noble.state === 'poweredOn') {
        noble.startScanning([], true);
        console.log('start scanning...');
    } else {
        noble.on('stateChange', function() {
        noble.startScanning([], true);
        console.log('start scanning...');
        });
    }

    // 消失デバイスをチェックをする
    setInterval(function() {
        checkDisappearDevices(self);
    }, timeout);
};

BLEbeacon.prototype.stopScanning = function() {
    debug('stopScanning');
    noble.stopScanning();
};

BLEbeacon.prototype.onDiscover = function(peripheral) {
    var self = this;
    debug('onDiscover: %s', peripheral);

    var manufacturerData = peripheral.advertisement.manufacturerData;
    var rssi = peripheral.rssi;
    var name = peripheral.advertisement.localName;

    debug('onDiscover: manufacturerData = %s, rssi = %d', manufacturerData ?  manufacturerData.toString('hex') : null, rssi);

    // iBeaconの場合
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
/*
            console.log('measuredPower: ' + measuredPower);
            console.log('RSSI:          ' + rssi);
            console.log('distance:      ' + distance);
            console.log('proximity:     ' + proximity);
            console.log('');
*/
            var beacon = this._discovered[peripheral.uuid];

            if (!beacon) {
                beacon = {};
            }

            beacon.iBeacon = true;
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

            // デバイスの比較
            compareDevices(self, key, beacon);
            // 発見イベント
            this.emit('discover', beacon);
        }
    }
    // not iBeacon
    else {
        if (!this._uuid || this._uuid === peripheral.uuid) {
            var beacon = this._discovered[peripheral.uuid];

            if (!beacon) {
                beacon = {};
            }

            beacon.ibeacon = false;
            beacon.uuid = peripheral.uuid;
            beacon.name = peripheral.advertisement.localName;
            beacon.rssi = peripheral.rssi;

            // 見つかったデバイスのkeyを作成
            var key = beacon.uuid;

            console.dir(beacon);

            this._discovered[peripheral.uuid] = beacon;

            // デバイスの比較
            compareDevices(self, key, beacon);

            // 発見イベント
            this.emit('discover', beacon);
        }
    }
};

// デバイスの比較
function compareDevices(object, key, beacon) {
    // すでに登録されたデバイスなら比較
    if (devCurrentSet.has(key)) {
        if (devCurrentMap[key].proximity !== beacon.proximity) {
            // Proximityが変化した
            console.log(key + ': change ' + devCurrentMap[key].proximity + ' to ' + beacon.proximity);
            object.emit('proximity', beacon);
        }
    } else if (devPrevSet.has(key)) {
        if (devPrevMap[key].proximity !== beacon.proximity) {
            // Proximityが変化した
            console.log(key + ': change ' + devPrevMap[key].proximity + ' to ' + beacon.proximity);
            object.emit('proximity', beacon);
        }
    } else
    // 新しいデバイスを発見
    {
        object.emit('appear', beacon);
    }
    // デバイス情報の更新
    devCurrentSet.add(key);
    devCurrentMap[key] = (new Function("return " + JSON.stringify(beacon)))();
}

// 消失デバイスの検出
function checkDisappearDevices(object) {
    // 最初は比較しない
    if (devCurrentSet !== undefined) {
        // デバイスが居なくなった
        var deleteSet = devPrevSet.difference(devCurrentSet);
        var size = deleteSet.size();
        for (var i = 0; i < size; i++) {
            var key = deleteSet.pop();
            console.log(key);
            object.emit('disappear', devPrevMap[key]);
        }
    }
    devPrevSet = devCurrentSet;
    devPrevMap = devCurrentMap;
    devCurrentSet =  new sets.Set();
    devCurrentMap =  new Object();
}

module.exports = BLEbeacon;
