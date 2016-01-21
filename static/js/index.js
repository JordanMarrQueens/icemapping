var socket = io();

var cameraRunning = false;

var changeModeDown = false;
var controlMode = 0;
var arm = {
    rotation : 0,
    oldRotation : 0,
    tilt : 45,
    elbowAngle : 90,
    set dx(num) {
        num = num/2.0;
        this.rotation += num;
        if (this.rotation > 180) this.rotation = 180;
        if (this.rotation < -180) this.rotation = -180;
    },
    dy: 0,
    oldDY : 0,
    dz : 0,
    oldDZ : 0,
    appendUpdateTo : function(update) {
        if (this.oldRotation != this.rotation){
            update.armPan = this.rotation;
            this.oldRotation = this.rotation;
        }
        if (this.oldDY != this.dy){
            update.arm1 = this.dy;
            this.oldDY = this.dy;
        }
        if (this.oldDZ != this.dz){
            update.arm2 = this.dz;
            this.oldDZ = this.dz;
        }
    }
}

var wheels = {
    wheelFL : 0,
    oldWheelFL : 0,
    wheelFR : 0,
    oldWheelFR : 0,
    wheelBL : 0,
    oldWheelBL : 0,
    wheelBR : 0,
    oldWheelBR : 0,
    setJoystickPosition : function(dx, dy) {
        dy = -dy;
        dx = -dx;
        var speedMultiplier = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
        if (speedMultiplier > 1) speedMultiplier = 1.0;
        
        if (Math.atan(dy/dx) < (Math.PI/6.0) && dy > 0 && dx > 0) {
            this.right = speedMultiplier*100;
            this.left = this.right;
            this.right = -this.right * (((Math.PI/6.0)-Math.atan(dy/dx))/(Math.PI/6.0));
        } else if (Math.atan(dy/dx) < (Math.PI/2.0) && dy > 0 && dx > 0){
            this.right = speedMultiplier*100;
            this.left = this.right;
            this.right = -this.right * (((Math.PI/3.0)-Math.atan(dy/dx)-Math.PI/6.0)/(Math.PI/3.0));
        } else if (Math.atan(dy/dx) < (Math.PI/6.0) && dy < 0 && dx < 0){
            this.right = speedMultiplier*100;
            this.left = -this.right;
            this.right = this.right * (((Math.PI/6.0)-Math.atan(dy/dx))/(Math.PI/6.0));
        } else if (Math.atan(dy/dx) < (Math.PI/2.0) && dy < 0 && dx < 0){
            this.right = speedMultiplier*100;
            this.left = -this.right;
            this.right = this.right * (((Math.PI/3.0)-Math.atan(dy/dx)-Math.PI/6.0)/(Math.PI/3.0));
        } else if (Math.abs(Math.atan(dy/dx)) < (Math.PI/6.0) && dy > 0 && dx < 0) { //this.left WHEEL STUFF
            this.right = speedMultiplier*100;
            this.left = this.right;
            this.left = -this.left * (((Math.PI/6.0)-Math.abs(Math.atan(dy/dx)))/(Math.PI/6.0));
        } else if (Math.abs(Math.atan(dy/dx)) < (Math.PI/6.0) && dy < 0 && dx > 0){
            this.right = speedMultiplier*100;
            this.left = this.right;
            this.left = this.left * (((Math.PI/6.0)-Math.abs(Math.atan(dy/dx)))/(Math.PI/6.0));
        } else if (Math.abs(Math.atan(dy/dx)) < (Math.PI/2.0) && dy < 0 && dx > 0){
            this.right = speedMultiplier*100;
            this.left = this.right;
            this.left = this.left * (((Math.PI/3.0)-Math.abs(Math.atan(dy/dx))-Math.PI/6.0)/(Math.PI/3.0));
        } else if (Math.abs(Math.atan(dy/dx)) < (Math.PI/2.0) && dy > 0 && dx < 0){
            this.right = speedMultiplier*100;
            this.left = this.right;
            this.left = -this.left * (((Math.PI/3.0)-Math.abs(Math.atan(dy/dx))-Math.PI/6.0)/(Math.PI/3.0));
        }
        
        if (dy <= 0 && dx >= 0) {
            this.right = -speedMultiplier*100;
        }
        if (dy <= 0 && dx <= 0) {
            this.left = -speedMultiplier*100;
        }
        if (dy >= 0 && dx >= 0) {
            this.left = speedMultiplier*100;
        }
        if (dy >= 0 && dx <= 0) {
            this.right = speedMultiplier*100;
        }

        this.left = this.left/100.0;
        this.right = this.right/100.0;
        
        this.wheelFL = this.left;
        this.wheelBL = this.left;
        this.wheelFR = this.right;
        this.wheelBR = this.right;
    },
    appendUpdateTo : function(update) {
        if (this.oldWheelFL != this.wheelFL){
            update.wheelFL = this.wheelFL;
            this.oldWheelFL = this.wheelFL;
        }
        if (this.oldWheelFR != this.wheelFR){
            update.wheelFR = this.wheelFR;
            this.oldWheelFR = this.wheelFR;
        }
        if (this.oldWheelBL != this.wheelBL){
            update.wheelBL = this.wheelBL;
            this.oldWheelBL = this.wheelBL;
        }
        if (this.oldWheelBR != this.wheelBR){
            update.wheelBR = this.wheelBR;
            this.oldWheelBR = this.wheelBR;
        }
    }
}

