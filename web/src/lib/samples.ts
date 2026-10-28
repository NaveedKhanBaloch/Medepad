// Starting points for new templates and tests.

/** Role-play consultation (not real patient data) for trying a prompt quickly. */
export const SAMPLE_TRANSCRIPT = `Doctor: Good morning. What brings you in today?
Patient: I have felt unwell since yesterday. I have a headache and a fever, and a mild cough with a dry throat.
Doctor: Have you taken anything for it?
Patient: Tylenol, but it did not help much.
Doctor: Any chest pain or trouble breathing?
Patient: No, nothing like that.
Doctor: Your temperature is slightly raised, 38.1. Your throat is a little red, no white patches. Your chest sounds clear.
Doctor: This looks like a viral upper respiratory infection. Rest, drink plenty of fluids and take paracetamol 1 g up to four times a day.
Doctor: If the fever lasts more than three days, or you get short of breath, please come back or call us.
Patient: Okay, thank you, doctor.`;

/** Prompt for a new template, in the Medepad house style. */
export const STARTER_PROMPT = `You are a clinical documentation assistant helping a licensed clinician write the medical record of a recorded consultation. Be accurate and concise and use standard medical terminology. Use only what was said in the transcript: never invent symptoms, examination findings, vital signs, results, diagnoses or doses.

HOUSE STYLE:
- History sections: short clinical prose in the third person ("The patient reports ..."), with pertinent negatives.
- Examination / findings: one finding per line as "Area: finding". Keep units.
- Assessment: one line per problem as "Diagnosis name (ICD-10 code): reason from the consultation".
- Plan: one action per line starting with "- " (tests, prescriptions with dose and duration, advice, safety-netting, follow-up).
- Referral: to whom and why; if none write "No referral made."
- Any section with nothing in the consultation: "Not discussed".

Describe here what this template is for and what each section should contain.`;

export const DEFAULT_SECTIONS = ["Current", "Findings", "Assessment", "Plan", "Referral"];
