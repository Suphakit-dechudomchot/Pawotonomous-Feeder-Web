// animalCalculator.js

// ข้อมูลสำหรับสูตรการคำนวณปริมาณอาหารสัตว์ตามประเภทและชนิด
export const animalData = {
    "ปลาน้ำจืด": {
        "ปลาทอง": { "calculation_type": "weight_percentage", "daily_percentage_of_body_weight": 0.02, "typical_weight_g": 20, "meals_per_day": 2, "notes": "ควรแบ่งให้หลายมื้อต่อวัน" },
        "ปลาคาร์ฟ": { "calculation_type": "weight_percentage", "daily_percentage_of_body_weight": 0.01, "typical_weight_g": 500, "meals_per_day": 3, "notes": "ปริมาณขึ้นอยู่กับอุณหภูมิน้ำและขนาดปลา" },
        "ปลากัด": { "calculation_type": "fixed_grams", "daily_grams": 1.8, "meals_per_day": 2, "notes": "สำหรับปลาโตเต็มวัย ควรแบ่งให้ 1-2 มื้อต่อวัน" }
    },
    "สัตว์เลี้ยงลูกด้วยนม": {
        "สุนัข": {
            "calculation_type": "RER_DER", "rer_formula": "70_BW_0.75", "kcal_per_gram_dry_food": 3.5,
            "der_factors": { "ลูกสุนัข": 2.0, "โตเต็มวัย_ทำหมันแล้ว": 1.6, "โตเต็มวัย_ไม่ทำหมัน": 1.8, "ลดน้ำหนัก": 1.0, "เพิ่มน้ำหนัก": 1.8, "ตั้งครรภ์": 2.0, "ให้นมบุตร": 3.0 },
            "meals_per_day": 2, "notes": "ต้องระบุน้ำหนักและช่วงชีวิต/ระดับกิจกรรม"
        },
        "แมว": {
            "calculation_type": "RER_DER", "rer_formula": "30_BW_plus_70", "kcal_per_gram_dry_food": 4.0,
            "der_factors": { "ลูกแมว": 2.5, "โตเต็มวัย_ทำหมันแล้ว": 1.2, "โตเต็มวัย_ไม่ทำหมัน": 1.4, "ลดน้ำหนัก": 0.8, "เพิ่มน้ำหนัก": 1.6, "ตั้งครรภ์": 2.0, "ให้นมบุตร": 3.0 },
            "meals_per_day": 2, "notes": "ต้องระบุน้ำหนักและช่วงชีวิต/ระดับกิจกรรม"
        },
        "กระต่าย": { "calculation_type": "weight_percentage", "daily_percentage_of_body_weight": 0.01, "typical_weight_g": 2000, "meals_per_day": 2, "notes": "หญ้าแห้งเป็นอาหารหลัก ควรให้เม็ดอาหารจำกัด" }
    },
    "สัตว์ปีก": {
        "ไก่": { "calculation_type": "fixed_grams", "daily_grams": 125, "meals_per_day": 1, "notes": "ไก่จะกินตามความต้องการสารอาหาร" },
        "เป็ด": { "calculation_type": "fixed_grams", "daily_grams": 170, "meals_per_day": 1, "notes": "เป็ดโตเต็มวัยจะกินประมาณ 170-200 กรัมต่อวัน" }
    }
};

function createCustomOption(value, text, targetId) {
    const option = document.createElement('div');
    option.className = 'custom-option';
    option.dataset.value = value;
    option.dataset.target = targetId;
    option.textContent = text;
    return option;
}

export function populateAnimalType(DOMElements) {
    // ใช้ DOMElements ที่ส่งเข้ามา
    const optionsContainer = DOMElements.animalTypeOptions; 
    if (!optionsContainer) {
        console.error("animalTypeOptions element not found in DOMElements.");
        return;
    }
    optionsContainer.innerHTML = '';
    for (const type in animalData) {
        optionsContainer.appendChild(createCustomOption(type, type, 'animalType'));
    }
}

export function updateAnimalSpecies(DOMElements) {
    // ใช้ DOMElements ที่ส่งเข้ามา
    const typeTrigger = document.querySelector('.custom-select-trigger[data-target="animalType"]');
    const type = typeTrigger ? typeTrigger.dataset.value : '';

    const speciesOptionsContainer = DOMElements.animalSpeciesOptions;
    const speciesTrigger = document.querySelector('.custom-select-trigger[data-target="animalSpecies"]');
    
    if (!speciesOptionsContainer || !speciesTrigger) {
        console.error("animalSpeciesOptions or animalSpecies trigger element not found in DOMElements.");
        return;
    }

    speciesOptionsContainer.innerHTML = '';
    speciesTrigger.textContent = '-- เลือกชนิดสัตว์ --';
    speciesTrigger.dataset.value = '';

    if (type && animalData[type]) {
        for (const species in animalData[type]) {
            speciesOptionsContainer.appendChild(createCustomOption(species, species, 'animalSpecies'));
        }
    }
}

