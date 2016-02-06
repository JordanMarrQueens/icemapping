var IS_PI = false;
var IS_MC = false; //set to true to use Proportional-Integral Motor Control for the wheels
var IS_SER = true; //serial comms? (y/n)

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var exec=require('child_process').exec;
var GPIO, pin7, pin11, pin12;
if (IS_PI) {
    GPIO = require('onoff').Gpio,
    pin7 = new GPIO(4, 'out'),  //BCM pin 4, board pin 7
    pin11 = new GPIO(17, 'out'),//BCM pin 17, board pin 11
    pin12 = new GPIO(18, 'out') //BCM pin 18, board pin 12
}
var fs = require('fs');
var PythonShell = require('python-shell');
var mapTargets =  { count : 0, targets : [], gps : {latitude : 44.198100, longitude:-76.4508, heading:0}};
var serialport = require("serialport");
var gpsPort = new serialport.SerialPort("/dev/ttyAMA0", {
  baudrate: 9600,
  parser: serialport.parsers.readline("\n")
});
var mapSocket = io.of('/map'), camSocket = io.of('/cam'), sensorSocket = io.of('/sensor');

var partValues = {};

var wheelFLPin = 0, wheelFRPin = 0, wheelBLPin = 0, wheelBRPin = 0;
var wheelFLSetpoint = 0, wheelFRSetpoint = 0, wheelBLSetpoint = 0, wheelBRSetpoint = 0, bias = 0, MAX_WHEEL_SPEED = 0;//TODO: Update MAX_WHEEL_SPEED after testing to determine an appropriate value
var wheelFLSpeed = 0, wheelFRSpeed = 0, wheelBLSpeed = 0, wheelBRSpeed = 0;
var iSumFront = 0, iSumBack = 0, iSumLeft = 0; iSumRight = 0;
var k_p = 0, k_i = 0;

var arm1LinActPin = 2, arm1LinActPotPin = 2, arm1LinActMax = 978, arm1LinActMin = 45, arm1Value = 0;
var arm1LinActFuncMax = 978, arm1LinActFuncMin = 45; //used when measuring the linear actuator functions
function arm1ToAngle(reading) {
    var oldRange = (arm1LinActMax - arm1LinActMin)  
    var newRange = (arm1LinActFuncMax - arm1LinActFuncMin)  
    reading = (((reading - arm1LinActMin) * newRange) / oldRange) + arm1LinActFuncMin
    return ((-5)*Math.pow(10,-5)*Math.pow(reading, 2)-0.023*reading+66.076);
}

var arm2LinActPin = 3, arm2LinActPotPin = 3, arm2LinActMax = 889, arm2LinActMin = 40, arm2Value = 0;
var arm2LinActFuncMax = 889, arm2LinActFuncMin = 40; //used when measuring the linear actuator functions
function arm2ToAngle(reading) {
    var oldRange = (arm2LinActMax - arm2LinActMin)  
    var newRange = (arm2LinActFuncMax - arm2LinActFuncMin)  
    reading = (((reading - arm2LinActMin) * newRange) / oldRange) + arm2LinActFuncMin
    return (-0.0858*reading + 103.93)
}

//////////////////////////////////////////////////////////////
//////////////// Routing Stuff ///////////////////////////////
//////////////////////////////////////////////////////////////

app.use(express.static('static'));

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

app.get('/index', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});
/*
app.get('/control', function(req, res){
    res.sendFile(__dirname + '/control.html');
});

app.get('/map', function(req, res){
    res.sendFile(__dirname + '/map.html');
});

app.get('/science', function(req, res){
    res.sendFile(__dirname + '/science.html');
});
*/

///////////////////////////////////////////
////////// Control Stuff //////////////////
///////////////////////////////////////////

var arduino = new PythonShell('motor_control.py', { mode: 'json', pythonOptions: ['-u'] });
arduino.on('message', function (msg) {
    if (msg.pin == arm1LinActPotPin) {
        partValues.arm1 = arm1ToAngle(msg.value);
    } else if (msg.pin == arm2LinActPotPin) {
        partValues.arm2 = arm2ToAngle(msg.value);
    } else {
        partValues[msg.pin] = msg.value
    }
});

function createArduinoMsg(type, pin, value) {
    return { "type": type, "pin": pin, "value": value };
}

