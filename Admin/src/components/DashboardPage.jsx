import { useEffect, useState, useMemo } from 'react'
import { dashboardStyles as s } from '../assets/dummyStyles'
import { Users, UserRoundCheck, CalendarRange, BadgeIndianRupee, CheckCircle, XCircle, Search } from 'lucide-react'

const API_BASE = 'http://localhost:4000';
const PATIENT_COUNT_API = `${API_BASE}/api/appointments/patients/count`;

const safeNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

function normalizeDoctor(doc) {
  const id = doc._id || doc.id || String(Math.random()).slice(2);
  const name =
    doc.name ||
    doc.fullName ||
    `${doc.firstName || ""} ${doc.lastName || ""}`.trim() ||
    "Unknown";
  const specialization =
    doc.specialization ||
    doc.speciality ||
    (Array.isArray(doc.specializations)
      ? doc.specializations.join(", ")
      : "") ||
    "General";
  const fee = safeNumber(
    doc.fee ?? doc.fees ?? doc.consultationFee ?? doc.consultation_fee ?? 0,
    0
  );
  const image =
    doc.imageUrl ||
    doc.image ||
    doc.avatar ||
    `https://i.pravatar.cc/150?u=${id}`;

  const appointments = {
    total:
      doc.appointments?.total ??
      doc.totalAppointments ??
      doc.appointmentsTotal ??
      0,
    completed:
      doc.appointments?.completed ??
      doc.completedAppointments ??
      doc.appointmentsCompleted ??
      0,
    canceled:
      doc.appointments?.canceled ??
      doc.canceledAppointments ??
      doc.appointmentsCanceled ??
      0,
  };

  const earnings = (doc.earnings !== undefined && doc.earnings !== null)
    ? safeNumber(doc.earnings, 0)
    : (doc.revenue !== undefined && doc.revenue !== null)
    ? safeNumber(doc.revenue, 0)
    : (appointments.completed && fee)
    ? fee * safeNumber(appointments.completed, 0)
    : 0;

  return {
    id,
    name,
    specialization,
    fee,
    image,
    appointments,
    earnings,
    raw: doc,
  };
}

