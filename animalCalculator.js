// animalCalculator.js

// ข้อมูลสำหรับสูตรการคำนวณปริมาณอาหารสัตว์ตามประเภทและชนิด
export const animalData = {
    "ปลาน้ำจืด": {
        "ปลาทอง": {
            "calculation_type": "weight_percentage",
            "daily_percentage_of_body_weight": 0.02,
            "typical_weight_g": 20, // น้ำหนักทั่วไปสำหรับคำนวณเบื้องต้นหากไม่มีการป้อน
            "meals_per_day": 2, // จำนวนมื้อต่อวัน
            "notes": "ควรแบ่งให้หลายมื้อต่อวัน"
        },
        "ปลาหางนกยูง": {
            "calculation_type": "weight_percentage",
            "daily_percentage_of_body_weight": 0.0075,
            "typical_weight_g": 0.1,
            "meals_per_day": 2,
            "notes": "ควรแบ่งให้ 1-2 มื้อต่อวัน"
        },
        "ปลาม้าลาย": {
            "calculation_type": "weight_percentage",
            "daily_percentage_of_body_weight": 0.0075,
            "typical_weight_g": 0.1,
            "meals_per_day": 2,
            "notes": "ควรแบ่งให้ 1-2 มื้อต่อวัน"
        },
        "ปลาสอด": {
            "calculation_type": "weight_percentage",
            "daily_percentage_of_body_weight": 0.0075,
            "typical_weight_g": 0.1,
            "meals_per_day": 2,
            "notes": "ควรแบ่งให้ 1-2 มื้อต่อวัน"
        },
        "ปลากัด": {
            "calculation_type": "fixed_grams",
            "daily_grams": 1.8, // ปริมาณที่แนะนำต่อวัน (กรัม)
            "meals_per_day": 2,
            "notes": "สำหรับปลาโตเต็มวัย ควรแบ่งให้ 1-2 มื้อต่อวัน"
        },
        "ปลาหมอสี": {
            "calculation_type": "fixed_grams",
            "daily_grams": 5,
            "meals_per_day": 1,
            "notes": "ให้เท่าที่กินหมดใน 30-60 วินาที"
        },
        "ปลาคาร์ฟ": {
            "calculation_type": "weight_percentage",
            "daily_percentage_of_body_weight": 0.01,
            "typical_weight_g": 500,
            "meals_per_day": 3,
            "notes": "ปริมาณขึ้นอยู่กับอุณหภูมิน้ำและขนาดปลา ควรแบ่งให้หลายมื้อ"
        },
        "ปลานิล": {
            "calculation_type": "weight_percentage",
            "daily_percentage_of_body_weight": 0.02,
            "typical_weight_g": 100,
            "meals_per_day": 2,
            "notes": "ปริมาณขึ้นอยู่กับขนาดปลา ควรปรับตามการเจริญเติบโต"
        },
        "ปลาสวาย": {
            "calculation_type": "weight_percentage",
            "daily_percentage_of_body_weight": 0.01,
            "typical_weight_g": 1000,
            "meals_per_day": 2,
            "notes": "ปริมาณขึ้นอยู่กับขนาดปลา"
        },
        "ปลาเทวดา": {
            "calculation_type": "fixed_grams",
            "daily_grams": 0.5,
            "meals_per_day": 2,
            "notes": "ให้เท่าที่กินหมดใน 2 นาที"
        },
        "ปลาหางไหม้": {
            "calculation_type": "fixed_grams",
            "daily_grams": 0.5,
            "meals_per_day": 2,
            "notes": "ให้เท่าที่กินหมดใน 2 นาที"
        }
    },
    "ปลาทะเล": {
        "ปลาการ์ตูน": {
            "calculation_type": "fixed_grams",
            "daily_grams": 0.8,
            "meals_per_day": 2,
            "notes": "ควรแบ่งให้ 2-3 มื้อต่อวัน ให้เท่าที่กินหมดใน 2-3 นาที"
        },
        "ปลาสิงโต": {
            "calculation_type": "fixed_grams",
            "daily_grams": 5,
            "meals_per_day": 1,
            "notes": "ให้ 1-2 ครั้งต่อวัน ให้เท่าที่กินหมดใน 1-2 นาที"
        },
        "ปลานกแก้ว": {
            "calculation_type": "fixed_grams",
            "daily_grams": 5,
            "meals_per_day": 1,
            "notes": "ให้ 1-2 ครั้งต่อวัน"
        },
        "ปลาผีเสื้อ": {
            "calculation_type": "fixed_grams",
            "daily_grams": 2,
            "meals_per_day": 2,
            "notes": "ให้ 1-2 ครั้งต่อวัน"
        },
        "ปลาสลิดหิน": {
            "calculation_type": "fixed_grams",
            "daily_grams": 3,
            "meals_per_day": 2,
            "notes": "ให้ 1-2 ครั้งต่อวัน"
        },
        "ปลาบลูแทงค์": {
            "calculation_type": "fixed_grams",
            "daily_grams": 2,
            "meals_per_day": 2,
            "notes": "ควรแบ่งให้ 2-3 มื้อต่อวัน ให้เท่าที่กินหมดใน 2-3 นาที"
        }
    },
    "สัตว์เลี้ยงลูกด้วยนม": {
        "สุนัข": {
            "calculation_type": "RER_DER", // ใช้สูตร RER/DER สำหรับการคำนวณ
            "rer_formula": "70_BW_0.75", // สูตร RER: 70 * (น้ำหนักตัว (kg)^0.75)
            "kcal_per_gram_dry_food": 3.5, // แคลอรี่ต่อกรัมของอาหารแห้ง (ค่าเฉลี่ย)
            "der_factors": { // ตัวคูณ DER (Daily Energy Requirement)
                "ลูกสุนัข": 2.0,
                "โตเต็มวัย_ทำหมันแล้ว": 1.6,
                "โตเต็มวัย_ไม่ทำหมัน": 1.8,
                "ลดน้ำหนัก": 1.0,
                "เพิ่มน้ำหนัก": 1.8,
                "ตั้งครรภ์": 2.0,
                "ให้นมบุตร": 3.0
            },
            "meals_per_day": 2,
            "notes": "ต้องระบุน้ำหนักและช่วงชีวิต/ระดับกิจกรรม"
        },
        "แมว": {
            "calculation_type": "RER_DER",
            "rer_formula": "30_BW_plus_70", // สูตร RER: (30 * น้ำหนักตัว (kg)) + 70
            "kcal_per_gram_dry_food": 4.0,
            "der_factors": {
                "ลูกแมว": 2.5,
                "โตเต็มวัย_ทำหมันแล้ว": 1.2,
                "โตเต็มวัย_ไม่ทำหมัน": 1.4,
                "ลดน้ำหนัก": 0.8,
                "เพิ่มน้ำหนัก": 1.6,
                "ตั้งครรภ์": 2.0,
                "ให้นมบุตร": 3.0
            },
            "meals_per_day": 2,
            "notes": "ต้องระบุน้ำหนักและช่วงชีวิต/ระดับกิจกรรม"
        },
        "กระต่าย": {
            "calculation_type": "weight_percentage",
            "daily_percentage_of_body_weight": 0.01,
            "typical_weight_g": 2000,
            "kcal_per_gram_dry_food": 2.5,
            "meals_per_day": 2,
            "notes": "หญ้าแห้งเป็นอาหารหลัก ควรให้เม็ดอาหารในปริมาณจำกัดเพื่อป้องกันโรคอ้วน"
        },
        "หนูแฮมสเตอร์": {
            "calculation_type": "fixed_grams",
            "daily_grams": 7.5,
            "kcal_per_gram_dry_food": 3.5,
            "meals_per_day": 1,
            "notes": "ควรให้ 1-2 ช้อนชาต่อวัน"
        },
        "หนูขาว": {
            "calculation_type": "fixed_grams",
            "daily_grams": 10,
            "kcal_per_gram_dry_food": 3.5,
            "meals_per_day": 1,
            "notes": "ควรให้ตามขนาดตัว"
        },
        "ชูการ์ไกลเดอร์": {
            "calculation_type": "weight_percentage",
            "daily_percentage_of_body_weight": 0.15,
            "typical_weight_g": 100,
            "kcal_per_gram_dry_food": 3.5,
            "meals_per_day": 1,
            "notes": "อาหารเม็ดควรเป็น 75% ของอาหารทั้งหมด"
        },
        "แพะ-แกะ": {
            "calculation_type": "weight_based_lookup", // คำนวณจากตารางข้อมูลอ้างอิง
            "data_points": [
                {"weight_kg_min": 0, "weight_kg_max": 12, "daily_grams_feed": 300, "notes": "ลูกแพะ/แกะ (ไม่มีหญ้า)"},
                {"weight_kg_min": 12, "weight_kg_max": 15, "daily_grams_feed": 300, "notes": "ลูกแพะ/แกะ (ไม่มีหญ้า)"},
                {"weight_kg_min": 15, "weight_kg_max": 25, "daily_grams_feed": 400, "notes": "ลูกแพะ/แกะ (ไม่มีหญ้า)"},
                {"weight_kg_min": 25, "weight_kg_max": 35, "daily_grams_feed": 600, "notes": "ลูกแพะ/แกะ (ไม่มีหญ้า)"},
                {"weight_kg_min": 30, "weight_kg_max": 50, "daily_grams_feed": 250, "notes": "ตั้งครรภ์ช่วงท้าย (มีหญ้า)"},
                {"weight_kg_min": 30, "weight_kg_max": 50, "daily_grams_feed": 400, "notes": "ไม่ตั้งครรภ์ (มีหญ้า)"}
            ],
            "kcal_per_gram_dry_food": 3.5,
            "meals_per_day": 1,
            "notes": "ปริมาณอาหารข้นขึ้นอยู่กับน้ำหนักและช่วงชีวิต/การผลิต หญ้าเป็นอาหารหลัก"
        },
        "หมู": {
            "calculation_type": "weight_based_lookup",
            "data_points": [
                {"weight_kg_min": 0, "weight_kg_max": 10, "daily_grams_feed": 300, "notes": "ลูกหมูหย่านม (ต่อครอก)"},
                {"weight_kg_min": 10, "weight_kg_max": 25, "daily_grams_feed": 500, "notes": "หมูเล็ก"},
                {"weight_kg_min": 25, "weight_kg_max": 50, "daily_grams_feed": 1000, "notes": "หมูรุ่น"},
                {"weight_kg_min": 50, "weight_kg_max": 100, "daily_grams_feed": 2000, "notes": "หมูขุน"},
                {"weight_kg_min": 150, "weight_kg_max": 250, "daily_grams_feed": 2000, "notes": "แม่พันธุ์อุ้มท้อง"},
                {"weight_kg_min": 150, "weight_kg_max": 250, "daily_grams_feed": 4000, "notes": "แม่พันธุ์ให้นมบุตร"}
            ],
            "kcal_per_gram_dry_food": 3.15,
            "meals_per_day": 2,
            "notes": "ปริมาณอาหารขึ้นอยู่กับน้ำหนักและช่วงชีวิต/การผลิต"
        },
        "ม้า": {
            "calculation_type": "weight_percentage",
            "daily_percentage_of_body_weight": 0.005,
            "typical_weight_g": 500000,
            "kcal_per_gram_dry_food": 2.5,
            "meals_per_day": 2,
            "notes": "หญ้า/อาหารหยาบเป็นอาหารหลัก ควรให้เม็ดอาหารในปริมาณจำกัด"
        },
        "หนูตะเภา": {
            "calculation_type": "fixed_grams",
            "daily_grams": 7,
            "kcal_per_gram_dry_food": 3.0,
            "meals_per_day": 2,
            "notes": "หญ้าแห้งเป็นอาหารหลัก ควรให้เม็ดอาหารในปริมาณจำกัด"
        },
        "เฟอร์เรท": {
            "calculation_type": "weight_percentage",
            "daily_percentage_of_body_weight": 0.06,
            "typical_weight_g": 1000,
            "kcal_per_gram_dry_food": 4.2,
            "meals_per_day": 3,
            "notes": "มีอัตราการเผาผลาญสูง ควรแบ่งให้หลายมื้อ"
        },
        "ชินชิลล่า": {
            "calculation_type": "fixed_grams",
            "daily_grams": 20,
            "kcal_per_gram_dry_food": 2.5,
            "meals_per_day": 1,
            "notes": "หญ้าแห้งเป็นอาหารหลัก ควรให้เม็ดอาหารในปริมาณจำกัด"
        }
    },
    "สัตว์ปีก": {
        "นกแก้ว": {
            "calculation_type": "weight_percentage",
            "daily_percentage_of_body_weight": 0.12,
            "typical_weight_g": 100,
            "kcal_per_gram_dry_food": 3.5,
            "meals_per_day": 2,
            "notes": "ปริมาณขึ้นอยู่กับขนาดและชนิดของนก"
        },
        "นกหงส์หยก": {
            "calculation_type": "fixed_grams",
            "daily_grams": 15,
            "kcal_per_gram_dry_food": 3.5,
            "meals_per_day": 1,
            "notes": "ควรให้ผักและผลไม้สดร่วมด้วย"
        },
        "ไก่": {
            "calculation_type": "fixed_grams",
            "daily_grams": 125,
            "kcal_per_gram_dry_food": 3.0,
            "meals_per_day": 1,
            "notes": "ไก่จะกินตามความต้องการสารอาหาร"
        },
        "ไก่งวง": {
            "calculation_type": "weight_based_lookup", // คำนวณจากตารางข้อมูลอ้างอิงตามอายุ (ในที่นี้ใช้ weight_kg input เป็นอายุสัปดาห์)
            "data_points": [
                {"age_weeks_min": 8, "age_weeks_max": 10, "daily_grams_feed": 285},
                {"age_weeks_min": 10, "age_weeks_max": 12, "daily_grams_feed": 350},
                {"age_weeks_min": 12, "age_weeks_max": 14, "daily_grams_feed": 400},
                {"age_weeks_min": 14, "age_weeks_max": 16, "daily_grams_feed": 440},
                {"age_weeks_min": 16, "age_weeks_max": 18, "daily_grams_feed": 470},
                {"age_weeks_min": 18, "age_weeks_max": 20, "daily_grams_feed": 485},
                {"age_weeks_min": 20, "age_weeks_max": 22, "daily_grams_feed": 500},
                {"age_weeks_min": 22, "age_weeks_max": 24, "daily_grams_feed": 515}
            ],
            "kcal_per_gram_dry_food": 3.0,
            "meals_per_day": 1,
            "notes": "ปริมาณอาหารขึ้นอยู่กับอายุ"
        },
        "เป็ด": {
            "calculation_type": "fixed_grams",
            "daily_grams": 170,
            "kcal_per_gram_dry_food": 3.0,
            "meals_per_day": 1,
            "notes": "เป็ดโตเต็มวัยจะกินประมาณ 170-200 กรัมต่อวัน"
        },
        "นกพิราบ": {
            "calculation_type": "fixed_grams",
            "daily_grams": 28,
            "kcal_per_gram_dry_food": 3.5,
            "meals_per_day": 1,
            "notes": "ควรให้ 1 ออนซ์ต่อวัน"
        },
        "ไก่ฟ้า": {
            "calculation_type": "fixed_grams",
            "daily_grams": 71,
            "kcal_per_gram_dry_food": 3.0,
            "meals_per_day": 1,
            "notes": "ไก่ฟ้าโตเต็มวัยจะกินประมาณ 500 กรัมต่อสัปดาห์"
        },
        "นกฟินช์": {
            "calculation_type": "fixed_grams",
            "daily_grams": 18,
            "kcal_per_gram_dry_food": 3.5,
            "meals_per_day": 1,
            "notes": "ควรให้ 1-2 ช้อนโต๊ะต่อวัน"
        },
        "นกคานารี": {
            "calculation_type": "fixed_grams",
            "daily_grams": 3.5,
            "kcal_per_gram_dry_food": 3.5,
            "meals_per_day": 1,
            "notes": "ควรให้ 3-4 กรัมต่อวัน"
        }
    },
    "สัตว์อื่น ๆ": {
        "เต่า": {
            "calculation_type": "weight_percentage",
            "daily_percentage_of_body_weight": 0.03,
            "typical_weight_g": 100,
            "kcal_per_gram_dry_food": 3.0,
            "meals_per_day": 1,
            "notes": "ลูกเต่าให้ทุกวัน เต่าโตเต็มวัย 3-4 ครั้งต่อสัปดาห์"
        },
        "กิ้งก่า": {
            "calculation_type": "fixed_grams",
            "daily_grams": 5,
            "kcal_per_gram_dry_food": 3.0,
            "meals_per_day": 1,
            "notes": "อาหารหลักคือกิ้งก่าและผักสด อาหารเม็ดเป็นเพียงส่วนเสริมหรืออาหารฉุกเฉิน"
        },
        "เม่นแคระ": {
            "calculation_type": "weight_percentage",
            "daily_percentage_of_body_weight": 0.02,
            "typical_weight_g": 400,
            "kcal_per_gram_dry_food": 3.4,
            "meals_per_day": 1,
            "notes": "ปริมาณอาหารขึ้นอยู่กับน้ำหนักตัว ระดับกิจกรรม และช่วงชีวิต"
        }
    }
};


