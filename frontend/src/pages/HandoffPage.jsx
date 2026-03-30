import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../api/client";
import {
  Layout, PageHeader, Card, Button, Badge, LoadingSpinner,
} from "../components/UI";
import {
  FileText, Plus, Sparkles, AlertCircle, ArrowUpCircle,
  CheckCircle2, Eye, Info, Trash2,
} from "lucide-react";

const CATEGORIES = [
  { value: "open", label: "תקלה פתוחה", icon: AlertCircle, color: "bg-red-100 text-red-700 border-red-200", dotColor: "bg-red-500" },
  { value: "escalation", label: "הסלמה", icon: ArrowUpCircle, color: "bg-orange-100 text-orange-700 border-orange-200", dotColor: "bg-orange-500" },
  { value: "resolved", label: "טופל", icon: CheckCircle2, color: "bg-green-100 text-green-700 border-green-200", dotColor: "bg-green-500" },
  { value: "heads_up", label: "שים לב", icon: Eye, color: "bg-yellow-100 text-yellow-700 border-yellow-200", dotColor: "bg-yellow-500" },
  { value: "info", label: "מידע כללי", icon: Info, color: "bg-blue-100 text-blue-700 border-blue-200", dotColor: "bg-blue-500" },
];

const SEVERITIES = [
  { value: "low", label: "נמוך", color: "bg-slate-100 text-slate-600" },
  { value: "medium", label: "בינוני", color: "bg-yellow-100 text-yellow-700" },
  { value: "high", label: "גבוה", color: "bg-red-100 text-red-700" },
];

