"""Note templates shown in the app, in the order they are listed, grouped under a heading.

1. The company's own templates (names and order exactly as in its system).
2. Widely used standards: the Nordic journal structure used in Cambio COSMIC / CGM TakeCare, and international
   formats (H&P, problem-based SOAP, ED note with MDM, discharge summary, ISBAR, DAP/BIRP, PRSB clinic letter…).

Every clinical template follows the Medepad house style of the company's own notes:
  Current (prose) · Findings ("Area: finding" lines) · Assessment ("Diagnosis (ICD-10): reason") ·
  Plan ("- " bullets) · Referral ("No referral made." when none).
Sources for the structures: HL7 C-CDA document templates, PRSB (UK) letter/discharge standards, Joint Commission
RC.02.01.03 (operative note), ACEP/AMA 2023 ED E/M (MDM), NICE NG201/NG45, AAP Bright Futures, NHS England SMR,
ACSQHC ISBAR, Socialstyrelsen HSLF-FS 2016:40 and regional journal guides (Region Stockholm, VGR, Region Skåne),
and the template libraries of Heidi, Nabla, Dragon Copilot, Lyrebird, Tortus, Freed and Tandem Health.
"""
from dataclasses import dataclass, field

BASE = (
    "You are a clinical documentation assistant helping a licensed clinician write the medical record of a "
    "recorded consultation. Be accurate and concise and use standard medical terminology. Use only what was said "
    "in the transcript: never invent symptoms, examination findings, vital signs, results, diagnoses or doses. "
    "Attribute statements correctly (patient, parent/carer, clinician) and ignore small talk."
)

STYLE = """
HOUSE STYLE (follow it in every section):
- History sections: short clinical prose in the third person ("The patient reports ..."). Include pertinent
  negatives the patient denied (e.g. "No chest pain or shortness of breath").
- Examination / findings sections: one finding per line as "Area: finding" (e.g. "Throat: mild redness, no
  exudate"; "Blood pressure: 128/82 mmHg"). Keep units.
- Assessment / diagnosis sections: one line per problem as "Diagnosis name (ICD-10 code): one-sentence reason
  from the consultation". Use the most specific ICD-10 code the consultation supports; use symptom codes (R codes)
  when no diagnosis was made; mark uncertain diagnoses as "suspected". Never make the clinician sound more
  certain than they were.
- Plan / action sections: one action per line starting with "- ": tests, prescriptions (drug, dose, route,
  frequency and duration when stated; new / changed / stopped), advice, safety-netting (what to watch for and
  when to seek help) and follow-up, saying who does what when it was said.
- Referral sections: to whom, why and how urgent; if no referral was made write "No referral made."
- Any other section with nothing in the consultation: "Not discussed".
- Codes: WHO ICD-10 codes (ICD-10-SE in Swedish notes), e.g. "S39.0", never US ICD-10-CM codes with extra
  characters such as "S39.012A".
- Write every fixed phrase ("Not discussed", "No referral made.", "None") in the language of the note, e.g. in
  Swedish "Ej diskuterat" and "Ingen remiss.".
""".strip()


def clinical(task: str) -> str:
    return f"{BASE}\n\n{STYLE}\n\n{task.strip()}"


@dataclass(frozen=True)
class TemplateDef:
    name: str
    group: str
    description: str
    sections: list[str] = field(default_factory=list)
    prompt: str = ""
    codes: bool = True  # ask for ICD-10 codes
    premium: bool = False
    old_name: str | None = None  # name it may have been saved under before


COMPANY = "Company templates"
NORDIC = "Nordic journal (COSMIC / TakeCare)"
GENERAL = "General practice"
HOSPITAL = "Hospital & emergency"
SURGERY = "Surgery"
MENTAL = "Mental health"
WOMEN_CHILD = "Women's & children's health"
ALLIED = "Nursing & allied health"
LETTERS = "Letters & documents"

