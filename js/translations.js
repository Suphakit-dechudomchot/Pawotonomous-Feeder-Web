// translations.js - Multi-language support
export const translations = {
    th: {
        // Header
        appName: 'Pawtonomous',
        webStatus: 'เว็บ',
        deviceStatus: 'เครื่อง',
        online: 'ออนไลน์',
        offline: 'ออฟไลน์',
        
        // Offline Banner
        offlineMode: 'โหมดออฟไลน์',
        offlineMessage: 'คุณสามารถดูและแก้ไขข้อมูลได้ การเปลี่ยนแปลงจะถูกบันทึกเมื่อกลับมาออนไลน์',
        
        // Navigation
        navControl: 'ควบคุม',
        navMeals: 'มื้ออาหาร',
        navSettings: 'ตั้งค่า',
        navNotifications: 'แจ้งเตือน',
        navCalculator: 'คำนวณ',
        
        // Dashboard
        dashboardTitle: 'ควบคุมด่วน',
        feedNow: 'ให้อาหารทันที',
        amount: 'ปริมาณ (กรัม)',
        fanStrength: 'ความแรงลม (0-100%)',
        fanDirection: 'ทิศทางลม (60°-120°)',
        swingMode: 'โหมดสวิง',
        animalSound: 'เสียงเรียกสัตว์',
        feed: 'ให้อาหาร',
        statusCheck: 'สถานะและการตรวจสอบ',
        foodLevel: 'ปริมาณอาหาร',
        lastMovement: 'เคลื่อนไหวล่าสุด',
        checkFood: 'เช็คอาหาร',
        checkMovement: 'เช็คเคลื่อนไหว',
        playSound: 'เล่นเสียงเรียกสัตว์',
        playThisSound: 'เล่นเสียงนี้',
        
        // Settings
        settingsTitle: 'การตั้งค่าอุปกรณ์',
        wifiSettings: 'การเชื่อมต่อ Wi-Fi',
        wifiSSID: 'WIFI SSID',
        wifiPassword: 'WIFI PASSWORD',
        wifiNote: 'ข้อมูล Wi-Fi จะถูกส่งไปยังอุปกรณ์เพื่อเชื่อมต่ออัตโนมัติ',
        timeSettings: 'การตั้งค่าเวลา',
        timezone: 'โซนเวลา (UTC+/-H)',
        selectTimezone: '-- เลือกโซนเวลา --',
        calibration: 'การปรับเทียบปริมาณอาหาร',
        calibrationNote: 'ปรับเทียบอัตราส่วนกรัมต่อวินาทีเพื่อให้การจ่ายอาหารแม่นยำ',
        currentValue: 'ค่าปัจจุบัน',
        testAndSet: 'ทดสอบและตั้งค่า',
        soundSettings: 'เสียงเรียกสัตว์',
        selectSound: 'เลือกเสียง',
        themeSettings: 'ธีมสี',
        selectTheme: 'เลือกธีม',
        languageSettings: 'ภาษา',
        selectLanguage: 'เลือกภาษา',
        accountSettings: 'บัญชีผู้ใช้',
        account: 'บัญชี',
        editName: 'แก้ไขชื่อ',
        logout: 'ออกจากระบบ / เปลี่ยนอุปกรณ์',
        
        // Buttons
        save: 'บันทึก',
        cancel: 'ยกเลิก',
        delete: 'ลบ',
        ok: 'ตกลง',
        yes: 'ใช่',
        no: 'ไม่',
        confirm: 'ยืนยัน',
        
        // Themes
        themeLight: '🌞 สว่าง (ค่าเริ่มต้น)',
        themeDark: '🌙 มืด',
        themeBlue: '💙 ฟ้า',
        themeGolden: '🐕 โกลเดน',
        
        // Device Connection
        connectDevice: 'เชื่อมต่ออุปกรณ์',
        enterDeviceId: 'กรุณากรอก Device ID ของเครื่องให้อาหาร',
        scanQR: 'หรือสแกน QR Code ข้างตัวเครื่อง',
        deviceIdPlaceholder: 'กรอก Device ID',
        
        // Meals
        mealsTitle: 'ตั้งค่ามื้ออาหาร',
        addMeal: 'เพิ่มมื้ออาหาร',
        editMeal: 'แก้ไขมื้ออาหาร',
        mealName: 'ชื่อมื้ออาหาร',
        mealTime: 'เวลา',
        days: 'วัน',
        noMeals: 'ไม่มีมื้ออาหารที่ตั้งค่าไว้',
        
        // Calibration
        calibrationTitle: 'ทดสอบและตั้งค่าปริมาณอาหาร',
        placeContainer: 'โปรดวางภาชนะรองรับอาหารที่ช่องจ่ายอาหาร',
        releaseTest: 'ปล่อยอาหารทดสอบ (5 วินาที)',
        weightMeasured: 'น้ำหนักที่ชั่งได้ (กรัม)',
        enterWeight: 'กรอกน้ำหนัก (กรัม)',
        saveCalibration: 'บันทึกค่า Calibrate',
        
        // Meal Modal
        addMealTitle: 'เพิ่มมื้ออาหารใหม่',
        mealNameLabel: 'ชื่อมื้ออาหาร:',
        mealNamePlaceholder: 'เช่น มื้อเช้า, มื้อเย็น',
        daysLabel: 'วัน:',
        amountLabel: 'ปริมาณ (กรัม):',
        fanStrengthLabel: 'ความแรงลม (0-100%):',
        fanDirectionLabel: 'ทิศทางลม (60°-120°):',
        swingModeLabel: 'โหมดสวิง',
        animalSoundLabel: 'เสียงเรียกสัตว์',
        
        // Days of week
        dayMon: 'จ',
        dayTue: 'อ',
        dayWed: 'พ',
        dayThu: 'พฤ',
        dayFri: 'ศ',
        daySat: 'ส',
        daySun: 'อา',
        
        // Owner Name Modal
        editAccountName: 'แก้ไขชื่อบัญชี',
        accountNameLabel: 'ชื่อบัญชี:',
        accountNamePlaceholder: 'เช่น บ้านป๋อม/ชื่อผู้ใช้',
        
        // Dashboard Cards
        feedNowTitle: 'ให้อาหารทันที',
        statusCheckTitle: 'สถานะและการตรวจสอบ',
        playSoundTitle: 'เล่นเสียงเรียกสัตว์',
        
        // Settings Cards
        wifiSettingsTitle: 'การเชื่อมต่อ Wi-Fi',
        wifiSsidLabel: 'WIFI SSID:',
        wifiSsidPlaceholder: 'ชื่อ Wi-Fi',
        wifiPasswordLabel: 'WIFI PASSWORD:',
        wifiPasswordPlaceholder: 'รหัสผ่าน Wi-Fi',
        timeSettingsTitle: 'การตั้งค่าเวลา',
        timezoneLabel: 'โซนเวลา (UTC+/-H):',
        calibrationTitle2: 'การปรับเทียบปริมาณอาหาร',
        soundSettingsTitle: 'เสียงเรียกสัตว์',
        soundSelectLabel: 'เลือกเสียง:',
        accountSettingsTitle: 'บัญชีผู้ใช้',
        
        // Notes and descriptions
        wifiNoteText: 'ข้อมูล Wi-Fi จะถูกส่งไปยังอุปกรณ์เพื่อเชื่อมต่ออัตโนมัติ',
        calibrationNoteText: 'ปรับเทียบอัตราส่วนกรัมต่อวินาทีเพื่อให้การจ่ายอาหารแม่นยำ',
        soundNoteText: 'ไฟล์ต้องถูกวางบน microSD หรือใน Storage ของระบบ (เช่น 001.mp3, 002.mp3...) โดยอุปกรณ์จะเล่นตามดัชนีที่เลือก',
        themeNoteText: 'เปลี่ยนสีธีมของเว็บแอปตามความชอบ',
        languageNoteText: 'เปลี่ยนภาษาของเว็บแอป',
        
        // Meal Schedule
        mealScheduleSubtitle: 'ตั้งค่าเวลา, ปริมาณ, และเสียงสำหรับแต่ละมื้อ',
        loadingMeals: 'กำลังโหลดมื้ออาหาร...',
        
        // Notification History
        notificationSubtitle: 'แสดงการแจ้งเตือน 50 รายการล่าสุด',
        
        // Calculator
        calculatorSubtitle: 'คำนวณปริมาณอาหารที่เหมาะสมสำหรับสัตว์เลี้ยงของคุณ',
        animalTypeLabel: 'ประเภทสัตว์:',
        animalSpeciesLabel: 'ชนิดสัตว์:',
        animalCountLabel: 'จำนวนสัตว์:',
        weightLabel: 'น้ำหนัก (Kg):',
        lifeStageLabel: 'ช่วงชีวิต/กิจกรรม:',
        selectAnimalType: '-- เลือกประเภทสัตว์ --',
        selectAnimalSpecies: '-- เลือกชนิดสัตว์ --',
        selectLifeStage: '-- เลือก --',
        
        // Status displays
        foodLevelText: 'ปริมาณอาหาร:',
        lastMovementText: 'เคลื่อนไหวล่าสุด:',
        currentValueText: 'ค่าปัจจุบัน:',
        accountText: 'บัญชี:',
        noDataText: '-',
        gramsPerSecond: 'กรัม/วินาที',
        
        // Buttons text
        playThisSoundBtn: 'เล่นเสียงนี้',
        checkFoodBtn: 'เช็คอาหาร',
        checkMovementBtn: 'เช็คเคลื่อนไหว',
        testAndSetBtn: 'ทดสอบและตั้งค่า',
        createMealBtn: 'นำไปสร้างมื้ออาหาร',
        logoutFullText: 'ออกจากระบบ / เปลี่ยนอุปกรณ์',
        
        // Select options
        noSelection: '-- ไม่เลือก --',
        selectTimezoneOption: '-- เลือกโซนเวลา --',
        
        // Animal types
        animalType_ปลาน้ำจืด: 'ปลาน้ำจืด',
        animalType_สัตว์เลี้ยงลูกด้วยนม: 'สัตว์เลี้ยงลูกด้วยนม',
        animalType_สัตว์ปีก: 'สัตว์ปีก',
        
        // Animal species
        animalSpecies_ปลาทอง: 'ปลาทอง',
        animalSpecies_ปลาคาร์ฟ: 'ปลาคาร์ฟ',
        animalSpecies_ปลากัด: 'ปลากัด',
        animalSpecies_สุนัข: 'สุนัข',
        animalSpecies_แมว: 'แมว',
        animalSpecies_กระต่าย: 'กระต่าย',
        animalSpecies_ไก่: 'ไก่',
        animalSpecies_เป็ด: 'เป็ด',
        
        // Life stages
        lifeStage_ลูกสุนัข: 'ลูกสุนัข',
        lifeStage_โตเต็มวัย_ทำหมันแล้ว: 'โตเต็มวัย (ทำหมันแล้ว)',
        lifeStage_โตเต็มวัย_ไม่ทำหมัน: 'โตเต็มวัย (ไม่ทำหมัน)',
        lifeStage_ลดน้ำหนัก: 'ลดน้ำหนัก',
        lifeStage_เพิ่มน้ำหนัก: 'เพิ่มน้ำหนัก',
        lifeStage_ตั้งครรภ์: 'ตั้งครรภ์',
        lifeStage_ให้นมบุตร: 'ให้นมบุตร',
        lifeStage_ลูกแมว: 'ลูกแมว',
        
        // Calculator notes
        calculatorNote_enterWeightAndLifeStage: 'กรุณาระบุน้ำหนักและช่วงชีวิต',
        calculatorNote_energyNeeded: 'พลังงานที่ต้องการ',
        calculatorNote_perDay: 'วัน',
        calculatorNote_perMeal: 'มื้อ',
        calculatorNote_shouldDivide: 'ควรแบ่งให้หลายมื้อต่อวัน',
        calculatorNote_dependsOnTemp: 'ปริมาณขึ้นอยู่กับอุณหภูมิน้ำและขนาดปลา',
        calculatorNote_forAdult: 'สำหรับปลาโตเต็มวัย ควรแบ่งให้ 1-2 มื้อต่อวัน',
        calculatorNote_hayMain: 'หญ้าแห้งเป็นอาหารหลัก ควรให้เม็ดอาหารจำกัด',
        calculatorNote_eatByNeed: 'ไก่จะกินตามความต้องการสารอาหาร',
        calculatorNote_duckAdult: 'เป็ดโตเต็มวัยจะกินประมาณ 170-200 กรัมต่อวัน',
        calculatorNote_needWeightAndLife: 'ต้องระบุน้ำหนักและช่วงชีวิต/ระดับกิจกรรม',
        
        // Countdown
        countdown_setTimezone: 'กรุณาตั้งค่าโซนเวลาในหน้า \'\'ตั้งค่า\'\' ',
        countdown_calculating: 'กำลังคำนวณมื้อถัดไป...',
        countdown_feedIn: 'จะให้อาหารในอีก',
        countdown_noUpcoming: 'ไม่มีมื้ออาหารที่กำลังจะมาถึง',
        countdown_days: 'วัน',
        countdown_hours: 'ชั่วโมง',
        countdown_minutes: 'นาที',
        countdown_seconds: 'วินาที',
        
        // Days and months
        everyDay: 'ทุกวัน',
        noDaysSelected: 'ไม่ระบุวัน',
        specificDateLabel: 'วันที่ระบุ:',
        noName: 'ไม่มีชื่อ',
        
        // Alert messages
        error: 'ข้อผิดพลาด',
        success: 'สำเร็จ',
        warning: 'แจ้งเตือน',
        info: 'ข้อมูล',
        backOnline: 'กลับมาออนไลน์',
        internetConnected: 'เชื่อมต่ออินเทอร์เน็ตแล้ว',
        noInternet: 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต คุณยังสามารถดูข้อมูลได้',
        deviceNotFound: 'ไม่พบบัญชี',
        deviceIdNotFound: 'ไม่พบ Device ID นี้ในระบบ',
        cannotVerifyDevice: 'ไม่สามารถตรวจสอบ Device ID ได้ โปรดลองอีกครั้ง',
        cannotLoadData: 'ไม่สามารถโหลดข้อมูลเริ่มต้นได้',
        enterDeviceIdMsg: 'กรุณากรอก Device ID',
        authError: 'ข้อผิดพลาดการยืนยันตัวตน',
        cannotLogin: 'ไม่สามารถเข้าสู่ระบบได้',
        accountNameTooLong: 'ชื่อบัญชีต้องไม่เกิน 20 ตัวอักษร',
        accountNameSaved: 'บันทึกชื่อบัญชีเรียบร้อย',
        cannotSaveAccountName: 'ไม่สามารถบันทึกชื่อบัญชีได้',
        cannotApplyAmount: 'ไม่สามารถนำปริมาณที่แนะนำไปใช้ได้',
        confirmDelete: 'คุณแน่ใจหรือไม่ที่จะลบมื้ออาหารนี้?',
        
        // Status text
        webOnline: 'เว็บ: ออนไลน์',
        webOffline: 'เว็บ: ออฟไลน์',
        deviceOnline: 'เครื่อง: ออนไลน์',
        deviceOffline: 'เครื่อง: ออฟไลน์',
        
        // Notifications
        notificationsTitle: 'ประวัติการแจ้งเตือน',
        showLast50: 'แสดงการแจ้งเตือน 50 รายการล่าสุด',
        noData: 'ไม่มีข้อมูล',
        
        // Feeding History
        feedingHistoryTitle: 'ประวัติการจ่ายอาหาร',
        filterDay: 'วันนี้',
        filterWeek: '7 วัน',
        filterMonth: '30 วัน',
        totalFeedings: 'จำนวนครั้ง:',
        totalAmount: 'ปริมาณรวม:',
        avgPerFeeding: 'เฉลี่ยต่อครั้ง:',
        noFeedingHistory: 'ไม่มีประวัติการจ่ายอาหาร',
        
        // Calculator
        calculatorTitle: 'โปรแกรมคำนวณอาหาร',
        calculateFood: 'คำนวณปริมาณอาหารที่เหมาะสมสำหรับสัตว์เลี้ยงของคุณ',
        animalType: 'ประเภทสัตว์',
        animalSpecies: 'ชนิดสัตว์',
        animalCount: 'จำนวนสัตว์',
        weight: 'น้ำหนัก (Kg)',
        lifeStage: 'ช่วงชีวิต/กิจกรรม',
        recommendedAmount: 'ปริมาณอาหารที่แนะนำ',
        createMeal: 'นำไปสร้างมื้ออาหาร',
        
        // Setup
        setupRequired: 'กรุณาตั้งค่าเริ่มต้น',
        setupMessage: 'โปรดไปที่หน้า "ตั้งค่า" เพื่อกำหนดโซนเวลา และปรับเทียบปริมาณอาหารให้เสร็จสิ้นก่อนใช้งาน',
        goToSettings: 'ไปที่หน้าตั้งค่า',
        
        // Meal status
        enabled: 'เปิดใช้งาน',
        disabled: 'ปิดใช้งาน',
        calibrationRequired: 'กรุณาทำการ Calibrate ปริมาณอาหารในหน้า "ตั้งค่า" ก่อน',
        noDaysSelectedWarning: 'เนื่องจากไม่ได้ระบุวัน มื้ออาหารนี้จะถูกตั้งค่าสำหรับวันที่',
        minAmountWarning: 'ปริมาณอาหารต้องไม่น้อยกว่า 1 กรัม',
        timeConflict: 'เวลาทับซ้อน',
        timeConflictMessage: 'เวลาที่ตั้งค่าทับซ้อนกับมื้ออาหารอื่น กรุณาเลือกเวลาใหม่',
        mealSaved: 'บันทึกมื้ออาหารเรียบร้อย',
        mealDeleted: 'ลบมื้ออาหารแล้ว',
        mealStatusChanged: 'เปลี่ยนสถานะมื้ออาหารแล้ว',
        cannotChangeMealStatus: 'ไม่สามารถเปลี่ยนสถานะมื้ออาหารได้',
        
        // Audio selection
        noAudio: '-- ไม่เลือก --',
        audioFile: 'ไฟล์เสียง',
        
        // Device notifications
        feedingCompleted: 'ให้อาหารเสร็จสิ้น',
        foodLow: 'อาหารใกล้หมด',
        foodEmpty: 'อาหารหมด',
        movementDetected: 'ตรวจพบการเคลื่อนไหว',
        systemError: 'ข้อผิดพลาดระบบ'
    },
    
    en: {
        // Header
        appName: 'Pawtonomous',
        webStatus: 'Web',
        deviceStatus: 'Device',
        online: 'Online',
        offline: 'Offline',
        
        // Offline Banner
        offlineMode: 'Offline Mode',
        offlineMessage: 'You can view and edit data. Changes will be saved when back online',
        
        // Navigation
        navControl: 'Control',
        navMeals: 'Meals',
        navSettings: 'Settings',
        navNotifications: 'Notifications',
        navCalculator: 'Calculator',
        
        // Dashboard
        dashboardTitle: 'Quick Control',
        feedNow: 'Feed Now',
        amount: 'Amount (grams)',
        fanStrength: 'Fan Strength (0-100%)',
        fanDirection: 'Fan Direction (60°-120°)',
        swingMode: 'Swing Mode',
        animalSound: 'Animal Sound',
        feed: 'Feed',
        statusCheck: 'Status & Check',
        foodLevel: 'Food Level',
        lastMovement: 'Last Movement',
        checkFood: 'Check Food',
        checkMovement: 'Check Movement',
        playSound: 'Play Animal Sound',
        playThisSound: 'Play This Sound',
        
        // Settings
        settingsTitle: 'Device Settings',
        wifiSettings: 'Wi-Fi Connection',
        wifiSSID: 'WIFI SSID',
        wifiPassword: 'WIFI PASSWORD',
        wifiNote: 'Wi-Fi credentials will be sent to device for automatic connection',
        timeSettings: 'Time Settings',
        timezone: 'Timezone (UTC+/-H)',
        selectTimezone: '-- Select Timezone --',
        calibration: 'Food Amount Calibration',
        calibrationNote: 'Calibrate grams per second ratio for accurate food dispensing',
        currentValue: 'Current Value',
        testAndSet: 'Test & Set',
        soundSettings: 'Animal Sound',
        selectSound: 'Select Sound',
        themeSettings: 'Theme Color',
        selectTheme: 'Select Theme',
        languageSettings: 'Language',
        selectLanguage: 'Select Language',
        accountSettings: 'User Account',
        account: 'Account',
        editName: 'Edit Name',
        logout: 'Logout / Change Device',
        
        // Buttons
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        ok: 'OK',
        yes: 'Yes',
        no: 'No',
        confirm: 'Confirm',
        
        // Themes
        themeLight: '🌞 Light (Default)',
        themeDark: '🌙 Dark',
        themeBlue: '💙 Blue',
        themeGolden: '🐕 Golden',
        
        // Device Connection
        connectDevice: 'Connect Device',
        enterDeviceId: 'Please enter Device ID of the feeder',
        scanQR: 'or scan QR Code on the device',
        deviceIdPlaceholder: 'Enter Device ID',
        
        // Meals
        mealsTitle: 'Meal Schedule',
        addMeal: 'Add Meal',
        editMeal: 'Edit Meal',
        mealName: 'Meal Name',
        mealTime: 'Time',
        days: 'Days',
        noMeals: 'No meals scheduled',
        
        // Calibration
        calibrationTitle: 'Test and Set Food Amount',
        placeContainer: 'Please place container at food dispenser',
        releaseTest: 'Release Test Food (5 seconds)',
        weightMeasured: 'Weight Measured (grams)',
        enterWeight: 'Enter weight (grams)',
        saveCalibration: 'Save Calibration',
        
        // Meal Modal
        addMealTitle: 'Add New Meal',
        mealNameLabel: 'Meal Name:',
        mealNamePlaceholder: 'e.g. Breakfast, Dinner',
        daysLabel: 'Days:',
        amountLabel: 'Amount (grams):',
        fanStrengthLabel: 'Fan Strength (0-100%):',
        fanDirectionLabel: 'Fan Direction (60°-120°):',
        swingModeLabel: 'Swing Mode',
        animalSoundLabel: 'Animal Sound',
        
        // Days of week
        dayMon: 'Mon',
        dayTue: 'Tue',
        dayWed: 'Wed',
        dayThu: 'Thu',
        dayFri: 'Fri',
        daySat: 'Sat',
        daySun: 'Sun',
        
        // Owner Name Modal
        editAccountName: 'Edit Account Name',
        accountNameLabel: 'Account Name:',
        accountNamePlaceholder: 'e.g. Home/Username',
        
        // Dashboard Cards
        feedNowTitle: 'Feed Now',
        statusCheckTitle: 'Status & Check',
        playSoundTitle: 'Play Animal Sound',
        
        // Settings Cards
        wifiSettingsTitle: 'Wi-Fi Connection',
        wifiSsidLabel: 'WIFI SSID:',
        wifiSsidPlaceholder: 'Wi-Fi Name',
        wifiPasswordLabel: 'WIFI PASSWORD:',
        wifiPasswordPlaceholder: 'Wi-Fi Password',
        timeSettingsTitle: 'Time Settings',
        timezoneLabel: 'Timezone (UTC+/-H):',
        calibrationTitle2: 'Food Amount Calibration',
        soundSettingsTitle: 'Animal Sound',
        soundSelectLabel: 'Select Sound:',
        accountSettingsTitle: 'User Account',
        
        // Notes and descriptions
        wifiNoteText: 'Wi-Fi credentials will be sent to device for automatic connection',
        calibrationNoteText: 'Calibrate grams per second ratio for accurate food dispensing',
        soundNoteText: 'Files must be placed on microSD or system storage (e.g. 001.mp3, 002.mp3...) Device will play by selected index',
        themeNoteText: 'Change web app theme color to your preference',
        languageNoteText: 'Change web app language',
        
        // Meal Schedule
        mealScheduleSubtitle: 'Set time, amount, and sound for each meal',
        loadingMeals: 'Loading meals...',
        
        // Notification History
        notificationSubtitle: 'Show last 50 notifications',
        
        // Calculator
        calculatorSubtitle: 'Calculate appropriate food amount for your pet',
        animalTypeLabel: 'Animal Type:',
        animalSpeciesLabel: 'Species:',
        animalCountLabel: 'Number of Animals:',
        weightLabel: 'Weight (Kg):',
        lifeStageLabel: 'Life Stage/Activity:',
        selectAnimalType: '-- Select Animal Type --',
        selectAnimalSpecies: '-- Select Species --',
        selectLifeStage: '-- Select --',
        
        // Status displays
        foodLevelText: 'Food Level:',
        lastMovementText: 'Last Movement:',
        currentValueText: 'Current Value:',
        accountText: 'Account:',
        noDataText: '-',
        gramsPerSecond: 'grams/second',
        
        // Buttons text
        playThisSoundBtn: 'Play This Sound',
        checkFoodBtn: 'Check Food',
        checkMovementBtn: 'Check Movement',
        testAndSetBtn: 'Test & Set',
        createMealBtn: 'Create Meal',
        logoutFullText: 'Logout / Change Device',
        
        // Select options
        noSelection: '-- No Selection --',
        selectTimezoneOption: '-- Select Timezone --',
        
        // Animal types
        animalType_ปลาน้ำจืด: 'Freshwater Fish',
        animalType_สัตว์เลี้ยงลูกด้วยนม: 'Mammals',
        animalType_สัตว์ปีก: 'Poultry',
        
        // Animal species
        animalSpecies_ปลาทอง: 'Goldfish',
        animalSpecies_ปลาคาร์ฟ: 'Koi',
        animalSpecies_ปลากัด: 'Betta',
        animalSpecies_สุนัข: 'Dog',
        animalSpecies_แมว: 'Cat',
        animalSpecies_กระต่าย: 'Rabbit',
        animalSpecies_ไก่: 'Chicken',
        animalSpecies_เป็ด: 'Duck',
        
        // Life stages
        lifeStage_ลูกสุนัข: 'Puppy',
        lifeStage_โตเต็มวัย_ทำหมันแล้ว: 'Adult (Neutered)',
        lifeStage_โตเต็มวัย_ไม่ทำหมัน: 'Adult (Intact)',
        lifeStage_ลดน้ำหนัก: 'Weight Loss',
        lifeStage_เพิ่มน้ำหนัก: 'Weight Gain',
        lifeStage_ตั้งครรภ์: 'Pregnant',
        lifeStage_ให้นมบุตร: 'Lactating',
        lifeStage_ลูกแมว: 'Kitten',
        
        // Calculator notes
        calculatorNote_enterWeightAndLifeStage: 'Please enter weight and life stage',
        calculatorNote_energyNeeded: 'Energy needed',
        calculatorNote_perDay: 'day',
        calculatorNote_perMeal: 'meal',
        calculatorNote_shouldDivide: 'Should be divided into multiple meals per day',
        calculatorNote_dependsOnTemp: 'Amount depends on water temperature and fish size',
        calculatorNote_forAdult: 'For adult fish, divide into 1-2 meals per day',
        calculatorNote_hayMain: 'Hay is the main food, pellets should be limited',
        calculatorNote_eatByNeed: 'Chickens will eat according to nutritional needs',
        calculatorNote_duckAdult: 'Adult ducks eat approximately 170-200 grams per day',
        calculatorNote_needWeightAndLife: 'Must specify weight and life stage/activity level',
        
        // Countdown
        countdown_setTimezone: 'Please set timezone in \'Settings\'',
        countdown_calculating: 'Calculating next meal...',
        countdown_feedIn: 'Will feed in',
        countdown_noUpcoming: 'No upcoming meals',
        countdown_days: 'days',
        countdown_hours: 'hours',
        countdown_minutes: 'minutes',
        countdown_seconds: 'seconds',
        
        // Days and months
        everyDay: 'Every day',
        noDaysSelected: 'No days',
        specificDateLabel: 'Specific date:',
        noName: 'No name',
        
        // Alert messages
        error: 'Error',
        success: 'Success',
        warning: 'Warning',
        info: 'Info',
        backOnline: 'Back Online',
        internetConnected: 'Internet connected',
        noInternet: 'No internet connection. You can still view data',
        deviceNotFound: 'Device Not Found',
        deviceIdNotFound: 'Device ID not found in system',
        cannotVerifyDevice: 'Cannot verify Device ID. Please try again',
        cannotLoadData: 'Cannot load initial data',
        enterDeviceIdMsg: 'Please enter Device ID',
        authError: 'Authentication Error',
        cannotLogin: 'Cannot login to system',
        accountNameTooLong: 'Account name must not exceed 20 characters',
        accountNameSaved: 'Account name saved successfully',
        cannotSaveAccountName: 'Cannot save account name',
        cannotApplyAmount: 'Cannot apply recommended amount',
        confirmDelete: 'Are you sure you want to delete this meal?',
        
        // Status text
        webOnline: 'Web: Online',
        webOffline: 'Web: Offline',
        deviceOnline: 'Device: Online',
        deviceOffline: 'Device: Offline',
        
        // Notifications
        notificationsTitle: 'Notification History',
        showLast50: 'Show last 50 notifications',
        noData: 'No data',
        
        // Feeding History
        feedingHistoryTitle: 'Feeding History',
        filterDay: 'Today',
        filterWeek: '7 Days',
        filterMonth: '30 Days',
        totalFeedings: 'Total Feedings:',
        totalAmount: 'Total Amount:',
        avgPerFeeding: 'Avg per Feeding:',
        noFeedingHistory: 'No feeding history',
        
        // Calculator
        calculatorTitle: 'Food Calculator',
        calculateFood: 'Calculate appropriate food amount for your pet',
        animalType: 'Animal Type',
        animalSpecies: 'Species',
        animalCount: 'Number of Animals',
        weight: 'Weight (Kg)',
        lifeStage: 'Life Stage/Activity',
        recommendedAmount: 'Recommended Amount',
        createMeal: 'Create Meal',
        
        // Setup
        setupRequired: 'Setup Required',
        setupMessage: 'Please go to "Settings" to set timezone and calibrate food amount before use',
        goToSettings: 'Go to Settings',
        
        // Meal status
        enabled: 'Enabled',
        disabled: 'Disabled',
        calibrationRequired: 'Please calibrate food amount in "Settings" first',
        noDaysSelectedWarning: 'Since no days were specified, this meal will be set for',
        minAmountWarning: 'Food amount must not be less than 1 gram',
        timeConflict: 'Time Conflict',
        timeConflictMessage: 'The set time conflicts with another meal. Please choose a different time',
        mealSaved: 'Meal saved successfully',
        mealDeleted: 'Meal deleted',
        mealStatusChanged: 'Meal status changed',
        cannotChangeMealStatus: 'Cannot change meal status',
        
        // Audio selection
        noAudio: '-- No Selection --',
        audioFile: 'Audio File',
        
        // Device notifications
        feedingCompleted: 'Feeding completed',
        foodLow: 'Food level low',
        foodEmpty: 'Food empty',
        movementDetected: 'Movement detected',
        systemError: 'System error'
    },
    
    zh: {
        // Header
        appName: 'Pawtonomous',
        webStatus: '网页',
        deviceStatus: '设备',
        online: '在线',
        offline: '离线',
        
        // Offline Banner
        offlineMode: '离线模式',
        offlineMessage: '您可以查看和编辑数据。更改将在重新上线时保存',
        
        // Navigation
        navControl: '控制',
        navMeals: '餐食',
        navSettings: '设置',
        navNotifications: '通知',
        navCalculator: '计算器',
        
        // Dashboard
        dashboardTitle: '快速控制',
        feedNow: '立即喂食',
        amount: '数量（克）',
        fanStrength: '风扇强度 (0-100%)',
        fanDirection: '风扇方向 (60°-120°)',
        swingMode: '摆动模式',
        animalSound: '动物声音',
        feed: '喂食',
        statusCheck: '状态检查',
        foodLevel: '食物量',
        lastMovement: '最后移动',
        checkFood: '检查食物',
        checkMovement: '检查移动',
        playSound: '播放动物声音',
        playThisSound: '播放此声音',
        
        // Settings
        settingsTitle: '设备设置',
        wifiSettings: 'Wi-Fi 连接',
        wifiSSID: 'WIFI SSID',
        wifiPassword: 'WIFI 密码',
        wifiNote: 'Wi-Fi 凭据将发送到设备以自动连接',
        timeSettings: '时间设置',
        timezone: '时区 (UTC+/-H)',
        selectTimezone: '-- 选择时区 --',
        calibration: '食物量校准',
        calibrationNote: '校准每秒克数比率以实现精确的食物分配',
        currentValue: '当前值',
        testAndSet: '测试并设置',
        soundSettings: '动物声音',
        selectSound: '选择声音',
        themeSettings: '主题颜色',
        selectTheme: '选择主题',
        languageSettings: '语言',
        selectLanguage: '选择语言',
        accountSettings: '用户账户',
        account: '账户',
        editName: '编辑名称',
        logout: '登出 / 更换设备',
        
        // Buttons
        save: '保存',
        cancel: '取消',
        delete: '删除',
        ok: '确定',
        yes: '是',
        no: '否',
        confirm: '确认',
        
        // Themes
        themeLight: '🌞 明亮（默认）',
        themeDark: '🌙 黑暗',
        themeBlue: '💙 蓝色',
        themeGolden: '🐕 金色',
        
        // Device Connection
        connectDevice: '连接设备',
        enterDeviceId: '请输入喂食器的设备ID',
        scanQR: '或扫描设备上QR码',
        deviceIdPlaceholder: '输入设备ID',
        
        // Meals
        mealsTitle: '餐食计划',
        addMeal: '添加餐食',
        editMeal: '编辑餐食',
        mealName: '餐食名称',
        mealTime: '时间',
        days: '日期',
        noMeals: '没有计划的餐食',
        
        // Calibration
        calibrationTitle: '测试和设置食物量',
        placeContainer: '请将容器放在食物分配器处',
        releaseTest: '释放测试食物（5秒）',
        weightMeasured: '测量重量（克）',
        enterWeight: '输入重量（克）',
        saveCalibration: '保存校准',
        
        // Meal Modal
        addMealTitle: '添加新餐食',
        mealNameLabel: '餐食名称:',
        mealNamePlaceholder: '例如 早餐, 晚餐',
        daysLabel: '日期:',
        amountLabel: '数量（克）:',
        fanStrengthLabel: '风扇强度 (0-100%):',
        fanDirectionLabel: '风扇方向 (60°-120°):',
        swingModeLabel: '摆动模式',
        animalSoundLabel: '动物声音',
        
        // Days of week
        dayMon: '一',
        dayTue: '二',
        dayWed: '三',
        dayThu: '四',
        dayFri: '五',
        daySat: '六',
        daySun: '日',
        
        // Owner Name Modal
        editAccountName: '编辑账户名称',
        accountNameLabel: '账户名称:',
        accountNamePlaceholder: '例如 家/用户名',
        
        // Dashboard Cards
        feedNowTitle: '立即喂食',
        statusCheckTitle: '状态检查',
        playSoundTitle: '播放动物声音',
        
        // Settings Cards
        wifiSettingsTitle: 'Wi-Fi 连接',
        wifiSsidLabel: 'WIFI SSID:',
        wifiSsidPlaceholder: 'Wi-Fi 名称',
        wifiPasswordLabel: 'WIFI 密码:',
        wifiPasswordPlaceholder: 'Wi-Fi 密码',
        timeSettingsTitle: '时间设置',
        timezoneLabel: '时区 (UTC+/-H):',
        calibrationTitle2: '食物量校准',
        soundSettingsTitle: '动物声音',
        soundSelectLabel: '选择声音:',
        accountSettingsTitle: '用户账户',
        
        // Notes and descriptions
        wifiNoteText: 'Wi-Fi 凭据将发送到设备以自动连接',
        calibrationNoteText: '校准每秒克数比率以实现精确的食物分配',
        soundNoteText: '文件必须放在 microSD 或系统存储中（例如 001.mp3, 002.mp3...）设备将按选定的索引播放',
        themeNoteText: '根据您的喜好更改网页应用主题颜色',
        languageNoteText: '更改网页应用语言',
        
        // Meal Schedule
        mealScheduleSubtitle: '为每餐设置时间、数量和声音',
        loadingMeals: '正在加载餐食...',
        
        // Notification History
        notificationSubtitle: '显示最后50条通知',
        
        // Calculator
        calculatorSubtitle: '计算适合您宠物的食物量',
        animalTypeLabel: '动物类型:',
        animalSpeciesLabel: '物种:',
        animalCountLabel: '动物数量:',
        weightLabel: '重量 (Kg):',
        lifeStageLabel: '生命阶段/活动:',
        selectAnimalType: '-- 选择动物类型 --',
        selectAnimalSpecies: '-- 选择物种 --',
        selectLifeStage: '-- 选择 --',
        
        // Status displays
        foodLevelText: '食物量:',
        lastMovementText: '最后移动:',
        currentValueText: '当前值:',
        accountText: '账户:',
        noDataText: '-',
        gramsPerSecond: '克/秒',
        
        // Buttons text
        playThisSoundBtn: '播放此声音',
        checkFoodBtn: '检查食物',
        checkMovementBtn: '检查移动',
        testAndSetBtn: '测试并设置',
        createMealBtn: '创建餐食',
        logoutFullText: '登出 / 更换设备',
        
        // Select options
        noSelection: '-- 不选择 --',
        selectTimezoneOption: '-- 选择时区 --',
        
        // Animal types
        animalType_ปลาน้ำจืด: '淡水鱼',
        animalType_สัตว์เลี้ยงลูกด้วยนม: '哺乳动物',
        animalType_สัตว์ปีก: '家禽',
        
        // Animal species
        animalSpecies_ปลาทอง: '金鱼',
        animalSpecies_ปลาคาร์ฟ: '鲤鱼',
        animalSpecies_ปลากัด: '斗鱼',
        animalSpecies_สุนัข: '狗',
        animalSpecies_แมว: '猫',
        animalSpecies_กระต่าย: '兔子',
        animalSpecies_ไก่: '鸡',
        animalSpecies_เป็ด: '鸭',
        
        // Life stages
        lifeStage_ลูกสุนัข: '幼犬',
        lifeStage_โตเต็มวัย_ทำหมันแล้ว: '成年 (已绝育)',
        lifeStage_โตเต็มวัย_ไม่ทำหมัน: '成年 (未绝育)',
        lifeStage_ลดน้ำหนัก: '减肥',
        lifeStage_เพิ่มน้ำหนัก: '增重',
        lifeStage_ตั้งครรภ์: '怀孕',
        lifeStage_ให้นมบุตร: '哺乳',
        lifeStage_ลูกแมว: '幼猫',
        
        // Calculator notes
        calculatorNote_enterWeightAndLifeStage: '请输入体重和生命阶段',
        calculatorNote_energyNeeded: '所需能量',
        calculatorNote_perDay: '天',
        calculatorNote_perMeal: '餐',
        calculatorNote_shouldDivide: '应分成多餐每天',
        calculatorNote_dependsOnTemp: '数量取决于水温和鱼的大小',
        calculatorNote_forAdult: '成年鱼应分成1-2餐每天',
        calculatorNote_hayMain: '干草是主食，颗粒应限制',
        calculatorNote_eatByNeed: '鸡会根据营养需求进食',
        calculatorNote_duckAdult: '成年鸭每天吃约170-200克',
        calculatorNote_needWeightAndLife: '必须指定体重和生命阶段/活动水平',
        
        // Countdown
        countdown_setTimezone: '请在\'设置\'中设置时区',
        countdown_calculating: '正在计算下一餐...',
        countdown_feedIn: '将在',
        countdown_noUpcoming: '没有即将到来的餐食',
        countdown_days: '天',
        countdown_hours: '小时',
        countdown_minutes: '分钟',
        countdown_seconds: '秒',
        
        // Days and months
        everyDay: '每天',
        noDaysSelected: '未选择日期',
        specificDateLabel: '指定日期:',
        noName: '无名称',
        
        // Alert messages
        error: '错误',
        success: '成功',
        warning: '警告',
        info: '信息',
        backOnline: '重新在线',
        internetConnected: '互联网已连接',
        noInternet: '无互联网连接。您仍可以查看数据',
        deviceNotFound: '找不到设备',
        deviceIdNotFound: '系统中找不到此设备ID',
        cannotVerifyDevice: '无法验证设备ID。请重试',
        cannotLoadData: '无法加载初始数据',
        enterDeviceIdMsg: '请输入设备ID',
        authError: '身份验证错误',
        cannotLogin: '无法登录系统',
        accountNameTooLong: '账户名称不得超过20个字符',
        accountNameSaved: '账户名称保存成功',
        cannotSaveAccountName: '无法保存账户名称',
        cannotApplyAmount: '无法应用推荐量',
        confirmDelete: '您确定要删除此餐食吗？',
        
        // Status text
        webOnline: '网页: 在线',
        webOffline: '网页: 离线',
        deviceOnline: '设备: 在线',
        deviceOffline: '设备: 离线',
        
        // Notifications
        notificationsTitle: '通知历史',
        showLast50: '显示最后50条通知',
        noData: '无数据',
        
        // Feeding History
        feedingHistoryTitle: '喂食历史',
        filterDay: '今天',
        filterWeek: '7天',
        filterMonth: '30天',
        totalFeedings: '总次数:',
        totalAmount: '总量:',
        avgPerFeeding: '平均每次:',
        noFeedingHistory: '无喂食历史',
        
        // Calculator
        calculatorTitle: '食物计算器',
        calculateFood: '计算适合您宠物的食物量',
        animalType: '动物类型',
        animalSpecies: '物种',
        animalCount: '动物数量',
        weight: '重量 (Kg)',
        lifeStage: '生命阶段/活动',
        recommendedAmount: '推荐量',
        createMeal: '创建餐食',
        
        // Setup
        setupRequired: '需要设置',
        setupMessage: '请转到“设置”设置时区并校准食物量后再使用',
        goToSettings: '转到设置',
        
        enabled: '已启用',
        disabled: '已禁用',
        calibrationRequired: '请先在"设置"中校准食物量',
        noDaysSelectedWarning: '由于未指定日期，此餐食将设置为',
        minAmountWarning: '食物量不得少于1克',
        timeConflict: '时间冲突',
        timeConflictMessage: '设置的时间与另一餐冲突。请选择不同的时间',
        mealSaved: '餐食保存成功',
        mealDeleted: '餐食已删除',
        mealStatusChanged: '餐食状态已更改',
        cannotChangeMealStatus: '无法更改餐食状态',
        
        // Audio selection
        noAudio: '-- 不选择 --',
        audioFile: '音频文件',
        
        // Device notifications
        feedingCompleted: '喂食完成',
        foodLow: '食物量低',
        foodEmpty: '食物已空',
        movementDetected: '检测到移动',
        systemError: '系统错误'
    },
    
    ja: {
        // Header
        appName: 'Pawtonomous',
        webStatus: 'ウェブ',
        deviceStatus: 'デバイス',
        online: 'オンライン',
        offline: 'オフライン',
        
        // Offline Banner
        offlineMode: 'オフラインモード',
        offlineMessage: 'データの表示と編集が可能です。変更はオンラインに戻ったときに保存されます',
        
        // Navigation
        navControl: 'コントロール',
        navMeals: '食事',
        navSettings: '設定',
        navNotifications: '通知',
        navCalculator: '計算機',
        
        // Dashboard
        dashboardTitle: 'クイックコントロール',
        feedNow: '今すぐ給餌',
        amount: '量（グラム）',
        fanStrength: 'ファン強度 (0-100%)',
        fanDirection: 'ファン方向 (60°-120°)',
        swingMode: 'スイングモード',
        animalSound: '動物の音',
        feed: '給餌',
        statusCheck: 'ステータス確認',
        foodLevel: '食料レベル',
        lastMovement: '最後の動き',
        checkFood: '食料確認',
        checkMovement: '動き確認',
        playSound: '動物の音を再生',
        playThisSound: 'この音を再生',
        
        // Settings
        settingsTitle: 'デバイス設定',
        wifiSettings: 'Wi-Fi接続',
        wifiSSID: 'WIFI SSID',
        wifiPassword: 'WIFI パスワード',
        wifiNote: 'Wi-Fi認証情報は自動接続のためにデバイスに送信されます',
        timeSettings: '時間設定',
        timezone: 'タイムゾーン (UTC+/-H)',
        selectTimezone: '-- タイムゾーンを選択 --',
        calibration: '食料量キャリブレーション',
        calibrationNote: '正確な食料分配のために秒あたりのグラム比率を調整',
        currentValue: '現在の値',
        testAndSet: 'テストと設定',
        soundSettings: '動物の音',
        selectSound: '音を選択',
        themeSettings: 'テーマカラー',
        selectTheme: 'テーマを選択',
        languageSettings: '言語',
        selectLanguage: '言語を選択',
        accountSettings: 'ユーザーアカウント',
        account: 'アカウント',
        editName: '名前を編集',
        logout: 'ログアウト / デバイス変更',
        
        // Buttons
        save: '保存',
        cancel: 'キャンセル',
        delete: '削除',
        ok: 'OK',
        yes: 'はい',
        no: 'いいえ',
        confirm: '確認',
        
        // Themes
        themeLight: '🌞 ライト（デフォルト）',
        themeDark: '🌙 ダーク',
        themeBlue: '💙 ブルー',
        themeGolden: '🐕 ゴールデン',
        
        // Device Connection
        connectDevice: 'デバイス接続',
        enterDeviceId: 'フィーダーのデバイスIDを入力してください',
        scanQR: 'またはデバイスのQRコードをスキャン',
        deviceIdPlaceholder: 'デバイスIDを入力',
        
        // Meals
        mealsTitle: '食事スケジュール',
        addMeal: '食事を追加',
        editMeal: '食事を編集',
        mealName: '食事名',
        mealTime: '時間',
        days: '曜日',
        noMeals: 'スケジュールされた食事はありません',
        
        // Calibration
        calibrationTitle: '食物量のテストと設定',
        placeContainer: '食物ディスペンサーに容器を置いてください',
        releaseTest: 'テスト食物を放出（5秒）',
        weightMeasured: '測定重量（グラム）',
        enterWeight: '重量を入力（グラム）',
        saveCalibration: 'キャリブレーションを保存',
        
        // Meal Modal
        addMealTitle: '新しい食事を追加',
        mealNameLabel: '食事名:',
        mealNamePlaceholder: '例: 朝食、夕食',
        daysLabel: '曜日:',
        amountLabel: '量（グラム）:',
        fanStrengthLabel: 'ファン強度 (0-100%):',
        fanDirectionLabel: 'ファン方向 (60°-120°):',
        swingModeLabel: 'スイングモード',
        animalSoundLabel: '動物の音',
        
        // Days of week
        dayMon: '月',
        dayTue: '火',
        dayWed: '水',
        dayThu: '木',
        dayFri: '金',
        daySat: '土',
        daySun: '日',
        
        // Owner Name Modal
        editAccountName: 'アカウント名を編集',
        accountNameLabel: 'アカウント名:',
        accountNamePlaceholder: '例: ホーム/ユーザー名',
        
        // Dashboard Cards
        feedNowTitle: '今すぐ給餌',
        statusCheckTitle: 'ステータス確認',
        playSoundTitle: '動物の音を再生',
        
        // Settings Cards
        wifiSettingsTitle: 'Wi-Fi接続',
        wifiSsidLabel: 'WIFI SSID:',
        wifiSsidPlaceholder: 'Wi-Fi名',
        wifiPasswordLabel: 'WIFI パスワード:',
        wifiPasswordPlaceholder: 'Wi-Fiパスワード',
        timeSettingsTitle: '時間設定',
        timezoneLabel: 'タイムゾーン (UTC+/-H):',
        calibrationTitle2: '食料量キャリブレーション',
        soundSettingsTitle: '動物の音',
        soundSelectLabel: '音を選択:',
        accountSettingsTitle: 'ユーザーアカウント',
        
        // Notes and descriptions
        wifiNoteText: 'Wi-Fi認証情報は自動接続のためにデバイスに送信されます',
        calibrationNoteText: '正確な食料分配のために秒あたりのグラム比率を調整',
        soundNoteText: 'ファイルはmicroSDまたはシステムストレージに配置する必要があります（例: 001.mp3, 002.mp3...）デバイスは選択されたインデックスで再生します',
        themeNoteText: 'お好みに応じてウェブアプリのテーマカラーを変更',
        languageNoteText: 'ウェブアプリの言語を変更',
        
        // Meal Schedule
        mealScheduleSubtitle: '各食事の時間、量、音を設定',
        loadingMeals: '食事を読み込み中...',
        
        // Notification History
        notificationSubtitle: '最後の50件の通知を表示',
        
        // Calculator
        calculatorSubtitle: 'ペットに適した食物量を計算',
        animalTypeLabel: '動物の種類:',
        animalSpeciesLabel: '種:',
        animalCountLabel: '動物の数:',
        weightLabel: '体重 (Kg):',
        lifeStageLabel: 'ライフステージ/活動:',
        selectAnimalType: '-- 動物の種類を選択 --',
        selectAnimalSpecies: '-- 種を選択 --',
        selectLifeStage: '-- 選択 --',
        
        // Status displays
        foodLevelText: '食料レベル:',
        lastMovementText: '最後の動き:',
        currentValueText: '現在の値:',
        accountText: 'アカウント:',
        noDataText: '-',
        gramsPerSecond: 'グラム/秒',
        
        // Buttons text
        playThisSoundBtn: 'この音を再生',
        checkFoodBtn: '食料確認',
        checkMovementBtn: '動き確認',
        testAndSetBtn: 'テストと設定',
        createMealBtn: '食事を作成',
        logoutFullText: 'ログアウト / デバイス変更',
        
        // Select options
        noSelection: '-- 選択なし --',
        selectTimezoneOption: '-- タイムゾーンを選択 --',
        
        // Animal types
        animalType_ปลาน้ำจืด: '淡水魚',
        animalType_สัตว์เลี้ยงลูกด้วยนม: '哺乳類',
        animalType_สัตว์ปีก: '家禽',
        
        // Animal species
        animalSpecies_ปลาทอง: '金魚',
        animalSpecies_ปลาคาร์ฟ: '鯉',
        animalSpecies_ปลากัด: 'ベタ',
        animalSpecies_สุนัข: '犬',
        animalSpecies_แมว: '猫',
        animalSpecies_กระต่าย: 'ウサギ',
        animalSpecies_ไก่: '鶏',
        animalSpecies_เป็ด: 'アヒル',
        
        // Life stages
        lifeStage_ลูกสุนัข: '子犬',
        lifeStage_โตเต็มวัย_ทำหมันแล้ว: '成犬 (去勢済)',
        lifeStage_โตเต็มวัย_ไม่ทำหมัน: '成犬 (未去勢)',
        lifeStage_ลดน้ำหนัก: '減量',
        lifeStage_เพิ่มน้ำหนัก: '増量',
        lifeStage_ตั้งครรภ์: '妊娠',
        lifeStage_ให้นมบุตร: '授乳',
        lifeStage_ลูกแมว: '子猫',
        
        // Calculator notes
        calculatorNote_enterWeightAndLifeStage: '体重とライフステージを入力してください',
        calculatorNote_energyNeeded: '必要エネルギー',
        calculatorNote_perDay: '日',
        calculatorNote_perMeal: '食',
        calculatorNote_shouldDivide: '毎日複数回に分けるべき',
        calculatorNote_dependsOnTemp: '量は水温と魚のサイズに依存',
        calculatorNote_forAdult: '成魚は1日に1-2回に分ける',
        calculatorNote_hayMain: '干草が主食、ペレットは制限すべき',
        calculatorNote_eatByNeed: '鶏は栄養ニーズに応じて食べる',
        calculatorNote_duckAdult: '成鳥のアヒルは1日約170-200グラム食べる',
        calculatorNote_needWeightAndLife: '体重とライフステージ/活動レベルを指定する必要があります',
        
        // Countdown
        countdown_setTimezone: '\'設定\'でタイムゾーンを設定してください',
        countdown_calculating: '次の食事を計算中...',
        countdown_feedIn: '給餌まで',
        countdown_noUpcoming: '予定された食事はありません',
        countdown_days: '日',
        countdown_hours: '時間',
        countdown_minutes: '分',
        countdown_seconds: '秒',
        
        // Days and months
        everyDay: '毎日',
        noDaysSelected: '日付未選択',
        specificDateLabel: '特定の日付:',
        noName: '名前なし',
        
        // Alert messages
        error: 'エラー',
        success: '成功',
        warning: '警告',
        info: '情報',
        backOnline: 'オンラインに戻りました',
        internetConnected: 'インターネットに接続されました',
        noInternet: 'インターネット接続がありません。データは表示できます',
        deviceNotFound: 'デバイスが見つかりません',
        deviceIdNotFound: 'このデバイスIDはシステムに見つかりません',
        cannotVerifyDevice: 'デバイスIDを確認できません。もう一度お試しください',
        cannotLoadData: '初期データを読み込めません',
        enterDeviceIdMsg: 'デバイスIDを入力してください',
        authError: '認証エラー',
        cannotLogin: 'システムにログインできません',
        accountNameTooLong: 'アカウント名は20文字以内で入力してください',
        accountNameSaved: 'アカウント名を保存しました',
        cannotSaveAccountName: 'アカウント名を保存できません',
        cannotApplyAmount: '推奨量を適用できません',
        confirmDelete: 'この食事を削除してもよろしいですか？',
        
        // Status text
        webOnline: 'ウェブ: オンライン',
        webOffline: 'ウェブ: オフライン',
        deviceOnline: 'デバイス: オンライン',
        deviceOffline: 'デバイス: オフライン',
        
        // Notifications
        notificationsTitle: '通知履歴',
        showLast50: '最後の50件の通知を表示',
        noData: 'データなし',
        
        // Feeding History
        feedingHistoryTitle: '給餌履歴',
        filterDay: '今日',
        filterWeek: '7日間',
        filterMonth: '30日間',
        totalFeedings: '総回数:',
        totalAmount: '総量:',
        avgPerFeeding: '平均/回:',
        noFeedingHistory: '給餌履歴なし',
        
        // Calculator
        calculatorTitle: '食物計算機',
        calculateFood: 'ペットに適した食物量を計算',
        animalType: '動物の種類',
        animalSpecies: '種',
        animalCount: '動物の数',
        weight: '体重 (Kg)',
        lifeStage: 'ライフステージ/活動',
        recommendedAmount: '推奨量',
        createMeal: '食事を作成',
        
        // Setup
        setupRequired: '設定が必要',
        setupMessage: '使用前に「設定」でタイムゾーンを設定し、食物量を調整してください',
        goToSettings: '設定へ移動',
        
        enabled: '有効',
        disabled: '無効',
        calibrationRequired: '先に「設定」で食物量を調整してください',
        noDaysSelectedWarning: '日付が指定されていないため、この食事は次の日に設定されます',
        minAmountWarning: '食物量は1グラム以上である必要があります',
        timeConflict: '時間の競合',
        timeConflictMessage: '設定された時間が別の食事と競合しています。別の時間を選択してください',
        mealSaved: '食事を保存しました',
        mealDeleted: '食事を削除しました',
        mealStatusChanged: '食事のステータスを変更しました',
        cannotChangeMealStatus: '食事のステータスを変更できません',
        
        // Audio selection
        noAudio: '-- 選択なし --',
        audioFile: '音声ファイル',
        
        // Device notifications
        feedingCompleted: '給餌完了',
        foodLow: '食料レベル低',
        foodEmpty: '食料空',
        movementDetected: '動き検出',
        systemError: 'システムエラー'
    }
};

export function setLanguage(lang) {
    localStorage.setItem('pawtonomous_language', lang);
    document.documentElement.setAttribute('lang', lang);
}

export function getLanguage() {
    return localStorage.getItem('pawtonomous_language') || 'th';
}

export function t(key) {
    const lang = getLanguage();
    return translations[lang]?.[key] || translations['th'][key] || key;
}
