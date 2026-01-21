"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, X, Star } from "lucide-react";
import { fetchUserPreferences, saveUserPreferences } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import {
  getCachedPreferences,
  setCachedPreferences,
} from "~/lib/userPreferencesStore";

type PersonaState = {
  // Demographics
  age?: number | null;
  sex_at_birth?: "male" | "female" | "other" | null;
  race?: string | null;
  culture?: string | null;
  marital_status?: string | null;

  // Body Measurements
  weight_kg?: number | null;
  height_cm?: number | null;
  waist_circumference_cm?: number | null;
  BMI?: number | null;

  // Lab Test Results
  total_cholesterol_mg_dl?: number | null;
  triglyceride_mg_dl?: number | null;
  HbA1c_percent?: number | null;
  glucose_plasma_mg_dl?: number | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  LDL_mg_dl?: number | null;
  insulin_status?: boolean | null;
  BUN_mg_dl?: number | null;
  uric_acid_mg_dl?: number | null;
  creatinine_mg_dl?: number | null;

  // Medication Usage
  on_lipid_med?: boolean | null;
  on_diabetic_medication?: "insulin" | "oral" | "none" | null;
  on_bp_medication?: boolean | null;
  medication_usage?: string[] | null;

  // Chronic Conditions
  chronic_conditions?: string[] | null;
  diabetes_status?: "healthy" | "pre-diabetes" | "diabetes";

  // Health Status
  history_hypertension?: boolean | null;
  history_gestational_diabetes?: boolean | null;
  physical_activity_level?: "low" | "moderate" | "high" | null;
  perceived_diabetes_risk?: string | null;

  // Family History
  family_history_diabetes?: boolean | null;

  // Health Behavior
  tobacco_use?: boolean | null;
  tobacco_use_details?: string | null;
  tabacco_pack_years?: number | null;
  alcohol_consumption?: string | null;
  sleep_hours?: number | null;
  diet_score?: number | null;

  // Social Determinants
  income_status?: string | null;
  education?: string | null;

  // Healthcare Access
  insurance_type?: "none" | "government" | "medicaid" | "private" | null;
  has_healthcare_access?: boolean | null;

  goals?: string | null;
};

const emptyPersona: PersonaState = {
  age: null,
  sex_at_birth: null,
  race: null,
  culture: null,
  marital_status: null,
  weight_kg: null,
  height_cm: null,
  waist_circumference_cm: null,
  BMI: null,
  total_cholesterol_mg_dl: null,
  triglyceride_mg_dl: null,
  HbA1c_percent: null,
  glucose_plasma_mg_dl: null,
  blood_pressure_systolic: null,
  blood_pressure_diastolic: null,
  LDL_mg_dl: null,
  insulin_status: null,
  BUN_mg_dl: null,
  uric_acid_mg_dl: null,
  creatinine_mg_dl: null,
  on_lipid_med: null,
  on_diabetic_medication: null,
  on_bp_medication: null,
  medication_usage: [],
  chronic_conditions: [],
  diabetes_status: "healthy",
  history_hypertension: null,
  history_gestational_diabetes: null,
  physical_activity_level: null,
  perceived_diabetes_risk: null,
  family_history_diabetes: null,
  tobacco_use: null,
  tobacco_use_details: null,
  tabacco_pack_years: null,
  alcohol_consumption: null,
  sleep_hours: null,
  diet_score: null,
  income_status: null,
  education: null,
  insurance_type: null,
  has_healthcare_access: null,
  goals: null,
};

const fetchedUserIds = new Set<string>();

