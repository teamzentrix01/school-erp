"use client";

import { useCallback, useEffect, useState } from "react";
import { Bus, Hotel, Loader2, RefreshCw, Send } from "lucide-react";
import StudentSidebar from "@/components/StudentSidebar";
import { apiFetch } from "@/lib/api";

export default function StudentServicesPage() {
  const [data, setData] = useState({
    transport: null,
    hostel: null,
    leave_requests: [],
    complaints: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leave, setLeave] = useState({
    from_date: "",
    to_date: "",
    reason: "",
  });
  const [complaint, setComplaint] = useState({
    category: "General",
    priority: "Medium",
    description: "",
  });
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await apiFetch("/student/campus-services"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const submitLeave = async () => {
    await apiFetch("/student/hostel/leave", {
      method: "POST",
      body: JSON.stringify(leave),
    });
    setLeave({ from_date: "", to_date: "", reason: "" });
    load();
  };
  const submitComplaint = async () => {
    await apiFetch("/student/hostel/complaints", {
      method: "POST",
      body: JSON.stringify(complaint),
    });
    setComplaint((value) => ({ ...value, description: "" }));
    load();
  };

  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <StudentSidebar />
      <main className="min-w-0 flex-1">
        <header className="border-b border-orange-100 bg-orange-50/90 px-5 py-5 lg:px-8">
          <div className="flex items-center justify-between gap-4 pl-10 lg:pl-0">
            <div>
              <h1 className="text-xl font-bold">Campus Services</h1>
              <p className="mt-1 text-sm text-gray-500">
                Your transport and hostel services.
              </p>
            </div>
            <button
              onClick={load}
              className="rounded-lg border border-orange-200 p-2.5 text-orange-700"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>
        <div className="space-y-5 p-5 lg:p-8">
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="animate-spin text-orange-600" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-lg border border-orange-200 bg-white p-5">
                  <Bus className="text-orange-600" />
                  <h2 className="mt-3 font-bold">Transport Allocation</h2>
                  {data.transport ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <p>
                        Route: <strong>{data.transport.route_name}</strong>
                      </p>
                      <p>
                        Stop: <strong>{data.transport.stop_name}</strong>
                      </p>
                      <p>
                        Bus:{" "}
                        <strong>
                          {data.transport.registration_number || "-"}
                        </strong>
                      </p>
                      <p>
                        Driver:{" "}
                        <strong>{data.transport.driver_name || "-"}</strong>
                      </p>
                      <p>
                        Pickup:{" "}
                        <strong>
                          {data.transport.pickup_time?.slice(0, 5) || "-"}
                        </strong>
                      </p>
                      <p>
                        Fee: <strong>Rs {data.transport.monthly_fee}</strong>
                      </p>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-gray-500">
                      No active transport allocation.
                    </p>
                  )}
                </section>
                <section className="rounded-lg border border-orange-200 bg-white p-5">
                  <Hotel className="text-orange-600" />
                  <h2 className="mt-3 font-bold">Hostel Allocation</h2>
                  {data.hostel ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <p>
                        Hostel: <strong>{data.hostel.hostel_name}</strong>
                      </p>
                      <p>
                        Room: <strong>{data.hostel.room_number}</strong>
                      </p>
                      <p>
                        Bed: <strong>{data.hostel.bed_label}</strong>
                      </p>
                      <p>
                        Warden:{" "}
                        <strong>{data.hostel.warden_name || "-"}</strong>
                      </p>
                      <p>
                        Hostel Fee: <strong>Rs {data.hostel.hostel_fee}</strong>
                      </p>
                      <p>
                        Mess Fee: <strong>Rs {data.hostel.mess_fee}</strong>
                      </p>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-gray-500">
                      No active hostel allocation.
                    </p>
                  )}
                </section>
              </div>
              {data.hostel && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="rounded-lg border border-orange-200 bg-white p-5">
                    <h2 className="font-bold">Hostel Leave Request</h2>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {["from_date", "to_date"].map((key) => (
                        <input
                          key={key}
                          type="date"
                          value={leave[key]}
                          onChange={(event) =>
                            setLeave((value) => ({
                              ...value,
                              [key]: event.target.value,
                            }))
                          }
                          className="rounded-lg border border-orange-200 px-3 py-2 text-sm"
                        />
                      ))}
                      <textarea
                        value={leave.reason}
                        onChange={(event) =>
                          setLeave((value) => ({
                            ...value,
                            reason: event.target.value,
                          }))
                        }
                        placeholder="Reason"
                        className="col-span-2 rounded-lg border border-orange-200 px-3 py-2 text-sm"
                      />
                      <button
                        onClick={submitLeave}
                        className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        <Send size={14} /> Submit Leave
                      </button>
                    </div>
                    <div className="mt-4 space-y-2">
                      {data.leave_requests.slice(0, 5).map((item) => (
                        <p key={item.id} className="text-xs text-gray-600">
                          {item.from_date?.slice(0, 10)} to{" "}
                          {item.to_date?.slice(0, 10)} |{" "}
                          <strong>{item.status}</strong>
                        </p>
                      ))}
                    </div>
                  </section>
                  <section className="rounded-lg border border-orange-200 bg-white p-5">
                    <h2 className="font-bold">Hostel Complaint</h2>
                    <div className="mt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={complaint.category}
                          onChange={(event) =>
                            setComplaint((value) => ({
                              ...value,
                              category: event.target.value,
                            }))
                          }
                          className="rounded-lg border border-orange-200 px-3 py-2 text-sm"
                        >
                          <option>General</option>
                          <option>Maintenance</option>
                          <option>Food</option>
                          <option>Security</option>
                        </select>
                        <select
                          value={complaint.priority}
                          onChange={(event) =>
                            setComplaint((value) => ({
                              ...value,
                              priority: event.target.value,
                            }))
                          }
                          className="rounded-lg border border-orange-200 px-3 py-2 text-sm"
                        >
                          <option>Low</option>
                          <option>Medium</option>
                          <option>High</option>
                        </select>
                      </div>
                      <textarea
                        value={complaint.description}
                        onChange={(event) =>
                          setComplaint((value) => ({
                            ...value,
                            description: event.target.value,
                          }))
                        }
                        placeholder="Describe the issue"
                        className="w-full rounded-lg border border-orange-200 px-3 py-2 text-sm"
                      />
                      <button
                        onClick={submitComplaint}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        <Send size={14} /> Submit Complaint
                      </button>
                    </div>
                    <div className="mt-4 space-y-2">
                      {data.complaints.slice(0, 5).map((item) => (
                        <p key={item.id} className="text-xs text-gray-600">
                          {item.category} | {item.description} |{" "}
                          <strong>{item.status}</strong>
                        </p>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