function writeArduino(msg) {
    arduino.send(msg);
}

var partReadTimeout = 1000;
function startPartReading() {
    app.set('partUpdateRunning', true);
    setTimeout(startPartReading, partReadTimeout) 
    writeArduino(createArduinoMsg("analogRead", arm1LinActPotPin));
    writeArduino(createArduinoMsg("analogRead", arm2LinActPotPin));
    //TODO: read encoders (not here, another place
    //      since they have more importance and will
    //      be updated more often)
    if (Object.keys(partValues).length > 0) {
        io.emit("partValues", partValues);
        partValues = {};
    }
}

var propIntLoopTimeout = 100; //TODO: test this. might need to be more often
function propIntLoop() {
    app.set('propIntLoopRunning', true);
    setTimeout(propIntLoop, propIntLoopTimeout) 
    //TODO: read encoders here to get the 4 wheel speeds
    iSumFront = iSumFront + (wheelFLSpeed - wheelFRSpeed + bias);
    iSumBack = iSumBack + (wheelBLSpeed - wheelBRSpeed + bias);
    iSumLeft = iSumLeft + (wheelFLSpeed - wheelBLSpeed);
    iSumRight = iSumRight + (wheelFRSpeed - wheelBRSpeed);

    var sigFL = k_p*(wheelFLSetpoint - wheelFLSpeed) + k_i*((-1)*iSumFront - iSumLeft);
    var sigFR = k_p*(wheelFRSetpoint - wheelFRSpeed) + k_i*(iSumFront - iSumRight);
    var sigBL = k_p*(wheelBLSetpoint - wheelBLSpeed) + k_i*(iSumLeft - iSumBack);
    var sigBR = k_p*(wheelBRSetpoint - wheelBRSpeed) + k_i*(iSumBack + iSumRight);

    writeArduino(createArduinoMsg("servo", wheelFLPin, 1500 + sigFL))
    writeArduino(createArduinoMsg("servo", wheelFRPin, 1500 + sigFR))
    writeArduino(createArduinoMsg("servo", wheelBLPin, 1500 + sigBL))
    writeArduino(createArduinoMsg("servo", wheelBRPin, 1500 + sigBR))
}

function handleUpdate(msg) {
    console.log(msg);
    if (IS_PI) {
        Object.keys(msg).forEach(function(part) {
            switch (part) {
                case "armPan": //value between -180 -> 180
                    
                    break;
                case "arm1": //value between -1 -> 1
                    arm1Value = msg[part];
                    writeArduino(createArduinoMsg("servo", arm1LinActPin, 1500 + (500*msg[part])))
                    break;
                case "arm2": //value between -1 -> 1
                    arm2Value = msg[part];
                    writeArduino(createArduinoMsg("servo", arm2LinActPin, 1500 + (500*msg[part])))
                    break;
                case "wheelFL": //value between -1 -> 1
		    if(IS_MC){
			changeWheelSetpoint(part,msg[part])
		    }
		    else{
                    	writeArduino(createArduinoMsg("servo", wheelFLPin, 1500 + (500*msg[part])))
		    }
                    break;
                case "wheelFR": //value between -1 -> 1
                    if(IS_MC){
			changeWheelSetpoint(part,msg[part])
		    }
		    else{
                    	writeArduino(createArduinoMsg("servo", wheelFRPin, 1500 + (500*msg[part])))
		    }
                    break;
                case "wheelBL": //value between -1 -> 1
                    if(IS_MC){
			changeWheelSetpoint(part,msg[part])
		    }
		    else{
                    	writeArduino(createArduinoMsg("servo", wheelBLPin, 1500 + (500*msg[part])))
		    }
                    break;
                case "wheelBR": //value between -1 -> 1
                    if(IS_MC){
			changeWheelSetpoint(part,msg[part])
		    }
		    else{
                    	writeArduino(createArduinoMsg("servo", wheelBRPin, 1500 + (500*msg[part])))
		    }
                    break;
            }
            
            //Prevent too much action occuring on the arduino
            //And allow for configurable update speed
            if (arm1Value == 0 && arm2Value == 0) {
                partReadTimeout = 1000;
            } else {
                partReadTimeout = 100;
            }
        }, this);
    }
}

