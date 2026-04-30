import { createContext, useContext, useState, useEffect } from "react";
import { apiFetch, getAudioUrl } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("ai_doctor_token") || "");
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (token) hydrate(token);
  }, []);

  function persistToken(t) {
    setToken(t);
    if (t) localStorage.setItem("ai_doctor_token", t);
    else localStorage.removeItem("ai_doctor_token");
  }

  async function hydrate(activeToken = token) {
    setLoading(true);
    try {
      const [profileData, historyData] = await Promise.all([
        apiFetch("/patients/me", { headers: { Authorization: `Bearer ${activeToken}` } }),
        apiFetch("/history/?limit=50", { headers: { Authorization: `Bearer ${activeToken}` } }),
      ]);
      const normalized = (historyData.consultations || []).map((item) => ({
        ...item,
        audio_player_url: getAudioUrl(item),
      }));
      setProfile(profileData);
      setHistory(normalized);
    } catch (e) {
      setToast(e.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    persistToken("");
    setProfile(null);
    setHistory([]);
  }

  async function login(email, password) {
    const body = new URLSearchParams();
    body.append("username", email);
    body.append("password", password);
    const data = await apiFetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    persistToken(data.access_token);
    await hydrate(data.access_token);
    return data;
  }

  async function register(form) {
    const payload = {
      ...form,
      age: form.age ? Number(form.age) : null,
      allergies: form.allergies || null,
      medications: form.medications || null,
    };
    const data = await apiFetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    persistToken(data.access_token);
    await hydrate(data.access_token);
    return data;
  }

  return (
    <AuthContext.Provider
      value={{ token, profile, setProfile, history, setHistory, loading, toast, setToast, login, register, logout, hydrate, persistToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
