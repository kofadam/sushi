import { useState, useEffect } from "react";
import { api } from "../api/client";
import {
  Layout, PageHeader, Card, Button, Badge,
  LoadingSpinner, EmptyState,
} from "../components/UI";
import { Users, Search } from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/users/"),
      api.get("/roles/"),
      api.get("/teams/"),
    ]).then(([userData, roleData, teamData]) => {
      setUsers(userData.results || []);
      setRoles(roleData.results || []);
      setTeams(teamData.results || []);
      setLoading(false);
    });
  }, []);

  const handleRoleChange = async (userId, roleId) => {
    try {
      await api.patch(`/users/${userId}/set_role/`, { role_id: roleId });
      // Refresh
      const data = await api.get("/users/");
      setUsers(data.results || []);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTeamToggle = async (userId, currentTeamIds, teamId) => {
    const newIds = currentTeamIds.includes(teamId)
      ? currentTeamIds.filter((t) => t !== teamId)
      : [...currentTeamIds, teamId];
    try {
      await api.patch(`/users/${userId}/set_teams/`, { team_ids: newIds });
      const data = await api.get("/users/");
      setUsers(data.results || []);
    } catch (err) {
      alert(err.message);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.employee_id?.toLowerCase().includes(q)
    );
  });

  if (loading) return <Layout><LoadingSpinner /></Layout>;

  return (
    <Layout>
      <PageHeader title="עובדים" subtitle={`${users.length} עובדים פעילים`} />

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="חפש עובד..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-right">
                <th className="p-3 font-medium text-slate-600">שם</th>
                <th className="p-3 font-medium text-slate-600">מספר עובד</th>
                <th className="p-3 font-medium text-slate-600">תפקיד</th>
                <th className="p-3 font-medium text-slate-600">צוותות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                        {u.first_name?.[0] || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {u.first_name} {u.last_name}
                        </p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-slate-600">{u.employee_id || "—"}</td>
                  <td className="p-3">
                    <select
                      value={u.role || ""}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">ללא תפקיד</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name_he}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1 flex-wrap">
                      {teams.map((t) => {
                        const isAssigned = (u.qualified_team_ids || []).includes(t.id);
                        return (
                          <button
                            key={t.id}
                            onClick={() =>
                              handleTeamToggle(u.id, u.qualified_team_ids || [], t.id)
                            }
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              isAssigned
                                ? "text-white"
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            }`}
                            style={isAssigned ? { backgroundColor: t.color } : {}}
                          >
                            {t.name_he}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Layout>
  );
}
