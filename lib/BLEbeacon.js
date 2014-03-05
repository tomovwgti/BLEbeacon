/**
 * Created by tomo on 2014/03/03.
 */

var Bleacon = require('../index');
var sets = require('simplesets');

var devCurrentSet;
var devScanSet = new sets.Set();
var devCurrentMap = new Object();
var devScanMap = new Object();

var BLEbeacon = function() {
}

BLEbeacon.prototype.scanBeacon = function() {
    Bleacon.startScanning();
    setTimeout(function() {
        Bleacon.stopScanning();
        // 差分をチェックする
        checkBeacon();
    }, 10000);
}

// 現在のBeaconと検索したBeaconの差分をチェックする
function checkBeacon() {
    // 差分チェックをする
    compareDevices();

    setTimeout(function() {
        BLEbeacon.prototype.scanBeacon();
    }, 10000);
}

// デバイスの比較
function compareDevices() {
    // 最初の比較、もしくは違いが無い場合
    if (devCurrentSet === undefined || devCurrentSet.equals(devScanSet)) {
        console.log('no difference');
        // Proximityに変化があったか？
        checkProximity();
    }
    if (devCurrentSet !== undefined) {

        // 2つに違いがある場合

        // 新しいデバイスを発見した
        if (devScanSet.difference(devCurrentSet).size() > 0) {
            console.log('発見!!');
            console.log('scan - current:', devScanSet.difference(devCurrentSet).array());
        }
        // デバイスが居なくなった
        if (devCurrentSet.difference(devScanSet).size() > 0) {
            console.log('消失!!');
            console.log('current - scan:', devCurrentSet.difference(devScanSet).array());
        }
    }

    // 現在のデバイスを更新
    devCurrentMap = devScanMap;
    devCurrentSet = devScanSet;
    devScanMap = new Object();
    devScanSet = new sets.Set();
}

// Proximityのチェック
function checkProximity() {
    // keyの取り出し
    for (var keyString in devCurrentMap) {
        if (devCurrentMap[keyString].proximity !== devScanMap[keyString].proximity) {
            // Proximityが変化した
            console.log(keyString + ': change ' + devCurrentMap[keyString].proximity + ' to ' + devScanMap[keyString].proximity);
        }
    }
}

// iBeaconの検索
Bleacon.on('discover', function(bleacon) {

    // 見つかったデバイスのkeyを作成
    var key = bleacon.name + bleacon.uuid + bleacon.major + bleacon.minor;

    // far, unknownの場合は登録しない
    if (bleacon.proximity === 'far' || bleacon.proximity === 'unknown') {
        return;
    }

    var device = JSON.stringify(bleacon);
    // スキャンで発見したデバイスを登録
    devScanSet.add(key);
    devScanMap[key] = (new Function("return " + device))();
});

module.exports = BLEbeacon;