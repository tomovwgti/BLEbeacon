/**
 * Created by tomo on 2014/03/05.
 */

BLEbeacon = require('./index');

/**
 * 検索するデバイスの情報
 * iBeacon の場合は、３つの情報が必要
 * BLE の場合は、uuidのみで検索を行う
 * @type {{uuid: string, major: number, minor: number}}
 */
var device = {
    uuid: 'f8afd77bdb354a00977a750f5f30ecc2',
    major: 1,
    minor: 1
}

// 対象とするBLEデバイスを設定（設定しない場合は全スキャンする）
BLEbeacon.setBeacon(device);

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
