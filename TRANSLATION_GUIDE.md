# คู่มือระบบแปลภาษา Pawtonomous Feeder

## ภาษาที่รองรับ
- 🇹🇭 ไทย (Thai) - `th`
- 🇬🇧 อังกฤษ (English) - `en`
- 🇨🇳 จีน (中文) - `zh`
- 🇯🇵 ญี่ปุ่น (日本語) - `ja`

## วิธีการใช้งาน

### 1. การเปลี่ยนภาษา
ผู้ใช้สามารถเปลี่ยนภาษาได้จากหน้า **ตั้งค่า** > **ภาษา**

### 2. การเพิ่มข้อความใหม่ที่ต้องการแปล

#### ใน HTML
ใช้ attribute `data-i18n` สำหรับข้อความ:
```html
<h2 data-i18n="settingsTitle">การตั้งค่าอุปกรณ์</h2>
```

ใช้ attribute `data-i18n-placeholder` สำหรับ placeholder:
```html
<input type="text" data-i18n-placeholder="deviceIdPlaceholder" placeholder="กรอก Device ID">
```

#### ใน JavaScript
ใช้ฟังก์ชัน `t(key)` เพื่อแปลข้อความ:
```javascript
import { t } from './js/translations.js';

const message = t('feedNow'); // จะได้ "ให้อาหารทันที" (ไทย) หรือ "Feed Now" (อังกฤษ)
```

### 3. การเพิ่ม Translation Keys ใหม่

แก้ไขไฟล์ `js/translations.js` และเพิ่ม key ใหม่ในทุกภาษา:

```javascript
export const translations = {
    th: {
        myNewKey: 'ข้อความภาษาไทย',
        // ...
    },
    en: {
        myNewKey: 'English text',
        // ...
    },
    zh: {
        myNewKey: '中文文本',
        // ...
    },
    ja: {
        myNewKey: '日本語テキスト',
        // ...
    }
};
```

## Translation Keys ที่มีอยู่

### Header & Status
- `appName`, `webStatus`, `deviceStatus`, `online`, `offline`

### Navigation
- `navControl`, `navMeals`, `navSettings`, `navNotifications`, `navCalculator`

### Dashboard
- `dashboardTitle`, `feedNow`, `amount`, `fanStrength`, `fanDirection`, `swingMode`, `animalSound`, `feed`
- `statusCheck`, `foodLevel`, `lastMovement`, `checkFood`, `checkMovement`, `playSound`

### Settings
- `settingsTitle`, `wifiSettings`, `timeSettings`, `calibration`, `soundSettings`, `themeSettings`, `languageSettings`
- `accountSettings`, `account`, `editName`, `logout`

### Buttons
- `save`, `cancel`, `delete`, `ok`, `yes`, `no`, `confirm`

### Meals
- `mealsTitle`, `addMeal`, `editMeal`, `mealName`, `mealTime`, `days`, `noMeals`

### Notifications
- `notificationsTitle`, `showLast50`, `noData`

### Calculator
- `calculatorTitle`, `calculateFood`, `animalType`, `animalSpecies`, `animalCount`, `weight`, `lifeStage`

### Days of Week
- `dayMon`, `dayTue`, `dayWed`, `dayThu`, `dayFri`, `daySat`, `daySun`

## การทำงานของระบบ

1. เมื่อผู้ใช้เปลี่ยนภาษา ระบบจะ:
   - บันทึกค่าลง `localStorage` ด้วย key `pawtonomous_language`
   - เรียกฟังก์ชัน `updateTranslations()` เพื่ออัปเดตข้อความทั้งหมด
   - อัปเดต `lang` attribute ของ `<html>` tag

2. ฟังก์ชัน `updateTranslations()` จะ:
   - หาทุก element ที่มี `data-i18n` และแปลข้อความ
   - หาทุก element ที่มี `data-i18n-placeholder` และแปล placeholder
   - หาทุก `<option>` ที่มี `data-i18n` และแปลข้อความ

3. ภาษาที่เลือกจะถูกบันทึกและใช้ต่อเมื่อเปิดเว็บครั้งถัดไป

## หมายเหตุ

- ข้อความที่สร้างแบบ dynamic ใน JavaScript ควรใช้ฟังก์ชัน `t()` เสมอ
- ตรวจสอบให้แน่ใจว่าทุก translation key มีอยู่ในทุกภาษา
- หากไม่พบ key ในภาษาที่เลือก ระบบจะใช้ภาษาไทยเป็นค่าเริ่มต้น
