/*
  Rui Santos & Sara Santos - Random Nerd Tutorials
  Complete project details at https://RandomNerdTutorials.com/esp32-web-bluetooth/
  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files.
  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Adafruit_NeoPixel.h>

BLEServer* pServer = NULL;
BLECharacteristic* pSensorCharacteristic = NULL;
BLECharacteristic* pLedCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;
uint32_t value = 0;

const int ledPin = 13; // Use the appropriate GPIO pin for your setup
const int fabricPin = 15;
bool fabricState = HIGH;
bool lastState = HIGH;   // Last state of the fabric pin
const int neoPixelPin = 14;
const int numPixels = 1;
unsigned long previousMillis = 0;

Adafruit_NeoPixel strip = Adafruit_NeoPixel(numPixels, neoPixelPin, NEO_GRB + NEO_KHZ800);

// See the following for generating UUIDs:
// https://www.uuidgenerator.net/
#define SERVICE_UUID        "19b10000-e8f2-537e-4f6c-d104768a1214"
#define SENSOR_CHARACTERISTIC_UUID "19b10001-e8f2-537e-4f6c-d104768a1214"
#define LED_CHARACTERISTIC_UUID "f8586726-e964-4135-a2d4-afc3375e50f3"

class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
    }
};

class MyCharacteristicCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic* pLedCharacteristic) {
      String value = pLedCharacteristic->getValue();
      if (value.length() > 0 && fabricState == HIGH && lastState == HIGH) {
        Serial.print("Characteristic event, written: ");
        Serial.println(static_cast<int>(value[0])); // Print the integer value
        int receivedValue = static_cast<int>(value[0]);
        strip.setPixelColor(0, strip.Color(200, 200, 255));
        strip.setBrightness(receivedValue);
        strip.show();
        
        
        
      }
    }
};

void setup() {
  Serial.begin(115200);
  pinMode(fabricPin, INPUT_PULLUP); // Set fabricPin as an input with internal pull-up resistor

  pinMode(ledPin, OUTPUT);
  strip.begin();
  strip.show();

  // Create the BLE Device
  BLEDevice::init("ESP32");

  // Create the BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create the BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Create a BLE Characteristic
  pSensorCharacteristic = pService->createCharacteristic(
                            SENSOR_CHARACTERISTIC_UUID,
                            BLECharacteristic::PROPERTY_READ   |
                            BLECharacteristic::PROPERTY_WRITE  |
                            BLECharacteristic::PROPERTY_NOTIFY |
                            BLECharacteristic::PROPERTY_INDICATE
                          );

  // Create the ON button Characteristic
  pLedCharacteristic = pService->createCharacteristic(
                         LED_CHARACTERISTIC_UUID,
                         BLECharacteristic::PROPERTY_WRITE
                       );

  // Register the callback for the ON button characteristic
  pLedCharacteristic->setCallbacks(new MyCharacteristicCallbacks());

  // https://www.bluetooth.com/specifications/gatt/viewer?attributeXmlFile=org.bluetooth.descriptor.gatt.client_characteristic_configuration.xml
  // Create a BLE Descriptor
  pSensorCharacteristic->addDescriptor(new BLE2902());
  pLedCharacteristic->addDescriptor(new BLE2902());

  // Start the service
  pService->start();

  // Start advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0);  // set value to 0x00 to not advertise this parameter
  BLEDevice::startAdvertising();
  Serial.println("Waiting a client connection to notify...");
}

void loop() {
  unsigned long currentMillis = millis();

  // notify changed value
  if (deviceConnected) {
    int fabricState = digitalRead(fabricPin);
//  Serial.println(
    if (fabricState == LOW && lastState == HIGH) {
      pSensorCharacteristic->setValue(String("button_down").c_str());
      pSensorCharacteristic->notify();
      //      strip.setPixelColor(0, strip.Color(200, 200, 255)); //Turn on NeoPixel
      //      strip.show();
      strip.setPixelColor(0, strip.Color(0, 0, 0)); // Turn off NeoPixel
      strip.setBrightness(0);
      strip.show();
      Serial.println("button_down");
      previousMillis = millis();
    }
    else if (fabricState == HIGH && lastState == LOW) {
      pSensorCharacteristic->setValue(String("button_up").c_str());
      pSensorCharacteristic->notify();
      //        digitalWrite(ledPin, LOW);   // Turn off the LED
      strip.setPixelColor(0, strip.Color(0, 0, 0)); // Turn off NeoPixel
      strip.setBrightness(0);
      strip.show();
      Serial.println("button_up");
    } else if (fabricState == LOW) {
      strip.setPixelColor(0, strip.Color(200, 200, 255));
      uint8_t brightness = (cos((previousMillis - millis()) / 500.0 + PI) * 127) + 128; // Calculate pulsing brightness

      strip.setBrightness(255 - brightness);
      strip.show();
    } 
    lastState = fabricState;

    delay(5); // bluetooth stack will go into congestion, if too many packets are sent, in 6 hours test i was able to go as low as 3ms
  }
  // disconnecting
  if (!deviceConnected && oldDeviceConnected) {
    Serial.println("Device disconnected.");
    delay(500); // give the bluetooth stack the chance to get things ready
    pServer->startAdvertising(); // restart advertising
    Serial.println("Start advertising");
    oldDeviceConnected = deviceConnected;
  }
  // connecting
  if (deviceConnected && !oldDeviceConnected) {
    // do stuff here on connecting
    oldDeviceConnected = deviceConnected;
    Serial.println("Device Connected");
  }
}
