import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../api/client";
import {
  Layout, PageHeader, Card, Button, Badge,
  LoadingSpinner, EmptyState,
} from "../components/UI";
import { ClipboardCheck, Plus, Check } from "lucide-react";

export default function TasksPage() {
  const { hasPerm } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", date: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get(`/tasks/?date=${selectedDate}`).then((data) => {
      setTasks(data.results || []);
      setLoading(false);
    });
  };

  useEffect(load, [selectedDate]);

  const handleSubmit = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      await api.post("/tasks/", {
        ...form,
        date: form.date || selectedDate,
      });
      setForm({ title: "", description: "", date: "" });
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleComplete = async (task) => {
    try {
      if (task.is_completed_by_me) {
        await api.post(`/tasks/${task.id}/uncomplete/`, {});
      } else {
        await api.post(`/tasks/${task.id}/complete/`, {});
      }
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <Layout><LoadingSpinner /></Layout>;

  return (
    <Layout>
      <PageHeader
        title="משימות יומיות"
        subtitle="רשימת משימות לביצוע"
        actions={
          hasPerm("manage_tasks") && (
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus size={16} />
              משימה חדשה
            </Button>
          )
        }
      />

      {/* Date selector */}
      <div className="flex items-center gap-4 mb-6">
        <label className="text-sm font-medium text-slate-700">תאריך:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {showForm && (
        <Card className="p-6 mb-6 animate-fade-in">
          <h3 className="font-semibold text-slate-900 mb-4">משימה חדשה</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="שם המשימה"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <textarea
              placeholder="פירוט (אופציונלי)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowForm(false)}>ביטול</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "שומר..." : "הוסף"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {tasks.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="אין משימות"
          description={`אין משימות לתאריך ${selectedDate}`}
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className="p-4 animate-fade-in">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => handleToggleComplete(task)}
                  className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    task.is_completed_by_me
                      ? "border-green-500 bg-green-500"
                      : "border-slate-300 hover:border-green-400"
                  }`}
                >
                  {task.is_completed_by_me && <Check size={14} className="text-white" />}
                </button>
                <div className="flex-1">
                  <p
                    className={`font-medium ${
                      task.is_completed_by_me
                        ? "text-slate-400 line-through"
                        : "text-slate-900"
                    }`}
                  >
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-sm text-slate-500 mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-slate-400">
                      נוצר ע״י {task.created_by_name}
                    </span>
                    {task.completions?.length > 0 && (
                      <span className="text-xs text-green-600">
                        {task.completions.length} ביצעו
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
