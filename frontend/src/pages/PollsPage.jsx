import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../api/client";
import {
  Layout, PageHeader, Card, Button, Badge,
  LoadingSpinner, EmptyState,
} from "../components/UI";
import { BarChart3, Plus, X } from "lucide-react";

export default function PollsPage() {
  const { hasPerm } = useAuth();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    question: "",
    options: ["", ""],
    allow_multiple: false,
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get("/polls/").then((data) => {
      setPolls(data.results || []);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const handleSubmit = async () => {
    const validOptions = form.options.filter((o) => o.trim());
    if (!form.question || validOptions.length < 2) return;
    setSaving(true);
    try {
      await api.post("/polls/", { ...form, options: validOptions });
      setForm({ question: "", options: ["", ""], allow_multiple: false });
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVote = async (pollId, optionId) => {
    const poll = polls.find((p) => p.id === pollId);
    if (!poll) return;

    let newVotes;
    if (poll.allow_multiple) {
      if (poll.my_votes.includes(optionId)) {
        newVotes = poll.my_votes.filter((v) => v !== optionId);
      } else {
        newVotes = [...poll.my_votes, optionId];
      }
    } else {
      newVotes = [optionId];
    }

    try {
      const updated = await api.post(`/polls/${pollId}/vote/`, {
        option_ids: newVotes,
      });
      setPolls((prev) => prev.map((p) => (p.id === pollId ? updated : p)));
    } catch (err) {
      alert(err.message);
    }
  };

  const addOption = () => {
    setForm({ ...form, options: [...form.options, ""] });
  };

  const updateOption = (idx, val) => {
    const opts = [...form.options];
    opts[idx] = val;
    setForm({ ...form, options: opts });
  };

  const removeOption = (idx) => {
    if (form.options.length <= 2) return;
    setForm({ ...form, options: form.options.filter((_, i) => i !== idx) });
  };

  if (loading) return <Layout><LoadingSpinner /></Layout>;

  return (
    <Layout>
      <PageHeader
        title="סקרים"
        subtitle="סקרים והצבעות לצוות"
        actions={
          hasPerm("manage_polls") && (
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus size={16} />
              סקר חדש
            </Button>
          )
        }
      />

      {showForm && (
        <Card className="p-6 mb-6 animate-fade-in">
          <h3 className="font-semibold text-slate-900 mb-4">סקר חדש</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="שאלה"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">אפשרויות</label>
              {form.options.map((opt, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`אפשרות ${idx + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  {form.options.length > 2 && (
                    <button
                      onClick={() => removeOption(idx)}
                      className="p-2 text-slate-400 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={addOption}>
                + הוסף אפשרות
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.allow_multiple}
                onChange={(e) => setForm({ ...form, allow_multiple: e.target.checked })}
                className="rounded"
              />
              אפשר בחירה מרובה
            </label>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowForm(false)}>ביטול</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "שומר..." : "פרסם"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {polls.length === 0 ? (
        <EmptyState icon={BarChart3} title="אין סקרים" description="טרם נוצרו סקרים" />
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} onVote={handleVote} />
          ))}
        </div>
      )}
    </Layout>
  );
}

function PollCard({ poll, onVote }) {
  const totalVotes = poll.options.reduce((sum, o) => sum + (o.vote_count || 0), 0);

  return (
    <Card className="p-6 animate-fade-in">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="font-semibold text-slate-900">{poll.question}</h3>
          <p className="text-xs text-slate-500 mt-1">
            {poll.author_name} · {poll.total_voters} הצביעו
            {poll.allow_multiple && " · בחירה מרובה"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {poll.options.map((opt) => {
          const isVoted = poll.my_votes?.includes(opt.id);
          const pct = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;

          return (
            <button
              key={opt.id}
              onClick={() => onVote(poll.id, opt.id)}
              className={`w-full text-right p-3 rounded-lg border transition-colors relative overflow-hidden ${
                isVoted
                  ? "border-brand-300 bg-brand-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* Progress bar background */}
              <div
                className="absolute inset-y-0 right-0 bg-brand-100/50 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between">
                <span className="text-sm text-slate-900">{opt.text}</span>
                <span className="text-sm font-medium text-slate-600">
                  {pct}% ({opt.vote_count})
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
