import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../api/client";
import {
  Layout, PageHeader, Card, Button, Badge,
  LoadingSpinner, EmptyState,
} from "../components/UI";
import { Megaphone, Plus, Pin, X } from "lucide-react";

export default function AnnouncementsPage() {
  const { hasPerm } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", is_pinned: false });
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get("/announcements/").then((data) => {
      setAnnouncements(data.results || []);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const handleSubmit = async () => {
    if (!form.title || !form.body) return;
    setSaving(true);
    try {
      await api.post("/announcements/", form);
      setForm({ title: "", body: "", is_pinned: false });
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("למחוק הודעה?")) return;
    await api.delete(`/announcements/${id}/`);
    load();
  };

  if (loading) return <Layout><LoadingSpinner /></Layout>;

  return (
    <Layout>
      <PageHeader
        title="הודעות"
        subtitle="הודעות היום ועדכונים לצוות"
        actions={
          hasPerm("manage_announcements") && (
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus size={16} />
              הודעה חדשה
            </Button>
          )
        }
      />

      {showForm && (
        <Card className="p-6 mb-6 animate-fade-in">
          <h3 className="font-semibold text-slate-900 mb-4">הודעה חדשה</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="כותרת"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <textarea
              placeholder="תוכן ההודעה..."
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.is_pinned}
                  onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
                  className="rounded"
                />
                <Pin size={14} />
                נעוץ
              </label>
              <div className="flex-1" />
              <Button variant="secondary" onClick={() => setShowForm(false)}>ביטול</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "שומר..." : "פרסם"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="אין הודעות"
          description="טרם פורסמו הודעות"
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <Card key={a.id} className="p-6 animate-fade-in">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900">{a.title}</h3>
                    {a.is_pinned && <Badge color="yellow">נעוץ</Badge>}
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{a.body}</p>
                  <p className="text-xs text-slate-400 mt-3">
                    {a.author_name} · {new Date(a.created_at).toLocaleDateString("he-IL")}
                  </p>
                </div>
                {hasPerm("manage_announcements") && (
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-1 text-slate-400 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
