import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../api/client";
import { LogIn, ChevronLeft } from "lucide-react";

const ROLE_COLORS = {
  "מנהלת": { bg: "bg-rose-500", text: "text-white", border: "border-rose-200", hover: "hover:border-rose-400 hover:bg-rose-50" },
  "אחראי משמרת": { bg: "bg-amber-500", text: "text-white", border: "border-amber-200", hover: "hover:border-amber-400 hover:bg-amber-50" },
  "טכנאי בכיר": { bg: "bg-teal-500", text: "text-white", border: "border-teal-200", hover: "hover:border-teal-400 hover:bg-teal-50" },
  "טכנאי": { bg: "bg-sky-500", text: "text-white", border: "border-sky-200", hover: "hover:border-sky-400 hover:bg-sky-50" },
};

const ROLE_BADGE_COLORS = {
  "מנהלת": "bg-rose-100 text-rose-700",
  "אחראי משמרת": "bg-amber-100 text-amber-700",
  "טכנאי בכיר": "bg-teal-100 text-teal-700",
  "טכנאי": "bg-sky-100 text-sky-700",
};

function SushiLogo({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="32" cy="40" rx="26" ry="16" fill="#FFF5E6" stroke="#E8D5B7" strokeWidth="1.5"/>
      <circle cx="20" cy="38" r="1.2" fill="#E8D5B7" opacity="0.5"/>
      <circle cx="28" cy="43" r="1" fill="#E8D5B7" opacity="0.5"/>
      <circle cx="36" cy="36" r="1.2" fill="#E8D5B7" opacity="0.5"/>
      <circle cx="42" cy="41" r="1" fill="#E8D5B7" opacity="0.5"/>
      <ellipse cx="32" cy="30" rx="22" ry="12" fill="#FF7B54" stroke="#E8653A" strokeWidth="1"/>
      <ellipse cx="26" cy="26" rx="8" ry="4" fill="#FF9B7B" opacity="0.6"/>
      <rect x="28" y="28" width="8" height="24" rx="1" fill="#2D5016" opacity="0.85"/>
      <circle cx="26" cy="30" r="2" fill="#1A1A2E"/>
      <circle cx="38" cy="30" r="2" fill="#1A1A2E"/>
      <circle cx="25.2" cy="29.2" r="0.7" fill="white"/>
      <circle cx="37.2" cy="29.2" r="0.7" fill="white"/>
      <path d="M29 34 Q32 37 35 34" stroke="#1A1A2E" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <ellipse cx="22" cy="33" rx="3" ry="2" fill="#FFB5B5" opacity="0.5"/>
      <ellipse cx="42" cy="33" rx="3" ry="2" fill="#FFB5B5" opacity="0.5"/>
    </svg>
  );
}

export default function LoginPage() {
  const { user, devLogin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(null);

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  useEffect(() => {
    api.get("/auth/status/").then((data) => {
      if (data.authenticated) navigate("/");
    });
  }, []);

  const handleDevLogin = async (username) => {
    setLoading(true);
    setLoadingUser(username);
    try {
      await devLogin(username);
      navigate("/");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
      setLoadingUser(null);
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
    <div className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        background: "linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 30%, #ECFDF5 70%, #F0F9FF 100%)",
      }}
    >
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #FF7B54 0%, transparent 70%)" }} />
        <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #10B981 0%, transparent 70%)" }} />
        <div className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #3B82F6 0%, transparent 70%)" }} />
      </div>

      <div className="w-full max-w-lg relative">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <SushiLogo size={88} />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-green-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.5s", animationDuration: "2s" }} />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight"
            style={{ fontFamily: "'Rubik', 'Heebo', sans-serif" }}
          >
            Sushi
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-light tracking-wide">
            <span className="font-semibold text-orange-500">SU</span>pervisor of
            <span className="font-semibold text-orange-500"> SHI</span>fts
          </p>
          <p className="text-xs text-slate-400 mt-1">ניהול משמרות וצוות תמיכה</p>
        </div>

        {/* Login card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/50 border border-white/60 p-6 animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="text-center mb-5">
            <h2 className="text-lg font-bold text-slate-800">כניסה למערכת</h2>
            <p className="text-xs text-slate-400 mt-1">בחר משתמש להתחברות</p>
          </div>

          <div className="grid gap-2">
            {demoUsers.map((u, i) => {
              const colors = ROLE_COLORS[u.role] || ROLE_COLORS["טכנאי"];
              const badgeColor = ROLE_BADGE_COLORS[u.role] || ROLE_BADGE_COLORS["טכנאי"];
              const isLoading = loadingUser === u.username;

              return (
                <button
                  key={u.username}
                  onClick={() => handleDevLogin(u.username)}
                  disabled={loading}
                  className={`group w-full flex items-center gap-3 p-3 rounded-xl border ${colors.border} ${colors.hover} transition-all duration-200 text-right disabled:opacity-50 animate-fade-in`}
                  style={{ animationDelay: `${0.15 + i * 0.05}s` }}
                >
                  <div className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center font-bold text-sm shadow-sm transition-transform group-hover:scale-105`}>
                    {u.label[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{u.label}</p>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
                      {u.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-300 group-hover:text-slate-500 transition-colors">
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    ) : (
                      <ChevronLeft size={18} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              בסביבת ייצור, הכניסה דרך
              <span className="font-medium text-slate-500 mx-1">OIDC</span>
              (Keycloak / Entra ID)
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-300 mt-6 animate-fade-in"
          style={{ animationDelay: "0.5s" }}
        >
          built with 🍣 and ❤️
        </p>
      </div>
    </div>
  );
}