type SectionProps = {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

function Section({ title, isOpen, onToggle, children }: SectionProps) {
  return (
    <div className="border-b border-slate-700">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-400">◆</span>
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {isOpen && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

export default function UserPersona() {
  const { user } = useAuth();
  const [persona, setPersona] = useState<PersonaState>(emptyPersona);
  const [goals, setGoals] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<Record<string, boolean>>({
    demographics: true,
    bodyMeasurements: true,
    labTests: true,
    chronicConditions: true,
    healthStatus: true,
    healthBehavior: true,
    healthcareAccess: true,
    goals: true,
  });

  useEffect(() => {
    if (!user?.id) return;
    const cached = getCachedPreferences(user.id);
    if (cached?.persona) {
      setPersona(cached.persona as PersonaState);
      setGoals(cached.goals || "");
      setLoading(false);
    }
    if (!fetchedUserIds.has(user.id)) {
      fetchedUserIds.add(user.id);
      loadPreferences(user.id, !!cached);
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const loadPreferences = async (userId: string, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const result = await fetchUserPreferences();
      if (result.ok && result.preferences) {
        const nextPersona = result.preferences.persona || emptyPersona;
        const nextGoals = result.preferences.goals || "";
        setPersona(nextPersona);
        setGoals(nextGoals);
        setCachedPreferences({
          userId,
          persona: nextPersona,
          goals: nextGoals,
          updatedAt: Date.now(),
        });
      }
    } catch (error) {
      console.error("Failed to load preferences:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const result = await saveUserPreferences({ persona, goals: goals || null });
      if (result.ok) {
        if (user?.id) {
          setCachedPreferences({
            userId: user.id,
            persona,
            goals: goals || null,
            updatedAt: Date.now(),
          });
        }
        // Show success feedback
        const saveBtn = document.getElementById("save-persona-btn");
        if (saveBtn) {
          const originalText = saveBtn.textContent;
          saveBtn.textContent = "Saved!";
          setTimeout(() => {
            if (saveBtn) saveBtn.textContent = originalText;
          }, 2000);
        }
      } else {
        alert(`Failed to save: ${result.error}`);
      }
    } catch (error) {
      console.error("Failed to save preferences:", error);
      alert("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const updatePersona = (field: keyof PersonaState, value: any) => {
    setPersona((prev) => ({ ...prev, [field]: value }));
  };

  const addChronicCondition = (condition: string) => {
    if (!condition.trim()) return;
    setPersona((prev) => ({
      ...prev,
      chronic_conditions: [...(prev.chronic_conditions || []), condition.trim()],
    }));
  };

  const removeChronicCondition = (index: number) => {
    setPersona((prev) => ({
      ...prev,
      chronic_conditions: (prev.chronic_conditions || []).filter((_, i) => i !== index),
    }));
  };

  const addMedication = (medication: string) => {
    if (!medication.trim()) return;
    setPersona((prev) => ({
      ...prev,
      medication_usage: [...(prev.medication_usage || []), medication.trim()],
    }));
  };

  const removeMedication = (index: number) => {
    setPersona((prev) => ({
      ...prev,
      medication_usage: (prev.medication_usage || []).filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500 text-sm">Loading persona...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <Section
          title="Demographics"
          isOpen={sections.demographics}
          onToggle={() => setSections((s) => ({ ...s, demographics: !s.demographics }))}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Age</label>
              <input
                type="number"
                value={persona.age || ""}
                onChange={(e) => updatePersona("age", e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                placeholder="35"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Sex at Birth</label>
              <select
                value={persona.sex_at_birth || ""}
                onChange={(e) => updatePersona("sex_at_birth", e.target.value || null)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Race</label>
              <input
                type="text"
                value={persona.race || ""}
                onChange={(e) => updatePersona("race", e.target.value || null)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                placeholder="Races..."
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Culture</label>
              <input
                type="text"
                value={persona.culture || ""}
                onChange={(e) => updatePersona("culture", e.target.value || null)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Marital Status</label>
              <select
                value={persona.marital_status || ""}
                onChange={(e) => updatePersona("marital_status", e.target.value || null)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">Select...</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </div>
          </div>
        </Section>

        <Section
          title="Body Measurements"
          isOpen={sections.bodyMeasurements}
          onToggle={() => setSections((s) => ({ ...s, bodyMeasurements: !s.bodyMeasurements }))}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={persona.weight_kg || ""}
                onChange={(e) => updatePersona("weight_kg", e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Height (cm)</label>
              <input
                type="number"
                step="0.1"
                value={persona.height_cm || ""}
                onChange={(e) => updatePersona("height_cm", e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Waist Circumference (cm)</label>
              <input
                type="number"
                step="0.1"
                value={persona.waist_circumference_cm || ""}
                onChange={(e) => updatePersona("waist_circumference_cm", e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">BMI</label>
              <input
                type="number"
                step="0.1"
                value={persona.BMI || ""}
                onChange={(e) => updatePersona("BMI", e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
          </div>
        </Section>

        <Section
          title="Lab Test Results"
          isOpen={sections.labTests}
          onToggle={() => setSections((s) => ({ ...s, labTests: !s.labTests }))}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Total Cholesterol (mg/dL)</label>
              <input
                type="number"
                step="0.1"
                value={persona.total_cholesterol_mg_dl || ""}
                onChange={(e) => updatePersona("total_cholesterol_mg_dl", e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Triglyceride (mg/dL)</label>
              <input
                type="number"
                step="0.1"
                value={persona.triglyceride_mg_dl || ""}
                onChange={(e) => updatePersona("triglyceride_mg_dl", e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">HbA1c (%)</label>
              <input
                type="number"
                step="0.1"
                value={persona.HbA1c_percent || ""}
                onChange={(e) => updatePersona("HbA1c_percent", e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Glucose Plasma (mg/dL)</label>
              <input
                type="number"
                step="0.1"
                value={persona.glucose_plasma_mg_dl || ""}
                onChange={(e) => updatePersona("glucose_plasma_mg_dl", e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Blood Pressure Systolic</label>
              <input
                type="number"
                value={persona.blood_pressure_systolic || ""}
                onChange={(e) => updatePersona("blood_pressure_systolic", e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Blood Pressure Diastolic</label>
              <input
                type="number"
                value={persona.blood_pressure_diastolic || ""}
                onChange={(e) => updatePersona("blood_pressure_diastolic", e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">LDL (mg/dL)</label>
              <input
                type="number"
                step="0.1"
                value={persona.LDL_mg_dl || ""}
                onChange={(e) => updatePersona("LDL_mg_dl", e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Insulin Status</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="radio"
                    name="insulin_status"
                    checked={persona.insulin_status === true}
                    onChange={() => updatePersona("insulin_status", true)}
                    className="w-4 h-4"
                  />
                  Normal
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="radio"
                    name="insulin_status"
                    checked={persona.insulin_status === false}
                    onChange={() => updatePersona("insulin_status", false)}
                    className="w-4 h-4"
                  />
                  Resistant
                </label>
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Chronic Conditions"
          isOpen={sections.chronicConditions}
          onToggle={() => setSections((s) => ({ ...s, chronicConditions: !s.chronicConditions }))}
        >
          <div className="flex flex-wrap gap-2 mb-3">
            {(persona.chronic_conditions || []).map((condition, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded-full"
              >
                {condition}
                <button
                  onClick={() => removeChronicCondition(idx)}
                  className="hover:text-red-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            placeholder="Add condition (e.g., COPD, HTN, DM)"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addChronicCondition(e.currentTarget.value);
                e.currentTarget.value = "";
              }
            }}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
          />
        </Section>

        <Section
          title="Health Status"
          isOpen={sections.healthStatus}
          onToggle={() => setSections((s) => ({ ...s, healthStatus: !s.healthStatus }))}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-300">History Hypertension</label>
              <button
                onClick={() => updatePersona("history_hypertension", !persona.history_hypertension)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  persona.history_hypertension ? "bg-green-500" : "bg-slate-700"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    persona.history_hypertension ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-300">History Gestational Diabetes</label>
              <button
                onClick={() => updatePersona("history_gestational_diabetes", !persona.history_gestational_diabetes)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  persona.history_gestational_diabetes ? "bg-green-500" : "bg-slate-700"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    persona.history_gestational_diabetes ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Physical Activity Level</label>
              <div className="flex gap-4">
                {(["low", "moderate", "high"] as const).map((level) => (
                  <label key={level} className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="radio"
                      name="physical_activity"
                      checked={persona.physical_activity_level === level}
                      onChange={() => updatePersona("physical_activity_level", level)}
                      className="w-4 h-4"
                    />
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Perceived Diabetes Risk</label>
              <div className="flex gap-4">
                {(["high", "low"] as const).map((risk) => (
                  <label key={risk} className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="radio"
                      name="diabetes_risk"
                      checked={persona.perceived_diabetes_risk === risk}
                      onChange={() => updatePersona("perceived_diabetes_risk", risk)}
                      className="w-4 h-4"
                    />
                    {risk.charAt(0).toUpperCase() + risk.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Health Behavior"
          isOpen={sections.healthBehavior}
          onToggle={() => setSections((s) => ({ ...s, healthBehavior: !s.healthBehavior }))}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-300">Tobacco Use</label>
              <button
                onClick={() => updatePersona("tobacco_use", !persona.tobacco_use)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  persona.tobacco_use ? "bg-green-500" : "bg-slate-700"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    persona.tobacco_use ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            {persona.tobacco_use && (
              <>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Details</label>
                  <input
                    type="text"
                    value={persona.tobacco_use_details || ""}
                    onChange={(e) => updatePersona("tobacco_use_details", e.target.value || null)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Pack Years</label>
                  <input
                    type="number"
                    value={persona.tabacco_pack_years || ""}
                    onChange={(e) => updatePersona("tabacco_pack_years", e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Sleep Hours</label>
              <input
                type="number"
                step="0.1"
                value={persona.sleep_hours || ""}
                onChange={(e) => updatePersona("sleep_hours", e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                placeholder="hrs"
              />
            </div>
          </div>
        </Section>

        <Section
          title="Healthcare Access"
          isOpen={sections.healthcareAccess}
          onToggle={() => setSections((s) => ({ ...s, healthcareAccess: !s.healthcareAccess }))}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Insurance Type</label>
              <select
                value={persona.insurance_type || ""}
                onChange={(e) => updatePersona("insurance_type", e.target.value || null)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">Select...</option>
                <option value="none">None</option>
                <option value="government">Government</option>
                <option value="medicaid">Medicaid</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-300">Has Healthcare Access</label>
              <button
                onClick={() => updatePersona("has_healthcare_access", !persona.has_healthcare_access)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  persona.has_healthcare_access ? "bg-green-500" : "bg-slate-700"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    persona.has_healthcare_access ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </Section>

        <Section
          title="Goals"
          isOpen={sections.goals}
          onToggle={() => setSections((s) => ({ ...s, goals: !s.goals }))}
        >
          <div className="relative">
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm min-h-[100px]"
              placeholder="Enter your health goals..."
            />
            <Star className="absolute right-3 top-3 w-4 h-4 text-yellow-400" />
          </div>
        </Section>
      </div>

      <div className="p-4 border-t border-slate-800">
        <button
          id="save-persona-btn"
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
