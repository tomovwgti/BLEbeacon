var noble = require('noble');

const PROXIMITY_UNKNOWN = 0;
const PROXIMITY_IMMEDIATE = 1;
const PROXIMITY_NEAR = 2;
const PROXIMITY_FAR = 3;


noble.on('stateChange', function(state) {
    if (state === 'poweredOn') {
        noble.startScanning();
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
            beacon.proximity = calculateProximity(beacon.accuracy);
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
    if (rssi === 0) {
        return -1.0; // if we cannot determine accuracy, return -1.
    }

    var ratio = rssi * 1.0 / txPower;
    if (ratio < 1.0) {
        return Math.pow(ratio,10);
    }
    else {
        var accuracy =  (0.89976) * Math.pow(ratio,7.7095) + 0.111;
        console.log(accuracy);
        return accuracy;
    }
}

/**
 * 近接距離
 *
 * @param accuracy
 * @returns {number}
 */
function calculateProximity(accuracy) {
    if (accuracy < 0) {
        return PROXIMITY_UNKNOWN;
        // is this correct?  does proximity only show unknown when accuracy is negative?  I have seen cases where it returns unknown when
        // accuracy is -1;
    }
    if (accuracy < 0.5 ) {
        return PROXIMITY_IMMEDIATE;
    }
    // forums say 3.0 is the near/far threshold, but it looks to be based on experience that this is 4.0
    if (accuracy <= 4.0) {
        return PROXIMITY_NEAR;
    }
    // if it is > 4.0 meters, call it far
    return PROXIMITY_FAR;
}