// ฟังก์ชันสำหรับเติมตัวเลือกประเภทสัตว์ลงใน dropdown
export function populateAnimalType() {
    const typeSelect = document.getElementById("animalType");
    typeSelect.innerHTML = '<option value="">-- เลือกประเภทสัตว์ --</option>';
    for (const type in animalData) {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        typeSelect.appendChild(option);
    }
}

// ฟังก์ชันสำหรับเติมตัวเลือกชนิดสัตว์ลงใน dropdown และอัปเดตช่อง "ช่วงชีวิต/ระดับกิจกรรม"
export function updateAnimalSpecies() {
    const type = document.getElementById("animalType").value;
    const speciesSelect = document.getElementById("animalSpecies");
    const weightInputContainer = document.getElementById("weightInputContainer"); // รับ reference ของ container น้ำหนัก
    const lifeStageActivityContainer = document.getElementById("lifeStageActivityContainer"); // รับ reference ของ container ช่วงชีวิต/กิจกรรม
    const lifeStageActivitySelect = document.getElementById("lifeStageActivity"); // รับ reference ของ dropdown ช่วงชีวิต/กิจกรรม

    // รีเซ็ตตัวเลือกชนิดสัตว์
    speciesSelect.innerHTML = '<option value="">-- เลือกชนิดสัตว์ --</option>';
    // รีเซ็ตตัวเลือกช่วงชีวิต/กิจกรรม
    if (lifeStageActivitySelect) {
        lifeStageActivitySelect.innerHTML = '<option value="">-- เลือก --</option>';
    }

    // ซ่อนช่องน้ำหนักและช่วงชีวิต/กิจกรรมเริ่มต้น (จะแสดงตามเงื่อนไขใน updateRecommendedAmount)
    if (weightInputContainer) weightInputContainer.style.display = "none";
    if (lifeStageActivityContainer) lifeStageActivityContainer.style.display = "none";
    
    if (!type || !animalData[type]) return;

    // เติมตัวเลือกชนิดสัตว์
    for (const species in animalData[type]) {
        const option = document.createElement("option");
        option.value = species;
        option.textContent = species;
        speciesSelect.appendChild(option);
    }

    // เมื่อประเภทสัตว์เปลี่ยน ควรตั้งค่าชนิดสัตว์ให้เป็นค่าว่างเริ่มต้น
    speciesSelect.value = ""; 

    // การแสดงช่องน้ำหนัก จะถูกจัดการใน updateRecommendedAmount() เพื่อให้สัมพันธ์กับชนิดสัตว์ที่เลือก
    // การเปลี่ยน Label น้ำหนัก ก็จะถูกจัดการใน updateRecommendedAmount() เช่นกัน

    // ไม่ต้องเรียก updateRecommendedAmount() ตรงนี้ ให้ script.js จัดการ
}


