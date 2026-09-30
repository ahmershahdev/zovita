<?php

namespace App\Support;

/**
 * Body map → symptom → catalog categories. Drives the interactive anatomy explorer.
 *
 * Each symptom lists the DVAGO-derived category slugs it maps to, a short self-care note and the
 * red flags that mean "see a doctor". Symptoms marked `urgent` never show products: they show
 * emergency guidance instead. This is navigation help, not diagnosis.
 */
final class BodyMap
{
    public const REGIONS = [
        'head' => [
            'label' => 'Head & mind',
            'symptoms' => [
                'headache' => ['label' => 'Headache', 'categories' => ['pain-fever-relief'], 'note' => 'Rest, hydrate and use a simple pain reliever such as paracetamol at the labelled dose.', 'flags' => 'Sudden “worst ever” headache, stiff neck, confusion or weakness on one side.'],
                'migraine' => ['label' => 'Migraine', 'categories' => ['migraine', 'pain-fever-relief'], 'note' => 'Treat early, rest in a dark quiet room and track your triggers.', 'flags' => 'A first migraine after 50, or aura that lasts more than an hour.'],
                'fever' => ['label' => 'Fever', 'categories' => ['pain-fever-relief', 'fluids-electrolytes'], 'note' => 'Fluids, light clothing and an antipyretic. Check temperature every few hours.', 'flags' => 'Fever above 39.5 °C, lasting over 3 days, or with a rash or breathing trouble.'],
                'dizziness' => ['label' => 'Dizziness & vertigo', 'categories' => ['vertigo'], 'note' => 'Sit or lie down when it starts and stand up slowly.', 'flags' => 'Fainting, chest pain, slurred speech or new numbness.'],
                'sleep' => ['label' => 'Trouble sleeping', 'categories' => ['insomnia'], 'note' => 'Keep a regular bedtime and cut caffeine and screens late in the evening.', 'flags' => 'Insomnia lasting weeks or affecting daytime safety.'],
                'anxiety' => ['label' => 'Stress & anxiety', 'categories' => ['anxiety', 'brain-memory'], 'note' => 'Breathing exercises, movement and sleep help. Many treatments need a prescription.', 'flags' => 'Thoughts of self-harm — call a helpline or emergency services now.'],
                'hair-fall' => ['label' => 'Hair fall', 'categories' => ['hair-growth', 'baldness', 'biotin-supplements'], 'note' => 'Gentle care, balanced diet; iron and biotin deficiencies are common causes.', 'flags' => 'Sudden patchy loss or loss with scalp pain.'],
                'dandruff' => ['label' => 'Dandruff & itchy scalp', 'categories' => ['anti-dandruff', 'medicated-shampoo'], 'note' => 'A medicated shampoo two to three times a week usually helps within a month.', 'flags' => 'Thick crusting, bleeding or spreading redness.'],
            ],
        ],
        'face' => [
            'label' => 'Eyes, ears, nose & mouth',
            'symptoms' => [
                'dry-eyes' => ['label' => 'Dry, tired eyes', 'categories' => ['dry-eyes', 'artificial-tears'], 'note' => 'Lubricating drops and regular screen breaks (20-20-20 rule).', 'flags' => 'Eye pain, light sensitivity or blurred vision.'],
                'eye-allergy' => ['label' => 'Itchy, watery eyes', 'categories' => ['eye-allergy', 'allergy'], 'note' => 'Avoid rubbing; antihistamine drops can calm allergy flares.', 'flags' => 'Pus, severe redness or a change in vision.'],
                'eye-infection' => ['label' => 'Red, sticky eye', 'categories' => ['eye-infection'], 'note' => 'Keep hands and towels clean. Antibiotic drops need a pharmacist’s advice.', 'flags' => 'Pain, vision change or contact-lens wearers with a red eye.'],
                'blocked-nose' => ['label' => 'Blocked nose', 'categories' => ['nasal-congestion', 'steam-inhaler'], 'note' => 'Saline rinses and steam. Decongestant sprays for no more than 3–5 days.', 'flags' => 'Facial swelling or high fever with sinus pain.'],
                'sore-throat' => ['label' => 'Sore throat', 'categories' => ['sore-throat-relief'], 'note' => 'Warm fluids, lozenges and salt-water gargles.', 'flags' => 'Trouble swallowing or breathing, or drooling.'],
                'ear-pain' => ['label' => 'Ear pain or wax', 'categories' => ['ear-infection', 'ear-wax-remover'], 'note' => 'Never use cotton buds inside the ear canal.', 'flags' => 'Discharge, hearing loss or swelling behind the ear.'],
                'mouth-ulcers' => ['label' => 'Mouth ulcers', 'categories' => ['mouth-ulcers', 'mouthwash'], 'note' => 'Soothing gels and avoiding spicy food help most ulcers heal in 1–2 weeks.', 'flags' => 'An ulcer lasting more than 3 weeks.'],
                'gums' => ['label' => 'Bleeding gums & teeth', 'categories' => ['gum-care', 'tooth-paste', 'toothbrushes'], 'note' => 'Soft brush, fluoride toothpaste and daily flossing.', 'flags' => 'Swelling of the face or jaw, or fever with tooth pain.'],
                'acne' => ['label' => 'Acne & breakouts', 'categories' => ['acne', 'facewash'], 'note' => 'Gentle cleanser, non-comedogenic moisturiser and patience — most treatments take 6–8 weeks.', 'flags' => 'Painful cysts or scarring acne.'],
                'pigmentation' => ['label' => 'Dark spots & pigmentation', 'categories' => ['hyperpigmentation', 'melasma', 'sunscreen'], 'note' => 'Daily broad-spectrum sunscreen is the single most effective step.', 'flags' => 'A mole or spot that changes shape, colour or bleeds.'],
            ],
        ],
        'chest' => [
            'label' => 'Chest & lungs',
            'symptoms' => [
                'cough' => ['label' => 'Cough & cold', 'categories' => ['cough-cold', 'sore-throat-relief'], 'note' => 'Honey, warm fluids and rest. Match the syrup to dry vs. chesty cough.', 'flags' => 'Coughing blood, a cough lasting over 3 weeks, or breathlessness.'],
                'wheezing' => ['label' => 'Wheezing & asthma', 'categories' => ['asthma', 'nebulizer'], 'note' => 'Keep your reliever inhaler to hand and avoid known triggers.', 'flags' => 'Lips turning blue, or a reliever that is not working.'],
                'blood-pressure' => ['label' => 'High blood pressure', 'categories' => ['hypertension', 'bp-monitors'], 'note' => 'Monitor at home, reduce salt and take medicines exactly as prescribed.', 'flags' => 'A reading above 180/120 with headache, chest pain or confusion.'],
                'cholesterol' => ['label' => 'Cholesterol', 'categories' => ['cholesterol-control', 'fish-oil-omega-3'], 'note' => 'Diet, activity and prescribed medicines work together.', 'flags' => 'Any chest pain on exertion.'],
                'chest-pain' => ['label' => 'Chest pain or tightness', 'categories' => [], 'urgent' => true, 'note' => 'Chest pain can be a heart attack. Call 1122 or go to the nearest emergency department now — do not wait or self-treat.', 'flags' => 'Pain spreading to the arm, jaw or back, sweating, or breathlessness.'],
            ],
        ],
        'abdomen' => [
            'label' => 'Stomach & digestion',
            'symptoms' => [
                'acidity' => ['label' => 'Acidity & heartburn', 'categories' => ['acidity-indigestion', 'gastroesophageal-reflux-disease'], 'note' => 'Smaller meals, no lying down after eating, and antacids for quick relief.', 'flags' => 'Black stools, vomiting blood or difficulty swallowing.'],
                'diarrhea' => ['label' => 'Diarrhoea', 'categories' => ['diarrhea-relief', 'fluids-electrolytes', 'probiotics'], 'note' => 'ORS first — replacing fluids matters more than stopping the diarrhoea.', 'flags' => 'Blood in stool, signs of dehydration, or lasting over 2 days in children.'],
                'constipation' => ['label' => 'Constipation', 'categories' => ['constipation'], 'note' => 'Fibre, water and movement. Laxatives are for short-term use.', 'flags' => 'Severe pain, a swollen belly or blood.'],
                'nausea' => ['label' => 'Nausea & vomiting', 'categories' => ['nausea-vomiting', 'fluids-electrolytes'], 'note' => 'Small sips of fluid often; bland food once settled.', 'flags' => 'Unable to keep fluids down for 24 hours, or severe abdominal pain.'],
                'cramps' => ['label' => 'Stomach cramps', 'categories' => ['anti-spasmodic'], 'note' => 'A warm compress and an antispasmodic can ease cramping.', 'flags' => 'Sharp pain in the lower right side, or a hard, tender belly.'],
                'bloating' => ['label' => 'Bloating & gas', 'categories' => ['digestive-enzymes', 'probiotics'], 'note' => 'Eat slowly and track foods that trigger it.', 'flags' => 'Unexplained weight loss or persistent bloating.'],
                'diabetes' => ['label' => 'Blood sugar', 'categories' => ['diabetes', 'blood-glucose-monitor-strips', 'diabetes-supplements'], 'note' => 'Check levels regularly and keep a fast-acting sugar source with you.', 'flags' => 'Confusion, heavy breathing or very high readings.'],
            ],
        ],
        'pelvis' => [
            'label' => 'Pelvis & urinary',
            'symptoms' => [
                'uti' => ['label' => 'Burning urination', 'categories' => ['urinary-tract-infection'], 'note' => 'Drink plenty of water. Most UTIs need an antibiotic prescription.', 'flags' => 'Fever, back pain or blood in urine.'],
                'period-pain' => ['label' => 'Period pain', 'categories' => ['anti-spasmodic', 'feminine-care', 'sanitary-pads'], 'note' => 'Heat packs and an anti-inflammatory at the labelled dose.', 'flags' => 'Very heavy bleeding or pain that stops daily life.'],
                'piles' => ['label' => 'Piles', 'categories' => ['piles'], 'note' => 'Fibre and fluids to soften stools; soothing creams for relief.', 'flags' => 'Heavy bleeding or bleeding with weight loss.'],
                'pcos' => ['label' => 'Irregular cycles (PCOS)', 'categories' => ['polycystic-ovary-syndrome', 'women-supplement'], 'note' => 'Management is long-term and doctor-led.', 'flags' => 'Missed periods with a possible pregnancy.'],
                'prostate' => ['label' => 'Frequent urination (men)', 'categories' => ['benign-prostatic-hyperplasia'], 'note' => 'Worth a check-up — several effective treatments exist.', 'flags' => 'Unable to pass urine at all.'],
            ],
        ],
        'back' => [
            'label' => 'Back & spine',
            'symptoms' => [
                'back-pain' => ['label' => 'Lower back pain', 'categories' => ['muscle-relaxant', 'back-abdomen-support', 'heating-pads'], 'note' => 'Stay gently active; heat and a pain reliever help most back pain settle in weeks.', 'flags' => 'Numbness in the groin, leg weakness or loss of bladder control.'],
                'muscle-spasm' => ['label' => 'Muscle spasm & stiffness', 'categories' => ['muscle-spasms', 'muscle-relaxant', 'body-massager'], 'note' => 'Stretch, massage and heat.', 'flags' => 'Pain after a fall or with fever.'],
            ],
        ],
        'arms' => [
            'label' => 'Arms, hands & joints',
            'symptoms' => [
                'joint-pain' => ['label' => 'Joint pain & arthritis', 'categories' => ['arthritis', 'osteoarthritis'], 'note' => 'Gentle movement keeps joints mobile; topical gels are a good first step.', 'flags' => 'A hot, swollen joint with fever.'],
                'wrist' => ['label' => 'Wrist & elbow strain', 'categories' => ['supports-braces'], 'note' => 'Rest, ice and a supportive brace.', 'flags' => 'Deformity after an injury or loss of grip.'],
                'nerve-pain' => ['label' => 'Tingling & nerve pain', 'categories' => ['neuropathic-pain'], 'note' => 'Common in diabetes — worth checking your blood sugar and B12.', 'flags' => 'Sudden weakness or numbness on one side.'],
            ],
        ],
        'legs' => [
            'label' => 'Legs, knees & feet',
            'symptoms' => [
                'knee-pain' => ['label' => 'Knee pain', 'categories' => ['osteoarthritis', 'knee-leg-support'], 'note' => 'Supportive footwear, weight management and a knee support for activity.', 'flags' => 'A knee that locks, gives way or swells quickly.'],
                'bones' => ['label' => 'Weak bones', 'categories' => ['calcium-minerals', 'vitamin-d-supplements', 'osteoporosis'], 'note' => 'Calcium and vitamin D with weight-bearing exercise.', 'flags' => 'A fracture from a minor fall.'],
                'leg-cramps' => ['label' => 'Leg cramps', 'categories' => ['muscle-spasms', 'fluids-electrolytes'], 'note' => 'Hydrate and stretch the calf before bed.', 'flags' => 'A swollen, warm, painful calf (possible clot).'],
            ],
        ],
        'skin' => [
            'label' => 'Skin (all over)',
            'symptoms' => [
                'dry-skin' => ['label' => 'Dry, flaky skin', 'categories' => ['dry-skin', 'moisturizer', 'body-lotion'], 'note' => 'Moisturise within minutes of bathing; lukewarm, not hot, water.', 'flags' => 'Cracked, bleeding or infected skin.'],
                'rash' => ['label' => 'Rash & itching', 'categories' => ['rashes', 'allergy', 'scabies'], 'note' => 'An antihistamine and a soothing cream calm most rashes.', 'flags' => 'Swelling of the lips or tongue, or a rash with fever.'],
                'fungal' => ['label' => 'Fungal infection', 'categories' => ['fungal-infection'], 'note' => 'Keep the area dry and continue the cream for a week after it clears.', 'flags' => 'Spreading infection or a weakened immune system.'],
                'wounds' => ['label' => 'Cuts & wounds', 'categories' => ['wound-care', 'dressing-bandages', 'antiseptics-disinfectants'], 'note' => 'Clean with water, apply antiseptic and cover.', 'flags' => 'Deep wounds, animal bites or signs of infection.'],
                'sun' => ['label' => 'Sun protection', 'categories' => ['sunscreen'], 'note' => 'SPF 30+ every morning, reapplied every 2 hours outdoors.', 'flags' => 'Blistering sunburn with fever.'],
                'psoriasis' => ['label' => 'Psoriasis & eczema', 'categories' => ['psoriasis', 'dry-skin'], 'note' => 'Daily emollients reduce flares.', 'flags' => 'Widespread redness or joint pain.'],
            ],
        ],
        'general' => [
            'label' => 'Whole body',
            'symptoms' => [
                'fatigue' => ['label' => 'Tiredness & low energy', 'categories' => ['multivitamins', 'iron-supplements', 'anemia'], 'note' => 'Iron, B12 and vitamin D deficiencies are common and easy to test for.', 'flags' => 'Unexplained weight loss or night sweats.'],
                'immunity' => ['label' => 'Low immunity', 'categories' => ['vitamin-c-supplements', 'zinc-supplements', 'boost-your-immunity'], 'note' => 'Sleep, a varied diet and vitamin C and zinc support immune health.', 'flags' => 'Frequent, severe or unusual infections.'],
                'weight' => ['label' => 'Weight management', 'categories' => ['weight-management', 'protein-supplement'], 'note' => 'Sustainable change comes from diet, sleep and activity together.', 'flags' => 'Rapid weight change without trying.'],
            ],
        ],
    ];

    /** Region → symptom list without the category mapping (what the page needs up front). */
    public static function regions(): array
    {
        return collect(self::REGIONS)->map(fn ($region, $key) => [
            'key' => $key,
            'label' => $region['label'],
            'symptoms' => collect($region['symptoms'])->map(fn ($s, $k) => [
                'key' => $k,
                'label' => $s['label'],
                'urgent' => $s['urgent'] ?? false,
            ])->values()->all(),
        ])->values()->all();
    }

    /** @return array{region: string, key: string, label: string, categories: array, note: string, flags: string, urgent: bool}|null */
    public static function symptom(string $key): ?array
    {
        foreach (self::REGIONS as $regionKey => $region) {
            if (isset($region['symptoms'][$key])) {
                return $region['symptoms'][$key] + ['region' => $regionKey, 'key' => $key, 'urgent' => false];
            }
        }

        return null;
    }
}
