/*
# Seed Schemes and Demo Officials

## Overview
Seeds 10 real Indian government schemes with bilingual (English + Telugu) titles,
descriptions, required documents, and eligibility rules. Also creates 2 demo
official accounts (Roads and Water departments).

## Schemes Seeded (10 total)

### Students (4)
1. Post-Matric Scholarship (SC)
2. Central Sector Scholarship for College and University Students
3. AICTE Pragati Scholarship (girls)
4. PM-Vidyalaxmi Education Loan

### Farmers (3)
5. PM-KISAN
6. PM Fasal Bima Yojana
7. Kisan Credit Card

### General (3)
8. PM Awas Yojana
9. Ayushman Bharat PM-JAY
10. Sukanya Samriddhi Yojana

## Demo Officials (2)
- Roads department official: phone 9000000001, email 9000000001@civicsetu.app
- Water department official: phone 9000000002, email 9000000002@civicsetu.app
- Fixed password derived from demo OTP 123456

## Notes
- Schemes are reference data with no user ownership — readable by all authenticated users.
- Official accounts are created via auth.users with profile rows linking their department.
*/

-- Insert schemes (use ON CONFLICT to be idempotent)
INSERT INTO schemes (title_en, title_te, description_en, description_te, target_group, documents, rules) VALUES

-- 1. Post-Matric Scholarship (SC)
(
  'Post-Matric Scholarship for SC Students',
  'ఎస్సీ విద్యార్థుల పోస్ట్-మెట్రిక్ స్కాలర్‌షిప్',
  'Financial assistance to SC students for post-matriculation education including intermediate, diploma, and degree courses.',
  'ఎస్సీ విద్యార్థులకు ఇంటర్, డిప్లొమా మరియు డిగ్రీ కోర్సులతో సహా పోస్ట్-మెట్రిక్ విద్య కోసం ఆర్థిక సహాయం.',
  'student',
  '[{"en":"Caste Certificate (SC)","te":"కుల ధృవీకరణ పత్రం (ఎస్సీ)"},{"en":"Income Certificate","te":"ఆదాయ ధృవీకరణ పత్రం"},{"en":"Marksheet of last exam","te":"చివరి పరీక్ష మార్క్‌షీట్"},{"en":"Bonafide/Admission proof","te":"బోనాఫైడ్/ప్రవేశ రుజువు"},{"en":"Aadhaar Card","te":"ఆధార్ కార్డ్"},{"en":"Bank Passbook","te":"బ్యాంక్ పాస్‌బుక్"}]'::jsonb,
  '{"max_income": 250000, "min_age": null, "max_age": null, "allowed_categories": ["SC"], "gender": null, "min_land_acres": null, "max_land_acres": null, "allowed_education_levels": ["Class 9-10","11-12","Diploma","UG","PG","PhD"], "min_percentage": 50}'::jsonb
),

-- 2. Central Sector Scholarship
(
  'Central Sector Scholarship for College and University Students',
  'కళాశాల మరియు విశ్వవిద్యాలయ విద్యార్థుల కోసం కేంద్ర రంగ స్కాలర్‌షిప్',
  'Merit-cum-means scholarship for students from economically weaker sections pursuing higher education.',
  'ఆర్థికంగా వెనుకబడిన వర్గాల విద్యార్థులకు ఉన్నత విద్య కోసం మెరిట్-కమ్-మీన్స్ స్కాలర్‌షిప్.',
  'student',
  '[{"en":"Income Certificate","te":"ఆదాయ ధృవీకరణ పత్రం"},{"en":"Marksheet of last exam","te":"చివరి పరీక్ష మార్క్‌షీట్"},{"en":"Caste Certificate","te":"కుల ధృవీకరణ పత్రం"},{"en":"Aadhaar Card","te":"ఆధార్ కార్డ్"},{"en":"Bank Passbook","te":"బ్యాంక్ పాస్‌బుక్"},{"en":"Institution Bonafide","te":"సంస్థ బోనాఫైడ్"}]'::jsonb,
  '{"max_income": 800000, "min_age": null, "max_age": null, "allowed_categories": ["General","OBC","SC","ST","EWS"], "gender": null, "min_land_acres": null, "max_land_acres": null, "allowed_education_levels": ["UG","PG","PhD"], "min_percentage": 80}'::jsonb
),

-- 3. AICTE Pragati Scholarship (girls)
(
  'AICTE Pragati Scholarship for Girls',
  'బాలికల కోసం ఐక్టీ ప్రగతి స్కాలర్‌షిప్',
  'Scholarship for girl students in first year of technical diploma/degree courses to promote women education.',
  'మహిళా విద్యను ప్రోత్సహించడానికి మొదటి సంవత్సరం సాంకేతిక డిప్లొమా/డిగ్రీ కోర్సులలో బాలికల కోసం స్కాలర్‌షిప్.',
  'student',
  '[{"en":"Aadhaar Card","te":"ఆధార్ కార్డ్"},{"en":"Income Certificate","te":"ఆదాయ ధృవీకరణ పత్రం"},{"en":"Marksheet of last exam","te":"చివరి పరీక్ష మార్క్‌షీట్"},{"en":"Admission Proof","te":"ప్రవేశ రుజువు"},{"en":"Bank Passbook","te":"బ్యాంక్ పాస్‌బుక్"},{"en":"Caste Certificate","te":"కుల ధృవీకరణ పత్రం"}]'::jsonb,
  '{"max_income": 800000, "min_age": null, "max_age": null, "allowed_categories": ["General","OBC","SC","ST","EWS"], "gender": "female", "min_land_acres": null, "max_land_acres": null, "allowed_education_levels": ["Diploma","UG"], "min_percentage": 60}'::jsonb
),