# ---- 1. the company's own templates --------------------------------------------------------------------------------
COMPANY_TEMPLATES: list[TemplateDef] = [
    TemplateDef(
        "Standard SOAP note", COMPANY, "Classic note: Subjective, Objective, Assessment and Plan.",
        ["Subjective", "Objective", "Assessment", "Plan"],
        clinical("""Produce a standard SOAP note.
- Subjective: presenting complaint, onset, duration, character, aggravating/relieving factors, relevant history,
  medication, allergies and the patient's own concerns.
- Objective: examination findings and observations stated by the clinician.
- Assessment: the working diagnosis or differential, as stated or clearly implied.
- Plan: investigations, treatment, medication, advice, safety-netting, referrals and follow-up."""),
        old_name="Standard SOAP Note",
    ),
    TemplateDef(
        "Soap with supporting details", COMPANY, "SOAP note with background and the details behind each point.",
        ["Background", "Subjective", "Objective", "Assessment", "Plan"],
        clinical("""Produce a SOAP note preceded by a Background section.
- Background: earlier history relevant to this visit: past illnesses or injuries, previous treatment and why it
  stopped, social and occupational context, barriers such as cost or scheduling.
- Then Subjective, Objective, Assessment and Plan as in a standard SOAP note, each point backed by the specific
  details from the conversation that support it."""),
        old_name="SOAP with background",
    ),
    TemplateDef(
        "Psychiatry", COMPANY, "Mental health assessment: history, mental state, risk and plan.",
        ["Presenting complaint", "History of presenting complaint", "Psychiatric history", "Substance use",
         "Medication", "Social situation", "Mental state examination", "Risk assessment", "Formulation", "Plan"],
        clinical("""Produce a psychiatric assessment note.
- History: mood, sleep, appetite, energy, concentration and functioning as reported; previous episodes,
  admissions and treatment; alcohol and drug use; forensic history if mentioned.
- Medication: current and past psychiatric medication, adherence and side effects.
- Mental state examination: one line each for appearance, behaviour, speech, mood (in the patient's words),
  affect, thought form, thought content, perception, cognition, insight and judgement, only as observed or stated.
- Risk assessment: self-harm/suicidal thoughts, harm to others, vulnerability and safeguarding. If risk was not
  discussed write "Not discussed"; never assume there is no risk.
- Formulation: the clinician's understanding of the problem, if given. Mental Health Act / capacity if mentioned."""),
    ),
    TemplateDef(
        "Doctor SOAP (Medepad Standard)", COMPANY, "Medepad house style: Current, Findings, Assessment, Plan, Referral.",
        ["Current", "Findings", "Assessment", "Plan", "Referral"],
        clinical("""Produce a note in the Medepad standard structure.
- Current: why the patient came today and the relevant story: symptoms, duration, what has been tried and with
  what effect, relevant history and medication.
- Findings: what the clinician observed or measured, as "Area: finding" lines (e.g. "General condition: ...").
- Assessment: each diagnosis with its ICD-10 code and the reason, one per line.
- Plan: the agreed actions as bullet points (prescriptions, advice, tests, safety-netting, follow-up).
- Referral: any referral made, or "No referral made.\""""),
    ),
    TemplateDef(
        "Fit Note - Self Serve", COMPANY, "Fitness-for-work (fit note) content for the clinician to sign.",
        ["Condition", "Functional effects", "Fitness for work", "Adjustments that may help", "Period covered",
         "Reassessment needed", "Comments"],
        clinical("""Draft the content of a fitness-for-work statement (UK fit note / MED3) for the clinician to
review and sign.
- Condition: the diagnosis or symptoms in plain words.
- Functional effects: how the condition affects what the patient can do at work.
- Fitness for work: "May be fit for work taking account of the advice below" or "Not fit for work", only as the
  clinician said; prefer "may be fit" unless the clinician said the patient cannot do any work.
- Adjustments that may help: phased return, altered hours, amended duties, workplace adaptations, as discussed.
- Period covered and whether reassessment is needed, as stated; otherwise "Not discussed".""", ),
        codes=False,
    ),
    TemplateDef(
        "Fit Note ROW Self Serve", COMPANY, "Fit note for patients outside the UK (rest of world).",
        ["Condition", "Fitness for work", "Restrictions", "Period", "Review date"],
        clinical("""Draft a concise international (rest-of-world) medical certificate of fitness for work for the
clinician to review: the condition, the clinician's view on fitness for work, any restrictions, the period it
covers and when it should be reviewed. Write "Not discussed" for anything not covered."""),
        codes=False,
    ),
    TemplateDef(
        "Referral basis", COMPANY, "Referral content: reason, question, findings, treatment tried and urgency.",
        ["Reason for referral", "Question for the specialist", "Relevant history", "Examination findings",
         "Investigations", "Treatment tried", "Current medication and allergies", "Urgency"],
        clinical("""Draft the basis for a referral to a specialist. Be specific about the clinical question the
referrer wants answered and the outcome they hope for. Include treatment already tried and its effect. Urgency
only as the clinician said (routine, soon, urgent); otherwise "Not discussed"."""),
    ),
    TemplateDef(
        "General Practitioner (Medepad Standard)", COMPANY, "Complete GP consultation note in the Medepad house style.",
        ["Current", "History", "Findings", "Assessment", "Plan", "Safety-netting", "Follow-up", "Referral"],
        clinical("""Produce a primary care (GP) consultation note.
- Current: the reason for the visit and the story of the complaint, with pertinent negatives.
- History: relevant past medical history, medication, allergies, family and social history mentioned.
- Findings: examination and observations as "Area: finding" lines.
- Assessment: each problem with its ICD-10 code and reason.
- Plan: actions as bullet points. Safety-netting: the specific warning signs and what to do. Follow-up: when and
  how. Referral: any referral, or "No referral made.\""""),
        premium=True,
    ),
    TemplateDef(
        "Gynaecologist (Medepad Standard)", COMPANY, "Gynaecology consultation with the relevant history.",
        ["Current", "Gynaecological history", "Obstetric history", "Findings", "Assessment", "Plan", "Referral"],
        clinical("""Produce a gynaecology consultation note. Gynaecological history: last menstrual period, cycle,
bleeding pattern, contraception, cervical screening and sexual health, only when mentioned. Obstetric history as
gravida/para. Findings as "Area: finding" lines (abdominal, speculum, bimanual examination as stated)."""),
        premium=True,
    ),
    TemplateDef(
        "Gynecology SOAP Note (Medepad Standard)", COMPANY, "SOAP note focused on gynaecology visits.",
        ["Subjective", "Objective", "Assessment", "Plan"],
        clinical("""Produce a SOAP note for a gynaecology visit, keeping gynaecological history (menstrual,
obstetric, contraceptive, sexual health) inside Subjective and examination findings as "Area: finding" lines."""),
        premium=True,
    ),
    TemplateDef(
        "Paediatrician (Medepad Standard)", COMPANY, "Child consultation including growth and development.",
        ["Current", "History (from parent/child)", "Growth & development", "Findings", "Assessment", "Plan",
         "Referral"],
        clinical("""Produce a paediatric consultation note. Distinguish what the parent/carer reported from what the
child said. Include feeding, fluid intake, wet nappies, growth, development and immunisation status only when
discussed. Findings as "Area: finding" lines with weight, temperature and other measurements when stated. Include
safety-netting advice given to the parents in the Plan."""),
        premium=True,
    ),
    TemplateDef(
        "Paediatrician (Tandem Standard)", COMPANY, "Short paediatric SOAP note in bullet style.",
        ["Subjective", "Objective", "Assessment", "Plan"],
        clinical("""Produce a concise paediatric SOAP note in short bullet points; mark parent/carer statements
"(parent)"."""),
        premium=True,
    ),
    TemplateDef(
        "Physiotherapist/occupational therapist (Medepad Standard)", COMPANY,
        "Function, objective findings, goals and treatment plan.",
        ["Presenting complaint", "History", "Functional assessment", "Findings", "Assessment", "Goals",
         "Treatment plan"],
        clinical("""Produce a physiotherapy / occupational therapy note: the problem and its impact on daily
activities and work, relevant history, functional limitations, objective findings (range of motion, strength,
special tests, outcome measures) as "Area: finding" lines, the clinical assessment, measurable goals, and the
treatment plan with exercises, frequency and follow-up."""),
        premium=True,
    ),
    TemplateDef(
        "T&O (Tandem Standard)", COMPANY, "Trauma & orthopaedics: injury, examination, imaging and plan.",
        ["History", "Examination", "Investigations", "Impression", "Plan"],
        clinical("""Produce a trauma and orthopaedics clinic note in concise bullet points: mechanism of injury or
onset, pain and function, relevant history, examination (including neurovascular status when stated), imaging and
test results as reported, the working diagnosis with ICD-10 code, and the plan (conservative or surgical options
discussed, follow-up)."""),
        premium=True,
    ),
    TemplateDef(
        "Urologist (Tandem Standard)", COMPANY, "Urology consultation: symptoms, tests and plan.",
        ["Presenting complaint", "Urological history", "Examination", "Investigations", "Impression", "Plan"],
        clinical("""Produce a urology clinic note in concise bullet points: lower urinary tract symptoms,
haematuria, pain, relevant history and medication, examination findings, test results (urine dipstick, PSA,
imaging) only as stated, the impression with ICD-10 code and the plan."""),
        premium=True,
    ),
]

