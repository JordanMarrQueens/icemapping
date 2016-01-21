from nanpy.servo import Servo
from nanpy.arduinoapi import ArduinoApi
import sys
import json

servos = {}
pins = []
arduino = ArduinoApi(None)

for line in iter(sys.stdin.readline, ''):
    msg = json.loads(line)

    if msg and 'type' in msg:
        pin = msg['pin']
        value = msg['value'] if 'value' in msg else None
            
        if msg['type'] == 'pinMode':
            pins.append(pin)
            arduino.pinMode(pin, arduino.OUTPUT if value == "output" else arduino.INPUT)

        elif msg['type'] == 'servo':
            if pin not in servos:
                servos[pin] = Servo(pin)
            servos[pin].writeMicroseconds(value)

        elif msg['type'] == 'analogWrite':
            if pin not in pins:
                pins.append(pin)
                arduino.pinMode(pin, arduino.OUTPUT)
            arduino.analogWrite(pin, value)

        elif msg['type'] == 'analogRead':
            msg["value"] = arduino.analogRead(pin)
            print json.dumps(msg)

        elif msg['type'] == 'digitalWrite':
            if pin not in pins:
                pins.append(pin)
                arduino.pinMode(pin, arduino.OUTPUT)
            arduino.digitalWrite(pin, arduino.HIGH if value == True else arduino.LOW)

        elif msg['type'] == 'digitalRead':
            if pin not in pins:
                pins.append(pin)
                arduino.pinMode(pin, arduino.INPUT)
            msg["value"] = arduino.digitalRead(pin)
            print json.dumps(msg)

        sys.stdout.flush()
