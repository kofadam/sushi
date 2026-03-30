import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../api/client";
import {
  Layout, PageHeader, Card, Button, Badge,
  LoadingSpinner, EmptyState,
} from "../components/UI";
import {
  BarChart3, AlertTriangle, TrendingUp, Users,
  Calendar, ChevronRight, ChevronLeft, Sparkles,
} from "lucide-react";
import { getDayNameHe, getMonthNameHe } from "../utils/dates";

const SEVERITY_COLORS = {
  high: "border-red-300 bg-red-50 text-red-800",
  medium: "border-orange-300 bg-orange-50 text-orange-800",
  low: "border-yellow-300 bg-yellow-50 text-yellow-800",
};

function fillColor(pct) {
  if (pct === 0) return "bg-red-100 text-red-700 border-red-200";
  if (pct < 30) return "bg-red-50 text-red-600 border-red-200";
  if (pct < 60) return "bg-orange-50 text-orange-600 border-orange-200";
  if (pct < 90) return "bg-yellow-50 text-yellow-600 border-yellow-200";
  return "bg-green-50 text-green-600 border-green-200";
}

function fillBg(pct) {
  if (pct === 0) return "bg-red-200";
  if (pct < 30) return "bg-red-300";
  if (pct < 60) return "bg-orange-300";
  if (pct < 90) return "bg-yellow-300";
  return "bg-green-400";
}

