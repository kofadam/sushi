import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../api/client";
import {
  Layout, PageHeader, Card, Button, Badge,
  LoadingSpinner, EmptyState,
} from "../components/UI";
import {
  CalendarDays, Check, Send, Eye, Plus, Settings,
  X, ToggleLeft, ToggleRight, Globe,
} from "lucide-react";
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
  const [view, setView] = useState("preferences");
  const [showCreateMonth, setShowCreateMonth] = useState(false);
  const [showMonthSettings, setShowMonthSettings] = useState(false);

  const loadMonths = async () => {
    const [monthData, teamData] = await Promise.all([
      api.get("/months/"),
      api.get("/teams/"),
    ]);
    const monthList = monthData.results || [];
    const teamList = teamData.results || [];
    setMonths(monthList);
    setTeams(teamList);
    return { monthList, teamList };
  };

  useEffect(() => {
    setPreferences({});
    setAssignments([]);
    setDashboardData(null);
    setSelectedMonth(null);
    setLoading(true);
    loadMonths().then(({ monthList }) => {
      if (monthList.length > 0) {
        setSelectedMonth(monthList[0]);
      }
      setLoading(false);
    });
  }, [user?.id]);

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
      // Only show current user's preferences in the preferences view
      const myPrefs = (prefData.results || []).filter(
        (p) => p.employee === user?.id
      );
      const prefMap = {};
      for (const p of myPrefs) {
        prefMap[p.date] = {
          preferred_team_ids: p.preferred_team_ids || [],
          notes: p.notes || "",
        };
      }
      setPreferences(prefMap);
      setAssignments(assignData.results || []);

      if (hasPerm("manage_schedule")) {
        const dash = await api.get(`/months/${selectedMonth.id}/dashboard/`);
        setDashboardData(dash);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMonthCreated = async (newMonth) => {
    const { monthList } = await loadMonths();
    const created = monthList.find((m) => m.id === newMonth.id);
    if (created) setSelectedMonth(created);
    setShowCreateMonth(false);
  };

  const handleMonthUpdated = async () => {
    const { monthList } = await loadMonths();
    const updated = monthList.find((m) => m.id === selectedMonth.id);
    if (updated) setSelectedMonth(updated);
    setShowMonthSettings(false);
    loadMonthData();
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
      const t = copy[dateStr].preferred_team_ids || [];
      if (t.includes(teamId)) {
        copy[dateStr] = { ...copy[dateStr], preferred_team_ids: t.filter((x) => x !== teamId) };
      } else {
        copy[dateStr] = { ...copy[dateStr], preferred_team_ids: [...t, teamId] };
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
    return <Layout><LoadingSpinner /></Layout>;
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
      <div className="flex gap-2 mb-6 flex-wrap items-center">
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

        {hasPerm("manage_schedule") && (
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCreateMonth(true)}>
              <Plus size={16} />
              חודש חדש
            </Button>
            {selectedMonth && (
              <Button variant="ghost" size="sm" onClick={() => setShowMonthSettings(true)}>
                <Settings size={16} />
              </Button>
            )}
          </>
        )}

        {months.length === 0 && !hasPerm("manage_schedule") && (
          <EmptyState
            icon={CalendarDays}
            title="אין חודשים מוגדרים"
            description="מנהלת הצוות עדיין לא פתחה חודש להגשת בקשות"
          />
        )}
      </div>

      {/* Create Month Modal */}
      {showCreateMonth && (
        <CreateMonthModal
          teams={teams}
          onClose={() => setShowCreateMonth(false)}
          onCreated={handleMonthCreated}
        />
      )}

      {/* Month Settings Modal */}
      {showMonthSettings && selectedMonth && (
        <MonthSettingsModal
          monthConfig={selectedMonth}
          teams={teams}
          onClose={() => setShowMonthSettings(false)}
          onUpdated={handleMonthUpdated}
        />
      )}

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

/* ============================================
   Create Month Modal
   ============================================ */
function CreateMonthModal({ teams, onClose, onCreated }) {
  const now = new Date();
  const nextMonth = now.getMonth() + 2; // JS months are 0-indexed, we want next month
  const nextYear = nextMonth > 12 ? now.getFullYear() + 1 : now.getFullYear();
  const adjustedMonth = nextMonth > 12 ? nextMonth - 12 : nextMonth;

  const [form, setForm] = useState({
    year: nextYear,
    month: adjustedMonth,
    notes: "",
    is_open_for_submissions: true,
    team_seats: teams.map((t) => ({ team_id: t.id, seats_per_day: 10 })),
  });
  const [saving, setSaving] = useState(false);

  const updateSeat = (teamId, value) => {
    setForm((prev) => ({
      ...prev,
      team_seats: prev.team_seats.map((ts) =>
        ts.team_id === teamId ? { ...ts, seats_per_day: parseInt(value) || 0 } : ts
      ),
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const created = await api.post("/months/", form);
      onCreated(created);
    } catch (err) {
      alert("שגיאה: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-lg p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">חודש חדש</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Year + Month */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">שנה</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">חודש</label>
              <select
                value={form.month}
                onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{getMonthNameHe(m)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Team capacities */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">מקומות לצוות ליום</label>
            <div className="space-y-2">
              {teams.map((t) => {
                const seat = form.team_seats.find((ts) => ts.team_id === t.id);
                return (
                  <div key={t.id} className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="text-sm text-slate-700 flex-1">{t.name_he}</span>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={seat?.seats_per_day ?? 10}
                      onChange={(e) => updateSeat(t.id, e.target.value)}
                      className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">הערות</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="הערות לחודש (אופציונלי)"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Open for submissions */}
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_open_for_submissions}
              onChange={(e) => setForm({ ...form, is_open_for_submissions: e.target.checked })}
              className="rounded"
            />
            פתוח להגשת בקשות מיד
          </label>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={onClose}>ביטול</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "יוצר..." : "צור חודש"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ============================================
   Month Settings Modal
   ============================================ */
function MonthSettingsModal({ monthConfig, teams, onClose, onUpdated }) {
  const [isOpen, setIsOpen] = useState(monthConfig.is_open_for_submissions);
  const [isPublished, setIsPublished] = useState(monthConfig.is_published);
  const [capacities, setCapacities] = useState(
    teams.map((t) => {
      const existing = monthConfig.team_capacities?.find((tc) => tc.team === t.id);
      return {
        team_id: t.id,
        seats_per_day: existing?.seats_per_day ?? 10,
      };
    })
  );
  const [saving, setSaving] = useState(false);

  const updateCap = (teamId, value) => {
    setCapacities((prev) =>
      prev.map((c) => (c.team_id === teamId ? { ...c, seats_per_day: parseInt(value) || 0 } : c))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update month config toggles
      await api.patch(`/months/${monthConfig.id}/`, {
        is_open_for_submissions: isOpen,
        is_published: isPublished,
      });
      // Update capacities
      await api.patch(`/months/${monthConfig.id}/set_capacities/`, {
        team_seats: capacities,
      });
      onUpdated();
    } catch (err) {
      alert("שגיאה: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-lg p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">
            הגדרות — {getMonthNameHe(monthConfig.month)} {monthConfig.year}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Toggles */}
          <div className="space-y-3">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center justify-between w-full p-3 rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">פתוח להגשת בקשות</p>
                <p className="text-xs text-slate-500">טכנאים יכולים לשלוח העדפות</p>
              </div>
              {isOpen ? (
                <ToggleRight size={28} className="text-brand-600" />
              ) : (
                <ToggleLeft size={28} className="text-slate-400" />
              )}
            </button>

            <button
              onClick={() => setIsPublished(!isPublished)}
              className="flex items-center justify-between w-full p-3 rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">לוח פורסם</p>
                <p className="text-xs text-slate-500">כל העובדים רואים את השיבוצים</p>
              </div>
              {isPublished ? (
                <Globe size={22} className="text-green-600" />
              ) : (
                <Globe size={22} className="text-slate-400" />
              )}
            </button>
          </div>

          {/* Capacities */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">מקומות לצוות ליום</label>
            <div className="space-y-2">
              {teams.map((t) => {
                const cap = capacities.find((c) => c.team_id === t.id);
                return (
                  <div key={t.id} className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="text-sm text-slate-700 flex-1">{t.name_he}</span>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={cap?.seats_per_day ?? 10}
                      onChange={(e) => updateCap(t.id, e.target.value)}
                      className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={onClose}>ביטול</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "שומר..." : "שמור"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ============================================
   Preferences View (Tech)
   ============================================ */
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
                    selected ? "border-brand-600 bg-brand-600" : "border-slate-300"
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

/* ============================================
   Assignments View (Published schedule)
   ============================================ */
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

/* ============================================
   Manager View (Dashboard + Auto-Assign)
   ============================================ */
function ManagerView({ dashboardData, selectedMonth, teams, onRefresh }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [proposals, setProposals] = useState(null); // null = not in review mode
  const [saving, setSaving] = useState(false);
  const assignPanelRef = useRef(null);

  useEffect(() => {
    if (selectedDate && assignPanelRef.current) {
      setTimeout(() => {
        assignPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [selectedDate]);

  if (!dashboardData) return <LoadingSpinner />;

  const { working_days, preferences_by_date, assignments_by_date, capacities } = dashboardData;

  // Auto-assign logic: propose assignments based on preferences
  const generateProposals = (dateStr) => {
    const prefs = preferences_by_date[dateStr] || [];
    const assigns = assignments_by_date[dateStr] || [];
    const alreadyAssignedIds = assigns.map((a) => a.employee_id);

    // Track remaining capacity per team
    const remaining = {};
    for (const t of teams) {
      const cap = capacities[t.id] || 0;
      const filled = assigns.filter((a) => a.team_id === t.id).length;
      remaining[t.id] = cap - filled;
    }

    const result = [];
    for (const pref of prefs) {
      if (alreadyAssignedIds.includes(pref.employee_id)) continue;

      let assignedTeamId = null;
      const hasPreference = (pref.preferred_team_ids || []).length > 0;

      // 1. Try preferred teams only (respecting capacity)
      for (const tid of (pref.preferred_team_ids || [])) {
        if (pref.qualified_team_ids?.includes(tid) && remaining[tid] > 0) {
          assignedTeamId = tid;
          break;
        }
      }

      // 2. Only fallback to other qualified teams if tech had NO preference
      if (!assignedTeamId && !hasPreference) {
        for (const tid of (pref.qualified_team_ids || [])) {
          if (remaining[tid] > 0) {
            assignedTeamId = tid;
            break;
          }
        }
      }

      if (assignedTeamId) {
        remaining[assignedTeamId]--;
      }

      result.push({
        employee_id: pref.employee_id,
        employee_name: pref.employee_name,
        preferred_team_ids: pref.preferred_team_ids || [],
        qualified_team_ids: pref.qualified_team_ids || [],
        proposed_team_id: assignedTeamId,
        notes: pref.notes,
      });
    }

    return result;
  };

  const handleAutoAssign = (dateStr) => {
    const props = generateProposals(dateStr);
    setProposals(props);
  };

  const updateProposal = (employeeId, newTeamId) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.employee_id === employeeId ? { ...p, proposed_team_id: newTeamId } : p
      )
    );
  };

  const removeProposal = (employeeId) => {
    setProposals((prev) => prev.filter((p) => p.employee_id !== employeeId));
  };

  const confirmAssignments = async () => {
    if (!proposals || !selectedDate) return;
    const valid = proposals.filter((p) => p.proposed_team_id);
    if (valid.length === 0) return;

    setSaving(true);
    try {
      await api.post("/assignments/bulk_assign/", {
        month_config_id: selectedMonth.id,
        assignments: valid.map((p) => ({
          employee_id: p.employee_id,
          date: selectedDate,
          team_id: p.proposed_team_id,
        })),
      });
      setProposals(null);
      await onRefresh();
    } catch (err) {
      alert("שגיאה: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async (assignmentId) => {
    setSaving(true);
    try {
      await api.delete(`/assignments/${assignmentId}/`);
      await onRefresh();
    } catch (err) {
      alert("שגיאה: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedPrefs = selectedDate ? (preferences_by_date[selectedDate] || []) : [];
  const selectedAssigns = selectedDate ? (assignments_by_date[selectedDate] || []) : [];
  const assignedEmployeeIds = selectedAssigns.map((a) => a.employee_id);
  const unassignedPrefs = selectedPrefs.filter((p) => !assignedEmployeeIds.includes(p.employee_id));

  return (
    <div className="space-y-6">
      {/* Overview table */}
      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-4">סקירת חודש — לחץ על יום לשיבוץ</h3>

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
                const isSelected = selectedDate === dateStr;

                return (
                  <tr
                    key={dateStr}
                    onClick={() => {
                      setSelectedDate(isSelected ? null : dateStr);
                      setProposals(null);
                    }}
                    className={`border-t border-slate-100 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-brand-100"
                        : isToday(dateStr)
                        ? "bg-brand-50 hover:bg-brand-100"
                        : "hover:bg-slate-50"
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

      {/* Assignment panel for selected date */}
      {selectedDate && (
        <div ref={assignPanelRef}>
        <Card className="p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">
                שיבוץ — {getDayNameHe(selectedDate)} {new Date(selectedDate + "T00:00:00").getDate()}/{new Date(selectedDate + "T00:00:00").getMonth() + 1}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {selectedPrefs.length} בקשות · {selectedAssigns.length} שובצו · {unassignedPrefs.length} ממתינים
              </p>
            </div>
            {unassignedPrefs.length > 0 && !proposals && (
              <Button onClick={() => handleAutoAssign(selectedDate)}>
                שיבוץ אוטומטי ({unassignedPrefs.length})
              </Button>
            )}
          </div>

          {/* Already assigned */}
          {selectedAssigns.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-700 mb-2">משובצים</h4>
              <div className="space-y-2">
                {selectedAssigns.map((a) => {
                  const team = teams.find((t) => t.id === a.team_id);
                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: team?.color || "#666" }}
                        >
                          {a.employee_name?.[0]}
                        </div>
                        <span className="text-sm font-medium text-slate-900">{a.employee_name}</span>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: team?.color || "#666" }}
                        >
                          {a.team_name}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUnassign(a.id); }}
                        disabled={saving}
                        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        הסר
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Auto-assign proposals (review mode) */}
          {proposals && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-slate-700">
                  הצעת שיבוץ — בדוק ואשר
                </h4>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setProposals(null)}>
                    ביטול
                  </Button>
                  <Button size="sm" onClick={confirmAssignments} disabled={saving}>
                    {saving ? "שומר..." : `אשר שיבוץ (${proposals.filter((p) => p.proposed_team_id).length})`}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {proposals.map((p) => {
                  const proposedTeam = teams.find((t) => t.id === p.proposed_team_id);
                  return (
                    <div
                      key={p.employee_id}
                      className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold">
                          {p.employee_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-slate-900">{p.employee_name}</span>
                          {/* Qualification + preference legend */}
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {teams.map((t) => {
                              const isQualified = p.qualified_team_ids?.includes(t.id);
                              const isPreferred = p.preferred_team_ids?.includes(t.id);
                              if (!isQualified) return null;
                              return (
                                <span
                                  key={t.id}
                                  className="text-xs px-1.5 py-0.5 rounded border"
                                  style={{
                                    backgroundColor: isPreferred ? t.color + "30" : "transparent",
                                    borderColor: t.color,
                                    color: t.color,
                                  }}
                                >
                                  {t.name_he}
                                  {isPreferred && " ★"}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mr-3">
                        <select
                          value={p.proposed_team_id || ""}
                          onChange={(e) => updateProposal(p.employee_id, parseInt(e.target.value) || null)}
                          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          style={proposedTeam ? {
                            borderColor: proposedTeam.color,
                            color: proposedTeam.color,
                            fontWeight: 600,
                          } : {}}
                        >
                          <option value="">— ללא —</option>
                          {p.preferred_team_ids.length > 0 && (
                            <optgroup label="ביקש/ה">
                              {teams.filter((t) => p.preferred_team_ids.includes(t.id)).map((t) => (
                                <option key={t.id} value={t.id}>★ {t.name_he}</option>
                              ))}
                            </optgroup>
                          )}
                          {teams.filter((t) =>
                            p.qualified_team_ids?.includes(t.id) && !p.preferred_team_ids.includes(t.id)
                          ).length > 0 && (
                            <optgroup label="מוסמך/ת (לא ביקש/ה)">
                              {teams.filter((t) =>
                                p.qualified_team_ids?.includes(t.id) && !p.preferred_team_ids.includes(t.id)
                              ).map((t) => (
                                <option key={t.id} value={t.id}>{t.name_he}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        <button
                          onClick={() => removeProposal(p.employee_id)}
                          className="p-1 text-slate-400 hover:text-red-500"
                          title="הסר מהצעה"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {proposals.filter((p) => !p.proposed_team_id).length > 0 && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠ {proposals.filter((p) => !p.proposed_team_id).length} עובדים ללא שיבוץ מוצע (אין מקום או הכשרה מתאימה)
                </p>
              )}
            </div>
          )}

          {/* Unassigned requests (when not in review mode) */}
          {!proposals && unassignedPrefs.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">ממתינים לשיבוץ</h4>
              <div className="space-y-2">
                {unassignedPrefs.map((pref) => (
                  <div
                    key={pref.employee_id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                        {pref.employee_name?.[0]}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-900">{pref.employee_name}</span>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {teams.map((t) => {
                            const isQualified = pref.qualified_team_ids?.includes(t.id);
                            const isPreferred = pref.preferred_team_ids?.includes(t.id);
                            if (!isQualified) return null;
                            return (
                              <span
                                key={t.id}
                                className="text-xs px-1.5 py-0.5 rounded border"
                                style={{
                                  backgroundColor: isPreferred ? t.color : "transparent",
                                  borderColor: t.color,
                                  color: isPreferred ? "white" : t.color,
                                }}
                              >
                                {t.name_he}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!proposals && unassignedPrefs.length === 0 && selectedAssigns.length === 0 && (
            <p className="text-sm text-slate-400">אין בקשות ליום זה</p>
          )}

          {!proposals && unassignedPrefs.length === 0 && selectedAssigns.length > 0 && (
            <p className="text-sm text-green-600">כל המבקשים שובצו ✓</p>
          )}
        </Card>
        </div>
      )}
    </div>
  );
}
