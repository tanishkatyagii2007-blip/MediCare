import React, { useState, useEffect, useMemo } from "react";
import {
  pageStyles,
  statusClasses,
  keyframesStyles,
} from "../assets/dummyStyles";
import {
  Search,
  Calendar,
  BadgeIndianRupee,
  Clock,
  User,
  Phone,
  XCircle,
  CheckCircle,
  FilterX,
  AlertCircle,
} from "lucide-react";

const API_BASE = "http://localhost:4000";

// Helper functions
function formatDateISO(iso) {
  if (!iso) return "N/A";
  try {
    const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch (e) {
    return iso;
  }
}

function dateTimeFromSlot(slot) {
  if (!slot || !slot.date) return new Date(0);
  try {
    const [y, m, d] = slot.date.split("-");
    const base = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);

    if (slot.time) {
      const [time, ampm] = slot.time.split(" ");
      let [hh, mm] = (time || "0:0").split(":").map(Number);
      if (ampm === "PM" && hh !== 12) hh += 12;
      if (ampm === "AM" && hh === 12) hh = 0;
      base.setHours(hh || 0, mm || 0, 0, 0);
    }
    return base;
  } catch (e) {
    return new Date(slot.date + "T00:00:00");
  }
}

const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterSpeciality, setFilterSpeciality] = useState("all");
  const [showAll, setShowAll] = useState(false);

  // Fetch appointments
  async function fetchAppointments() {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}/api/appointments?limit=500`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Failed to fetch (${res.status})`);
      }
      const data = await res.json();
      const items = (data?.appointments || data?.data || []).map((a) => {
        const doctorName =
          (a.doctorId && a.doctorId.name) || a.doctorName || "Doctor";
        const speciality =
          (a.doctorId && a.doctorId.specialization) ||
          a.speciality ||
          a.specialization ||
          "General";
        const fee = typeof a.fees === "number" ? a.fees : a.fee || 0;
        return {
          id: a._id || a.id,
          patientName: a.patientName || "Patient",
          age: a.age || "",
          gender: a.gender || "",
          mobile: a.mobile || "",
          doctorName,
          speciality,
          fee,
          slot: {
            date: a.date || (a.slot && a.slot.date) || "",
            time: a.time || (a.slot && a.slot.time) || "00:00 AM",
          },
          status: a.status || (a.payment && a.payment.status) || "Pending",
          raw: a,
        };
      });
      setAppointments(items);
    } catch (err) {
      console.error("Load appointments error:", err);
      setError(err.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAppointments();
  }, []);

  const specialities = useMemo(() => {
    const set = new Set(appointments.map((a) => a.speciality || "General"));
    return ["all", ...Array.from(set)];
  }, [appointments]);

  // Search and Filter Logic
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return appointments.filter((a) => {
      // Filter by Speciality
      if (
        filterSpeciality !== "all" &&
        (a.speciality || "").toLowerCase() !== filterSpeciality.toLowerCase()
      ) {
        return false;
      }

      // Filter by Date
      if (filterDate && a.slot?.date !== filterDate) {
        return false;
      }

      // Filter by Search Query (Doctor, Patient, Speciality, Mobile, Status)
      if (!q) return true;
      return (
        (a.doctorName || "").toLowerCase().includes(q) ||
        (a.speciality || "").toLowerCase().includes(q) ||
        (a.patientName || "").toLowerCase().includes(q) ||
        (a.mobile || "").toLowerCase().includes(q) ||
        (a.status || "").toLowerCase().includes(q)
      );
    });
  }, [appointments, query, filterDate, filterSpeciality]);

  const sortedFiltered = useMemo(() => {
    return filtered.slice().sort((a, b) => {
      const da = dateTimeFromSlot(a.slot).getTime();
      const db = dateTimeFromSlot(b.slot).getTime();
      return db - da;
    });
  }, [filtered]);

  const displayed = useMemo(
    () => (showAll ? sortedFiltered : sortedFiltered.slice(0, 8)),
    [sortedFiltered, showAll]
  );

  const clearFilters = () => {
    setQuery("");
    setFilterDate("");
    setFilterSpeciality("all");
    setShowAll(false);
  };

  async function adminCancelAppointment(id) {
    const appt = appointments.find((x) => x.id === id);
    if (!appt) return;

    const statusLower = (appt.status || "").toLowerCase();
    const isCancelled =
      statusLower === "canceled" || statusLower === "cancelled";
    const isCompleted = statusLower === "completed";

    if (isCancelled || isCompleted) return;

    const ok = window.confirm(
      `Mark appointment for ${appt.patientName} with ${
        appt.doctorName
      } on ${formatDateISO(appt.slot.date)} at ${appt.slot.time} as CANCELLED?`
    );
    if (!ok) return;

    try {
      setAppointments((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "Canceled" } : p))
      );

      const res = await fetch(`${API_BASE}/api/appointments/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Cancel failed (${res.status})`);
      }
      const data = await res.json();
      const updated = data?.appointment || data?.appointments || null;
      if (updated) {
        setAppointments((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: updated.status || "Canceled",
                  slot: {
                    date: updated.date || p.slot.date,
                    time: updated.time || p.slot.time,
                  },
                  raw: updated,
                }
              : p
          )
        );
      }
    } catch (err) {
      console.error("Cancel error:", err);
      setError(err.message || "Failed to cancel appointment");
      fetchAppointments();
    }
  }

  const hasActiveFilters = query !== "" || filterDate !== "" || filterSpeciality !== "all";

  return (
    <div className={pageStyles.container}>
      <style>{keyframesStyles}</style>

      <div className={pageStyles.maxWidthContainer}>
        {/* Header Section */}
        <header className={pageStyles.headerContainer}>
          <div className={pageStyles.headerTitleSection}>
            <h1 className={pageStyles.headerTitle}>Appointments</h1>
            <p className={pageStyles.headerSubtitle}>
              Manage and search upcoming patient appointments
            </p>
          </div>

          <div className={pageStyles.headerControlsSection}>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {/* Search Bar */}
              <div className={pageStyles.searchContainer}>
                <Search size={16} className={pageStyles.searchIcon} />
                <input
                  className={pageStyles.searchInput}
                  placeholder="Search doctor, patient, speciality..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              {/* Filter Controls */}
              <div className={pageStyles.filterContainer}>
                {/* Date Picker */}
                <div className={pageStyles.dateFilter}>
                  <Calendar size={14} className={pageStyles.dateFilterIcon} />
                  <input
                    type="date"
                    className={pageStyles.dateInput}
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                  />
                </div>

                {/* Specialty Filter Dropdown */}
                <select
                  className={pageStyles.selectFilter}
                  value={filterSpeciality}
                  onChange={(e) => setFilterSpeciality(e.target.value)}
                >
                  {specialities.map((s) => (
                    <option value={s} key={s}>
                      {s === "all" ? "All Specialties" : s}
                    </option>
                  ))}
                </select>

               

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className={pageStyles.clearButton}
                    title="Clear filters"
                  >
                    <FilterX size={14} className="inline mr-1" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>
        {/* Main Grid Content */}
        <main className="mt-4">
          {/* Loading State */}
          {loading && (
            <div className={pageStyles.loadingErrorContainer}>
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-2"></div>
              <p>Loading appointments...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className={pageStyles.errorContainer}>
              <AlertCircle size={20} className="inline mr-2" />
              <span>{error}</span>
              <button
                onClick={fetchAppointments}
                className="ml-3 underline text-sm text-rose-700 hover:text-rose-900"
              >
                Retry
              </button>
            </div>
          )}

          {/* No Results State */}
          {!loading && !error && filtered.length === 0 && (
            <div className={pageStyles.noResultsContainer}>
              <p className="text-base font-medium">No appointments found</p>
              <p className="text-xs text-emerald-500 mt-1">
                Try adjusting your search query or filters.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-3 px-4 py-1.5 text-xs rounded-full bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  Reset Filters
                </button>
              )}
            </div>
          )}

          {/* Appointments Grid */}
          {!loading && !error && displayed.length > 0 && (
            <div className={pageStyles.gridContainer}>
              {displayed.map((appt) => {
                const statusLower = (appt.status || "").toLowerCase();
                const isCancelled =
                  statusLower === "canceled" || statusLower === "cancelled";
                const isCompleted = statusLower === "completed";

                return (
                  <article key={appt.id} className={pageStyles.card}>
                    {/* Card Header: Patient Name & Status */}
                    <div className={pageStyles.cardHeader}>
                      <div>
                        <h3 className={pageStyles.cardTitle}>
                          {appt.patientName}
                        </h3>
                        <div className={pageStyles.patientInfo}>
                          <User size={12} />
                          <span>
                            {appt.gender || "N/A"} {appt.age ? `(${appt.age} yrs)` : ""}
                          </span>
                        </div>
                        {appt.mobile && (
                          <div className="text-xs text-emerald-500 flex items-center gap-1 mt-0.5">
                            <Phone size={10} />
                            <span>{appt.mobile}</span>
                          </div>
                        )}
                      </div>

                      <span
                        className={`${pageStyles.statusBadge} ${statusClasses(
                          appt.status
                        )}`}
                      >
                        {appt.status}
                      </span>
                    </div>

                    {/* Doctor Info */}
                    <div className={pageStyles.doctorInfo}>
                      <span className="text-emerald-400 font-medium">Doctor: </span>
                      <span className="font-semibold text-emerald-800">
                        {appt.doctorName}
                      </span>
                      <div className={pageStyles.doctorSpeciality}>
                        {appt.speciality}
                      </div>
                    </div>

                    {/* Slot Date & Time */}
                    <div className={pageStyles.slotContainer}>
                      <Clock size={14} className={pageStyles.slotIcon} />
                      <span>
                        {formatDateISO(appt.slot.date)} at {appt.slot.time}
                      </span>
                    </div>

                    {/* Footer: Fee & Cancel Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-emerald-50">
                      <div>
                        <span className={pageStyles.feeLabel}>Fee</span>
                        <div className={pageStyles.feeAmount}>
                          <BadgeIndianRupee size={16} />
                          <span>{appt.fee}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => adminCancelAppointment(appt.id)}
                        disabled={isCancelled || isCompleted}
                        className={pageStyles.cancelButton(isCancelled || isCompleted)}
                        title={
                          isCancelled
                            ? "Already Cancelled"
                            : isCompleted
                            ? "Already Completed"
                            : "Cancel Appointment"
                        }
                      >
                        <XCircle size={14} />
                        <span>{isCancelled ? "Cancelled" : isCompleted ? "Completed" : "Cancel"}</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Show More / Show Less Pagination */}
          {!loading && !error && filtered.length > 8 && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setShowAll((prev) => !prev)}
                className={pageStyles.showMoreButton}
              >
                {showAll
                  ? "Show Less"
                  : `Show More (${filtered.length - 8} remaining)`}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AppointmentsPage;