# Swedish journal headings (sökord). When the notes are written in Swedish the LLM uses these exact words.
SOKORD = (
    "If the note is written in Swedish, use the Swedish journal keywords (sökord) as headings: Kontaktorsak, "
    "Socialt, Levnadsvanor, Tolk, Hereditet, Tidigare sjukdomar, Nuvarande sjukdomar, Överkänslighet, Aktuellt, "
    "Aktuella läkemedel, Status, Provsvar, Bedömning, Åtgärd, Planering, Diagnos, Remiss. "
    "Status records normal findings too (e.g. 'Cor: regular rhythm, no murmurs'). Bedömning is a short synthesis "
    "that adds no new facts. Diagnosis: main diagnosis first, each as 'Name (ICD-10-SE code)'. Write in neutral, "
    "non-judgemental language: patients read their notes in 1177 Journalen. Do not name relatives."
)


def nordic(task: str) -> str:
    return clinical(f"{task.strip()}\n\n{SOKORD}")


NORDIC_TEMPLATES: list[TemplateDef] = [
    TemplateDef(
        "Physician new visit (Nybesök)", NORDIC, "Swedish new-visit journal note: Kontaktorsak to Diagnos and Remiss.",
        ["Reason for contact", "Social history", "Lifestyle", "Interpreter", "Family history", "Past history",
         "Current chronic conditions", "Allergies", "Current complaint", "Current medication", "Findings",
         "Assessment", "Plan", "Diagnosis", "Referral"],
        nordic("""Produce a physician new-visit note (nybesök) in the Swedish journal structure.
- Reason for contact (Kontaktorsak): why the patient came and how (self-referred, referral from ...).
- Social history: living situation, work, sick leave, help at home. Lifestyle (Levnadsvanor): tobacco, alcohol,
  physical activity and diet. Interpreter: whether one was used and the language.
- Allergies (Överkänslighet): substance and reaction, or "No known allergies" if stated.
- Current complaint (Aktuellt): symptoms, onset, course, triggers, what eases them and what has been tried.
- Current medication: drug, strength and dose, or "No regular medication" if stated.
- Findings (Status): general condition, then by organ system ("Area: finding"), normal findings included.
- Assessment (Bedömning): short synthesis with working diagnosis and differentials.
- Plan (Åtgärd/Planering): treatment with dose and duration, advice, follow-up, who is responsible and what the
  patient was told."""),
    ),
    TemplateDef(
        "Follow-up visit (Återbesök)", NORDIC, "Swedish follow-up note: change since last visit, results, plan.",
        ["Reason for contact", "Current complaint", "Medication changes", "Findings", "Results", "Assessment",
         "Plan", "Diagnosis"],
        nordic("""Produce a follow-up visit note (återbesök). Reason for contact: what is being followed up.
Current complaint (Aktuellt): change since last visit, response to treatment and side effects. Medication
changes: only what changed, with the reason. Results (Provsvar): tests since last visit and what they mean.
Assessment: better, unchanged or worse and whether goals are met."""),
    ),
    TemplateDef(
        "Telephone / digital contact (Telefonkontakt)", NORDIC, "Phone, video or chat contact without a physical visit.",
        ["Reason and channel", "Current complaint", "Assessment", "Advice and action", "Safety-netting", "Diagnosis"],
        nordic("""Produce a note for a telephone, video or chat contact (anteckning utan fysiskt möte).
Reason and channel: phone, video or chat and who made contact. Assessment: state that no physical examination
was done. Safety-netting: e.g. "Will contact again if worse"; where to go if symptoms change."""),
    ),
    TemplateDef(
        "Emergency visit (Akutbesök)", NORDIC, "Swedish emergency / on-call note with triage, status and disposition.",
        ["Presenting complaint", "Triage and vital signs", "Current complaint", "Past history", "Medication",
         "Allergies", "Findings", "Investigations", "Assessment", "Treatment in the emergency department",
         "Disposition", "Diagnosis"],
        nordic("""Produce an emergency department note (akutbesök / jouranteckning). Triage and vital signs: RETTS
priority, respiratory rate, oxygen saturation, pulse, blood pressure, temperature and consciousness (RLS/GCS),
as stated. Medication: flag anticoagulants. Findings: for injuries include distal motor, sensory and circulation
status. Disposition: admitted to which ward, or home with advice and follow-up."""),
    ),
    TemplateDef(
        "Admission note (Inskrivning)", NORDIC, "Hospital admission note: full history, status and 24-hour plan.",
        ["Reason for admission", "Social history", "Bodily functions", "Family history", "Past history",
         "Current chronic conditions", "Current complaint", "Current medication", "Allergies", "Findings",
         "Investigations", "Assessment", "Plan", "Preliminary diagnosis"],
        nordic("""Produce an admission note (inskrivningsanteckning). Bodily functions (Naturliga funktioner):
appetite, sleep, bowel and bladder. Findings: full status ending with the local status. Assessment: a short
synthesis ("Thus a 72-year-old man with ..."). Plan: diagnostics and treatment for the next 24 hours."""),
    ),
    TemplateDef(
        "Ward progress note (Daganteckning)", NORDIC, "Daily ward-round note: events, assessment, plan.",
        ["Current status", "Assessment", "Plan", "Important for on-call"],
        nordic("""Produce a daily ward progress note (daganteckning). Current status (Aktuellt): how the patient
feels, vital signs, examination and new results. Assessment: whether the working diagnosis still holds. Plan:
today's actions and planned discharge date. Important for on-call: what the on-call doctor should do for each
possible result, if discussed."""),
    ),
    TemplateDef(
        "Discharge summary (Epikris)", NORDIC, "Swedish epikris with medication report and post-discharge plan.",
        ["Diagnoses", "Reason for admission", "Background", "Hospital course", "Investigations",
         "Status at discharge", "Medication report", "Plan after discharge", "Certificates"],
        nordic("""Produce a discharge summary (epikris). Diagnoses: main and secondary with ICD-10-SE codes, and
procedure codes (KVÅ) if stated. Medication report (Läkemedelsberättelse): new, stopped and changed medicines,
each with the reason. Plan after discharge: follow-up, tests and referrals with who is responsible.
Certificates: sick leave or other certificates issued."""),
    ),
    TemplateDef(
        "Sick-leave certificate (FK 7804)", NORDIC, "Läkarintyg för sjukpenning for Försäkringskassan.",
        ["Based on", "Occupation", "Diagnosis", "Functional impairment", "Activity limitation", "Medical treatment",
         "Reduced work capacity", "Prognosis", "Return-to-work measures", "Other information"],
        nordic("""Draft the content of the Swedish medical certificate for sickness benefit (Läkarintyg för
sjukpenning, FK 7804) for the doctor to review. Follow the form's order.
- Based on: physical visit, digital visit, phone contact or records.
- Occupation: the patient's job and its tasks (or job-seeking, studies, parental leave).
- Diagnosis, Functional impairment and Activity limitation must form a clear chain (DFA): the diagnosis causes an
  impaired function (with the findings it rests on) which limits concrete activities in that occupation.
- Reduced work capacity: 100, 75, 50 or 25 % and the period, only as the doctor said.
- Prognosis: return to work expected, not expected, or uncertain (why). Plain language a layperson understands;
  keep the patient's own account separate from the doctor's observations."""),
    ),
    TemplateDef(
        "Referral (Remiss)", NORDIC, "Swedish referral with one clear clinical question and priority.",
        ["Clinical question", "Current complaint", "Past and current illness", "Findings", "Results so far",
         "Current medication", "Allergies", "Special considerations", "Requested priority"],
        nordic("""Produce a referral (remiss). Clinical question (Frågeställning): one clear question; never "see
history". Current medication: flag anticoagulants, antiplatelets and steroids. Special considerations: interpreter,
disability, infection risk. Requested priority only as stated."""),
    ),
    TemplateDef(
        "Psychiatric emergency assessment (Psykiatri akut)", NORDIC,
        "Acute psychiatric assessment with structured suicide risk assessment.",
        ["Reason for contact", "Social history", "Family history", "Previous psychiatric care", "Medical history",
         "Substance use", "Current situation", "Medication", "Allergies", "Mental status", "Suicide history",
         "Self-harm", "Suicide risk assessment", "Assessment", "Plan", "Diagnosis"],
        nordic("""Produce an acute psychiatric assessment. Mental status (Psykiskt status): describe the patient in
the conversation in neutral, concrete words without interpretation. Suicide history: previous attempts and
impulses in time order. Suicide risk assessment: near-term risk weighing risk and protective factors, graded
high / medium / low only as the clinician concluded; if not discussed write "Not discussed". Plan: include
whether compulsory care was considered."""),
    ),
    TemplateDef(
        "Antenatal booking visit (MVC inskrivning)", NORDIC, "Midwife booking visit at the antenatal clinic.",
        ["Reason for contact", "Social history", "Health history", "Lifestyle", "Violence", "Allergies",
         "Medication and supplements", "Communication", "Obstetric findings", "Psychosocial", "Risk assessment",
         "Information given", "Assessment and action", "Consent", "Plan"],
        nordic("""Produce a midwife antenatal booking note. Health history: hereditary, medical, obstetric and
psychiatric history, previous births and last cervical smear. Violence: only that she was asked and her answer.
Obstetric findings: blood pressure, Hb, symphysis-fundal height, fetal movements. Psychosocial: EPDS and fear of
childbirth if discussed. Plan: basic programme or individual care plan. Do not name the woman or her relatives."""),
    ),
    TemplateDef(
        "Child health visit (BVC)", NORDIC, "Child health centre visit following the national programme.",
        ["Visit type and age", "Health since last visit", "Growth", "Feeding", "Sleep", "Development",
         "Examination", "Family and parenting", "Vaccination", "Advice given", "Assessment", "Next visit", "Referral"],
        nordic("""Produce a child health centre (BVC) visit note. Growth: weight, length and head circumference
and the curve trend. Development: motor, language and social. Family and parenting: as discussed (violence
questions only as 'asked / answer'). Referral: e.g. eye, hearing or speech therapy, or "No referral made.\""""),
        codes=False,
    ),
    TemplateDef(
        "Nursing note (VIPS)", NORDIC, "Swedish nursing documentation using the VIPS keywords.",
        ["Reason for contact", "Nursing history", "Nursing status", "Nursing assessment", "Goals", "Nursing actions",
         "Information and teaching", "Outcome", "Plan"],
        nordic("""Produce a nursing note using the VIPS model. Nursing status: use the VIPS keywords that apply,
as "Keyword: finding" lines: Communication, Breathing/Circulation, Nutrition, Elimination, Skin/Tissue, Activity,
Sleep, Pain/Senses (with pain score), Psychosocial, Spiritual/Cultural. Goals: agreed with the patient."""),
        codes=False,
    ),
    TemplateDef(
        "Medication review (Läkemedelsgenomgång)", NORDIC, "Simple or in-depth medication review.",
        ["Reason", "Current medication list", "Allergies", "Kidney function and tests", "Drug-related problems",
         "Changes", "Information to the patient", "Follow-up"],
        nordic("""Produce a medication review (läkemedelsgenomgång): simple or in-depth and why. Drug-related
problems: interactions, duplicates and drugs unsuitable for the patient. Changes: each with the reason."""),
        codes=False,
    ),
    TemplateDef(
        "Annual check (Årskontroll)", NORDIC, "Diabetes, hypertension or COPD annual check (NDR-ready).",
        ["Reason for contact", "Since last check", "Lifestyle", "Home readings", "Medication", "Findings", "Results",
         "Assessment", "Action", "Diagnosis", "Next check"],
        nordic("""Produce an annual chronic-disease check. Findings: blood pressure, weight/BMI, foot status,
spirometry as stated. Results: HbA1c, lipids, urine albumin, eGFR. Assessment: whether treatment targets are
met. Diagnosis with the ICD-10-SE code (needed for the national diabetes register)."""),
    ),
]

