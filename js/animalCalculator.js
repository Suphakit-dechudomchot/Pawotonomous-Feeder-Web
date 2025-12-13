// animalCalculator.js
import { t } from './translations.js';

// ข้อมูลสำหรับสูตรการคำนวณปริมาณอาหารสัตว์ตามประเภทและชนิด
export const animalData = {
    "ปลาน้ำจืด": {
        "ปลาทอง": { "calculation_type": "weight_percentage", "daily_percentage_of_body_weight": 0.02, "typical_weight_g": 20, "meals_per_day": 2, "notes_key": "calculatorNote_shouldDivide" },
        "ปลาคาร์ฟ": { "calculation_type": "weight_percentage", "daily_percentage_of_body_weight": 0.01, "typical_weight_g": 500, "meals_per_day": 3, "notes_key": "calculatorNote_dependsOnTemp" },
        "ปลากัด": { "calculation_type": "fixed_grams", "daily_grams": 1.8, "meals_per_day": 2, "notes_key": "calculatorNote_forAdult" }
    },
    "สัตว์เลี้ยงลูกด้วยนม": {
        "สุนัข": {
            "calculation_type": "RER_DER", "rer_formula": "70_BW_0.75", "kcal_per_gram_dry_food": 3.5,
            "der_factors": { "ลูกสุนัข": 2.0, "โตเต็มวัย_ทำหมันแล้ว": 1.6, "โตเต็มวัย_ไม่ทำหมัน": 1.8, "ลดน้ำหนัก": 1.0, "เพิ่มน้ำหนัก": 1.8, "ตั้งครรภ์": 2.0, "ให้นมบุตร": 3.0 },
            "meals_per_day": 2, "notes_key": "calculatorNote_needWeightAndLife"
        },
        "แมว": {
            "calculation_type": "RER_DER", "rer_formula": "30_BW_plus_70", "kcal_per_gram_dry_food": 4.0,
            "der_factors": { "ลูกแมว": 2.5, "โตเต็มวัย_ทำหมันแล้ว": 1.2, "โตเต็มวัย_ไม่ทำหมัน": 1.4, "ลดน้ำหนัก": 0.8, "เพิ่มน้ำหนัก": 1.6, "ตั้งครรภ์": 2.0, "ให้นมบุตร": 3.0 },
            "meals_per_day": 2, "notes_key": "calculatorNote_needWeightAndLife"
        },
        "กระต่าย": { "calculation_type": "weight_percentage", "daily_percentage_of_body_weight": 0.01, "typical_weight_g": 2000, "meals_per_day": 2, "notes_key": "calculatorNote_hayMain" }
    },
    "สัตว์ปีก": {
        "ไก่": { "calculation_type": "fixed_grams", "daily_grams": 125, "meals_per_day": 1, "notes_key": "calculatorNote_eatByNeed" },
        "เป็ด": { "calculation_type": "fixed_grams", "daily_grams": 170, "meals_per_day": 1, "notes_key": "calculatorNote_duckAdult" }
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
    const optionsContainer = DOMElements.animalTypeOptions; 
    if (!optionsContainer) return;
    optionsContainer.innerHTML = '';
    for (const type in animalData) {
        optionsContainer.appendChild(createCustomOption(type, t(`animalType_${type}`) || type, 'animalType'));
    }
    const trigger = document.querySelector('.custom-select-trigger[data-target="animalType"]');
    if (trigger && !trigger.dataset.value) trigger.textContent = t('selectAnimalType');
}

export function updateAnimalSpecies(DOMElements) {
    const typeTrigger = document.querySelector('.custom-select-trigger[data-target="animalType"]');
    const type = typeTrigger ? typeTrigger.dataset.value : '';
    const speciesOptionsContainer = DOMElements.animalSpeciesOptions;
    const speciesTrigger = document.querySelector('.custom-select-trigger[data-target="animalSpecies"]');
    if (!speciesOptionsContainer || !speciesTrigger) return;

    speciesOptionsContainer.innerHTML = '';
    speciesTrigger.textContent = t('selectAnimalSpecies');
    speciesTrigger.dataset.value = '';

    if (type && animalData[type]) {
        for (const species in animalData[type]) {
            speciesOptionsContainer.appendChild(createCustomOption(species, t(`animalSpecies_${species}`) || species, 'animalSpecies'));
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
    let notes = animal.notes_key ? t(animal.notes_key) : "";

    // Show/hide and configure optional fields
    DOMElements.weightInputContainer.style.display = "block";
    if (animal.calculation_type === "RER_DER") {
        DOMElements.lifeStageActivityContainer.style.display = "block";
        const lifeStageOptionsContainer = DOMElements.lifeStageActivityOptions; // ใช้ DOMElements
        const lifeStageTriggerForPopulation = document.querySelector('.custom-select-trigger[data-target="lifeStageActivity"]'); // ยังคงต้องใช้ querySelector เพื่ออ้างอิง trigger
        
        if (lifeStageOptionsContainer && lifeStageTriggerForPopulation) {
            lifeStageOptionsContainer.innerHTML = '';
            lifeStageTriggerForPopulation.textContent = t('selectLifeStage');
            lifeStageTriggerForPopulation.dataset.value = '';
            for (const factor in animal.der_factors) {
                lifeStageOptionsContainer.appendChild(createCustomOption(factor, t(`lifeStage_${factor}`) || factor.replace(/_/g, ' '), 'lifeStageActivity'));
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
                notes = t('calculatorNote_enterWeightAndLifeStage') || "กรุณาระบุน้ำหนักและช่วงชีวิต";
                totalDailyGrams = 0;
                break;
            }
            let rerKcal = 0;
            if (animal.rer_formula === "70_BW_0.75") rerKcal = 70 * (weightKg ** 0.75);
            else if (animal.rer_formula === "30_BW_plus_70") rerKcal = (30 * weightKg) + 70;
            
            const derKcal = rerKcal * animal.der_factors[lifeStageActivity];
            totalDailyGrams = derKcal / animal.kcal_per_gram_dry_food;
            notes += ` (${t('calculatorNote_energyNeeded')}: ${derKcal.toFixed(0)} kcal/${t('calculatorNote_perDay')})`;
            break;
    }

    // Final display
    if (totalDailyGrams > 0) {
        const mealsPerDay = animal.meals_per_day || 1;
        const totalPerMeal = (totalDailyGrams * count) / mealsPerDay;
        const lang = localStorage.getItem('pawtonomous_language') || 'th';
        const gramsText = lang === 'en' ? 'grams' : lang === 'zh' ? '克' : lang === 'ja' ? 'グラム' : 'กรัม';
        DOMElements.recommendedAmount.textContent = `${totalPerMeal.toFixed(1)} ${gramsText} / ${t('calculatorNote_perMeal')}`;
        DOMElements.applyRecommendedAmountBtn.disabled = false;
    } else {
        DOMElements.recommendedAmount.textContent = "-";
        DOMElements.applyRecommendedAmountBtn.disabled = true;
    }
    DOMElements.calculationNotes.textContent = notes;
}
