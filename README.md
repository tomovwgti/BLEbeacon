## BLE Beacon
====

Node.jsを使ってBLEのAdvertiseビーコンをスキャンします。
iBeaconかどうかの判断もします（てきとー

Nobleが必要です。[sandeepmistry / noble](https://github.com/sandeepmistry/noble)

```
$ npm install noble
```

#### BLEデバイスのスキャン

```
$ node advertisement-discovery.js
```

#### 出力例

```
$ node advertisement-discovery.js 
peripheral discovered (77a45c7f36974ae190617e5601aa3e3c):
	hello my local name is:
		estimote
	can I interest you in any of the following advertised services:
		[]
	here is my manufacturer data:
		4c000215b9407f30f5f8466eaff925556b57fe6d5023d5afb6
iBeacon Found!!
{ companyId: '004c',
  uuid: 'b9407f30f5f8466eaff925556b57fe6d',
  major: 20515,
  minor: 54703,
  rssi_row: 182,
  rssi: -74 }

peripheral discovered (2c2dea588a2c47a7b0bc7b024d0b56cf):
	hello my local name is:
		estimote
	can I interest you in any of the following advertised services:
		[]
	here is my manufacturer data:
		4c000215b9407f30f5f8466eaff925556b57fe6d8344782db6
iBeacon Found!!
{ companyId: '004c',
  uuid: 'b9407f30f5f8466eaff925556b57fe6d',
  major: 33604,
  minor: 30765,
  rssi_row: 182,
  rssi: -74 }

```