-- 4. PM-Vidyalaxmi Education Loan
(
  'PM-Vidyalaxmi Education Loan',
  'పిఎం-విద్యాలక్ష్మి విద్యా రుణం',
  'Collateral-free, guarantee-free education loan for students admitted to quality higher education institutions.',
  'నాణ్యమైన ఉన్నత విద్యా సంస్థలలో ప్రవేశం పొందిన విద్యార్థుల కోసం పూచీకత్తు లేని, హామీ లేని విద్యా రుణం.',
  'student',
  '[{"en":"Admission Letter","te":"ప్రవేశ లేఖ"},{"en":"Income Certificate","te":"ఆదాయ ధృవీకరణ పత్రం"},{"en":"Aadhaar Card","te":"ఆధార్ కార్డ్"},{"en":"Marksheet of last exam","te":"చివరి పరీక్ష మార్క్‌షీట్"},{"en":"Bank Passbook","te":"బ్యాంక్ పాస్‌బుక్"},{"en":"PAN Card","te":"పాన్ కార్డ్"}]'::jsonb,
  '{"max_income": 800000, "min_age": null, "max_age": null, "allowed_categories": ["General","OBC","SC","ST","EWS"], "gender": null, "min_land_acres": null, "max_land_acres": null, "allowed_education_levels": ["UG","PG","PhD"], "min_percentage": 60}'::jsonb
),

-- 5. PM-KISAN
(
  'PM-KISAN Samman Nidhi',
  'పిఎం-కిసాన్ సమ్మాన్ నిధి',
  'Income support of Rs 6000 per year to small and marginal farmer families holding cultivable land.',
  'సాగు భూమి కలిగి ఉన్న చిన్న మరియు సన్నకందుకుల రైతు కుటుంబాలకు సంవత్సరానికి 6000 రూపాయల ఆదాయ సహాయం.',
  'farmer',
  '[{"en":"Aadhaar Card","te":"ఆధార్ కార్డ్"},{"en":"Land Ownership Document","te":"భూ యాజమాన్య పత్రం"},{"en":"Bank Passbook","te":"బ్యాంక్ పాస్‌బుక్"},{"en":"Citizen ID Proof","te":"పౌర ఐడి రుజువు"}]'::jsonb,
  '{"max_income": null, "min_age": null, "max_age": null, "allowed_categories": ["General","OBC","SC","ST","EWS"], "gender": null, "min_land_acres": null, "max_land_acres": 5, "allowed_education_levels": null, "min_percentage": null}'::jsonb
),

-- 6. PM Fasal Bima Yojana
(
  'PM Fasal Bima Yojana',
  'పిఎం ఫసల్ బీమా యోజన',
  'Crop insurance scheme to protect farmers against natural calamities, pests and diseases causing crop loss.',
  'పంట నష్టాన్ని కలిగించే సహజ విపత్తులు, తెగుళ్లు మరియు వ్యాధుల నుండి రైతులను రక్షించే పంట బీమా పథకం.',
  'farmer',
  '[{"en":"Aadhaar Card","te":"ఆధార్ కార్డ్"},{"en":"Land Ownership Document","te":"భూ యాజమాన్య పత్రం"},{"en":"Bank Passbook","te":"బ్యాంక్ పాస్‌బుక్"},{"en":"Sowing Certificate","te":"విత్తన ధృవీకరణ పత్రం"}]'::jsonb,
  '{"max_income": null, "min_age": null, "max_age": null, "allowed_categories": ["General","OBC","SC","ST","EWS"], "gender": null, "min_land_acres": null, "max_land_acres": null, "allowed_education_levels": null, "min_percentage": null}'::jsonb
),

-- 7. Kisan Credit Card
(
  'Kisan Credit Card (KCC)',
  'కిసాన్ క్రెడిట్ కార్డ్ (కెసిసి)',
  'Short-term credit facility for farmers to meet agricultural expenses like seeds, fertilizers, and equipment.',
  'విత్తనాలు, ఎరువులు, పరికరాలు వంటి వ్యవసాయ ఖర్చులను భరించడానికి రైతుల కోసం అల్పకాలిక రుణ సౌకర్యం.',
  'farmer',
  '[{"en":"Aadhaar Card","te":"ఆధార్ కార్డ్"},{"en":"Land Ownership Document","te":"భూ యాజమాన్య పత్రం"},{"en":"Bank Passbook","te":"బ్యాంక్ పాస్‌బుక్"},{"en":"PAN Card","te":"పాన్ కార్డ్"}]'::jsonb,
  '{"max_income": null, "min_age": 18, "max_age": null, "allowed_categories": ["General","OBC","SC","ST","EWS"], "gender": null, "min_land_acres": 0.5, "max_land_acres": null, "allowed_education_levels": null, "min_percentage": null}'::jsonb
),

