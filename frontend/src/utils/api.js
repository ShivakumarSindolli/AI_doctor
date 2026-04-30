export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const detail = typeof data === "string" ? data : data?.detail || "Request failed.";
    throw new Error(detail);
  }
  return data;
}

export function getAudioUrl(payload) {
  if (!payload) return "";
  if (payload.audio_url) return `${API_BASE}${payload.audio_url}`;
  if (payload.audio_path) {
    const clean = payload.audio_path.split(/[\\/]/).pop();
    return `${API_BASE}/audio/${clean}`;
  }
  return "";
}

export function uid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function formatDate(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function buildRecordSummary(record) {
  const topCondition = record?.diagnosis?.differential_diagnosis?.[0]?.condition;
  return topCondition || record.specialist || "Consultation";
}

export function getUrgencyColor(urgency) {
  const u = (urgency || "").toLowerCase();
  if (u === "emergency" || u === "urgent") return "#ef4444";
  if (u === "moderate") return "#f59e0b";
  return "#22c55e";
}

export function getUrgencyLabel(urgency) {
  const u = (urgency || "").toLowerCase();
  if (u === "emergency") return "🔴 Emergency";
  if (u === "urgent") return "🔴 Urgent";
  if (u === "moderate") return "🟡 Moderate";
  return "🟢 Routine";
}

export const GENDERS = ["Male", "Female", "Other"];
export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

// ── Multilingual support ────────────────────────────────────────────────────
export const LANGUAGES = [
  { code: "en", name: "English",  native: "English",  flag: "🇬🇧" },
  { code: "hi", name: "Hindi",    native: "हिन्दी",    flag: "🇮🇳" },
  { code: "kn", name: "Kannada",  native: "ಕನ್ನಡ",    flag: "🇮🇳" },
  { code: "mr", name: "Marathi",  native: "मराठी",     flag: "🇮🇳" },
];

export function getLanguageLabel(code) {
  const lang = LANGUAGES.find((l) => l.code === code);
  return lang ? lang.native : code;
}

// ── Likelihood string → percentage for display ─────────────────────────────
const LIKELIHOOD_TO_PCT = {
  high: 85,
  medium: 55,
  moderate: 55,
  low: 25,
};

/**
 * Convert a likelihood value (string or number) to a display percentage.
 * Handles: "high", "medium", "low", numeric 0-1, numeric 0-100, "75%", etc.
 */
export function likelihoodToPercent(likelihood) {
  if (likelihood == null) return 50;
  if (typeof likelihood === "number") {
    return likelihood <= 1 ? Math.round(likelihood * 100) : Math.round(likelihood);
  }
  const s = String(likelihood).trim().toLowerCase();
  // "75%" → 75
  if (s.endsWith("%")) {
    const n = parseFloat(s);
    return isNaN(n) ? 50 : Math.round(n);
  }
  // "high" / "medium" / "low"
  if (LIKELIHOOD_TO_PCT[s] !== undefined) return LIKELIHOOD_TO_PCT[s];
  // Try parsing as a bare number
  const n = parseFloat(s);
  if (!isNaN(n)) return n <= 1 ? Math.round(n * 100) : Math.round(n);
  return 50;
}

// Specialist directory for AI appointment booking
// Keys MUST match the triage_agent.py SPECIALTIES list exactly
export const SPECIALISTS = {
  dermatology: [
    { id: "dr-1", name: "Dr. Priya Sharma", title: "Senior Dermatologist", rating: 4.9, reviews: 342, exp: "15 yrs", hospital: "Apollo Skin Clinic", fee: "₹120", avatar: "PS", available: true },
    { id: "dr-2", name: "Dr. Rajesh Kumar", title: "Consultant Dermatologist", rating: 4.7, reviews: 218, exp: "12 yrs", hospital: "Fortis Derma Center", fee: "₹95", avatar: "RK", available: true },
  ],
  cardiology: [
    { id: "dr-3", name: "Dr. Anand Mehta", title: "Interventional Cardiologist", rating: 4.9, reviews: 512, exp: "20 yrs", hospital: "Max Heart Institute", fee: "₹200", avatar: "AM", available: true },
    { id: "dr-4", name: "Dr. Sneha Patel", title: "Cardiac Electrophysiologist", rating: 4.8, reviews: 289, exp: "14 yrs", hospital: "Narayana Health", fee: "₹180", avatar: "SP", available: true },
  ],
  neurology: [
    { id: "dr-5", name: "Dr. Vikram Singh", title: "Senior Neurologist", rating: 4.8, reviews: 376, exp: "18 yrs", hospital: "AIIMS Neuro Wing", fee: "₹175", avatar: "VS", available: true },
  ],
  orthopedics: [
    { id: "dr-9", name: "Dr. Arjun Reddy", title: "Orthopedic Surgeon", rating: 4.9, reviews: 445, exp: "16 yrs", hospital: "Joint & Spine Hospital", fee: "₹160", avatar: "AR", available: true },
  ],
  gastroenterology: [
    { id: "dr-12", name: "Dr. Ramesh Iyer", title: "Senior Gastroenterologist", rating: 4.8, reviews: 310, exp: "17 yrs", hospital: "Apollo GI Center", fee: "₹155", avatar: "RI", available: true },
    { id: "dr-13", name: "Dr. Fatima Sheikh", title: "Consultant Gastroenterologist", rating: 4.7, reviews: 226, exp: "11 yrs", hospital: "Fortis Digestive Care", fee: "₹130", avatar: "FS", available: true },
  ],
  pulmonology: [
    { id: "dr-14", name: "Dr. Anil Kapoor", title: "Senior Pulmonologist", rating: 4.8, reviews: 287, exp: "19 yrs", hospital: "Lung Care Institute", fee: "₹165", avatar: "AK", available: true },
    { id: "dr-15", name: "Dr. Meera Joshi", title: "Consultant Pulmonologist", rating: 4.6, reviews: 192, exp: "10 yrs", hospital: "Max Respiratory Center", fee: "₹135", avatar: "MJ", available: true },
  ],
  psychiatry: [
    { id: "dr-16", name: "Dr. Sanjay Gupta", title: "Senior Psychiatrist", rating: 4.9, reviews: 398, exp: "20 yrs", hospital: "MindCare Clinic", fee: "₹175", avatar: "SG", available: true },
    { id: "dr-17", name: "Dr. Anjali Das", title: "Clinical Psychiatrist", rating: 4.7, reviews: 245, exp: "12 yrs", hospital: "Fortis Mental Wellness", fee: "₹145", avatar: "AD", available: true },
  ],
  ophthalmology: [
    { id: "dr-10", name: "Dr. Nisha Gupta", title: "Senior Ophthalmologist", rating: 4.7, reviews: 312, exp: "14 yrs", hospital: "Clear Vision Eye Clinic", fee: "₹110", avatar: "NG", available: true },
  ],
  ent: [
    { id: "dr-18", name: "Dr. Karthik Nair", title: "Senior ENT Specialist", rating: 4.8, reviews: 329, exp: "15 yrs", hospital: "ENT & Allergy Center", fee: "₹130", avatar: "KN", available: true },
    { id: "dr-19", name: "Dr. Pooja Malhotra", title: "Consultant ENT Surgeon", rating: 4.6, reviews: 198, exp: "11 yrs", hospital: "Apollo ENT Wing", fee: "₹115", avatar: "PM", available: true },
  ],
  endocrinology: [
    { id: "dr-8", name: "Dr. Kavita Rao", title: "Endocrinologist", rating: 4.8, reviews: 201, exp: "13 yrs", hospital: "Thyroid & Diabetes Center", fee: "₹150", avatar: "KR", available: true },
    { id: "dr-20", name: "Dr. Nikhil Sharma", title: "Senior Endocrinologist", rating: 4.7, reviews: 267, exp: "15 yrs", hospital: "Max Endocrine Clinic", fee: "₹160", avatar: "NS", available: true },
  ],
  urology: [
    { id: "dr-21", name: "Dr. Raghav Menon", title: "Senior Urologist", rating: 4.8, reviews: 356, exp: "16 yrs", hospital: "Kidney & Urology Hospital", fee: "₹155", avatar: "RM", available: true },
    { id: "dr-22", name: "Dr. Deepa Krishnan", title: "Consultant Urologist", rating: 4.7, reviews: 214, exp: "12 yrs", hospital: "Apollo Urology Center", fee: "₹140", avatar: "DK", available: true },
  ],
  general: [
    { id: "dr-6", name: "Dr. Sarah Chen", title: "General Physician", rating: 4.6, reviews: 198, exp: "10 yrs", hospital: "MediAI Primary Care", fee: "₹75", avatar: "SC", available: true },
    { id: "dr-7", name: "Dr. Mohammad Ali", title: "Family Medicine", rating: 4.7, reviews: 264, exp: "12 yrs", hospital: "City Health Center", fee: "₹80", avatar: "MA", available: true },
  ],
  emergency: [
    { id: "dr-11", name: "Dr. Amit Verma", title: "Emergency Medicine", rating: 4.9, reviews: 523, exp: "17 yrs", hospital: "City Trauma Center", fee: "₹250", avatar: "AV", available: true },
  ],
};

export function getSpecialistsForType(specialty) {
  const key = (specialty || "general").toLowerCase();
  return SPECIALISTS[key] || SPECIALISTS.general;
}

export function generateTimeSlots() {
  const slots = [];
  const now = new Date();
  for (let d = 1; d <= 5; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const dayStr = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const times = ["09:00 AM", "10:30 AM", "11:00 AM", "02:00 PM", "03:30 PM", "04:00 PM", "05:30 PM"];
    const available = times.filter(() => Math.random() > 0.3);
    if (available.length > 0) slots.push({ date: dayStr, dateISO: date.toISOString(), times: available });
  }
  return slots;
}