export default function HandoffPage() {
  const { user, hasPerm } = useAuth();
  const [teams, setTeams] = useState([]);
  const [notes, setNotes] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState("all");

  // Quick-add form
  const [form, setForm] = useState({
    category: "open",
    severity: "medium",
    team: "",
    ticket_number: "",
    description: "",
  });

  const load = async () => {
    try {
      const [teamData, noteData, summaryData] = await Promise.all([
        api.get("/teams/"),
        api.get(`/shift-notes/?date=${selectedDate}`),
        api.get(`/handoff-summaries/?date=${selectedDate}`),
      ]);
      const teamList = teamData.results || [];
      setTeams(teamList);
      setNotes(noteData.results || []);
      setSummaries(summaryData.results || []);
      // Default team to user's first qualified team
      if (!form.team && user?.qualified_teams_detail?.length > 0) {
        setForm((f) => ({ ...f, team: String(user.qualified_teams_detail[0].id) }));
      } else if (!form.team && teamList.length > 0) {
        setForm((f) => ({ ...f, team: String(teamList[0].id) }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedDate]);

  const addNote = async () => {
    if (!form.description.trim() || !form.team) return;
    setSaving(true);
    try {
      await api.post("/shift-notes/", {
        date: selectedDate,
        team: parseInt(form.team),
        category: form.category,
        severity: form.severity,
        ticket_number: form.ticket_number,
        description: form.description.trim(),
      });
      setForm((f) => ({ ...f, ticket_number: "", description: "" }));
      load();
    } catch (err) {
      alert("שגיאה: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (id) => {
    try {
      await api.delete(`/shift-notes/${id}/`);
      load();
    } catch (err) {
      alert("שגיאה: " + err.message);
    }
  };

  const generateSummary = async (teamId) => {
    setGenerating(true);
    try {
      const payload = { date: selectedDate };
      if (teamId) payload.team_id = teamId;
      const data = await api.post("/handoff-summaries/generate/", payload);
      load();
    } catch (err) {
      alert("שגיאה: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const filteredNotes = selectedTeamFilter === "all"
    ? notes
    : notes.filter((n) => String(n.team) === selectedTeamFilter);

  const getCat = (val) => CATEGORIES.find((c) => c.value === val) || CATEGORIES[0];
  const getSev = (val) => SEVERITIES.find((s) => s.value === val) || SEVERITIES[1];

  if (loading) return <Layout><LoadingSpinner /></Layout>;

  return (
    <Layout>
      <PageHeader
        title="סיכום משמרת"
        subtitle="הערות מהירות וסיכום AI למשמרת הבאה"
      />

      {/* Date + quick stats */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">תאריך:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
          />
        </div>
        <Badge color={notes.length > 0 ? "blue" : "gray"}>
          {notes.length} הערות
        </Badge>
        <Badge color={summaries.length > 0 ? "green" : "gray"}>
          {summaries.length} סיכומים
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Quick-add note */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Plus size={18} className="text-brand-600" />
              הוספת הערה מהירה
            </h3>

            {/* Category — tap to select */}
            <div className="flex flex-wrap gap-2 mb-3">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const active = form.category === cat.value;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setForm({ ...form, category: cat.value })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      active ? cat.color + " ring-2 ring-offset-1 ring-current" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={14} />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Severity — tap to select */}
            <div className="flex gap-2 mb-3">
              {SEVERITIES.map((sev) => (
                <button
                  key={sev.value}
                  onClick={() => setForm({ ...form, severity: sev.value })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    form.severity === sev.value ? sev.color + " ring-2 ring-offset-1 ring-current" : "bg-white border-slate-200 text-slate-400"
                  }`}
                >
                  {sev.label}
                </button>
              ))}
            </div>

            {/* Team + Ticket */}
            <div className="flex gap-2 mb-3">
              <select
                value={form.team}
                onChange={(e) => setForm({ ...form, team: e.target.value })}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name_he}</option>
                ))}
              </select>
              <input
                type="text"
                value={form.ticket_number}
                onChange={(e) => setForm({ ...form, ticket_number: e.target.value })}
                placeholder="# קריאה (אופציונלי)"
                className="w-36 px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>

            {/* Description */}
            <div className="flex gap-2">
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addNote()}
                placeholder="תיאור קצר..."
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                autoFocus
              />
              <Button onClick={addNote} disabled={saving || !form.description.trim()}>
                {saving ? "..." : "הוסף"}
              </Button>
            </div>
          </Card>

          {/* Notes list */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <FileText size={18} className="text-slate-500" />
                הערות היום
              </h3>
              <select
                value={selectedTeamFilter}
                onChange={(e) => setSelectedTeamFilter(e.target.value)}
                className="text-xs px-2 py-1 border border-slate-200 rounded-lg"
              >
                <option value="all">כל הצוותות</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name_he}</option>
                ))}
              </select>
            </div>

            {filteredNotes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">אין הערות עדיין</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredNotes.map((note) => {
                  const cat = getCat(note.category);
                  const sev = getSev(note.severity);
                  return (
                    <div
                      key={note.id}
                      className={`flex items-start gap-2 p-3 rounded-lg border ${cat.color} bg-opacity-50`}
                    >
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cat.dotColor}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium">{cat.label}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${sev.color}`}>{sev.label}</span>
                          {note.ticket_number && (
                            <span className="text-xs text-slate-500">#{note.ticket_number}</span>
                          )}
                          <span className="text-xs text-slate-400">{note.team_name}</span>
                        </div>
                        <p className="text-sm mt-1">{note.description}</p>
                        <p className="text-xs text-slate-400 mt-1">{note.author_name}</p>
                      </div>
                      {note.author === user?.id && (
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right: Summaries */}
        <div className="space-y-4">
          {/* Generate buttons */}
          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Sparkles size={18} className="text-purple-500" />
              סיכום AI
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              הפק סיכום חכם מכל ההערות — לפי צוות או סקירה כוללת
            </p>
            <div className="flex flex-wrap gap-2">
              {teams.map((t) => {
                const teamNotes = notes.filter((n) => n.team === t.id);
                return (
                  <Button
                    key={t.id}
                    variant="secondary"
                    onClick={() => generateSummary(t.id)}
                    disabled={generating || teamNotes.length === 0}
                    className="text-sm"
                  >
                    {t.name_he} ({teamNotes.length})
                  </Button>
                );
              })}
              <Button
                onClick={() => generateSummary(null)}
                disabled={generating || notes.length === 0}
                className="!bg-purple-600 hover:!bg-purple-700 text-sm"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    מסכם...
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Sparkles size={14} />
                    סקירה כוללת ({notes.length})
                  </span>
                )}
              </Button>
            </div>
          </Card>

          {/* Existing summaries */}
          {summaries.length > 0 ? (
            summaries.map((s) => (
              <Card key={s.id} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-500" />
                    <h4 className="font-semibold text-slate-800">
                      {s.scope === "daily" ? "סקירה יומית" : s.team_name}
                    </h4>
                    <Badge color="purple">{s.notes_count} הערות</Badge>
                  </div>
                  <span className="text-xs text-slate-400">
                    {s.compiled_by_name}
                  </span>
                </div>
                <div className="prose prose-sm max-w-none text-slate-700 bg-purple-50/30 rounded-xl p-4 border border-purple-100 whitespace-pre-wrap leading-relaxed">
                  {s.summary_text}
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center">
              <Sparkles size={32} className="mx-auto text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">
                הוסף הערות ולחץ "סקירה כוללת" להפקת סיכום AI
              </p>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
