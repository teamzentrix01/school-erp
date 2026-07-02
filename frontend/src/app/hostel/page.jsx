"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { apiFetch as request } from "@/lib/api";
import {
  BedDouble,
  Building2,
  ClipboardCheck,
  DoorOpen,
  IndianRupee,
  Loader2,
  MessageSquareWarning,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

const apiFetch = (path, options = {}) =>
  request(`/admin/hostel${path}`, options);

const EMPTY = {
  hostel: {
    name: "",
    hostel_type: "Boys",
    address: "",
    warden_name: "",
    warden_phone: "",
    capacity: 0,
    status: "Active",
  },
  room: {
    hostel_id: "",
    room_number: "",
    floor: "",
    room_type: "Dorm",
    total_beds: 4,
    monthly_fee: "",
    mess_fee: "",
    status: "Available",
  },
  allocation: {
    student_id: "",
    hostel_id: "",
    room_id: "",
    bed_id: "",
    hostel_fee: "",
    mess_fee: "",
    security_deposit: "",
    join_date: "",
    guardian_contact: "",
    emergency_contact: "",
    notes: "",
  },
  leave: {
    allocation_id: "",
    student_id: "",
    from_date: "",
    to_date: "",
    reason: "",
  },
  complaint: {
    allocation_id: "",
    student_id: "",
    category: "General",
    priority: "Medium",
    description: "",
    assigned_to: "",
  },
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatusPill({ value }) {
  const tone =
    value === "Active" || value === "Approved" || value === "Resolved"
      ? "bg-emerald-50 text-emerald-700"
      : value === "Pending" || value === "Open" || value === "In Progress"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>
      {value || "-"}
    </span>
  );
}

function EditorModal({ modal, data, onClose, onSave }) {
  const type = modal.type;
  const initial = modal.data || EMPTY[type];
  const [form, setForm] = useState(() => ({ ...EMPTY[type], ...initial }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputClass =
    "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const rooms = data.rooms.filter(
    (room) =>
      !form.hostel_id || String(room.hostel_id) === String(form.hostel_id),
  );
  const selectedRoom = data.rooms.find(
    (room) => String(room.id) === String(form.room_id),
  );
  const beds = data.beds.filter(
    (bed) =>
      String(bed.room_id) === String(form.room_id) &&
      (bed.status === "Available" ||
        String(bed.id) === String(initial.bed_id || "")),
  );
  const allocationOptions = data.allocations.filter(
    (item) => item.status === "Active",
  );

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave(type, form, initial.id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-900">
              {initial.id ? "Edit" : "Add"}{" "}
              {type === "hostel"
                ? "Hostel"
                : type === "room"
                  ? "Room"
                  : type === "allocation"
                    ? "Student Allocation"
                    : type === "leave"
                      ? "Leave Request"
                      : "Complaint"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Saved directly to the school database.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {type === "hostel" && (
            <>
              <Field label="Hostel name">
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Boys Hostel A"
                />
              </Field>
              <Field label="Type">
                <select
                  className={inputClass}
                  value={form.hostel_type}
                  onChange={(e) => set("hostel_type", e.target.value)}
                >
                  <option>Boys</option>
                  <option>Girls</option>
                  <option>Staff</option>
                  <option>Mixed</option>
                </select>
              </Field>
              <Field label="Warden name">
                <input
                  className={inputClass}
                  value={form.warden_name || ""}
                  onChange={(e) => set("warden_name", e.target.value)}
                />
              </Field>
              <Field label="Warden phone">
                <input
                  className={inputClass}
                  value={form.warden_phone || ""}
                  onChange={(e) => set("warden_phone", e.target.value)}
                />
              </Field>
              <Field label="Capacity">
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={form.capacity || ""}
                  onChange={(e) => set("capacity", e.target.value)}
                />
              </Field>
              <Field label="Status">
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  <option>Active</option>
                  <option>Inactive</option>
                  <option>Maintenance</option>
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address">
                  <textarea
                    className={`${inputClass} min-h-20`}
                    value={form.address || ""}
                    onChange={(e) => set("address", e.target.value)}
                  />
                </Field>
              </div>
            </>
          )}

          {type === "room" && (
            <>
              <Field label="Hostel">
                <select
                  className={inputClass}
                  value={form.hostel_id}
                  onChange={(e) => set("hostel_id", e.target.value)}
                >
                  <option value="">Select hostel</option>
                  {data.hostels.map((hostel) => (
                    <option key={hostel.id} value={hostel.id}>
                      {hostel.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Room number">
                <input
                  className={inputClass}
                  value={form.room_number}
                  onChange={(e) => set("room_number", e.target.value)}
                  placeholder="A-101"
                />
              </Field>
              <Field label="Floor / Block">
                <input
                  className={inputClass}
                  value={form.floor || ""}
                  onChange={(e) => set("floor", e.target.value)}
                />
              </Field>
              <Field label="Room type">
                <select
                  className={inputClass}
                  value={form.room_type}
                  onChange={(e) => set("room_type", e.target.value)}
                >
                  <option>Single</option>
                  <option>Double</option>
                  <option>Triple</option>
                  <option>Dorm</option>
                </select>
              </Field>
              <Field label="Total beds">
                <input
                  type="number"
                  min="1"
                  className={inputClass}
                  value={form.total_beds}
                  onChange={(e) => set("total_beds", e.target.value)}
                />
              </Field>
              <Field label="Room status">
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  <option>Available</option>
                  <option>Full</option>
                  <option>Maintenance</option>
                </select>
              </Field>
              <Field label="Hostel fee">
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={form.monthly_fee || ""}
                  onChange={(e) => set("monthly_fee", e.target.value)}
                />
              </Field>
              <Field label="Mess fee">
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={form.mess_fee || ""}
                  onChange={(e) => set("mess_fee", e.target.value)}
                />
              </Field>
            </>
          )}

          {type === "allocation" && (
            <>
              <Field label="Student">
                <select
                  className={inputClass}
                  value={form.student_id}
                  onChange={(e) => set("student_id", e.target.value)}
                >
                  <option value="">Select student</option>
                  {data.students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} - {student.class}-{student.section}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Hostel">
                <select
                  className={inputClass}
                  value={form.hostel_id}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      hostel_id: e.target.value,
                      room_id: "",
                      bed_id: "",
                    }))
                  }
                >
                  <option value="">Select hostel</option>
                  {data.hostels
                    .filter((hostel) => hostel.status === "Active")
                    .map((hostel) => (
                      <option key={hostel.id} value={hostel.id}>
                        {hostel.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Room">
                <select
                  className={inputClass}
                  value={form.room_id}
                  onChange={(e) => {
                    const room = data.rooms.find(
                      (item) => String(item.id) === e.target.value,
                    );
                    setForm((current) => ({
                      ...current,
                      room_id: e.target.value,
                      bed_id: "",
                      hostel_fee: room?.monthly_fee || current.hostel_fee,
                      mess_fee: room?.mess_fee || current.mess_fee,
                    }));
                  }}
                >
                  <option value="">Select room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.room_number} - {room.occupied_count}/
                      {room.total_beds}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Bed">
                <select
                  className={inputClass}
                  value={form.bed_id}
                  onChange={(e) => set("bed_id", e.target.value)}
                >
                  <option value="">Select bed</option>
                  {beds.map((bed) => (
                    <option key={bed.id} value={bed.id}>
                      {bed.bed_label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Hostel fee">
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={form.hostel_fee || selectedRoom?.monthly_fee || ""}
                  onChange={(e) => set("hostel_fee", e.target.value)}
                />
              </Field>
              <Field label="Mess fee">
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={form.mess_fee || selectedRoom?.mess_fee || ""}
                  onChange={(e) => set("mess_fee", e.target.value)}
                />
              </Field>
              <Field label="Security deposit">
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={form.security_deposit || ""}
                  onChange={(e) => set("security_deposit", e.target.value)}
                />
              </Field>
              <Field label="Joining date">
                <input
                  type="date"
                  className={inputClass}
                  value={form.join_date?.slice?.(0, 10) || ""}
                  onChange={(e) => set("join_date", e.target.value)}
                />
              </Field>
              <Field label="Guardian contact">
                <input
                  className={inputClass}
                  value={form.guardian_contact || ""}
                  onChange={(e) => set("guardian_contact", e.target.value)}
                />
              </Field>
              <Field label="Emergency contact">
                <input
                  className={inputClass}
                  value={form.emergency_contact || ""}
                  onChange={(e) => set("emergency_contact", e.target.value)}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notes">
                  <textarea
                    className={`${inputClass} min-h-20`}
                    value={form.notes || ""}
                    onChange={(e) => set("notes", e.target.value)}
                  />
                </Field>
              </div>
            </>
          )}

          {(type === "leave" || type === "complaint") && (
            <>
              <Field label="Student allocation">
                <select
                  className={inputClass}
                  value={form.allocation_id}
                  onChange={(e) => {
                    const allocation = data.allocations.find(
                      (item) => String(item.id) === e.target.value,
                    );
                    setForm((current) => ({
                      ...current,
                      allocation_id: e.target.value,
                      student_id: allocation?.student_id || "",
                    }));
                  }}
                >
                  <option value="">Select allocated student</option>
                  {allocationOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.student_name} - {item.hostel_name}/
                      {item.room_number}
                    </option>
                  ))}
                </select>
              </Field>
              {type === "leave" && (
                <>
                  <Field label="From date">
                    <input
                      type="date"
                      className={inputClass}
                      value={form.from_date?.slice?.(0, 10) || ""}
                      onChange={(e) => set("from_date", e.target.value)}
                    />
                  </Field>
                  <Field label="To date">
                    <input
                      type="date"
                      className={inputClass}
                      value={form.to_date?.slice?.(0, 10) || ""}
                      onChange={(e) => set("to_date", e.target.value)}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Reason">
                      <textarea
                        className={`${inputClass} min-h-20`}
                        value={form.reason || ""}
                        onChange={(e) => set("reason", e.target.value)}
                      />
                    </Field>
                  </div>
                </>
              )}
              {type === "complaint" && (
                <>
                  <Field label="Category">
                    <select
                      className={inputClass}
                      value={form.category}
                      onChange={(e) => set("category", e.target.value)}
                    >
                      <option>General</option>
                      <option>Room</option>
                      <option>Electricity</option>
                      <option>Water</option>
                      <option>Cleaning</option>
                      <option>Food</option>
                    </select>
                  </Field>
                  <Field label="Priority">
                    <select
                      className={inputClass}
                      value={form.priority}
                      onChange={(e) => set("priority", e.target.value)}
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </Field>
                  <Field label="Assigned to">
                    <input
                      className={inputClass}
                      value={form.assigned_to || ""}
                      onChange={(e) => set("assigned_to", e.target.value)}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Description">
                      <textarea
                        className={`${inputClass} min-h-24`}
                        value={form.description || ""}
                        onChange={(e) => set("description", e.target.value)}
                      />
                    </Field>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {error && (
          <p className="mx-5 mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HostelPage() {
  const [data, setData] = useState({
    hostels: [],
    rooms: [],
    beds: [],
    allocations: [],
    students: [],
    leaves: [],
    complaints: [],
  });
  const [tab, setTab] = useState("hostels");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch("");
      setData({
        hostels: Array.isArray(result?.hostels) ? result.hostels : [],
        rooms: Array.isArray(result?.rooms) ? result.rooms : [],
        beds: Array.isArray(result?.beds) ? result.beds : [],
        allocations: Array.isArray(result?.allocations)
          ? result.allocations
          : [],
        students: Array.isArray(result?.students) ? result.students : [],
        leaves: Array.isArray(result?.leaves) ? result.leaves : [],
        complaints: Array.isArray(result?.complaints) ? result.complaints : [],
      });
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
    const segment =
      type === "hostel"
        ? "hostels"
        : type === "room"
          ? "rooms"
          : type === "allocation"
            ? "allocations"
            : type === "leave"
              ? "leaves"
              : "complaints";
    await apiFetch(
      `/${segment}${id && type !== "allocation" ? `/${id}` : ""}`,
      {
        method: id && type !== "allocation" ? "PUT" : "POST",
        body: JSON.stringify(form),
      },
    );
    await load();
  };

  const remove = async (segment, id, message = "Delete this record?") => {
    if (!window.confirm(message)) return;
    try {
      await apiFetch(`/${segment}/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const patch = async (segment, id, body) => {
    try {
      await apiFetch(`/${segment}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const stats = useMemo(() => {
    const activeAllocations = data.allocations.filter(
      (item) => item.status === "Active",
    );
    return {
      hostels: data.hostels.filter((item) => item.status === "Active").length,
      beds: data.beds.length,
      occupied: activeAllocations.length,
      monthly:
        activeAllocations.reduce(
          (sum, item) =>
            sum + Number(item.hostel_fee || 0) + Number(item.mess_fee || 0),
          0,
        ) || 0,
    };
  }, [data]);

  const tabs = [
    { key: "hostels", label: "Hostels", icon: Building2 },
    { key: "rooms", label: "Rooms & Beds", icon: BedDouble },
    { key: "allocations", label: "Student Allocation", icon: Users },
    { key: "leaves", label: "Leave", icon: ClipboardCheck },
    { key: "complaints", label: "Complaints", icon: MessageSquareWarning },
  ];

  const addType =
    tab === "hostels"
      ? "hostel"
      : tab === "rooms"
        ? "room"
        : tab === "allocations"
          ? "allocation"
          : tab === "leaves"
            ? "leave"
            : "complaint";

  return (
    <div className="portal-saffron flex min-h-screen bg-orange-50/60">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <header className="border-b border-orange-100 bg-orange-50/90 px-5 py-5 lg:px-8">
          <div className="flex items-center justify-between gap-4 pl-10 lg:pl-0">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Hostel Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Hostels, rooms, beds, student stays, fees, leave, and
                complaints.
              </p>
            </div>
            <button
              onClick={load}
              className="rounded-lg border border-slate-200 p-2.5 text-slate-500"
              title="Refresh"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        <div className="space-y-5 p-5 lg:p-8">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Active Hostels", stats.hostels, Building2],
              ["Total Beds", stats.beds, BedDouble],
              ["Occupied", stats.occupied, Users],
              [
                "Monthly Billing",
                `Rs ${stats.monthly.toLocaleString("en-IN")}`,
                IndianRupee,
              ],
            ].map(([label, value, Icon]) => (
              <div
                key={label}
                className="rounded-lg border border-slate-100 bg-white p-4"
              >
                <Icon size={17} className="mb-3 text-orange-600" />
                <p className="text-xl font-bold text-slate-900">{value}</p>
                <p className="mt-1 text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-slate-200">
            <div className="flex overflow-x-auto">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${
                    tab === key
                      ? "border-orange-600 text-orange-700"
                      : "border-transparent text-slate-500"
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setModal({ type: addType })}
              className="mb-2 flex items-center gap-2 whitespace-nowrap rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white"
            >
              {tab === "allocations" ? (
                <UserPlus size={15} />
              ) : (
                <Plus size={15} />
              )}
              Add
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="animate-spin text-orange-600" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-100 bg-white">
              {tab === "hostels" && (
                <table className="w-full min-w-[850px] text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      {[
                        "Hostel",
                        "Warden",
                        "Capacity",
                        "Rooms",
                        "Beds",
                        "Occupied",
                        "Status",
                        "",
                      ].map((item) => (
                        <th key={item} className="px-4 py-3 text-left">
                          {item}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.hostels.map((hostel) => (
                      <tr key={hostel.id}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">
                            {hostel.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {hostel.hostel_type}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p>{hostel.warden_name || "-"}</p>
                          <p className="text-xs text-slate-400">
                            {hostel.warden_phone || ""}
                          </p>
                        </td>
                        <td className="px-4 py-3">{hostel.capacity || 0}</td>
                        <td className="px-4 py-3">{hostel.rooms_count || 0}</td>
                        <td className="px-4 py-3">{hostel.beds_count || 0}</td>
                        <td className="px-4 py-3">
                          {hostel.occupied_count || 0}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill value={hostel.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() =>
                                setModal({ type: "hostel", data: hostel })
                              }
                              className="p-2 text-orange-600"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => remove("hostels", hostel.id)}
                              className="p-2 text-red-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === "rooms" && (
                <table className="w-full min-w-[850px] text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      {[
                        "Room",
                        "Hostel",
                        "Type",
                        "Beds",
                        "Fee",
                        "Mess",
                        "Status",
                        "",
                      ].map((item) => (
                        <th key={item} className="px-4 py-3 text-left">
                          {item}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.rooms.map((room) => (
                      <tr key={room.id}>
                        <td className="px-4 py-3">
                          <p className="font-semibold">{room.room_number}</p>
                          <p className="text-xs text-slate-400">
                            {room.floor || "-"}
                          </p>
                        </td>
                        <td className="px-4 py-3">{room.hostel_name}</td>
                        <td className="px-4 py-3">{room.room_type}</td>
                        <td className="px-4 py-3">
                          {room.occupied_count || 0}/{room.total_beds}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          Rs{" "}
                          {Number(room.monthly_fee || 0).toLocaleString(
                            "en-IN",
                          )}
                        </td>
                        <td className="px-4 py-3">
                          Rs{" "}
                          {Number(room.mess_fee || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill value={room.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() =>
                                setModal({ type: "room", data: room })
                              }
                              className="p-2 text-orange-600"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => remove("rooms", room.id)}
                              className="p-2 text-red-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === "allocations" && (
                <table className="w-full min-w-[950px] text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      {[
                        "Student",
                        "Class",
                        "Hostel",
                        "Room/Bed",
                        "Fee",
                        "Joined",
                        "Status",
                        "",
                      ].map((item) => (
                        <th key={item} className="px-4 py-3 text-left">
                          {item}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.allocations.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <p className="font-semibold">{item.student_name}</p>
                          <p className="text-xs text-slate-400">
                            {item.roll_number}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {item.class}-{item.section}
                        </td>
                        <td className="px-4 py-3">{item.hostel_name}</td>
                        <td className="px-4 py-3">
                          {item.room_number} / {item.bed_label}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          Rs{" "}
                          {(
                            Number(item.hostel_fee || 0) +
                            Number(item.mess_fee || 0)
                          ).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          {item.join_date?.slice(0, 10) || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill value={item.status} />
                        </td>
                        <td className="px-4 py-3">
                          {item.status === "Active" && (
                            <button
                              onClick={() =>
                                remove(
                                  "allocations",
                                  item.id,
                                  "Vacate this student and remove hostel/mess fee?",
                                )
                              }
                              className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600"
                            >
                              Vacate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === "leaves" && (
                <table className="w-full min-w-[850px] text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      {[
                        "Student",
                        "Hostel",
                        "Dates",
                        "Reason",
                        "Status",
                        "",
                      ].map((item) => (
                        <th key={item} className="px-4 py-3 text-left">
                          {item}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.leaves.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <p className="font-semibold">{item.student_name}</p>
                          <p className="text-xs text-slate-400">
                            {item.roll_number}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {item.hostel_name || "-"}{" "}
                          {item.room_number ? `/ ${item.room_number}` : ""}
                        </td>
                        <td className="px-4 py-3">
                          {item.from_date?.slice(0, 10)} to{" "}
                          {item.to_date?.slice(0, 10)}
                        </td>
                        <td className="max-w-xs px-4 py-3 text-slate-600">
                          {item.reason || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill value={item.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                patch("leaves", item.id, { status: "Approved" })
                              }
                              className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                patch("leaves", item.id, { status: "Rejected" })
                              }
                              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === "complaints" && (
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      {[
                        "Student",
                        "Hostel",
                        "Category",
                        "Priority",
                        "Issue",
                        "Status",
                        "",
                      ].map((item) => (
                        <th key={item} className="px-4 py-3 text-left">
                          {item}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.complaints.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <p className="font-semibold">{item.student_name}</p>
                          <p className="text-xs text-slate-400">
                            {item.roll_number}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {item.hostel_name || "-"}{" "}
                          {item.room_number ? `/ ${item.room_number}` : ""}
                        </td>
                        <td className="px-4 py-3">{item.category}</td>
                        <td className="px-4 py-3">{item.priority}</td>
                        <td className="max-w-sm px-4 py-3 text-slate-600">
                          {item.description}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill value={item.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                patch("complaints", item.id, {
                                  status: "In Progress",
                                })
                              }
                              className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700"
                            >
                              Start
                            </button>
                            <button
                              onClick={() =>
                                patch("complaints", item.id, {
                                  status: "Resolved",
                                })
                              }
                              className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                            >
                              Resolve
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {!loading && (
            <>
              {tab === "hostels" && data.hostels.length === 0 && (
                <EmptyState icon={Building2} label="No hostels added yet" />
              )}
              {tab === "rooms" && data.rooms.length === 0 && (
                <EmptyState icon={DoorOpen} label="No rooms added yet" />
              )}
              {tab === "allocations" && data.allocations.length === 0 && (
                <EmptyState icon={Users} label="No students allocated yet" />
              )}
              {tab === "leaves" && data.leaves.length === 0 && (
                <EmptyState
                  icon={ClipboardCheck}
                  label="No leave requests yet"
                />
              )}
              {tab === "complaints" && data.complaints.length === 0 && (
                <EmptyState
                  icon={MessageSquareWarning}
                  label="No complaints yet"
                />
              )}
            </>
          )}
        </div>
      </main>

      {modal && (
        <EditorModal
          modal={modal}
          data={data}
          onClose={() => setModal(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, label }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center">
      <Icon className="mx-auto mb-3 text-orange-500" size={24} />
      <p className="text-sm font-semibold text-slate-600">{label}</p>
    </div>
  );
}
