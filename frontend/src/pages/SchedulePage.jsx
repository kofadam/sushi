import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../api/client";
import {
  Layout, PageHeader, Card, Button, Badge,
  LoadingSpinner, EmptyState,
} from "../components/UI";
import { CalendarDays, Check, Send, Eye } from "lucide-react";
import { getWorkingDaysForMonth, getDayNameHe, getMonthNameHe, isToday } from "../utils/dates";

export default function SchedulePage() {
  const { user, hasPerm } = useAuth();
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [teams, setTeams] = useState([]);
  const [preferences, setPreferences] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("preferences"); // preferences | assignments | manage

  useEffect(() => {
    Promise.all([
      api.get("/months/"),
      api.get("/teams/"),
    ]).then(([monthData, teamData]) => {
      setMonths(monthData.results || []);
      setTeams(teamData.results || []);
      if (monthData.results?.length > 0) {
        setSelectedMonth(monthData.results[0]);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedMonth) return;
    loadMonthData();
  }, [selectedMonth]);

  const loadMonthData = async () => {
    if (!selectedMonth) return;
    try {
      const [prefData, assignData] = await Promise.all([
        api.get(`/preferences/?month_config=${selectedMonth.id}`),
        api.get(`/assignments/?month_config=${selectedMonth.id}`),
      ]);
      // Build preferences map: date -> { preferred_team_ids, notes }
      const prefMap = {};
      for (const p of prefData.results || []) {
        prefMap[p.date] = {
          preferred_team_ids: p.preferred_team_ids || [],
          notes: p.notes || "",
        };
      }
      setPreferences(prefMap);
      setAssignments(assignData.results || []);

      // Load dashboard for managers
      if (hasPerm("manage_schedule")) {
        const dash = await api.get(`/months/${selectedMonth.id}/dashboard/`);
        setDashboardData(dash);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleDatePreference = (dateStr) => {
    if (!selectedMonth?.is_open_for_submissions) return;
    setPreferences((prev) => {
      const copy = { ...prev };
      if (copy[dateStr]) {
        delete copy[dateStr];
      } else {
        copy[dateStr] = { preferred_team_ids: [], notes: "" };
      }
      return copy;
    });
  };

  const toggleTeamPreference = (dateStr, teamId) => {
    setPreferences((prev) => {
      const copy = { ...prev };
      if (!copy[dateStr]) return copy;
      const teams = copy[dateStr].preferred_team_ids || [];
      if (teams.includes(teamId)) {
        copy[dateStr] = {
          ...copy[dateStr],
          preferred_team_ids: teams.filter((t) => t !== teamId),
        };
      } else {
        copy[dateStr] = {
          ...copy[dateStr],
          preferred_team_ids: [...teams, teamId],
        };
      }
      return copy;
    });
  };

  const submitPreferences = async () => {
    if (!selectedMonth) return;
    setSaving(true);
    try {
      const prefList = Object.entries(preferences).map(([date, data]) => ({
        date,
        preferred_team_ids: data.preferred_team_ids || [],
        notes: data.notes || "",
      }));
      await api.post("/preferences/bulk_submit/", {
        month_config_id: selectedMonth.id,
        preferences: prefList,
      });
      alert("הבקשות נשלחו בהצלחה!");
    } catch (err) {
      alert("שגיאה: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  const workingDays = selectedMonth
    ? getWorkingDaysForMonth(selectedMonth.year, selectedMonth.month)
    : [];

  const myAssignments = assignments.filter((a) => a.employee === user?.id);

  return (
    <Layout>
      <PageHeader
        title="משמרות"
        subtitle="הגשת בקשות וצפייה בלוח המשמרות"
        actions={
          <div className="flex gap-2">
            <Button
              variant={view === "preferences" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setView("preferences")}
            >
              בקשות
            </Button>
            <Button
              variant={view === "assignments" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setView("assignments")}
            >
              <Eye size={16} />
              לוח שיבוצים
            </Button>
            {hasPerm("manage_schedule") && (
              <Button
                variant={view === "manage" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setView("manage")}
              >
                ניהול
              </Button>
            )}
          </div>
        }
      />

      {/* Month selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {months.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedMonth(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedMonth?.id === m.id
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:border-brand-300"
            }`}
          >
            {getMonthNameHe(m.month)} {m.year}
            {m.is_open_for_submissions && (
              <span className="mr-2 text-xs opacity-75">● פתוח</span>
            )}
          </button>
        ))}
        {months.length === 0 && (
          <EmptyState
            icon={CalendarDays}
            title="אין חודשים מוגדרים"
            description={
              hasPerm("manage_schedule")
                ? "צור תצורת חודש חדשה כדי להתחיל"
                : "מנהלת הצוות עדיין לא פתחה חודש להגשת בקשות"
            }
          />
        )}
      </div>

      {selectedMonth && view === "preferences" && (
        <PreferencesView
          workingDays={workingDays}
          teams={teams}
          preferences={preferences}
          isOpen={selectedMonth.is_open_for_submissions}
          onToggleDate={toggleDatePreference}
          onToggleTeam={toggleTeamPreference}
          onSubmit={submitPreferences}
          saving={saving}
          qualifiedTeams={user?.qualified_teams_detail || []}
        />
      )}

      {selectedMonth && view === "assignments" && (
        <AssignmentsView
          workingDays={workingDays}
          assignments={myAssignments}
          allAssignments={selectedMonth.is_published ? assignments : []}
          teams={teams}
          isPublished={selectedMonth.is_published}
        />
      )}

      {selectedMonth && view === "manage" && hasPerm("manage_schedule") && (
        <ManagerView
          dashboardData={dashboardData}
          selectedMonth={selectedMonth}
          teams={teams}
          onRefresh={loadMonthData}
        />
      )}
    </Layout>
  );
}

function PreferencesView({
  workingDays, teams, preferences, isOpen,
  onToggleDate, onToggleTeam, onSubmit, saving, qualifiedTeams,
}) {
  const qualifiedTeamIds = qualifiedTeams.map((t) => t.id);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900">בחר ימים זמינים</h3>
          <p className="text-sm text-slate-500 mt-1">
            {isOpen
              ? "לחץ על יום כדי לסמן זמינות, ובחר צוות מועדף"
              : "ההגשה סגורה לחודש זה"}
          </p>
        </div>
        {isOpen && (
          <Button onClick={onSubmit} disabled={saving}>
            <Send size={16} />
            {saving ? "שולח..." : "שלח בקשות"}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {/* Header */}
        <div className="grid grid-cols-[120px_1fr] gap-2 text-xs font-medium text-slate-500 pb-2 border-b">
          <div>יום</div>
          <div className="flex gap-2">
            {teams.map((t) => (
              <div
                key={t.id}
                className="flex-1 text-center px-1 py-1 rounded"
                style={{ backgroundColor: t.color + "15", color: t.color }}
              >
                {t.name_he}
              </div>
            ))}
          </div>
        </div>

        {/* Days */}
        {workingDays.map((dateStr) => {
          const selected = !!preferences[dateStr];
          const d = new Date(dateStr + "T00:00:00");
          const dayNum = d.getDate();
          const dayName = getDayNameHe(dateStr);

          return (
            <div
              key={dateStr}
              className={`grid grid-cols-[120px_1fr] gap-2 items-center p-2 rounded-lg transition-colors ${
                selected ? "bg-brand-50 border border-brand-200" : "hover:bg-slate-50"
              } ${isToday(dateStr) ? "ring-2 ring-brand-400" : ""}`}
            >
              <button
                onClick={() => isOpen && onToggleDate(dateStr)}
                disabled={!isOpen}
                className="flex items-center gap-2 text-right"
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    selected
                      ? "border-brand-600 bg-brand-600"
                      : "border-slate-300"
                  }`}
                >
                  {selected && <Check size={12} className="text-white" />}
                </div>
                <span className="text-sm font-medium text-slate-900">
                  {dayName} {dayNum}
                </span>
              </button>

              <div className="flex gap-2">
                {teams.map((t) => {
                  const isQualified = qualifiedTeamIds.includes(t.id);
                  const isPreferred = preferences[dateStr]?.preferred_team_ids?.includes(t.id);

                  return (
                    <button
                      key={t.id}
                      onClick={() =>
                        selected && isOpen && isQualified && onToggleTeam(dateStr, t.id)
                      }
                      disabled={!selected || !isOpen || !isQualified}
                      className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                        !isQualified
                          ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                          : isPreferred
                          ? "text-white"
                          : selected
                          ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          : "bg-slate-50 text-slate-300"
                      }`}
                      style={isPreferred ? { backgroundColor: t.color } : {}}
                    >
                      {isPreferred ? "✓" : isQualified ? "—" : "✗"}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function AssignmentsView({ workingDays, assignments, allAssignments, teams, isPublished }) {
  const assignmentsByDate = {};
  for (const a of allAssignments.length > 0 ? allAssignments : assignments) {
    if (!assignmentsByDate[a.date]) assignmentsByDate[a.date] = [];
    assignmentsByDate[a.date].push(a);
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-slate-900 mb-1">לוח שיבוצים</h3>
      <p className="text-sm text-slate-500 mb-4">
        {isPublished ? "הלוח פורסם — צפייה בשיבוצים" : "הלוח טרם פורסם — רק השיבוצים שלך מוצגים"}
      </p>

      <div className="space-y-2">
        {workingDays.map((dateStr) => {
          const dayAssignments = assignmentsByDate[dateStr] || [];
          const dayName = getDayNameHe(dateStr);
          const d = new Date(dateStr + "T00:00:00");

          return (
            <div
              key={dateStr}
              className={`p-3 rounded-lg border ${
                isToday(dateStr) ? "border-brand-300 bg-brand-50" : "border-slate-100"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-900">
                  {dayName} {d.getDate()}/{d.getMonth() + 1}
                </span>
                {isToday(dateStr) && <Badge color="blue">היום</Badge>}
              </div>
              {dayAssignments.length === 0 ? (
                <p className="text-xs text-slate-400">אין שיבוצים</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {dayAssignments.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
                      style={{
                        backgroundColor: (a.team_detail?.color || "#3B82F6") + "20",
                        color: a.team_detail?.color || "#3B82F6",
                      }}
                    >
                      {a.employee_name} — {a.team_detail?.name_he}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ManagerView({ dashboardData, selectedMonth, teams, onRefresh }) {
  if (!dashboardData) return <LoadingSpinner />;

  const { working_days, preferences_by_date, assignments_by_date, capacities } = dashboardData;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-4">סקירת חודש — תצוגת ניהול</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right">
                <th className="p-2 font-medium text-slate-500">תאריך</th>
                {teams.map((t) => (
                  <th
                    key={t.id}
                    className="p-2 font-medium text-center"
                    style={{ color: t.color }}
                  >
                    {t.name_he}
                    <br />
                    <span className="text-xs text-slate-400">
                      ({capacities[t.id] || 0} מקומות)
                    </span>
                  </th>
                ))}
                <th className="p-2 font-medium text-slate-500 text-center">בקשות</th>
                <th className="p-2 font-medium text-slate-500 text-center">שובצו</th>
              </tr>
            </thead>
            <tbody>
              {working_days.map((dateStr) => {
                const prefs = preferences_by_date[dateStr] || [];
                const assigns = assignments_by_date[dateStr] || [];
                const d = new Date(dateStr + "T00:00:00");

                return (
                  <tr
                    key={dateStr}
                    className={`border-t border-slate-100 ${
                      isToday(dateStr) ? "bg-brand-50" : ""
                    }`}
                  >
                    <td className="p-2 font-medium">
                      {getDayNameHe(dateStr)} {d.getDate()}/{d.getMonth() + 1}
                    </td>
                    {teams.map((t) => {
                      const teamAssigns = assigns.filter((a) => a.team_id === t.id);
                      const cap = capacities[t.id] || 0;
                      const fill = teamAssigns.length;
                      return (
                        <td key={t.id} className="p-2 text-center">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              fill >= cap && cap > 0
                                ? "bg-green-100 text-green-700"
                                : fill > 0
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {fill}/{cap}
                          </span>
                        </td>
                      );
                    })}
                    <td className="p-2 text-center">
                      <Badge color={prefs.length > 0 ? "blue" : "gray"}>
                        {prefs.length}
                      </Badge>
                    </td>
                    <td className="p-2 text-center">
                      <Badge color={assigns.length > 0 ? "green" : "gray"}>
                        {assigns.length}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
