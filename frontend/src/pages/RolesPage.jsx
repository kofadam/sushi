import { useState, useEffect } from "react";
import { api } from "../api/client";
import {
  Layout, PageHeader, Card, Button, Badge,
  LoadingSpinner,
} from "../components/UI";
import { Shield, Check, X } from "lucide-react";

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/roles/"),
      api.get("/permissions/"),
    ]).then(([roleData, permData]) => {
      setRoles(roleData.results || []);
      setPermissions(permData.results || []);
      setLoading(false);
    });
  }, []);

  const togglePermission = async (role, permId) => {
    setSaving(true);
    const currentPerms = role.permissions || [];
    const newPerms = currentPerms.includes(permId)
      ? currentPerms.filter((p) => p !== permId)
      : [...currentPerms, permId];

    try {
      await api.patch(`/roles/${role.id}/`, { permissions: newPerms });
      const data = await api.get("/roles/");
      setRoles(data.results || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by category
  const permsByCategory = {};
  for (const p of permissions) {
    if (!permsByCategory[p.category]) permsByCategory[p.category] = [];
    permsByCategory[p.category].push(p);
  }

  const categoryLabels = {
    scheduling: "משמרות",
    portal: "פורטל",
    admin: "ניהול",
  };

  if (loading) return <Layout><LoadingSpinner /></Layout>;

  return (
    <Layout>
      <PageHeader
        title="הרשאות"
        subtitle="ניהול תפקידים והרשאות — מה כל תפקיד יכול לעשות"
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-right">
                <th className="p-4 font-medium text-slate-600 min-w-[200px]">הרשאה</th>
                {roles.map((r) => (
                  <th key={r.id} className="p-4 font-medium text-slate-900 text-center min-w-[120px]">
                    {r.name_he}
                    <p className="text-xs text-slate-400 font-normal mt-0.5">
                      {r.description_he}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(permsByCategory).map(([category, perms]) => (
                <>
                  <tr key={`cat-${category}`} className="bg-slate-25">
                    <td
                      colSpan={roles.length + 1}
                      className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100"
                    >
                      {categoryLabels[category] || category}
                    </td>
                  </tr>
                  {perms.map((perm) => (
                    <tr key={perm.id} className="border-b border-slate-100">
                      <td className="p-4">
                        <p className="font-medium text-slate-900">{perm.label_he}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{perm.description_he}</p>
                      </td>
                      {roles.map((role) => {
                        const hasIt = (role.permissions || []).includes(perm.id);
                        return (
                          <td key={role.id} className="p-4 text-center">
                            <button
                              onClick={() => togglePermission(role, perm.id)}
                              disabled={saving}
                              className={`w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors ${
                                hasIt
                                  ? "bg-green-100 text-green-600 hover:bg-green-200"
                                  : "bg-slate-100 text-slate-300 hover:bg-slate-200 hover:text-slate-500"
                              }`}
                            >
                              {hasIt ? <Check size={16} /> : <X size={16} />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Layout>
  );
}
