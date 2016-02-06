var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var exec=require('child_process').exec;
var fs = require('fs');
var mapTargets =  { count : 0, targets : [], gps : {latitude : 44.198100, longitude:-76.4508, heading:0}};
var serialport = require("serialport");
var ardPort = new serialport.SerialPort("/dev/ttyACM0", {
  baudrate: 115200,
  parser: serialport.parsers.readline("\n")
});
var thickness = 4000;
var mapSocket = io.of('/map');


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

///////////////////////////////////////////
////////// Control Stuff //////////////////
///////////////////////////////////////////



///////////////////////////////////////////////////////////////////
//////////////////////// Socket.io and Functions //////////////////
///////////////////////////////////////////////////////////////////

io.on('connection', function(socket){
    console.log('a user connected');

    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
    
});

exec('sudo killall uv4l');

http.listen(3000, function(){
    console.log('listening on *:3000');
});

///////////////////////////////////////
//////////// MAP RELATED STUFF ////////
///////////////////////////////////////


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
    
    socket.on('acquire-thickness', function() {
	socket.emit('thickness', thickness);
    });

    socket.on('log-data', function() {
	  writer = fs.createWriteStream("data_log")
          for (i = 0; i < mapTargets.count; i++) {
    		writer.write(mapTargets.targets[i].lat + "\t" + mapTargets.targets[i].lon + "\t" +mapTargets.targets[i].label + "\n")
	  }
    }); 
       
});

ardPort.on('data', function(data) {
	thickness = 4*data/1000; //convert from ns to mm at 4000 m/s
});

ardPort.on("error", function (error) {
    console.log("Serial port error");
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
