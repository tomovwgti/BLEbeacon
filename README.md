## BLE Beacon


Node.jsを使ってBLEのAdvertiseビーコンをスキャンします。

iBeaconかどうかの判断もします（てきとー

#### 動作確認環境
+ Macintosh (Marvericks)
+ Beaglebone Black + [PLANEX BT-MICRO4](http://www.amazon.co.jp/gp/product/B0071TE1G2/ref=as_li_ss_tl?ie=UTF8&camp=247&creative=7399&creativeASIN=B0071TE1G2&linkCode=as2&tag=tomovwgti-22)

Nobleを使っています。[sandeepmistry / noble](https://github.com/sandeepmistry/noble)

Bleaconを修正しています。[sandeepmistry / node-bleacon](https://github.com/sandeepmistry/node-bleacon)

    Linuxの場合、BlueZ, libbluetooth-devが必要かも...依存わからんけど

```
$ git clone https://github.com/tomovwgti/BLEbeacon.git
$ cd BLEbeacon
$ npm install
```

#### BLEデバイスのスキャン

```
$ node ble-discovery.js # Macの場合
$ sudo /home/ubuntu/.nodebrew/current/bin/node ble-discovery.js # Linixの場合の例root権限で 
```

#### iBeaconデバイスのスキャンと発見・消失・Proximity変化イベント
※アルゴリズムを見直し、スキャンをフリーランにしました

1. 起動するとスキャンを行い、20sおきに既存リストと比較して消失デバイスを検出する
2. デバイスを検出するごとに、新規なのか、既存なのか判定を行う

```
$ node beacon.js # Macの場合
$ sudo /home/ubuntu/.nodebrew/current/bin/node beacon.js # Linixの場合の例root権限で 
```

#### iBeaconのProximityについて
受信するBTデバイスによって感度が違うため、結局のところProximityの判定(immediate, nearなど)はそれぞれの受信デバイスとターゲットデバイスで調整する必要があるようです。lib/blebeacon.jsの中を調整します。


#### 出力例

```
$ node ble-discovery.js 
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

```
$ node beacon.js
estimoteb9407f30f5f8466eaff925556b57fe6d3360430765: change immediate to near
proximity変わった
{ name: 'estimote',
  uuid: 'b9407f30f5f8466eaff925556b57fe6d',
  major: 33604,
  minor: 30765,
  measuredPower: -74,
  rssi: -68,
  accuracy: 0.739176628587144,
  proximity: 'near' }
消失!!
disappear
{ name: 'estimote',
  uuid: 'b9407f30f5f8466eaff925556b57fe6d',
  major: 45756,
  minor: 53882,
  measuredPower: -74,
  rssi: -76,
  accuracy: 1.105988448636924,
  proximity: 'near' }
estimoteb9407f30f5f8466eaff925556b57fe6d3360430765: change immediate to near
proximity変わった
{ name: 'estimote',
  uuid: 'b9407f30f5f8466eaff925556b57fe6d',
  major: 33604,
  minor: 30765,
  measuredPower: -74,
  rssi: -70,
  accuracy: 0.8175208127197672,
  proximity: 'near' }
発見!!
appear
{ name: 'estimote',
  uuid: 'b9407f30f5f8466eaff925556b57fe6d',
  major: 45756,
  minor: 53882,
  measuredPower: -74,
  rssi: -87,
  accuracy: 1.924770003766445,
  proximity: 'near' }

```