// ฟังก์ชันหลักในการคำนวณปริมาณอาหารที่แนะนำ
export function updateRecommendedAmount() {
    const type = document.getElementById("animalType").value;
    const species = document.getElementById("animalSpecies").value;
    const count = parseInt(document.getElementById("animalCount").value) || 0;
    
    // ดึงค่าจาก input/select ที่เพิ่มเข้ามา
    const weight_kg_input = document.getElementById("animalWeightKg");
    const weight_kg = parseFloat(weight_kg_input ? weight_kg_input.value : 0) || 0;

    const lifeStageActivityContainer = document.getElementById("lifeStageActivityContainer"); // รับ reference
    const life_stage_activity_select = document.getElementById("lifeStageActivity");
    const life_stage_activity = life_stage_activity_select ? life_stage_activity_select.value : "";
    
    const resultSpan = document.getElementById("recommendedAmount");
    const notesSpan = document.getElementById("calculationNotes"); // span สำหรับแสดง notes

    // รีเซ็ตค่าและซ่อน notes ถ้าไม่มีข้อมูลที่เลือก หรือหากค่าไม่ถูกต้อง
    if (!type || !species || !animalData[type] || !animalData[type][species]) {
        resultSpan.textContent = "กรุณาเลือกข้อมูลให้ครบถ้วน";
        if (notesSpan) notesSpan.textContent = "";
        // ซ่อนช่องช่วงชีวิต/กิจกรรม และน้ำหนัก ถ้ายังไม่เลือกประเภท/ชนิดที่ถูกต้อง
        if (lifeStageActivityContainer) lifeStageActivityContainer.style.display = "none";
        const weightInputContainer = document.getElementById("weightInputContainer");
        if (weightInputContainer) weightInputContainer.style.display = "none";
        return;
    }

    const animal = animalData[type][species];
    let totalDailyGrams = 0; // ปริมาณอาหารต่อวันทั้งหมด (สำหรับสัตว์ทุกตัวรวมกัน)
    let calculationNotes = animal.notes || ""; // เริ่มต้นด้วย notes จาก animalData

    // จัดการการแสดงผลของช่องน้ำหนัก และเปลี่ยน Label
    const weightInputContainer = document.getElementById("weightInputContainer");
    const weightLabel = document.querySelector("#weightInputContainer label");
    if (weightInputContainer) {
        weightInputContainer.style.display = "block"; // แสดงช่องน้ำหนักเมื่อเลือกชนิดสัตว์แล้ว
        if (weightLabel) {
            if (type === "สัตว์ปีก" && species === "ไก่งวง" && animal.calculation_type === "weight_based_lookup" && animal.data_points[0] && animal.data_points[0].age_weeks_min !== undefined) {
                weightLabel.textContent = "อายุ (สัปดาห์):";
            } else if (type === "ปลาน้ำจืด" || type === "ปลาทะเล") {
                weightLabel.textContent = "น้ำหนัก (Kg) (ถ้าทราบ):";
            } else {
                weightLabel.textContent = "น้ำหนัก (Kg):";
            }
        }
    }


    // จัดการการแสดงผลของช่องช่วงชีวิต/กิจกรรม และเติมตัวเลือก
    if (type === "สัตว์เลี้ยงลูกด้วยนม" && (species === "สุนัข" || species === "แมว")) {
        if (lifeStageActivityContainer) lifeStageActivityContainer.style.display = "block";
        if (life_stage_activity_select && animal && animal.der_factors) {
            // เติมตัวเลือกเฉพาะเมื่อยังไม่มีการเติม (เพื่อไม่ให้เติมซ้ำ หรือเติมใหม่เมื่อ species เปลี่ยน)
            if (life_stage_activity_select.dataset.lastSpecies !== species) { // ตรวจสอบว่า species ที่เลือกเปลี่ยนหรือไม่
                life_stage_activity_select.innerHTML = '<option value="">-- เลือก --</option>';
                for (const factor in animal.der_factors) {
                    const option = document.createElement("option");
                    option.value = factor;
                    option.textContent = factor.replace(/_/g, ' '); // ทำให้ข้อความอ่านง่ายขึ้น
                    life_stage_activity_select.appendChild(option);
                }
                life_stage_activity_select.dataset.lastSpecies = species; // บันทึก species ล่าสุดที่ใช้เติม
            }
        }
    } else {
        if (lifeStageActivityContainer) lifeStageActivityContainer.style.display = "none";
        if (life_stage_activity_select) life_stage_activity_select.dataset.lastSpecies = ""; // รีเซ็ตสถานะการเติม
    }


    // ตรวจสอบและดำเนินการตามประเภทการคำนวณที่กำหนดไว้ใน animalData
    if (animal.calculation_type === "fixed_grams") {
        totalDailyGrams = animal.daily_grams;
    } else if (animal.calculation_type === "weight_percentage") {
        const actualWeight_g = weight_kg > 0 ? weight_kg * 1000 : (animal.typical_weight_g || 0); // ใช้น้ำหนักที่ผู้ใช้ป้อน หรือ typical_weight_g
        if (actualWeight_g === 0) {
            resultSpan.textContent = "กรุณาระบุน้ำหนัก";
            if (notesSpan) notesSpan.textContent = "";
            return;
        }
        totalDailyGrams = actualWeight_g * animal.daily_percentage_of_body_weight;
    } else if (animal.calculation_type === "RER_DER") {
        if (weight_kg <= 0 || !life_stage_activity || !animal.der_factors[life_stage_activity]) {
            resultSpan.textContent = "กรุณาระบุน้ำหนักและช่วงชีวิต/กิจกรรม";
            if (notesSpan) notesSpan.textContent = "";
            return;
        }
        let rerKcal;
        if (animal.rer_formula === "70_BW_0.75") { // สำหรับสุนัข
            rerKcal = 70 * (weight_kg ** 0.75);
        } else if (animal.rer_formula === "30_BW_plus_70") { // สำหรับแมว
            rerKcal = (30 * weight_kg) + 70;
        } else {
            resultSpan.textContent = "ข้อผิดพลาดในการคำนวณ RER";
            if (notesSpan) notesSpan.textContent = "";
            return;
        }
        const derKcal = rerKcal * animal.der_factors[life_stage_activity];
        totalDailyGrams = derKcal / animal.kcal_per_gram_dry_food;
        calculationNotes += ` (อิงตามความต้องการพลังงาน ${derKcal.toFixed(0)} kcal/วัน)`;
    } else if (animal.calculation_type === "weight_based_lookup") {
        if (weight_kg <= 0) {
            // ปรับข้อความเตือนให้ครอบคลุมทั้งน้ำหนักและอายุ (สำหรับไก่งวง)
            resultSpan.textContent = "กรุณาระบุน้ำหนัก/อายุ (สัปดาห์)";
            if (notesSpan) notesSpan.textContent = "";
            return;
        }
        let found = false;
        for (const dp of animal.data_points) {
            let isMatch = false;
            // กรณี lookup ด้วยน้ำหนัก
            if (dp.weight_kg_min !== undefined && dp.weight_kg_max !== undefined) {
                isMatch = (weight_kg >= dp.weight_kg_min && weight_kg <= dp.weight_kg_max);
            }
            // กรณี lookup ด้วยอายุ (สำหรับไก่งวง) - ใช้ weight_kg input เป็นอายุในหน่วยสัปดาห์
            else if (dp.age_weeks_min !== undefined && dp.age_weeks_max !== undefined) {
                isMatch = (weight_kg >= dp.age_weeks_min && weight_kg <= dp.age_weeks_max);
            }

            if (isMatch) {
                totalDailyGrams = dp.daily_grams_feed;
                calculationNotes += dp.notes ? ` (${dp.notes})` : "";
                found = true;
                break;
            }
        }
        if (!found) {
            resultSpan.textContent = "ไม่พบข้อมูลปริมาณอาหารสำหรับน้ำหนัก/อายุนี้";
            if (notesSpan) notesSpan.textContent = "";
            return;
        }
    } else {
        resultSpan.textContent = "ไม่รองรับวิธีการคำนวณนี้";
        if (notesSpan) notesSpan.textContent = "";
        return;
    }

    // คำนวณปริมาณอาหารรวมสำหรับสัตว์ทั้งหมดในหนึ่งมื้อ
    const mealsPerDay = animal.meals_per_day || 1; // Default เป็น 1 ถ้าไม่ได้ระบุ
    if (count > 0) {
        const totalPerMeal = (totalDailyGrams * count) / mealsPerDay;
        resultSpan.textContent = totalPerMeal.toFixed(2) + " กรัม / มื้อ";
        if (notesSpan) notesSpan.textContent = calculationNotes;
    } else {
        resultSpan.textContent = "โปรดระบุจำนวนสัตว์";
        if (notesSpan) notesSpan.textContent = "";
    }
}
