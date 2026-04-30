import { createContext, useContext, useState, useEffect } from "react";
import { apiFetch, getAudioUrl } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("ai_doctor_token") || "");
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [appointments, setAppointments] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mediai_appointments") || "[]"); } catch { return []; }
  });
  const [language, setLanguageState] = useState(() => localStorage.getItem("mediai_language") || "en");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => { if (token) hydrate(token); }, []);

  useEffect(() => {
    localStorage.setItem("mediai_appointments", JSON.stringify(appointments));
  }, [appointments]);

  // Persist language selection
  function setLanguage(lang) {
    setLanguageState(lang);
    localStorage.setItem("mediai_language", lang);
  }

  function persistToken(t) {
    setToken(t);
    if (t) localStorage.setItem("ai_doctor_token", t);
    else localStorage.removeItem("ai_doctor_token");
  }

  function addAppointment(appt) {
    setAppointments((prev) => [appt, ...prev]);
  }

  function cancelAppointment(id) {
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: "cancelled" } : a));
  }

  async function hydrate(activeToken = token) {
    setLoading(true);
    try {
      const [profileData, historyData] = await Promise.all([
        apiFetch("/patients/me", { headers: { Authorization: `Bearer ${activeToken}` } }),
        apiFetch("/history/?limit=50", { headers: { Authorization: `Bearer ${activeToken}` } }),
      ]);
      const normalized = (historyData.consultations || []).map((item) => ({
        ...item, audio_player_url: getAudioUrl(item),
      }));
      setProfile(profileData);
      setHistory(normalized);
    } catch (e) { setToast(e.message); } finally { setLoading(false); }
  }

  function logout() { persistToken(""); setProfile(null); setHistory([]); }

  async function login(email, password) {
    const body = new URLSearchParams();
    body.append("username", email);
    body.append("password", password);
    const data = await apiFetch("/auth/login", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body,
    });
    persistToken(data.access_token);
    await hydrate(data.access_token);
    return data;
  }

  async function register(form) {
    const payload = { ...form, age: form.age ? Number(form.age) : null, allergies: form.allergies || null, medications: form.medications || null };
    const data = await apiFetch("/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    persistToken(data.access_token);
    await hydrate(data.access_token);
    return data;
  }

  return (
    <AuthContext.Provider
      value={{ token, profile, setProfile, history, setHistory, appointments, addAppointment, cancelAppointment, language, setLanguage, loading, toast, setToast, login, register, logout, hydrate, persistToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