# ---- 2. international standards -------------------------------------------------------------------------------------
INTERNATIONAL_TEMPLATES: list[TemplateDef] = [
    # General practice
    TemplateDef(
        "History & Physical (H&P)", GENERAL, "Comprehensive new-patient note (HL7 C-CDA History and Physical).",
        ["Chief complaint", "History of present illness", "Past medical & surgical history", "Medications",
         "Allergies", "Family history", "Social history", "Review of systems", "Examination", "Investigations",
         "Assessment", "Plan"],
        clinical("""Produce a full History & Physical.
- Chief complaint: one line, in the patient's words when possible.
- History of present illness: onset, location, duration, character, aggravating/relieving factors, radiation,
  timing and severity (OLDCARTS), with pertinent positives and negatives.
- Medications with dose, route and frequency; allergies with the reaction, or "No known drug allergies" if said.
- Social history: smoking, alcohol, drugs, occupation, living situation and function.
- Review of systems by system, only systems that were asked about.
- Examination: vital signs first, then by system, as "Area: finding" lines.
- Assessment: problem list with ICD-10 codes and the differential. Plan per problem."""),
    ),
    TemplateDef(
        "Problem-based SOAP (multiple issues)", GENERAL, "One SOAP block per problem when a visit covers several issues.",
        ["Summary of the visit", "Problems", "Safety-netting", "Follow-up"],
        clinical("""The patient raised several problems. In "Problems", write one block per problem, each starting
with a line "Problem N: <name> (<ICD-10 code>)" followed by lines "S: ...", "O: ...", "A: ..." and "P: ..." (the plan
may be several "- " bullet lines). "Summary of the visit" is a two-sentence overview. Safety-netting and
Follow-up cover the whole visit."""),
    ),
    TemplateDef(
        "Telephone / video consultation", GENERAL, "Remote consultation with modality, consent and safety-netting.",
        ["Consultation details", "Current", "Observations available", "Assessment", "Plan", "Safety-netting",
         "Follow-up"],
        clinical("""Produce a remote (telephone or video) consultation note.
- Consultation details: audio or video, who took part and their relationship to the patient, identity check,
  the patient's location and consent to a remote consultation, as stated.
- Observations available: readings the patient reported (e.g. home blood pressure, temperature) and what was seen
  on video; state that no physical examination was possible.
- Safety-netting is required: specific warning signs and when to call back or be seen face to face."""),
    ),
    TemplateDef(
        "Follow-up / progress note", GENERAL, "Return visit: progress since last time, response to treatment.",
        ["Since last visit", "Current status", "Findings", "Results", "Assessment", "Plan", "Next review"],
        clinical("""Produce a follow-up note. Since last visit: response to treatment, side effects, adherence and
new symptoms. Assessment: each problem with ICD-10 code and whether it is improving, stable or worse. Plan:
changes to treatment and what continues."""),
    ),
    TemplateDef(
        "Chronic disease review", GENERAL, "Diabetes, hypertension, asthma/COPD or heart failure annual review.",
        ["Conditions reviewed", "Symptoms and control", "Self-monitoring", "Measurements", "Medication and adherence",
         "Lifestyle", "Complications screening", "Patient goals", "Assessment", "Plan and recall"],
        clinical("""Produce a long-term condition review (e.g. diabetes, hypertension, asthma, COPD).
- Symptoms and control: e.g. hypoglycaemia, asthma symptom control, exacerbations and oral steroid courses,
  inhaler technique.
- Self-monitoring: home blood pressure, glucose or peak flow readings reported.
- Measurements: blood pressure, weight/BMI, HbA1c, lipids, eGFR/ACR, foot check, retinal screening, as stated.
- Lifestyle: smoking, diet, activity, alcohol. Patient goals: what the patient wants to achieve.
- Plan and recall: changes, tests and the date of the next review."""),
    ),
    TemplateDef(
        "Structured medication review", GENERAL, "Review of all medicines (polypharmacy), NHS England SMR.",
        ["Reason for review", "Current medicines", "Patient priorities", "Adherence and practical issues",
         "Effectiveness and side effects", "Monitoring", "Decisions", "Follow-up"],
        clinical("""Produce a structured medication review.
- Current medicines: one line each: name, dose, route, frequency and what it is for.
- Decisions: one line per medicine changed: started / stopped / changed / continued, with the reason and the
  patient's agreement (shared decision)."""),
        codes=False,
    ),
    # Hospital & emergency
    TemplateDef(
        "Emergency department note", HOSPITAL, "ED / urgent care note with medical decision making (MDM).",
        ["Arrival and chief complaint", "History of present illness", "Past history, medication, allergies",
         "Examination", "ED course", "Results", "Medical decision making", "Diagnosis", "Disposition",
         "Discharge advice"],
        clinical("""Produce an emergency department note.
- Arrival and chief complaint: how the patient arrived and why.
- History: timing, and red-flag symptoms the patient denied.
- Examination: vital signs (with times when stated), then by system.
- ED course: treatment given (drug, dose, route, time) and reassessments.
- Medical decision making: the differential considered, data reviewed (tests, imaging, records) and the risk.
- Diagnosis with ICD-10 codes. Disposition: discharged, admitted or transferred.
- Discharge advice: return precautions as specific warning signs."""),
    ),
    TemplateDef(
        "Discharge summary", HOSPITAL, "Hospital discharge summary for the GP (PRSB / HL7 C-CDA).",
        ["Reason for admission", "Diagnoses", "Procedures", "Hospital course", "Results", "Medication on discharge",
         "Allergies", "Information given to the patient", "Actions for the GP", "Follow-up"],
        clinical("""Produce a discharge summary.
- Diagnoses: primary and secondary, each with ICD-10 code.
- Hospital course: a short clinical summary of what happened.
- Results: key results; flag results still pending and who will follow them up.
- Medication on discharge: each medicine, marking new / changed / stopped and why.
- Actions for the GP: each requested action with who does it and when."""),
    ),
    TemplateDef(
        "ISBAR handover", HOSPITAL, "Structured clinical handover / escalation (ISBAR).",
        ["Identify", "Situation", "Background", "Assessment", "Recommendation"],
        clinical("""Produce an ISBAR handover.
- Identify: who is handing over, to whom, and the patient.
- Situation: why the call or handover is happening, in one or two lines.
- Background: reason for admission and relevant history.
- Assessment: current observations, early-warning score and the clinician's impression.
- Recommendation: the specific request and timeframe, and any read-back agreed."""),
        codes=False,
    ),
    TemplateDef(
        "Specialist consultation (response to referral)", HOSPITAL, "Specialist opinion answering a referral question.",
        ["Reason for referral", "History", "Past history, medication, allergies", "Examination", "Results reviewed",
         "Impression", "Recommendations", "Follow-up"],
        clinical("""Produce a specialist consultation note in reply to a referral. Reason for referral: the question
the referrer asked. Impression: diagnoses with ICD-10 codes and a direct answer to that question.
Recommendations: numbered, each saying who should do it. Follow-up: ongoing follow-up or discharge back to the
referrer."""),
    ),
    # Surgery
    TemplateDef(
        "Pre-operative assessment", SURGERY, "Fitness for surgery and anaesthesia (NICE NG45).",
        ["Planned procedure", "Comorbidities", "Functional capacity", "Anaesthetic history", "Airway",
         "Medication and peri-operative instructions", "Allergies", "Smoking and alcohol", "Findings", "ASA grade",
         "Tests requested", "Risks discussed", "Fasting instructions"],
        clinical("""Produce a pre-operative assessment. Anaesthetic history: previous anaesthetics and family
history of problems (e.g. nausea, malignant hyperthermia). Medication: include anticoagulants and diabetes
medicines with what to do before surgery. ASA grade only if the clinician stated it."""),
    ),
    TemplateDef(
        "Procedure note", SURGERY, "Minor or bedside procedure (HL7 C-CDA Procedure Note).",
        ["Procedure", "Indication", "Consent", "Safety check", "Anaesthesia", "Description", "Findings",
         "Specimens", "Complications", "Blood loss", "Post-procedure diagnosis", "Aftercare"],
        clinical("""Produce a procedure note. Consent: risks discussed and consent given, as stated. Anaesthesia:
agent and dose. Description: site, technique and equipment. Complications: write "None" only if the clinician
said there were none."""),
    ),
    TemplateDef(
        "Operative note", SURGERY, "Operation note with Joint Commission minimum elements.",
        ["Surgeon and assistants", "Pre-operative diagnosis", "Post-operative diagnosis", "Procedure performed",
         "Indications", "Anaesthesia", "Findings", "Procedure description", "Estimated blood loss", "Specimens",
         "Implants and drains", "Complications", "Condition and disposition", "Post-operative plan"],
        clinical("""Produce an operative note from the surgeon's dictation. Keep the procedure description in
steps. Diagnoses with ICD-10 codes. Write "Not discussed" for any element not stated; never assume none."""),
    ),
    # Mental health
    TemplateDef(
        "Therapy session note (DAP)", MENTAL, "Psychotherapy / counselling session: Data, Assessment, Plan.",
        ["Session details", "Data", "Assessment", "Risk", "Plan"],
        clinical("""Produce a DAP therapy session note. Session details: type of session and duration, if said.
Data: what the client reported and what was observed. Assessment: the clinician's interpretation and progress
towards goals. Risk: suicidal thoughts, self-harm or harm to others; "Not discussed" if not covered. Plan:
homework and the next session."""),
    ),
    TemplateDef(
        "Behavioural health note (BIRP)", MENTAL, "Behaviour, Intervention, Response, Plan.",
        ["Behaviour", "Intervention", "Response", "Risk", "Plan"],
        clinical("""Produce a BIRP note. Behaviour: presentation and what the client reported. Intervention: the
techniques used (e.g. CBT, motivational interviewing). Response: how the client responded. Risk as reported.
Plan: next steps and next session."""),
    ),
    # Women's & children's health
    TemplateDef(
        "Antenatal visit", WOMEN_CHILD, "Pregnancy check (NICE NG201).",
        ["Gestation and history", "Since last visit", "Mood and wellbeing", "Observations", "Abdominal examination",
         "Results", "Assessment", "Plan", "Advice given", "Next appointment"],
        clinical("""Produce an antenatal visit note. Gestation and history: weeks + days and gravida/para.
Since last visit: fetal movements, bleeding, pain, headache or visual disturbance, fluid loss. Observations:
blood pressure and urine. Abdominal examination: symphysis-fundal height, presentation and fetal heart, as
stated. Include vaccinations offered and warning signs explained."""),
    ),
    TemplateDef(
        "Well-child check", WOMEN_CHILD, "Child health surveillance (AAP Bright Futures).",
        ["Age and visit", "Parent concerns", "Feeding, sleep and elimination", "Growth", "Development",
         "Examination", "Immunisations", "Screening", "Advice given", "Next check"],
        clinical("""Produce a well-child check note. Growth: weight, length/height and head circumference with
centiles, as stated. Development: gross motor, fine motor, language and social milestones. Advice given: safety,
safe sleep and nutrition guidance discussed."""),
    ),
    # Nursing & allied health
    TemplateDef(
        "Nursing note (SOAPIE)", ALLIED, "Subjective, Objective, Assessment, Plan, Intervention, Evaluation.",
        ["Subjective", "Objective", "Assessment", "Plan", "Intervention", "Evaluation"],
        clinical("""Produce a nursing SOAPIE note. Assessment: the nursing assessment / nursing problem.
Intervention: what was done, with times when stated. Evaluation: how the patient responded."""),
        codes=False,
    ),
    TemplateDef(
        "Dietitian note (ADIME)", ALLIED, "Assessment, Diagnosis (PES), Intervention, Monitoring & Evaluation.",
        ["Assessment", "Nutrition diagnosis", "Intervention", "Monitoring and evaluation"],
        clinical("""Produce an ADIME dietetic note. Assessment: anthropometrics, biochemistry, clinical findings
and diet history. Nutrition diagnosis as a PES statement (problem related to cause as shown by signs).
Intervention: advice and goals. Monitoring and evaluation: what will be measured and when."""),
        codes=False,
    ),
    # Letters & documents
    TemplateDef(
        "Referral letter", LETTERS, "Full referral letter to a specialist (RACGP / HL7 Referral Note).",
        ["Recipient and urgency", "Reason for referral", "History and findings", "Investigations",
         "Management tried", "Past history, medication and allergies", "Social and functional context",
         "Patient informed"],
        clinical("""Write a referral letter to a specialist in a professional letter tone, using the sections as
headings. Reason for referral: the specific question and the outcome hoped for. Patient informed: whether the
patient knows about and agrees to the referral, as stated."""),
    ),
    TemplateDef(
        "Clinic letter to GP", LETTERS, "Outpatient letter to the GP (PRSB outpatient letter standard).",
        ["Diagnoses", "Clinical summary", "Medication changes", "Allergies", "Results", "Information given to the patient",
         "Actions for the GP", "Follow-up"],
        clinical("""Write an outpatient clinic letter from the specialist to the patient's GP (copied to the
patient). Medication changes: started / stopped / changed, with doses and reasons. Actions for the GP: each with
who is responsible and when (e.g. "- GP to repeat kidney function in 2 weeks"). Follow-up: next clinic or
discharge back to the GP."""),
    ),
    TemplateDef(
        "After-visit summary (for the patient)", LETTERS, "Plain-language summary for the patient to take home.",
        ["Why you came", "What we found", "What it means", "Your medicines", "Tests and referrals", "What you can do",
         "When to get help urgently", "Next appointment"],
        clinical("""Write a summary FOR THE PATIENT, addressed to them as "you", in plain everyday words a
12-year-old could understand. No medical jargon or abbreviations, and no ICD-10 codes. Your medicines: name, how
much and how to take it, and anything stopped. When to get help urgently: clear warning signs and who to
contact. Keep every fact exactly as discussed."""),
        codes=False,
    ),
]

# Everything after the company's own list, in display order
STANDARD_TEMPLATES: list[TemplateDef] = [*NORDIC_TEMPLATES, *INTERNATIONAL_TEMPLATES]