const DashboardPage = () => {
  const [doctors, setDoctors] = useState([]);

  // new patient count
  const [patientCount, setPatientCount] = useState(null);
  const [patientCountLoading, setPatientCountLoading] = useState(false);

  // Added state variables
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  //to load doctor from server
  useEffect(() => {
    let mounted = true;
    async function loadDoctors() {
      setLoading(true);
      setError(null);
      try {
        const url = `${API_BASE}/api/doctors?limit=200`;
        const res = await fetch(url);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body?.message || `Failed to fetch doctors (${res.status})`
          );
        }
        const body = await res.json();
        let list = [];
        if (Array.isArray(body)) list = body;
        else if (Array.isArray(body.doctors)) list = body.doctors;
        else if (Array.isArray(body.data)) list = body.data;
        else if (Array.isArray(body.items)) list = body.items;
        else {
          const firstArray = Object.values(body).find((v) => Array.isArray(v));
          if (firstArray) list = firstArray;
        }
        const normalized = list.map((d) => normalizeDoctor(d));
        if (mounted) setDoctors(normalized);
      } catch (err) {
        console.error("Failed to load doctors:", err);
        if (mounted) {
          setDoctors([]);
          setError(err.message || "Failed to load doctors");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadDoctors();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadPatientCount() {
      setPatientCountLoading(true);
      try {
        const res = await fetch(PATIENT_COUNT_API);
        if (!res.ok) {
          console.warn("Patient count fetch failed:", res.status);
          if (mounted) setPatientCount(0);
          return;
        }

        const body = await res.json().catch(() => ({}));
        const count = Number(
          body?.count ?? body?.totalUsers ?? body?.data ?? 0
        );
        if (mounted) setPatientCount(isNaN(count) ? 0 : count);
      } catch (err) {
        console.error("Failed to fetch patient count:", err);
        if (mounted) setPatientCount(0);
      } finally {
        if (mounted) setPatientCountLoading(false);
      }
    }
    loadPatientCount();
    return () => {
      mounted = false;
    };
  }, []);

  const totals = useMemo(() => {
    const totalDoctors = doctors.length;
    const totalAppointments = doctors.reduce(
      (s, d) => s + safeNumber(d.appointments?.total, 0),
      0
    );
    const totalEarnings = doctors.reduce(
      (s, d) => s + safeNumber(d.earnings, 0),
      0
    );
    const completed = doctors.reduce(
      (s, d) => s + safeNumber(d.appointments?.completed, 0),
      0
    );
    const canceled = doctors.reduce(
      (s, d) => s + safeNumber(d.appointments?.canceled, 0),
      0
    );
    const totalLoginPatients =
      doctors.reduce((s, d) => s + (d.raw?.loginPatientsCount ?? 0), 0) || 0;
    return {
      totalDoctors,
      totalAppointments,
      totalEarnings,
      completed,
      canceled,
      totalLoginPatients,
    };
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    if (!query) return doctors;
    const lower = query.toLowerCase();
    return doctors.filter((d) => {
      return (
        d.name?.toLowerCase().includes(lower) ||
        d.specialization?.toLowerCase().includes(lower) ||
        String(d.fee).includes(lower)
      );
    });
  }, [doctors, query]);

  const visibleDoctors = useMemo(() => {
    if (showAll) return filteredDoctors;
    return filteredDoctors.slice(0, 10);
  }, [filteredDoctors, showAll]);

  return (
    <div className={s.pageContainer}>
      <div className={s.maxWidthContainer}>
        <div className={s.headerContainer}>
          <div>
            <h1 className={s.headerTitle}>DASHBOARD</h1>
            <p className={s.headerSubTitle}>
              Overview of doctors & appointments
            </p>
          </div>
        </div>
        {/* stats section */}
        <div className={s.statsGrid}>
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Total Doctors"
            value={totals.totalDoctors}
          />

          <StatCard
            // shows count fetch from the backend
            icon={<UserRoundCheck className="w-6 h-6" />}
            label="Total Registered Users"
            value={
              patientCountLoading
                ? "Loading..."
                : (patientCount ?? totals.totalLoginPatients)
            }
          />
          <StatCard
            icon={<CalendarRange className="w-6 h-6" />}
            label="Total Appointments"
            value={totals.totalAppointments}
          />

          <StatCard
            icon={<BadgeIndianRupee className="w-6 h-6" />}
            label="Total Earnings"
            value={`₹ ${totals.totalEarnings.toLocaleString()}`}
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6" />}
            label="Completed"
            value={totals.completed}
          />

          <StatCard
            icon={<XCircle className="w-6 h-6" />}
            label="Canceled"
            value={totals.canceled}
          />
        </div>
        <div className="mb-6">
          <label className={s.searchLabel}>Search Doctors</label>

          <div className={s.searchContainer}>
            <div className={s.searchInputContainer}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={s.searchInput}
                placeholder="Search name / Specialization / fee"
              />
              <Search className={s.searchIcon} />
            </div>

            <button
              onClick={() => {
                setQuery("");
                setShowAll(false);
              }}
              className={s.clearButton + " " + s.cursorPointer}
            >
              Clear
            </button>
          </div>
        </div>
        
        <div className={s.tableContainer}>
          <div className={s.tableHeader}>
            <h2 className={s.tableTitle}>Doctors</h2>

            <p className={s.tableCount}>
              {loading
                ? "Loading..."
                : `Showing ${visibleDoctors.length} of ${filteredDoctors.length}`}
            </p>
          </div>
          {error && (
            <div className={s.errorContainer}>
              Error loading doctors: {error}
            </div>
          )}
          
          {/* Desktop Table View */}
          <div className={s.tableWrapper}>
            <table className={s.table}>
              <thead className={s.tableHead}>
                <tr>
                  <th className={s.tableHeaderCell}>Doctor</th>
                  <th className={s.tableHeaderCell}>Specialization</th>
                  <th className={s.tableHeaderCell}>Fee</th>
                  <th className={s.tableHeaderCell}>Appointments</th>
                  <th className={s.tableHeaderCell}>Completed</th>
                  <th className={s.tableHeaderCell}>Canceled</th>
                  <th className={s.tableHeaderCell}>Total Earnings</th>
                </tr>
              </thead>
              <tbody className={s.tableBody}>
                {visibleDoctors.map((d, idx) => (
                  <tr
                    key={d.id}
                    className={s.tableRow + " " + 
                      (idx % 2 === 0 ? s.tableRowEven : s.tableRowOdd)}
                  >
                    <td className={s.tableCell + " " + s.tableCellFlex}>
                      <div className={s.verticalLine} />
                      <img
                        src={d.image}
                        alt={d.name}
                        className={s.doctorImage}
                      />
                      <div>
                        <div className={s.doctorName}>
                          {d.name}
                        </div>
                        <div className={s.doctorId}>
                          ID: {d.id}
                        </div>
                      </div>
                    </td>

                    <td className={s.tableCell + " " + s.doctorSpecialization}>
                      {d.specialization}
                    </td>

                    <td className={s.tableCell + " " + s.feeText}>
                      ₹ {d.fee}
                    </td>

                    <td className={s.tableCell + " " + s.appointmentsText}>
                      {d.appointments.total}
                    </td>

                    <td className={s.tableCell + " " + s.completedText}>
                      {d.appointments.completed}
                    </td>

                    <td className={s.tableCell + " " + s.canceledText}>
                      {d.appointments.canceled}
                    </td>

                    <td className={s.tableCell + " " + s.earningsText}>
                      ₹ {d.earnings.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className={s.mobileDoctorContainer}>
            <div className={s.mobileDoctorGrid}>
              {visibleDoctors.map((d) => (
                <div key={d.id} className={s.mobileDoctorCard}>
                  <div className={s.mobileDoctorHeader}>
                    <div className="flex items-center gap-3">
                      <img
                        src={d.image}
                        alt={d.name}
                        className={s.mobileDoctorImage}
                      />
                      <div>
                        <div className={s.mobileDoctorName}>{d.name}</div>
                        <div className={s.mobileDoctorSpecialization}>
                          {d.specialization}
                        </div>
                      </div>
                    </div>
                    <div className={s.mobileDoctorFee}>₹ {d.fee}</div>
                  </div>
                  
                  <div className={s.mobileStatsGrid}>
                    <div>
                      <div className={s.mobileStatLabel}>Appointments</div>
                      <div className={s.mobileStatValue}>
                        {d.appointments.total}
                      </div>
                    </div>
                    <div>
                      <div className={s.mobileStatLabel}>Completed</div>
                      <div className={s.mobileStatValue}>
                        {d.appointments.completed}
                      </div>
                    </div>
                    <div>
                      <div className={s.mobileStatLabel}>Canceled</div>
                      <div className={s.mobileStatValue}>
                        {d.appointments.canceled}
                      </div>
                    </div>
                  </div>
                  
                  <div className={s.mobileEarningsContainer}>
                    <span>Total Earnings</span>
                    <span className="font-semibold text-slate-800">
                      ₹ {d.earnings.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Show More Button */}
          {filteredDoctors.length > 10 && (
            <div className={s.showMoreContainer}>
              <button
                onClick={() => setShowAll(!showAll)}
                className={s.showMoreButton + " " + s.cursorPointer}
              >
                {showAll ? "Show Less" : "Show More"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DashboardPage

function StatCard({ icon, label, value }) {
  return (
    <div className={s.statCard}>
      <div className={s.statCardContent}>
        <div className={s.statIconContainer}>{icon}</div>

        <div className="flex-1">
          <div className={s.statLabel}>{label}</div>
          <div className={s.statValue}>{value}</div>
        </div>
      </div>
    </div>
  );
}