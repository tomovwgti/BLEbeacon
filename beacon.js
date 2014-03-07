/**
 * Created by tomo on 2014/03/05.
 */

BLEbeacon = require('./index');
var serialport = require("serialport");

var portName = "/dev/tty.usbmodem1431";
var sp = new serialport.SerialPort(portName, {
    baudRate: 9600,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: false,
    parser: serialport.parsers.readline("\n")
});

var device = {
    uuid: 'b9407f30f5f8466eaff925556b57fe6d',
    major: 45756,
    minor: 53882
}

// 対象とするデバイスを設定
BLEbeacon.setBeacon(device);

// デバイスのスキャンを開始
// 内部では発見したデバイスをリストで管理し、再スキャン時に比較を行っている
BLEbeacon.startScanning();

// 既存のデバイスのproximityが変化したときのコールバック
BLEbeacon.on('proximity', function(beacon) {
    console.log('proximity変わった');
    console.dir(beacon);

    console.log(getProximity(beacon));

    sp.write(getProximity(beacon), function(err, bytesWritten) {
        console.log('bytes written: ', bytesWritten);
    });
});

// 既存のデバイスに新しいデバイスが発見された場合に呼ばれるコールバック
BLEbeacon.on('appear', function(beacon) {
    console.log('発見!!');
    console.log('appear');
    console.dir(beacon);

    sp.write(getProximity(beacon), function(err, bytesWritten) {
        console.log('bytes written: ', bytesWritten);
    });
})

// 既存のデバイスが見つからなくなったときに呼ばれるコールバック
BLEbeacon.on('disappear', function(beacon) {
    console.log('消失!!');
    console.log('disappear');
    console.dir(beacon);

    sp.write('3', function(err, bytesWritten) {
        console.log('bytes written: ', bytesWritten);
    });
})

sp.on('close', function(err) {
    console.log('port closed');
});

sp.on('open', function(err) {
    console.log('port opened');
});

// デバイスを発見すると呼ばれるコールバック
// これを有効にすると、毎回のスキャンで呼び出されてしまうので注意が必要
/*BLEbeacon.on('discover', function(beacon) {
 console.log('discover');
 console.dir(beacon);
 })*/


// 現在のデバイスのリストを返す
/*console.log('beacons');
console.dir(BLEbeacon.getBeacons());
*/

function getProximity(beacon) {
    var status;
    switch (beacon.proximity) {
        case 'immediate':
            status = '0';
            break;
        case 'near':
            status = '1';
            break;
        case 'far':
            status = '2';
            break;
        default:
            status = '3';
            break;
    }
    return status;
}