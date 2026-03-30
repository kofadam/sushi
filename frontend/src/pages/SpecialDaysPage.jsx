import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../api/client";
import {
  Layout, PageHeader, Card, Button, Badge,
  LoadingSpinner, EmptyState,
} from "../components/UI";
import { CalendarOff, Plus, X, Sun, Clock, TrendingDown } from "lucide-react";
import { getDayNameHe, getMonthNameHe } from "../utils/dates";

const DAY_TYPE_CONFIG = {
  off: { label: "יום חופש", icon: CalendarOff, color: "red", badgeColor: "bg-red-100 text-red-700" },
  half: { label: "חצי יום", icon: Clock, color: "orange", badgeColor: "bg-orange-100 text-orange-700" },
  reduced: { label: "קיבולת מופחתת", icon: TrendingDown, color: "yellow", badgeColor: "bg-yellow-100 text-yellow-700" },
};

export default function SpecialDaysPage() {
  const { hasPerm } = useAuth();
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDay, setEditingDay] = useState(null);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);

  const emptyForm = {
    date: "",
    day_type: "off",
    note: "",
    end_time: "13:00",
    capacity_percent: 50,
  };
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    api.get(`/special-days/?year=${viewYear}&month=${viewMonth}`).then((data) => {
      setDays(data.results || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(load, [viewYear, viewMonth]);

  const handleSubmit = async () => {
    if (!form.date || !form.day_type) return;
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        day_type: form.day_type,
        note: form.note,
        end_time: form.day_type === "half" ? form.end_time : null,
        capacity_percent:
          form.day_type === "off" ? 0 :
          form.day_type === "half" ? 50 :
          form.capacity_percent,
      };

      if (editingDay) {
        await api.put(`/special-days/${editingDay.id}/`, payload);
      } else {
        await api.post("/special-days/", payload);
      }
      setForm(emptyForm);
      setShowForm(false);
      setEditingDay(null);
      load();
    } catch (err) {
      alert("שגיאה: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (day) => {
    setForm({
      date: day.date,
      day_type: day.day_type,
      note: day.note || "",
      end_time: day.end_time || "13:00",
      capacity_percent: day.capacity_percent,
    });
    setEditingDay(day);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("למחוק יום מיוחד?")) return;
    await api.delete(`/special-days/${id}/`);
    load();
  };

  const canManage = hasPerm("manage_schedule");

  // Generate all working days for the month to show a mini-calendar
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const allDates = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(viewYear, viewMonth - 1, d);
    const dow = dt.getDay();
    if ([0, 1, 2, 3, 4].includes(dow)) { // Sun-Thu
      allDates.push({
        date: `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d,
        dayName: getDayNameHe(`${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`),
      });
    }
  }

  // Map special days by date for quick lookup
  const specialByDate = {};
  for (const sd of days) {
    specialByDate[sd.date] = sd;
  }

  if (loading) return <Layout><LoadingSpinner /></Layout>;

  return (
    <Layout>
      <PageHeader
        title="ימים מיוחדים"
        subtitle="חגים, חצאי ימים וימים עם קיבולת מופחתת"
        actions={
          canManage && (
            <Button onClick={() => { setEditingDay(null); setForm(emptyForm); setShowForm(!showForm); }}>
              <Plus size={16} />
              יום מיוחד חדש
            </Button>
          )
        }
      />

      {/* Month navigator */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => {
            if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
            else setViewMonth(viewMonth - 1);
          }}
          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm hover:bg-slate-50"
        >
          →
        </button>
        <span className="text-lg font-semibold text-slate-800">
          {getMonthNameHe(viewMonth)} {viewYear}
        </span>
        <button
          onClick={() => {
            if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
            else setViewMonth(viewMonth + 1);
          }}
          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm hover:bg-slate-50"
        >
          ←
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && canManage && (
        <Card className="p-6 mb-6 animate-fade-in">
          <h3 className="font-semibold text-slate-900 mb-4">
            {editingDay ? "עריכת יום מיוחד" : "הוספת יום מיוחד"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">תאריך</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">סוג</label>
              <select
                value={form.day_type}
                onChange={(e) => setForm({ ...form, day_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="off">🚫 יום חופש (סגור לגמרי)</option>
                <option value="half">🕐 חצי יום</option>
                <option value="reduced">📉 קיבולת מופחתת</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">הערה / סיבה</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="למשל: חג הפסח, ערב חג..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            {form.day_type === "half" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">שעת סיום</label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}
            {form.day_type === "reduced" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  אחוז קיבולת: {form.capacity_percent}%
                </label>
                <input
                  type="range"
                  min={10}
                  max={90}
                  step={10}
                  value={form.capacity_percent}
                  onChange={(e) => setForm({ ...form, capacity_percent: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="secondary" onClick={() => { setShowForm(false); setEditingDay(null); }}>
              ביטול
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "שומר..." : editingDay ? "עדכן" : "הוסף"}
            </Button>
          </div>
        </Card>
      )}

      {/* Calendar grid */}
      <Card className="p-6">
        <div className="space-y-2">
          {allDates.map(({ date, day, dayName }) => {
            const special = specialByDate[date];
            const isPast = date < new Date().toISOString().split("T")[0];
            const typeConfig = special ? DAY_TYPE_CONFIG[special.day_type] : null;

            return (
              <div
                key={date}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  special
                    ? special.day_type === "off"
                      ? "bg-red-50 border-red-200"
                      : special.day_type === "half"
                      ? "bg-orange-50 border-orange-200"
                      : "bg-yellow-50 border-yellow-200"
                    : isPast
                    ? "bg-slate-50 border-slate-100 opacity-50"
                    : "border-slate-100 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700 w-20">
                    {dayName} {day}/{viewMonth}
                  </span>
                  {special && (
                    <>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.badgeColor}`}>
                        {typeConfig.label}
                      </span>
                      {special.note && (
                        <span className="text-sm text-slate-600">{special.note}</span>
                      )}
                      {special.day_type === "half" && special.end_time && (
                        <span className="text-xs text-slate-400">עד {special.end_time}</span>
                      )}
                      {special.day_type === "reduced" && (
                        <span className="text-xs text-slate-400">{special.capacity_percent}% קיבולת</span>
                      )}
                    </>
                  )}
                </div>
                {canManage && !isPast && (
                  <div className="flex gap-1">
                    {special ? (
                      <>
                        <button
                          onClick={() => handleEdit(special)}
                          className="px-2 py-1 text-xs text-slate-500 hover:text-brand-600 rounded hover:bg-brand-50"
                        >
                          ערוך
                        </button>
                        <button
                          onClick={() => handleDelete(special.id)}
                          className="px-2 py-1 text-xs text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                        >
                          הסר
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingDay(null);
                          setForm({ ...emptyForm, date });
                          setShowForm(true);
                        }}
                        className="px-2 py-1 text-xs text-slate-400 hover:text-brand-600 rounded hover:bg-brand-50"
                      >
                        + סמן
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </Layout>
  );
}