//////////////////////////////////////////////////////////////
////////////////// Begin Socket.io ///////////////////////////
//////////////////////////////////////////////////////////////
var camSocket = io(window.location.origin + '/cam')

camSocket.on('cameraRunning', function() {
    document.getElementById("cameraControls").style.display = "block";
    document.getElementById("loadingBar").style.display = "none"
    if (!cameraRunning) {
        startCamera('remote-video');
        cameraRunning = true;
    }
});

camSocket.on('cameraStopped', function() {
    stopCamera();
    cameraRunning = false;
});

camSocket.on('cameraCapture', function(info) {
    document.getElementById("cameraControls").style.display = "block";
    document.getElementById("loadingBar").style.display = "none"
    if (info.image) {
        var blob = new Blob([info.buffer], {type: 'application/octet-stream'});
        var dNow = new Date();
        saveAs(blob, "snapshot-"+dNow.getHours()+"."+dNow.getMinutes()+"."+dNow.getSeconds()+".jpg");
    }
});

function takePicture() {
    document.getElementById("cameraControls").style.display = "none";
    document.getElementById("loadingBar").style.display = "block"
    stopCamera();
    cameraRunning = false;
    camSocket.emit('takePicture');
}

function switchCamera(num) {
    document.getElementById("cameraControls").style.display = "none";
    document.getElementById("loadingBar").style.display = "block"
    camSocket.emit('switchCamera', num);
}

function checkConnection() {
    setTimeout(checkConnection, 100);
    var span = document.getElementById("connectionStatus");
    if (socket.connected) {
        span.textContent = "Connected"
        span.style.color = "#009688"
    } else {
        span.textContent = "Not Connected"
        span.style.color = "#F44336"
    }
}

socket.on('partValues', function(msg) {
    Object.keys(msg).forEach(function(part) {
        switch (part) {
            case "arm1":
                arm.tilt = msg[part];
                break;
            case "arm2": //value between -1 -> 1
                arm.elbowAngle = msg[part];
                break;
            case "wheelFL":
                
                break;
            case "wheelFR":
                
                break;
            case "wheelBL":
                
                break;
            case "wheelBR":
                
                break;
            case "gps":
                msg[part].latitude
                msg[part].longitude
                msg[part].heading
                break;
            default:
                console.log("Unknown part: "+part);
                break;
        }
    }, this);
});

////////////////////////////////////////////////////////////////////////////////////
////////////////////// END SOCKET.IO STUFF /////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////

function initRover() {
    initCanvas(); //in Arm.js
    window.requestAnimationFrame(gamepadLoop); //note: this is non-blocking :D
    sendToRover();
    checkConnection();
}

function gamepadLoop(timestamp) {
    window.requestAnimationFrame(gamepadLoop);
    gamepad = navigator.getGamepads()[0];
    if (gamepad != null) {
        var dx = (Math.abs(gamepad.axes[0]) > 0.1 ? -gamepad.axes[0] : 0)
        var dy = (Math.abs(gamepad.axes[1]) > 0.1 ? gamepad.axes[1] : 0);
        var dz = 0;
        if (gamepad.axes[9] == -1) {
            dz = 1;
        } else if (gamepad.axes[9] < 0.15 && gamepad.axes[9] > 0.14) {
            dz = -1;
        }
        
        if (gamepad.buttons[1].pressed != changeModeDown) {
            if (gamepad.buttons[1].pressed) {
                var newMode = (controlMode + 1 > 2) ? 0 : controlMode + 1;
                if (controlMode > 2) controlMode = 0;
                switchMode(newMode);
                changeModeDown = gamepad.buttons[1].pressed;
            } else {
                changeModeDown = false;
            }
        }

        if (controlMode == 0) {
            arm.dx = dx;
            arm.dy = dy;
            arm.dz = dz;
        } else if (controlMode == 1) {
            wheels.setJoystickPosition(dx, dy);
        } else if (controlMode == 2) {
            
        }
    }
    
    drawAll(arm.rotation, arm.tilt, arm.elbowAngle);
}

function sendToRover(){
    //Only send updates if they have updated
    //And only send 10 times per second
    setTimeout(sendToRover, 100);
    var update = {};

    arm.appendUpdateTo(update);
    wheels.appendUpdateTo(update);
    //Add more parts as we need
    if (Object.keys(update).length != 0) {
        socket.emit("partUpdate", update);
    }
}

//MODES: 0 - Arm, 1 - Wheels, 2 - Drill
function switchMode(mode) {
    controlMode = mode;
    switch (mode) {
        case 0:
            document.getElementById("modeArm").checked = true;
            break;
        case 1:
            document.getElementById("modeWheels").checked = true;
            break;
        case 2:
            document.getElementById("modeDrill").checked = true;
            break;
        default:
            break;
    }
}

window.onbeforeunload = function() {
    if (ws) {
        ws.onclose = function () {}; // disable onclose handler first
        stopCamera();
    }
};


/////////////////////////////////////////////////////
///////////// Safety functions //////////////////////
/////////////////////////////////////////////////////

function arduino(type, pin, value) {
    //type: analogWrite, analogRead, digitalRead, digitalWrite, servo
    //pin: integer pin number
    //value (optional): value to write
    socket.emit('arduino', { "type": type, "pin": pin, "value": value });
}
