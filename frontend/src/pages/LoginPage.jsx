import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../api/client";
import { Button, Card } from "../components/UI";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const { user, devLogin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  useEffect(() => {
    // In dev mode, fetch available users for quick login
    api.get("/auth/status/").then((data) => {
      if (data.authenticated) navigate("/");
    });
    // Try to get user list (won't work until logged in as manager, that's OK)
    fetch("/api/users/?format=json", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((data) => setUsers(data.results || []))
      .catch(() => {});
  }, []);

  const handleDevLogin = async (username) => {
    setLoading(true);
    try {
      await devLogin(username);
      navigate("/");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const demoUsers = [
    { username: "manager1", label: "שרה כהן", role: "מנהלת" },
    { username: "teamlead1", label: "דוד לוי", role: "אחראי משמרת" },
    { username: "senior1", label: "יוסי מזרחי", role: "טכנאי בכיר" },
    { username: "tech1", label: "רונית אברהם", role: "טכנאי" },
    { username: "tech2", label: "עמית פרץ", role: "טכנאי" },
    { username: "tech3", label: "מיכל גולן", role: "טכנאי" },
    { username: "tech4", label: "אורי שלום", role: "טכנאי" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Sushi</h1>
          <p className="text-slate-500">SUpervisor of SHIfts — ניהול משמרות</p>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">כניסה למערכת</h2>
          <p className="text-sm text-slate-500 mb-6">מצב פיתוח — בחר משתמש להתחברות</p>

          <div className="space-y-3">
            {demoUsers.map((u) => (
              <button
                key={u.username}
                onClick={() => handleDevLogin(u.username)}
                disabled={loading}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 transition-colors text-right disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                  {u.label[0]}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{u.label}</p>
                  <p className="text-xs text-slate-500">{u.role}</p>
                </div>
                <LogIn size={18} className="text-slate-400" />
              </button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              בסביבת ייצור, הכניסה תהיה דרך OIDC (Keycloak / Entra ID)
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
