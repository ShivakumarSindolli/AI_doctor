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
