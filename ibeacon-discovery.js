var Bleacon = require('./index');
Bleacon.startScanning();

Bleacon.on('discover', function(bleacon) {
   console.dir(bleacon);
});
