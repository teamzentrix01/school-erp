"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Bus, MapPin, Users, Plus, Pencil, Trash2, Loader2, X,
  Save, Route, UserPlus, RefreshCw, IndianRupee,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function getToken() {
  if (typeof document === "undefined") return "";
  return document.cookie.match(/(^| )token=([^;]+)/)?.[2] || "";
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}/api/admin/transport${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

const EMPTY = {
  route: {
    route_code: "", name: "", area: "", stops: "", vehicle_id: "",
    departure_time: "", return_time: "", distance_km: "", monthly_fee: "",
    status: "Active",
  },
  vehicle: {
    registration_number: "", type: "Bus", model: "", capacity: 40,
    driver_name: "", driver_phone: "", conductor_name: "",
    status: "Active", last_service_date: "",
  },
  assignment: {
    student_id: "", route_id: "", stop_name: "", pickup_time: "",
    drop_time: "", monthly_fee: "",
  },
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function EditorModal({ modal, vehicles, routes, students, onClose, onSave }) {
  const type = modal.type;
  const initial = modal.data || EMPTY[type];
  const [form, setForm] = useState(() => ({
    ...EMPTY[type],
    ...initial,
    stops: type === "route"
      ? (Array.isArray(initial.stops) ? initial.stops.join(", ") : initial.stops || "")
      : undefined,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200";
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const selectedRoute = routes.find((route) => String(route.id) === String(form.route_id));

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        ...(type === "route"
          ? { stops: String(form.stops || "").split(",").map((item) => item.trim()).filter(Boolean) }
          : {}),
      };
      await onSave(type, payload, initial.id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-2xl">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">
              {initial.id ? "Edit" : "Add"} {type === "route" ? "Route" : type === "vehicle" ? "Vehicle" : "Student Assignment"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Changes are saved directly to the school database.</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 grid sm:grid-cols-2 gap-4">
          {type === "route" && (
            <>
              <Field label="Route code">
                <input className={inputClass} value={form.route_code} onChange={(e) => set("route_code", e.target.value)} placeholder="RT-001" />
              </Field>
              <Field label="Route name">
                <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="North Campus Route" />
              </Field>
              <Field label="Area">
                <input className={inputClass} value={form.area || ""} onChange={(e) => set("area", e.target.value)} placeholder="North Zone" />
              </Field>
              <Field label="Vehicle">
                <select className={inputClass} value={form.vehicle_id || ""} onChange={(e) => set("vehicle_id", e.target.value)}>
                  <option value="">No vehicle assigned</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>{vehicle.registration_number}</option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Stops, comma separated">
                  <textarea className={`${inputClass} min-h-20`} value={form.stops || ""} onChange={(e) => set("stops", e.target.value)} placeholder="Civil Lines, Model Town, School Gate" />
                </Field>
              </div>
              <Field label="Departure time">
                <input type="time" className={inputClass} value={form.departure_time || ""} onChange={(e) => set("departure_time", e.target.value)} />
              </Field>
              <Field label="Return time">
                <input type="time" className={inputClass} value={form.return_time || ""} onChange={(e) => set("return_time", e.target.value)} />
              </Field>
              <Field label="Distance (km)">
                <input type="number" min="0" className={inputClass} value={form.distance_km || ""} onChange={(e) => set("distance_km", e.target.value)} />
              </Field>
              <Field label="Monthly fee">
                <input type="number" min="0" className={inputClass} value={form.monthly_fee || ""} onChange={(e) => set("monthly_fee", e.target.value)} />
              </Field>
              <Field label="Status">
                <select className={inputClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option>Active</option><option>Inactive</option><option>Under Maintenance</option>
                </select>
              </Field>
            </>
          )}

          {type === "vehicle" && (
            <>
              <Field label="Registration number">
                <input className={inputClass} value={form.registration_number} onChange={(e) => set("registration_number", e.target.value)} placeholder="UP-32-AB-1234" />
              </Field>
              <Field label="Vehicle type">
                <select className={inputClass} value={form.type} onChange={(e) => set("type", e.target.value)}>
                  <option>Bus</option><option>Mini Bus</option><option>Van</option>
                </select>
              </Field>
              <Field label="Model">
                <input className={inputClass} value={form.model || ""} onChange={(e) => set("model", e.target.value)} />
              </Field>
              <Field label="Capacity">
                <input type="number" min="1" className={inputClass} value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
              </Field>
              <Field label="Driver name">
                <input className={inputClass} value={form.driver_name || ""} onChange={(e) => set("driver_name", e.target.value)} />
              </Field>
              <Field label="Driver phone">
                <input className={inputClass} value={form.driver_phone || ""} onChange={(e) => set("driver_phone", e.target.value)} />
              </Field>
              <Field label="Conductor name">
                <input className={inputClass} value={form.conductor_name || ""} onChange={(e) => set("conductor_name", e.target.value)} />
              </Field>
              <Field label="Last service date">
                <input type="date" className={inputClass} value={form.last_service_date?.slice?.(0, 10) || ""} onChange={(e) => set("last_service_date", e.target.value)} />
              </Field>
              <Field label="Status">
                <select className={inputClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option>Active</option><option>Inactive</option><option>Under Maintenance</option>
                </select>
              </Field>
            </>
          )}

          {type === "assignment" && (
            <>
              <Field label="Student">
                <select className={inputClass} value={form.student_id} onChange={(e) => set("student_id", e.target.value)}>
                  <option value="">Select student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} - {student.class}-{student.section}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Route">
                <select
                  className={inputClass}
                  value={form.route_id}
                  onChange={(e) => {
                    const route = routes.find((item) => String(item.id) === e.target.value);
                    setForm((current) => ({
                      ...current,
                      route_id: e.target.value,
                      monthly_fee: route?.monthly_fee || current.monthly_fee,
                      stop_name: "",
                    }));
                  }}
                >
                  <option value="">Select route</option>
                  {routes.filter((route) => route.status === "Active").map((route) => (
                    <option key={route.id} value={route.id}>{route.route_code} - {route.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Pickup stop">
                <select className={inputClass} value={form.stop_name} onChange={(e) => set("stop_name", e.target.value)}>
                  <option value="">Select stop</option>
                  {(selectedRoute?.stops || []).map((stop) => <option key={stop}>{stop}</option>)}
                </select>
              </Field>
              <Field label="Monthly fee">
                <input type="number" min="0" className={inputClass} value={form.monthly_fee} onChange={(e) => set("monthly_fee", e.target.value)} />
              </Field>
              <Field label="Pickup time">
                <input type="time" className={inputClass} value={form.pickup_time || ""} onChange={(e) => set("pickup_time", e.target.value)} />
              </Field>
              <Field label="Drop time">
                <input type="time" className={inputClass} value={form.drop_time || ""} onChange={(e) => set("drop_time", e.target.value)} />
              </Field>
            </>
          )}
        </div>

        {error && <p className="mx-5 mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TransportPage() {
  const [data, setData] = useState({ routes: [], vehicles: [], assignments: [], students: [] });
  const [tab, setTab] = useState("routes");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await apiFetch(""));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (type, form, id) => {
    if (type === "assignment") {
      await apiFetch("/assignments", { method: "POST", body: JSON.stringify(form) });
    } else {
      const segment = type === "route" ? "routes" : "vehicles";
      await apiFetch(`/${segment}${id ? `/${id}` : ""}`, {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
    }
    await load();
  };

  const remove = async (segment, id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await apiFetch(`/${segment}/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const stats = useMemo(() => ({
    activeRoutes: data.routes.filter((route) => route.status === "Active").length,
    seats: data.vehicles.reduce((sum, vehicle) => sum + Number(vehicle.capacity || 0), 0),
    students: data.assignments.filter((assignment) => assignment.active).length,
    monthly: data.assignments.reduce((sum, assignment) => sum + Number(assignment.monthly_fee || 0), 0),
  }), [data]);

  const tabs = [
    { key: "routes", label: "Routes", icon: Route },
    { key: "vehicles", label: "Vehicles", icon: Bus },
    { key: "assignments", label: "Student Assignments", icon: Users },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <header className="bg-white border-b border-gray-100 px-5 lg:px-8 py-5">
          <div className="pl-10 lg:pl-0 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Transport Management</h1>
              <p className="text-sm text-gray-500 mt-1">Routes, fleet, stops, students, and transport fees.</p>
            </div>
            <button onClick={load} className="p-2.5 rounded-lg border border-gray-200 text-gray-500" title="Refresh">
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        <div className="p-5 lg:p-8 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ["Active Routes", stats.activeRoutes, MapPin],
              ["Fleet Seats", stats.seats, Bus],
              ["Students", stats.students, Users],
              ["Monthly Billing", `Rs ${stats.monthly.toLocaleString("en-IN")}`, IndianRupee],
            ].map(([label, value, Icon]) => (
              <div key={label} className="bg-white border border-gray-100 rounded-lg p-4">
                <Icon size={17} className="text-blue-600 mb-3" />
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setTab(key)} className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 ${tab === key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500"}`}>
                  <Icon size={15} />{label}
                </button>
              ))}
            </div>
            <button onClick={() => setModal({ type: tab === "assignments" ? "assignment" : tab.slice(0, -1) })} className="mb-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold flex items-center gap-2 whitespace-nowrap">
              {tab === "assignments" ? <UserPlus size={15} /> : <Plus size={15} />} Add
            </button>
          </div>

          {error && <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
          {loading ? (
            <div className="py-24 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-lg overflow-x-auto">
              {tab === "routes" && (
                <table className="w-full text-sm min-w-[850px]">
                  <thead className="bg-gray-50 text-xs text-gray-500"><tr>{["Route", "Stops", "Vehicle", "Timing", "Fee", "Occupancy", "Status", ""].map((item) => <th key={item} className="text-left px-4 py-3">{item}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.routes.map((route) => (
                      <tr key={route.id}>
                        <td className="px-4 py-3"><p className="font-semibold text-gray-900">{route.name}</p><p className="text-xs text-gray-400">{route.route_code} {route.area ? `- ${route.area}` : ""}</p></td>
                        <td className="px-4 py-3 text-gray-600">{route.stops?.length || 0}</td>
                        <td className="px-4 py-3 text-gray-600">{route.registration_number || "Unassigned"}</td>
                        <td className="px-4 py-3 text-gray-600">{route.departure_time?.slice(0, 5) || "-"} / {route.return_time?.slice(0, 5) || "-"}</td>
                        <td className="px-4 py-3 font-semibold">Rs {Number(route.monthly_fee || 0).toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3">{route.enrolled}/{route.vehicle_capacity || 0}</td>
                        <td className="px-4 py-3"><span className="text-xs font-semibold bg-gray-100 px-2 py-1 rounded-full">{route.status}</span></td>
                        <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => setModal({ type: "route", data: route })} className="p-2 text-blue-600"><Pencil size={14} /></button><button onClick={() => remove("routes", route.id)} className="p-2 text-red-500"><Trash2 size={14} /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === "vehicles" && (
                <table className="w-full text-sm min-w-[750px]">
                  <thead className="bg-gray-50 text-xs text-gray-500"><tr>{["Vehicle", "Model", "Driver", "Capacity", "Last Service", "Status", ""].map((item) => <th key={item} className="text-left px-4 py-3">{item}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.vehicles.map((vehicle) => (
                      <tr key={vehicle.id}>
                        <td className="px-4 py-3"><p className="font-semibold">{vehicle.registration_number}</p><p className="text-xs text-gray-400">{vehicle.type}</p></td>
                        <td className="px-4 py-3 text-gray-600">{vehicle.model || "-"}</td>
                        <td className="px-4 py-3"><p>{vehicle.driver_name || "-"}</p><p className="text-xs text-gray-400">{vehicle.driver_phone}</p></td>
                        <td className="px-4 py-3">{vehicle.capacity}</td>
                        <td className="px-4 py-3 text-gray-600">{vehicle.last_service_date?.slice(0, 10) || "-"}</td>
                        <td className="px-4 py-3"><span className="text-xs font-semibold bg-gray-100 px-2 py-1 rounded-full">{vehicle.status}</span></td>
                        <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => setModal({ type: "vehicle", data: vehicle })} className="p-2 text-blue-600"><Pencil size={14} /></button><button onClick={() => remove("vehicles", vehicle.id)} className="p-2 text-red-500"><Trash2 size={14} /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === "assignments" && (
                <table className="w-full text-sm min-w-[800px]">
                  <thead className="bg-gray-50 text-xs text-gray-500"><tr>{["Student", "Class", "Route", "Stop", "Timing", "Monthly Fee", ""].map((item) => <th key={item} className="text-left px-4 py-3">{item}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.assignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td className="px-4 py-3"><p className="font-semibold">{assignment.student_name}</p><p className="text-xs text-gray-400">{assignment.roll_number}</p></td>
                        <td className="px-4 py-3">{assignment.class}-{assignment.section}</td>
                        <td className="px-4 py-3">{assignment.route_code} - {assignment.route_name}</td>
                        <td className="px-4 py-3">{assignment.stop_name}</td>
                        <td className="px-4 py-3 text-gray-600">{assignment.pickup_time?.slice(0, 5) || "-"} / {assignment.drop_time?.slice(0, 5) || "-"}</td>
                        <td className="px-4 py-3 font-semibold">Rs {Number(assignment.monthly_fee || 0).toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3"><button onClick={() => remove("assignments", assignment.id)} className="p-2 text-red-500"><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </main>

      {modal && (
        <EditorModal
          modal={modal}
          vehicles={data.vehicles}
          routes={data.routes}
          students={data.students}
          onClose={() => setModal(null)}
          onSave={save}
        />
      )}
    </div>
  );
}