export function updateRecommendedAmount(DOMElements) {
    // ใช้ DOMElements ที่ส่งเข้ามา
    const typeTrigger = document.querySelector('.custom-select-trigger[data-target="animalType"]');
    const type = typeTrigger ? typeTrigger.dataset.value : '';

    const speciesTrigger = document.querySelector('.custom-select-trigger[data-target="animalSpecies"]');
    const species = speciesTrigger ? speciesTrigger.dataset.value : '';
    
    const count = parseInt(DOMElements.animalCount?.value) || 1;
    const weightKg = parseFloat(DOMElements.animalWeightKg?.value) || 0;
    
    const lifeStageActivityTrigger = document.querySelector('.custom-select-trigger[data-target="lifeStageActivity"]');
    const lifeStageActivity = lifeStageActivityTrigger ? lifeStageActivityTrigger.dataset.value : '';

    // ตรวจสอบว่า DOMElements ที่จำเป็นมีอยู่จริง
    if (!DOMElements.recommendedAmount || !DOMElements.calculationNotes || 
        !DOMElements.lifeStageActivityContainer || !DOMElements.weightInputContainer || 
        !DOMElements.applyRecommendedAmountBtn) {
        console.error("One or more DOMElements for calculator not found.");
        return;
    }

    // Reset and hide optional fields initially
    DOMElements.lifeStageActivityContainer.style.display = "none";
    DOMElements.weightInputContainer.style.display = "none";
    DOMElements.applyRecommendedAmountBtn.disabled = true; // ตั้งค่าเริ่มต้นเป็น disabled
    DOMElements.recommendedAmount.textContent = "-";
    DOMElements.calculationNotes.textContent = "";

    if (!type || !species || !animalData[type]?.[species]) {
        return;
    }

    const animal = animalData[type][species];
    let totalDailyGrams = 0;
    let notes = animal.notes || "";

    // Show/hide and configure optional fields
    DOMElements.weightInputContainer.style.display = "block";
    if (animal.calculation_type === "RER_DER") {
        DOMElements.lifeStageActivityContainer.style.display = "block";
        const lifeStageOptionsContainer = DOMElements.lifeStageActivityOptions; // ใช้ DOMElements
        const lifeStageTriggerForPopulation = document.querySelector('.custom-select-trigger[data-target="lifeStageActivity"]'); // ยังคงต้องใช้ querySelector เพื่ออ้างอิง trigger
        
        if (lifeStageOptionsContainer && lifeStageTriggerForPopulation) {
            lifeStageOptionsContainer.innerHTML = '';
            lifeStageTriggerForPopulation.textContent = '-- เลือก --';
            lifeStageTriggerForPopulation.dataset.value = '';
            for (const factor in animal.der_factors) {
                lifeStageOptionsContainer.appendChild(createCustomOption(factor, factor.replace(/_/g, ' '), 'lifeStageActivity'));
            }
        }
    }

    // Calculation logic
    switch (animal.calculation_type) {
        case "fixed_grams":
            totalDailyGrams = animal.daily_grams;
            break;
        case "weight_percentage":
            const actualWeightG = weightKg > 0 ? weightKg * 1000 : (animal.typical_weight_g || 0);
            totalDailyGrams = actualWeightG * animal.daily_percentage_of_body_weight;
            break;
        case "RER_DER":
            if (weightKg <= 0 || !lifeStageActivity) {
                notes = "กรุณาระบุน้ำหนักและช่วงชีวิต";
                totalDailyGrams = 0;
                break;
            }
            let rerKcal = 0;
            if (animal.rer_formula === "70_BW_0.75") rerKcal = 70 * (weightKg ** 0.75);
            else if (animal.rer_formula === "30_BW_plus_70") rerKcal = (30 * weightKg) + 70;
            
            const derKcal = rerKcal * animal.der_factors[lifeStageActivity];
            totalDailyGrams = derKcal / animal.kcal_per_gram_dry_food;
            notes += ` (พลังงานที่ต้องการ: ${derKcal.toFixed(0)} kcal/วัน)`;
            break;
    }

    // Final display
    if (totalDailyGrams > 0) {
        const mealsPerDay = animal.meals_per_day || 1;
        const totalPerMeal = (totalDailyGrams * count) / mealsPerDay;
        DOMElements.recommendedAmount.textContent = `${totalPerMeal.toFixed(1)} กรัม / มื้อ`;
        DOMElements.applyRecommendedAmountBtn.disabled = false; // เปิดใช้งานปุ่มเมื่อมีปริมาณที่คำนวณได้
    } else {
        DOMElements.recommendedAmount.textContent = "-";
        DOMElements.applyRecommendedAmountBtn.disabled = true; // ปิดใช้งานปุ่มเมื่อไม่มีปริมาณที่คำนวณได้
    }
    DOMElements.calculationNotes.textContent = notes;
}