export default function ReportsPage() {
  const { hasPerm } = useAuth();
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    api.get("/months/").then((data) => {
      const list = data.results || [];
      setMonths(list);
      if (list.length > 0) setSelectedMonth(list[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedMonth) return;
    setReport(null);
    setAiInsight(null);
    api.get(`/months/${selectedMonth.id}/reports/`).then(setReport).catch(console.error);
  }, [selectedMonth]);

  const generateAiInsight = async () => {
    if (!report) return;
    setAiLoading(true);
    try {
      // Build a concise summary for the AI
      const summary = {
        month: `${getMonthNameHe(report.month_config.month)} ${report.month_config.year}`,
        working_days: report.total_working_days,
        teams: report.team_summary.map(t => ({
          name: t.team_name,
          capacity: t.total_capacity,
          assigned: t.total_assigned,
          requests: t.total_requests,
          fill: t.fill_percent + "%",
        })),
        alerts_count: report.alerts.length,
        high_alerts: report.alerts.filter(a => a.severity === "high").length,
        missing_prefs: report.missing_preferences.length,
        missing_names: report.missing_preferences.map(p => p.name).slice(0, 10),
        understaffed_days: report.daily_coverage
          .filter(d => d.teams.some(t => t.capacity > 0 && t.assigned === 0))
          .map(d => d.date),
      };

      const data = await api.post("/ai/insights/", { report_summary: summary });
      setAiInsight(data.insight || "לא הצלחתי לנתח את הנתונים");
    } catch (err) {
      setAiInsight("שגיאה בהפקת תובנות: " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <Layout><LoadingSpinner /></Layout>;

  return (
    <Layout>
      <PageHeader
        title="דוחות"
        subtitle="סקירת כיסוי, התראות ותובנות חודשיות"
      />

      {/* Month selector */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {months.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedMonth(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedMonth?.id === m.id
                ? "bg-brand-600 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {getMonthNameHe(m.month)} {m.year}
          </button>
        ))}
      </div>

      {!report ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">

          {/* Summary cards row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <Calendar size={20} className="mx-auto text-brand-600 mb-1" />
              <p className="text-2xl font-bold text-slate-800">{report.total_working_days}</p>
              <p className="text-xs text-slate-500">ימי עבודה</p>
            </Card>
            <Card className="p-4 text-center">
              <Users size={20} className="mx-auto text-blue-600 mb-1" />
              <p className="text-2xl font-bold text-slate-800">
                {report.team_summary.reduce((s, t) => s + t.total_assigned, 0)}
                <span className="text-sm text-slate-400 font-normal">
                  /{report.team_summary.reduce((s, t) => s + t.total_capacity, 0)}
                </span>
              </p>
              <p className="text-xs text-slate-500">שיבוצים / קיבולת</p>
            </Card>
            <Card className="p-4 text-center">
              <AlertTriangle size={20} className={`mx-auto mb-1 ${report.alerts.length > 0 ? "text-red-500" : "text-green-500"}`} />
              <p className={`text-2xl font-bold ${report.alerts.length > 0 ? "text-red-600" : "text-green-600"}`}>
                {report.alerts.filter(a => a.severity === "high").length}
              </p>
              <p className="text-xs text-slate-500">התראות קריטיות</p>
            </Card>
            <Card className="p-4 text-center">
              <TrendingUp size={20} className="mx-auto text-orange-500 mb-1" />
              <p className="text-2xl font-bold text-slate-800">{report.missing_preferences.length}</p>
              <p className="text-xs text-slate-500">טרם הגישו בקשות</p>
            </Card>
          </div>

          {/* Alerts */}
          {report.alerts.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={20} className="text-red-500" />
                <h3 className="font-semibold text-slate-900">התראות כיסוי</h3>
                <Badge color="red">{report.alerts.length}</Badge>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {report.alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${SEVERITY_COLORS[alert.severity]}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      alert.severity === "high" ? "bg-red-500" : "bg-orange-400"
                    }`} />
                    <span className="text-sm">{alert.message}</span>
                    <span className="text-xs opacity-60 mr-auto">
                      {getDayNameHe(alert.date)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Coverage heatmap */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={20} className="text-brand-600" />
              <h3 className="font-semibold text-slate-900">מפת כיסוי — {getMonthNameHe(report.month_config.month)}</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-right py-2 pr-3 font-medium text-slate-600 sticky right-0 bg-white">יום</th>
                    <th className="text-center py-2 px-2 font-medium text-slate-600">בקשות</th>
                    {report.teams.map((t) => (
                      <th key={t.id} className="text-center py-2 px-2 font-medium" style={{ color: t.color }}>
                        {t.name_he}
                      </th>
                    ))}
                    <th className="text-center py-2 px-2 font-medium text-slate-600">סה״כ</th>
                  </tr>
                </thead>
                <tbody>
                  {report.daily_coverage.map((day) => {
                    const today = new Date().toISOString().split("T")[0];
                    const isPast = day.date < today;
                    const isToday = day.date === today;
                    const d = new Date(day.date + "T00:00:00");
                    const dayNum = d.getDate();
                    const dayName = getDayNameHe(day.date);
                    const totalAssigned = day.teams.reduce((s, t) => s + t.assigned, 0);
                    const totalCap = day.teams.reduce((s, t) => s + t.capacity, 0);
                    const totalPct = totalCap > 0 ? Math.round(totalAssigned / totalCap * 100) : 0;

                    return (
                      <tr
                        key={day.date}
                        className={`border-b border-slate-100 ${
                          isToday ? "bg-brand-50" :
                          isPast ? "opacity-50" :
                          day.special ? "bg-orange-50/30" : ""
                        }`}
                      >
                        <td className="py-2 pr-3 font-medium text-slate-700 sticky right-0 bg-inherit whitespace-nowrap">
                          {dayName} {dayNum}
                          {day.special && (
                            <span className="text-xs text-orange-500 mr-1">
                              {day.special.day_type === "half" ? "½" : "↓"}
                            </span>
                          )}
                        </td>
                        <td className="text-center py-2 px-2 text-slate-500">
                          {day.total_requests}
                        </td>
                        {day.teams.map((t) => (
                          <td key={t.team_id} className="text-center py-2 px-2">
                            {t.capacity > 0 ? (
                              <div className="flex items-center justify-center">
                                <span className={`inline-flex items-center justify-center w-14 h-7 rounded text-xs font-medium border ${fillColor(t.fill_percent)}`}>
                                  {t.assigned}/{t.capacity}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        ))}
                        <td className="text-center py-2 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${fillBg(totalPct)}`}
                                style={{ width: `${Math.min(totalPct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500">{totalPct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200" /> 0%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-300" /> &lt;60%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-300" /> &lt;90%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400" /> 90%+</span>
            </div>
          </Card>

          {/* Request vs Capacity per team */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={20} className="text-blue-600" />
              <h3 className="font-semibold text-slate-900">בקשות מול קיבולת — לפי צוות</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {report.team_summary.map((t) => {
                const reqPct = t.total_capacity > 0 ? Math.round(t.total_requests / t.total_capacity * 100) : 0;
                const fillPct = t.fill_percent;

                return (
                  <div key={t.team_id} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                      <h4 className="font-semibold text-slate-800">{t.team_name}</h4>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>בקשות</span>
                          <span>{t.total_requests} / {t.total_capacity} ({reqPct}%)</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-400 transition-all"
                            style={{ width: `${Math.min(reqPct, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>שיבוצים</span>
                          <span>{t.total_assigned} / {t.total_capacity} ({fillPct}%)</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${fillBg(fillPct)}`}
                            style={{ width: `${Math.min(fillPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    {reqPct > 100 && (
                      <p className="text-xs text-orange-600 mt-2">⚠ ביקוש גבוה מהקיבולת</p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Missing preferences */}
          {report.missing_preferences.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users size={20} className="text-orange-500" />
                <h3 className="font-semibold text-slate-900">טרם הגישו בקשות</h3>
                <Badge color="orange">{report.missing_preferences.length}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {report.missing_preferences.map((p) => (
                  <span
                    key={p.id}
                    className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-sm border border-orange-200"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* AI Insights */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-purple-500" />
                <h3 className="font-semibold text-slate-900">תובנות AI</h3>
              </div>
              <Button
                onClick={generateAiInsight}
                disabled={aiLoading}
                className="!bg-purple-600 hover:!bg-purple-700"
              >
                {aiLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    מנתח...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles size={14} />
                    הפק תובנות
                  </span>
                )}
              </Button>
            </div>
            {aiInsight ? (
              <div className="prose prose-sm max-w-none text-slate-700 bg-purple-50/50 rounded-xl p-4 border border-purple-100 whitespace-pre-wrap leading-relaxed">
                {aiInsight}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Sparkles size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">לחץ "הפק תובנות" לקבלת ניתוח AI של מצב הכיסוי</p>
              </div>
            )}
          </Card>

        </div>
      )}
    </Layout>
  );
}
