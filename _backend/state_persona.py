from typing import TypedDict, Optional, Literal

class PersonaState(TypedDict, total=False):
    # 🔹 Demographics
    age: Optional[int]  # years
    sex_at_birth: Optional[Literal["male", "female", "other"]]
    race: Optional[str]
    culture: Optional[str]
    marital_status: Optional[str]

    # 🔹 Body Measurements
    weight_kg: Optional[float]
    height_cm: Optional[float]
    waist_circumference_cm: Optional[float]
    BMI: Optional[float]

    # 🔹 Lab Test Results
    total_cholesterol_mg_dl: Optional[float]
    triglyceride_mg_dl: Optional[float]
    HbA1c_percent: Optional[float]
    # <5.7% normal; 5.7–6.4% pre-diabetes; ≥6.5% diabetes diagnosis :contentReference[oaicite:2]{index=2}
    glucose_plasma_mg_dl: Optional[float]
    blood_pressure_systolic: Optional[float]
    blood_pressure_diastolic: Optional[float]
    LDL_mg_dl: Optional[float]
    insulin_status: Optional[bool]
    BUN_mg_dl: Optional[float]
    uric_acid_mg_dl: Optional[float]
    creatinine_mg_dl: Optional[float]

    # 🔹 Medication Usage
    on_lipid_med: Optional[bool]
    on_diabetic_medication: Optional[Literal["insulin", "oral", "none"]]
    on_bp_medication: Optional[bool]

    # 🔹 Medication Usage
    # e.g., HCTZ, Enalapril, ASA, Advair, ProAir, etc.
    medication_usage: Optional[list[str]]

    # 🔹 Chronic Conditions
    # e.g., COPD, HTN, DM, Hyperlipidemia, Depression, Anxiety, Sleep_Apnea, etc.
    chronic_conditions: Optional[list[str]]
    # 🔹 Diabetes Diagnosis
    diabetes_status: Literal["healthy", "pre-diabetes", "diabetes"]

    # 🔹 Health Status
    history_hypertension: Optional[bool]
    history_gestational_diabetes: Optional[bool]
    physical_activity_level: Optional[Literal["low", "moderate", "high"]]
    perceived_diabetes_risk: Optional[str]  # e.g. "high", "low"

    # 🔹 Family History
    family_history_diabetes: Optional[bool]

    # 🔹 Health Behavior
    tobacco_use: Optional[bool]
    tobacco_use_details: Optional[str]
    tabacco_pack_years: Optional[int]
    alcohol_consumption: Optional[str]  # e.g. "occasional", "regular"
    sleep_hours: Optional[float]
    diet_score: Optional[float]  # e.g. from validated diet survey
    physical_activity_level: Optional[Literal["low", "moderate", "high"]]

    # 🔹 Social Determinants of Health (SDOH)
    income_status: Optional[str]  # e.g. "below_poverty", "above_poverty"
    education: Optional[str]  # e.g. "high_school", "college", etc.

    # 🔹 Healthcare Access & Utilization
    insurance_type: Optional[Literal["none", "government", "medicaid", "private"]]
    has_healthcare_access: Optional[bool]

    goals: Optional[str]