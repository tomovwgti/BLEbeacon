/**
 * Created by tomo on 2014/03/05.
 */

BLEbeacon = require('./index');


// 対象とするデバイスを設定
//BLEbeacon.setBeacon(device);

// デバイスのスキャンを開始
// 内部では発見したデバイスをリストで管理し、再スキャン時に比較を行っている
BLEbeacon.startScanning();

// 既存のデバイスのproximityが変化したときのコールバック
BLEbeacon.on('proximity', function(beacon) {
    console.log('proximity変わった');
    console.dir(beacon);
});

// 既存のデバイスに新しいデバイスが発見された場合に呼ばれるコールバック
BLEbeacon.on('appear', function(beacon) {
    console.log('発見!!');
    console.log('appear');
    console.dir(beacon);
})

// 既存のデバイスが見つからなくなったときに呼ばれるコールバック
BLEbeacon.on('disappear', function(beacon) {
    console.log('消失!!');
    console.log('disappear');
    console.dir(beacon);
})


// デバイスを発見すると呼ばれるコールバック
// これを有効にすると、毎回のスキャンで呼び出されてしまうので注意が必要
/*
BLEbeacon.on('discover', function(beacon) {
 console.log('discover');
 console.log(beacon);
})
*/
// 現在のデバイスのリストを返す
/*console.log('beacons');
console.dir(BLEbeacon.getBeacons());
*/
