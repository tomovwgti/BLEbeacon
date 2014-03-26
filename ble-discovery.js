var noble = require('noble');

noble.on('stateChange', function(state) {
    if (state === 'poweredOn') {
         noble.startScanning([], true);
    } else {
        noble.stopScanning();
    }
});

/*
 estimoteの場合
 企業コード : 4c00
 iBeacon : 02
 21オクテット : 15
 UUID : b9407f30f5f8466eaff925556b57fe6d
 MAJOR : 0x5023 = 20515
 MINOR : 0xd5af = 54703
 RSSI : 0xb6 = -74(2の補数)
 */
var beacon = {
    companyId : null,   // 企業名ID
    uuid : null,        // UUID
    major : null,       // MAJOR ID
    minor : null,       // MINOR ID
    txPower : null,     // 1m離れた時のRSSI(固有値)
    rssi : null,        // 測定されたRSSI値
    accuracy : null,    // 精度
    proximity : null    // 距離
}

noble.on('discover', function(peripheral) {
    console.log('peripheral discovered (' + peripheral.uuid+ '):');
    console.log('\thello my local name is:');
    console.log('\t\t' + peripheral.advertisement.localName);
    console.log('\tcan I interest you in any of the following advertised services:');
    console.log('\t\t' + JSON.stringify(peripheral.advertisement.serviceUuids));
    if (peripheral.advertisement.serviceData) {
        console.log('\there is my service data:');
        console.log('\t\t' + JSON.stringify(peripheral.advertisement.serviceData.toString('hex')));
    }
    if (peripheral.advertisement.manufacturerData) {
        var data = peripheral.advertisement.manufacturerData.toString('hex');
        console.log('\there is my manufacturer data:');
        console.log('\t\t' + data);
        if (isBeacon(data)) {
            console.log('iBeacon Found!!');
            beacon = new Object();
            beacon.companyId = data.substring(2, 4) + data.substring(0, 2);
            beacon.uuid = data.substring(8, 40);
            beacon.major = parseInt(data.substring(40, 44), 16);
            beacon.minor = parseInt(data.substring(44, 48), 16);
            beacon.txPower = -((~parseInt(data.substring(48, 50), 16) & 0x000000FF) + 1);
            beacon.rssi = peripheral.rssi;
            beacon.accuracy = calculateAccuracy(beacon.txPower, beacon.rssi);
            beacon.proximity = calculateProximity(beacon.txPower, beacon.rssi);
            console.dir(beacon);
        }
    }
    if (peripheral.advertisement.txPowerLevel !== undefined) {
        console.log('\tmy TX power level is:');
        console.log('\t\t' + peripheral.advertisement.txPowerLevel);
    }

    console.log();
});

/**
 * iBeaconかどうか判断
 *
 * @param data
 * @returns {boolean}
 */
function isBeacon(data) {
    if (data.substring(0, 4) === '4c00'
        && data.substring(4, 6) === '02'
        && data.substring(6, 8) === '15') {
        return true;
    } else {
        return false;
    }
}

/**
 * 精度計算
 *
 * @param txPower
 * @param rssi
 * @returns {number}
 */
function calculateAccuracy(txPower, rssi) {
    return Math.pow(12.0, 1.5 * ((rssi / txPower) - 1));
}

/**
 * 近接距離
 *
 * @param txPower
 * @param rssi
 * @returns {number}
 */
function calculateProximity(txPower, rssi) {
    /* 距離計算は以下に基づく
     RSSI = A - 10Nlogd
     A : 1m離れた位置でのdBm
     N : 理想値は2
     d : 距離
     RSSI : 受信測定値
     */
    var N = 1.5; // 環境によって設定値を変える必要あり（実測での感覚）
    var distance = Math.pow(10, (txPower - rssi) / (10 * N));
    var proximity = null;

    if (rssi >= txPower) {
        proximity = 'immediate';
    } else if (distance > 1.0 && distance <= 5.0) {
        proximity = 'near';
    } else if (distance > 5.0 && distance < 10.0) {
        proximity = 'far';
    } else {
        proximity = 'unknown';
    }

    return proximity;
}