function changeWheelSetpoint(part,scaledValue){ //scaledValue is between -1 -> 1
	switch (part) { //change our setpoints and reset the integral error terms
                case "wheelFL": 
                    wheelFLSetpoint = MAX_WHEEL_SPEED*scaledValue;
		    iSumFront = 0;
		    iSumLeft = 0;
                    break;
                case "wheelFR": 
                    wheelFRSetpoint = MAX_WHEEL_SPEED*scaledValue;
		    iSumFront = 0;
		    iSumRight = 0;
                    break;
                case "wheelBL": 
                    wheelBLSetpoint = MAX_WHEEL_SPEED*scaledValue;
		    iSumBack = 0;
		    iSumLeft = 0;
                    break;
                case "wheelBR": 
                    wheelBRSetpoint = MAX_WHEEL_SPEED*scaledValue;
		    iSumBack = 0;
		    iSumRight = 0;
                    break;
            }
}

///////////////////////////////////////////////////////
/////////////// Location Stuff ////////////////////////
///////////////////////////////////////////////////////

gpsPort.on("open", function () {
    console.log('open GPS');
    gpsPort.on('data', function(data) {
        var data2 = data.substring(data.indexOf("$")+1, data.indexOf("*"))
        data = data.split(",");
        
        if (data[0] == "$GPRMC" && data[2] == "A") {
            //Get the checksum
            var checksum = 0;
            for (var i = 0; i < data2.length; i++) {
                checksum ^= data2.charCodeAt(i);
            }
            
            //convert to hex
            var hexsum = checksum.toString(16).toUpperCase();
            if (hexsum.length < 2) {
                hexsum = ("00" + hexsum).slice(-2);
            }
            
            //verify the checksum
            if (data[data.length-1].split("*")[1] == hexsum){ 
                //parse out latitude
                var lat1 = data[3]/100; 
                var lat2 = (lat1 % 1)*100;
                lat1 = Math.floor(lat1);
                lat2 *= 0.016666667; 
                lat1 += lat2; 
                lat1 *= (data[4] == "N" ? 1 : -1); 
                mapTargets.gps.latitude = lat1;
                
                //parse out longitude
                var lon1 = data[5]/100; 
                var lon2 = (lon1 % 1)*100;
                lon1 = Math.floor(lon1);
                lon2 *= 0.016666667; 
                lon1 += lon2; 
                lon1 *= (data[6] == "E" ? 1 : -1);
                mapTargets.gps.longitude = lon1;

                mapTargets.gps.heading = data[8] * 1;
            }
        }
        
  });
});

gpsPort.on("error", function (error) {
    console.log("Serial port ERROR!!!");
});

///////////////////////////////////////////////////////////////////
//////////////////////// Socket.io and Functions //////////////////
///////////////////////////////////////////////////////////////////

io.on('connection', function(socket){
    console.log('a driver connected');

    socket.on('disconnect', function(){
        console.log('driver disconnected');
    });
    
    socket.on('arduino', function(msg) {
        //msg must be in form:
        //type: analogRead, analogWrite, digitalRead, digitalWrite, servo
        //pin: integer pin number
        //value (optional): value to write
        writeArduino(msg);
    });
    
    socket.on('partUpdate', function(msg) {
        handleUpdate(msg);
    });

    if (IS_PI) {
        if (!app.get('partUpdateRunning')) {
            startPartReading();
        }
	if ((!app.get('propIntLoopRunning')) && IS_MC) {
            propIntLoop();
        }
    }
    
});

exec('sudo killall uv4l');

http.listen(3000, function(){
    console.log('listening on *:3000');
});

///////////////////////////////////////
//////////// MAP RELATED STUFF ////////
///////////////////////////////////////

/*mapSocket.on('connection', function(socket){
    console.log('MS CONNECTION')
});*/

//start the tessera server for the map tiles
var tiles = exec('./node_modules/.bin/tessera mbtiles://./kingston.mbtiles -p 3001');

