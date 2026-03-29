import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../api/client";
import { Layout, PageHeader, Card, Badge, LoadingSpinner, EmptyState } from "../components/UI";
import { CalendarDays, Megaphone, BarChart3, ClipboardCheck, Users } from "lucide-react";
import { formatDateHe } from "../utils/dates";

export default function DashboardPage() {
  const { user, hasPerm } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [polls, setPolls] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    Promise.all([
      api.get("/announcements/").catch(() => ({ results: [] })),
      api.get("/polls/").catch(() => ({ results: [] })),
      api.get(`/tasks/?date=${today}`).catch(() => ({ results: [] })),
    ]).then(([annData, pollData, taskData]) => {
      setAnnouncements((annData.results || []).slice(0, 3));
      setPolls((pollData.results || []).slice(0, 3));
      setTasks(taskData.results || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title={`שלום, ${user?.first_name || ""}!`}
        subtitle={`${formatDateHe(today)} — ${user?.role_detail?.name_he || ""}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Announcements */}
        <Card className="p-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone size={20} className="text-brand-600" />
            <h3 className="font-semibold text-slate-900">הודעות אחרונות</h3>
          </div>
          {announcements.length === 0 ? (
            <p className="text-sm text-slate-400">אין הודעות חדשות</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-slate-900 text-sm">{a.title}</h4>
                    {a.is_pinned && <Badge color="yellow">נעוץ</Badge>}
                  </div>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{a.body}</p>
                  <p className="text-xs text-slate-400 mt-2">{a.author_name}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Daily tasks */}
        <Card className="p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-2 mb-4">
            <ClipboardCheck size={20} className="text-green-600" />
            <h3 className="font-semibold text-slate-900">משימות היום</h3>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-400">אין משימות להיום</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    t.is_completed_by_me
                      ? "bg-green-50 border-green-200"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      t.is_completed_by_me
                        ? "border-green-500 bg-green-500"
                        : "border-slate-300"
                    }`}
                  >
                    {t.is_completed_by_me && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-sm ${
                        t.is_completed_by_me
                          ? "text-slate-500 line-through"
                          : "text-slate-900"
                      }`}
                    >
                      {t.title}
                    </p>
                    {t.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{t.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Active polls */}
        <Card className="p-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={20} className="text-purple-600" />
            <h3 className="font-semibold text-slate-900">סקרים פעילים</h3>
          </div>
          {polls.length === 0 ? (
            <p className="text-sm text-slate-400">אין סקרים פעילים</p>
          ) : (
            <div className="space-y-3">
              {polls.map((p) => (
                <div key={p.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="font-medium text-slate-900 text-sm">{p.question}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-slate-500">
                      {p.total_voters} הצביעו
                    </span>
                    <span className="text-xs text-slate-500">
                      {p.options?.length} אפשרויות
                    </span>
                    {p.my_votes?.length > 0 && (
                      <Badge color="green">הצבעת</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick stats for managers */}
        {hasPerm("manage_schedule") && (
          <Card className="p-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center gap-2 mb-4">
              <Users size={20} className="text-orange-600" />
              <h3 className="font-semibold text-slate-900">סטטיסטיקות</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-blue-50">
                <p className="text-2xl font-bold text-blue-700">
                  {user?.qualified_teams_detail?.length || 0}
                </p>
                <p className="text-xs text-blue-600 mt-1">צוותות פעילים</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-50">
                <p className="text-2xl font-bold text-green-700">—</p>
                <p className="text-xs text-green-600 mt-1">משובצים היום</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
