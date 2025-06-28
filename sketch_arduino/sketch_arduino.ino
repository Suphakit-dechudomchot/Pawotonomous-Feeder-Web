// arduino_servo_test.cpp
// โค้ดสำหรับทดสอบการทำงานของ Servo Motor บน ESP32 GPIO 17

#include <ESP32Servo.h> // เรียกใช้ไลบรารี ESP32Servo สำหรับควบคุม Servo

// กำหนดขา GPIO ที่จะต่อกับ Servo Motor
const int SERVO_PIN = 17; // ใช้ขา GPIO 17 ตามที่คุณระบุ

Servo testServo; // สร้าง Object ของ Servo

void setup() {
  Serial.begin(115200); // เริ่มต้น Serial Communication ที่ Baud Rate 115200
  Serial.println("Starting Servo Test on GPIO 17...");

  // แนบ Servo เข้ากับขาที่กำหนด
  // ตั้งค่าช่อง PWM สำหรับ Servo
  // ESP32 มี 16 ช่อง PWM (0-15) เราเลือกใช้ช่องใดก็ได้
  // สำหรับ Servo แนะนำให้ใช้ความถี่ 50 Hz และตั้งค่าช่วง Pulse Width ให้ถูกต้อง
  // min_uS: ค่า PWM น้อยสุดสำหรับ 0 องศา (โดยทั่วไป 500 us)
  // max_uS: ค่า PWM มากสุดสำหรับ 180 องศา (โดยทั่วไป 2500 us)
  // ไลบรารี ESP32Servo จะจัดการค่าเหล่านี้ให้เป็นค่าเริ่มต้นที่เหมาะสมอยู่แล้ว
  testServo.attach(SERVO_PIN); 

  // ตั้งตำแหน่งเริ่มต้นของ Servo ไปที่ 0 องศา
  testServo.write(0); 
  Serial.println("Servo attached to GPIO 17 and set to 0 degrees.");
}

void loop() {
  // หมุน Servo จาก 0 ถึง 180 องศา
  for (int pos = 0; pos <= 180; pos += 1) { // เพิ่มทีละ 1 องศา
    testServo.write(pos); // สั่งให้ Servo ไปยังตำแหน่ง pos องศา
    Serial.print("Servo position: ");
    Serial.println(pos);
    delay(15); // หน่วงเวลา 15 มิลลิวินาที เพื่อให้ Servo มีเวลาเคลื่อนที่
  }

  delay(1000); // หน่วงเวลา 1 วินาที ที่ตำแหน่ง 180 องศา

  // หมุน Servo จาก 180 กลับไป 0 องศา
  for (int pos = 180; pos >= 0; pos -= 1) { // ลดลงทีละ 1 องศา
    testServo.write(pos); // สั่งให้ Servo ไปยังตำแหน่ง pos องศา
    Serial.print("Servo position: ");
    Serial.println(pos);
    delay(15); // หน่วงเวลา 15 มิลลิวินาที
  }

  delay(1000); // หน่วงเวลา 1 วินาที ที่ตำแหน่ง 0 องศา
}