mapSocket.on('connection', function(socket){
    console.log('Map Connection')
    
    //send all the map target points on connection
    socket.emit('targets', mapTargets.targets);
    
    //tmp test to check if location updating works.
    socket.on('rt', function(dt){
        console.log('simulated rover rotate')
        mapTargets.gps.heading += 45;
    });
    
    //When a new marker is to be added
    socket.on('new-marker', function(target) {
        console.log('New Marker: '+target)
        target.id = ++mapTargets.count;
        mapTargets.targets.push(target);    
    }); 
    
    //When a marker is to be deleted
    socket.on('delete-marker', function(id){
        var index = mapTargets.targets.findIndex(function(itm){
	       if(itm.id === id ) return true;
	       return false;
        });
          
        if(~index){
            console.log('DELETING MAP TARGET ID: '+id)
            mapTargets.targets.splice(index, 1);
        } else {console.log('error deleting')}
    });

    socket.on('log-data', function() {
	  writer = fs.createWriteStream("data_log")
          for (i = 0; i < mapTargets.count; i++) {
    		writer.write(mapTargets.targets[i].lat + "\t" + mapTargets.targets[i].lon + "\t" +mapTargets.targets[i].label + "\n")
	  }
    }); 
       
});   
   

    
    //Watch the array, and if there are any changes, push those out to listening qmaps
Array.observe(mapTargets.targets, function(changes){
    console.log("Array Changed:")
    console.log(changes)
    var change = changes[0]
        if(change.type==='splice' && change.removed.length === 0){
            console.log('New Target Added: ');console.log(change.object[change.index]);
            mapSocket.emit('target-added', change.object[change.index]);
        }
        //Deleting from the array 
        else if(change.type==='splice' && change.removed.length > 0 ){
            for (var remove of change.removed){
                console.log('delete: '+remove.id)
                mapSocket.emit('target-deleted', remove.id)
            }
        }
});

//watch the GPS object for changes and push them out.
Object.observe(mapTargets.gps, function(changes){
    changes.forEach(function(change){
       if(change.name==='heading'){
           mapSocket.emit('locationUpdate', mapTargets.gps);
       } 
    });
});

///////////////////////////////////////////////////
///////////////// Camera stuff ////////////////////
///////////////////////////////////////////////////

camSocket.on('connection', function(socket){
    console.log('Camera Viewport Connected')
    if (!app.get('cameraRunning')) {
        switchCamera(3); // 3 is initial camera
    } else {
        startStreaming();
    } 
    camSocket.on('switchCamera', function(msg) {
        switchCamera(msg);
    });
    
    camSocket.on('takePicture', function() {
        takePicture(socket);
    });
});


function switchCamera(cameraPort) {
    if (IS_PI) {
        stopStreaming();
        setTimeout(function() {
            switch (cameraPort) {
                case 1:
                    pin7.writeSync(0);
                    pin11.writeSync(0);
                    pin12.writeSync(1);
                    break;
                case 2:
                    pin7.writeSync(1);
                    pin11.writeSync(0);
                    pin12.writeSync(1);
                    break;
                case 3:
                    pin7.writeSync(0);
                    pin11.writeSync(1);
                    pin12.writeSync(0);
                    break;
                case 4:
                    pin7.writeSync(1);
                    pin11.writeSync(1);
                    pin12.writeSync(0);
                    break;
                default:
                    break;
            }
            setTimeout(startStreaming(), 500);
        }, 500);
    }
}

function startStreaming() {
    if (app.get('cameraRunning')) {
        camSocket.emit('cameraRunning');
        return;
    }
    
    console.log("starting cam");    
    exec('uv4l --driver raspicam --auto-video_nr --width 640 --height 480 --encoding h264 --framerate 10');
    app.set('cameraRunning', true);
    setTimeout(function() { camSocket.emit('cameraRunning'); }, 1000);
}

function stopStreaming() {
    camSocket.emit('cameraStopped');
    app.set('cameraRunning', false);
    exec('sudo killall uv4l');
}

function takePicture(socket) {
    stopStreaming();
    setTimeout(
        function() {
            exec('raspistill -o image.jpg --nopreview --timeout 500');
            setTimeout(function() { 
                fs.readFile('./image.jpg', function(err, buf) {
                    socket.emit('cameraCapture', { image: true, buffer: buf})
                });
                startStreaming(); 
            }, 2000);
        }, 1000);
}

///////////////////////////////
////////// SENSORS ////////////
///////////////////////////////
sensorSocket.on('connection', function(socket){
    console.log('Sensor Readout connected')
    
    socket.on('requestSensorUpdate', function(msg) {
        handleSensorUpdate(msg);
    });
    
});

function handleSensorUpdate(msg) {
    console.log("updating sensor: " + msg);
    //TODO: read from sensors
    sensorSocket.emit('sensorUpdate');
};
