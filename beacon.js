/**
 * Created by tomo on 2014/03/05.
 */

BLEbeacon = require('./index');

// デバイスのスキャンを開始
// 内部では発見したデバイスをリストで管理し、再スキャン時の比較を行っている
BLEbeacon.startScanning();

// 既存のデバイスのproximityが変化したときのコールバック
BLEbeacon.on('proximity', function(beacon) {
    console.log('proximity');
    console.dir(beacon);
});

// 既存のデバイスに新しいデバイスが発見された場合に呼ばれるコールバック
BLEbeacon.on('appear', function(beacon) {
    console.log('appear');
    console.dir(beacon);
})

// 既存のデバイスが見つからなくなったときに呼ばれるコールバック
BLEbeacon.on('disappear', function(beacon) {
    console.log('disappear');
    console.dir(beacon);
})

// デバイスを発見すると呼ばれるコールバック
// これを有効にすると、毎回のスキャンで呼び出されてしまうので注意が必要
/*BLEbeacon.on('discover', function(beacon) {
 console.log('discover');
 console.dir(beacon);
 })*/