-- 8. PM Awas Yojana
(
  'PM Awas Yojana (Housing for All)',
  'పిఎం ఆవాస్ యోజన (అందరికీ గృహాలు)',
  'Affordable housing scheme providing financial assistance for construction of pucca houses to eligible families.',
  'అర్హత కలిగిన కుటుంబాలకు పక్కా ఇళ్ల నిర్మాణానికి ఆర్థిక సహాయం అందించే సరసమైన గృహ పథకం.',
  'general',
  '[{"en":"Aadhaar Card","te":"ఆధార్ కార్డ్"},{"en":"Income Certificate","te":"ఆదాయ ధృవీకరణ పత్రం"},{"en":"Caste Certificate","te":"కుల ధృవీకరణ పత్రం"},{"en":"Bank Passbook","te":"బ్యాంక్ పాస్‌బుక్"},{"en":"Land Document","te":"భూ పత్రం"}]'::jsonb,
  '{"max_income": 300000, "min_age": 18, "max_age": null, "allowed_categories": ["General","OBC","SC","ST","EWS"], "gender": null, "min_land_acres": null, "max_land_acres": null, "allowed_education_levels": null, "min_percentage": null}'::jsonb
),

-- 9. Ayushman Bharat PM-JAY
(
  'Ayushman Bharat PM-JAY',
  'ఆయుష్మాన్ భారత్ పిఎం-జే',
  'Health insurance providing Rs 5 lakh coverage per family per year for secondary and tertiary hospitalization.',
  'ద్వితీయ మరియు తృతీయ ఆసుపత్రి ఖర్చులకు కుటుంబానికి సంవత్సరానికి 5 లక్షలు కవరేజీ అందించే ఆరోగ్య బీమా.',
  'general',
  '[{"en":"Aadhaar Card","te":"ఆధార్ కార్డ్"},{"en":"Ration Card","te":"రేషన్ కార్డ్"},{"en":"Mobile Number","te":"మొబైల్ నంబర్"},{"en":"Address Proof","te":"చిరునామా రుజువు"}]'::jsonb,
  '{"max_income": null, "min_age": null, "max_age": null, "allowed_categories": ["General","OBC","SC","ST","EWS"], "gender": null, "min_land_acres": null, "max_land_acres": null, "allowed_education_levels": null, "min_percentage": null}'::jsonb
),

-- 10. Sukanya Samriddhi Yojana
(
  'Sukanya Samriddhi Yojana',
  'సుకన్య సమృద్ధి యోజన',
  'Small savings scheme for girl child under 10, offering high interest rate and tax benefits for education and marriage.',
  '10 సంవత్సరాల లోపు బాలికల కోసం అధిక వడ్డీ రేటు మరియు పన్ను ప్రయోజనాలతో చిన్న పొదుపు పథకం.',
  'general',
  '[{"en":"Girl Child Birth Certificate","te":"బాలిక జనన ధృవీకరణ పత్రం"},{"en":"Parent Aadhaar Card","te":"తల్లిదండ్రుల ఆధార్ కార్డ్"},{"en":"Address Proof","te":"చిరునామా రుజువు"},{"en":"ID Proof of Depositor","te":"జమ్మదారు ఐడి రుజువు"}]'::jsonb,
  '{"max_income": null, "min_age": null, "max_age": 10, "allowed_categories": ["General","OBC","SC","ST","EWS"], "gender": "female", "min_land_acres": null, "max_land_acres": null, "allowed_education_levels": null, "min_percentage": null}'::jsonb
)
ON CONFLICT DO NOTHING;

-- Create demo official accounts
-- We insert profile rows; the auth.users accounts are created from the frontend
-- during the first login attempt (signUp). Here we just note the credentials.
-- The profiles will be created when the official first signs up via the app.

-- Actually, we need to create the auth.users entries for officials via the API.
-- Since we can't directly insert into auth.users via SQL, we'll handle this
-- by having the app auto-create official profiles on signup with those specific
-- phone numbers, and storing department info.
-- For now, we insert a reference table for official phone -> department mapping.
CREATE TABLE IF NOT EXISTS official_seeds (
  phone text PRIMARY KEY,
  department text NOT NULL,
  role text NOT NULL DEFAULT 'official'
);

ALTER TABLE official_seeds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_official_seeds" ON official_seeds;
CREATE POLICY "select_official_seeds"
ON official_seeds FOR SELECT TO authenticated
USING (true);

INSERT INTO official_seeds (phone, department) VALUES
('9000000001', 'Roads'),
('9000000002', 'Water')
ON CONFLICT DO NOTHING;
