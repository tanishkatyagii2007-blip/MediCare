import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Clock,
  FileText,
  IndianRupee,
  Send,
  Phone,
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { serviceDetailStyles } from "../assets/frontend/dummyStyles";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { defaultServices } from "../assets/frontend/defaultServices";

const DEFAULT_HOST = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

// ── Helpers ────────────────────────────────────────────────────────────────────
function normalizeToDateString(d) {
  const dt = new Date(d);
  if (isNaN(dt)) return null;
  return dt.toISOString().split("T")[0];
}

function sortServiceDates(datesArr) {
  if (!Array.isArray(datesArr)) return [];
  const uniq = Array.from(
    new Set(datesArr.map(normalizeToDateString).filter(Boolean))
  );
  const parsed = uniq.map((ds) => ({ ds, date: new Date(ds) }));
  const dateVal = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const todayVal = dateVal(new Date());
  const past = parsed
    .filter((p) => dateVal(p.date) < todayVal)
    .sort((a, b) => dateVal(b.date) - dateVal(a.date));
  const future = parsed
    .filter((p) => dateVal(p.date) >= todayVal)
    .sort((a, b) => dateVal(a.date) - dateVal(b.date));
  return [...past, ...future].map((p) => p.ds);
}

function transformServiceShape(doc) {
  const out = {};
  out.id = doc._id ?? doc.id ?? doc.slug ?? String(doc.name).replace(/\s+/g, "-").toLowerCase();
  out.name = doc.name ?? doc.title ?? "Service";
  out.image = doc.imageUrl || doc.image || doc.imageURL || doc.image_path || null;
  out.price = typeof doc.price === "number" ? doc.price : Number(doc.price) || 0;
  out.about = doc.about ?? doc.description ?? doc.shortDescription ?? "";
  out.instructions = Array.isArray(doc.instructions) ? doc.instructions : [];

  let dates = Array.isArray(doc.dates) ? doc.dates.slice() : [];
  let slotsMap = {};

  if (doc.slots instanceof Map) {
    doc.slots.forEach((v, k) => (slotsMap[k] = v));
    if (dates.length === 0) dates = Object.keys(slotsMap);
  } else if (doc.slots && !Array.isArray(doc.slots) && typeof doc.slots === "object") {
    slotsMap = { ...doc.slots };
    if (dates.length === 0) dates = Object.keys(slotsMap);
  } else if (Array.isArray(doc.slots)) {
    const arr = doc.slots.slice();
    if (dates.length > 0) {
      dates.forEach((d) => (slotsMap[d] = arr.slice()));
    } else {
      const today = new Date().toISOString().split("T")[0];
      slotsMap[today] = arr.slice();
      dates = [today];
    }
  } else {
    if (dates.length > 0) {
      dates.forEach((d) => (slotsMap[d] = []));
    } else {
      const today = new Date().toISOString().split("T")[0];
      dates = [today];
      slotsMap[today] = [];
    }
  }

  out.dates = sortServiceDates(dates);
  out.slots = slotsMap;
  out.raw = doc;
  return out;
}

const isValidMobile = (m) => /^\d{10}$/.test(m);
const isValidAge = (a) => {
  if (a === "" || a === null || a === undefined) return false;
  const n = Number(a);
  return Number.isInteger(n) && n > 0 && n < 150;
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function ServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSignedIn, getToken } = useAuth();

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const controller = new AbortController();

    async function tryFetch() {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch(
          `${DEFAULT_HOST}/api/services/${encodeURIComponent(id)}`,
          {
            headers: { Accept: "application/json" },
            signal: controller.signal,
          }
        );
        if (!mounted) return;

        if (res.status === 404) {
          setFetchError("Service not found.");
          setLoading(false);
          return;
        }

        const json = await res.json().catch(() => null);

        if (!res.ok || !json) {
          setFetchError(`Could not load service details (${res.status}).`);
          setLoading(false);
          return;
        }

        const doc = json?.data ?? json?.service ?? json;
        if (!doc || typeof doc !== "object") {
          setFetchError("Invalid service data received.");
          setLoading(false);
          return;
        }

        const transformed = transformServiceShape(doc);
        setService(transformed);
        if (transformed.dates && transformed.dates.length > 0) {
          setSelectedDate(transformed.dates[0]);
          setSelectedTime("");
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        const found = defaultServices.find((s) => String(s.id) === String(id) || String(s._id) === String(id)) || defaultServices[0];
        if (mounted && found) {
          const transformed = transformServiceShape(found);
          setService(transformed);
          if (transformed.dates && transformed.dates.length > 0) {
            setSelectedDate(transformed.dates[0]);
            setSelectedTime("");
          }
          setFetchError(null);
        } else if (mounted) {
          setFetchError("Unable to fetch service details.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    tryFetch();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [id]);

  // ── Validation ─────────────────────────────────────────────────────────────
  function getClientMissingFields() {
    const missing = [];
    if (!customerName || !customerName.trim()) missing.push("Patient Name");
    if (!mobile || !isValidMobile(mobile)) missing.push("Mobile (10 digits)");
    if (!selectedDate) missing.push("Date");
    if (!selectedTime) missing.push("Time");
    if (!isValidAge(age)) missing.push("Age");
    if (!gender || !String(gender).trim()) missing.push("Gender");
    return missing;
  }

  const isFormValid = () => getClientMissingFields().length === 0;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    if (!isSignedIn) {
      toast.error("Please sign in to create a booking.");
      return;
    }

    const missing = getClientMissingFields();
    if (missing.length > 0) {
      setSubmitError(`Please fill in: ${missing.join(", ")}`);
      return;
    }

    if (!service) {
      setSubmitError("Service details not loaded.");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken().catch(() => null);
      if (!token) {
        toast.error("Authentication token unavailable. Please sign in again.");
        setSubmitting(false);
        return;
      }

      const payload = {
        serviceId: (service?.raw && (service.raw._id || service.raw.id)) || service?.id,
        serviceName: service?.name || "",
        serviceImageUrl:
          (service?.raw && (service.raw.imageUrl || service.raw.image || "")) ||
          service?.image || "",
        serviceImagePublicId:
          (service?.raw && (service.raw.imagePublicId || "")) || "",
        patientName: customerName.trim(),
        mobile: mobile.trim(),
        age: age ? Number(age) : undefined,
        gender: gender || "",
        date: selectedDate,
        time: selectedTime,
        fees: service?.price ?? 0,
        amount: service?.price ?? 0,
        paymentMethod: paymentMethod === "Cash" ? "Cash" : "Online",
        email: email || undefined,
        meta: { client: "frontend", serviceName: service?.name },
      };

      const res = await fetch(`${DEFAULT_HOST}/api/service-appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch { json = { rawText: text }; }

      if (!res.ok) {
        const msg =
          (json && (json.message || json.error || json.rawText)) ||
          `Server returned ${res.status}`;
        setSubmitError(String(msg));
        setSubmitting(false);
        return;
      }

      const { checkoutUrl } = json || {};
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }

      toast.success("Booking created successfully! 🎉");
      setSuccessMessage("Your appointment has been booked successfully!");
      setTimeout(() => navigate("/appointments", { replace: true }), 1500);

      setCustomerName(""); setMobile(""); setAge(""); setGender("");
      setSelectedTime(""); setEmail("");
    } catch (err) {
      console.error("Booking error:", err);
      setSubmitError("Network error while creating booking.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <Navbar />
        <div className={serviceDetailStyles.loadingContainer}>
          <div className={serviceDetailStyles.loadingCard}>
            <h2 className={serviceDetailStyles.loadingTitle}>Loading service...</h2>
            <p className={serviceDetailStyles.loadingText}>Fetching details from server</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // ── Error / not found ──────────────────────────────────────────────────────
  if (fetchError || !service) {
    return (
      <>
        <Navbar />
        <div className={serviceDetailStyles.loadingContainer}>
          <div className={serviceDetailStyles.loadingCard}>
            <h2 className={serviceDetailStyles.loadingTitle}>
              {fetchError || "Service not found"}
            </h2>
            <p className={serviceDetailStyles.loadingText}>
              Please go back and select a valid service.
            </p>
            <Link to="/services" className={serviceDetailStyles.backToServices}>
              Back to Services
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const availableSlots =
    service.slots && selectedDate ? service.slots[selectedDate] || [] : [];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <ToastContainer position="top-center" autoClose={3500} />
      <Navbar />
      <div className={serviceDetailStyles.pageContainer}>
        {/* Back nav */}
        <div className={serviceDetailStyles.navBar}>
          <div className={serviceDetailStyles.navContainer}>
            <Link to="/services" className={serviceDetailStyles.backButton}>
              <ArrowLeft size={18} />
              Back
            </Link>
          </div>
        </div>

        <div className={serviceDetailStyles.mainGrid}>
          {/* ── LEFT ── */}
          <div className={serviceDetailStyles.leftColumn}>
            {/* Image */}
            <div className={serviceDetailStyles.imageContainer}>
              {service.image ? (
                <img
                  src={service.image}
                  alt={service.name}
                  className={serviceDetailStyles.image}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                <div className="w-full h-full bg-emerald-50 flex items-center justify-center rounded-3xl">
                  <span className="text-emerald-300 text-7xl select-none">🏥</span>
                </div>
              )}
            </div>

            {/* Patient details */}
            <div className={serviceDetailStyles.detailsContainer}>
              <h3 className={serviceDetailStyles.detailsTitle}>
                <Phone size={18} />
                Your Details
              </h3>

              <div className={serviceDetailStyles.detailsGrid}>
                <input
                  required
                  type="text"
                  placeholder="Full Name *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={
                    customerName.trim()
                      ? serviceDetailStyles.input
                      : serviceDetailStyles.invalidInput
                  }
                />

                <input
                  type="text"
                  required
                  placeholder="Mobile (10 digits) *"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  className={
                    isValidMobile(mobile)
                      ? serviceDetailStyles.input
                      : serviceDetailStyles.invalidInput
                  }
                />

                <input
                  type="number"
                  required
                  placeholder="Age *"
                  value={age}
                  min={1}
                  max={149}
                  onChange={(e) => setAge(e.target.value)}
                  className={
                    isValidAge(age)
                      ? serviceDetailStyles.input
                      : serviceDetailStyles.invalidInput
                  }
                />

                <select
                  value={gender}
                  required
                  onChange={(e) => setGender(e.target.value)}
                  className={
                    gender
                      ? serviceDetailStyles.input
                      : serviceDetailStyles.invalidInput
                  }
                >
                  <option value="">Select Gender *</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>

                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={serviceDetailStyles.emailInput}
                />
              </div>

              {/* Payment method */}
              <div className={serviceDetailStyles.dateSection}>
                <label className={serviceDetailStyles.paymentLabel}>
                  Payment Method
                </label>
                <div className={serviceDetailStyles.paymentOptions}>
                  {["Cash", "Online"].map((method) => (
                    <label
                      key={method}
                      className={serviceDetailStyles.paymentOption(
                        paymentMethod === method
                      )}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={() => setPaymentMethod(method)}
                        className={serviceDetailStyles.paymentInput}
                      />
                      {method}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Date selection */}
            {service.dates && service.dates.length > 0 && (
              <div>
                <h2 className={serviceDetailStyles.dateTitle}>Select Date *</h2>
                <div className={serviceDetailStyles.dateScrollContainer}>
                  <div className={serviceDetailStyles.dateButtonsContainer}>
                    {service.dates.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => { setSelectedDate(d); setSelectedTime(""); }}
                        className={serviceDetailStyles.dateButton(selectedDate === d)}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Time selection */}
            {selectedDate && (
              <div className={serviceDetailStyles.timeSection}>
                <h2 className={serviceDetailStyles.timeTitle}>Select Time *</h2>
                <div className={serviceDetailStyles.timeScrollContainer}>
                  <div className={serviceDetailStyles.timeButtonsContainer}>
                    {availableSlots.length > 0 ? (
                      availableSlots.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTime(t)}
                          className={serviceDetailStyles.timeButton(selectedTime === t)}
                        >
                          <Clock size={13} className="mr-1" />
                          {t}
                        </button>
                      ))
                    ) : (
                      <div className={serviceDetailStyles.noSlotsMessage}>
                        No slots available for this date.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error / Success + Submit */}
            <div>
              {submitError && (
                <div className={serviceDetailStyles.errorMessage}>
                  ⚠️ {submitError}
                </div>
              )}
              {successMessage && (
                <div className={serviceDetailStyles.successMessage}>
                  ✅ {successMessage}
                </div>
              )}
              <button
                disabled={!isFormValid() || submitting}
                onClick={handleSubmit}
                className={serviceDetailStyles.submitButton(
                  isFormValid() && !submitting,
                  submitting
                )}
              >
                <Send size={16} />
                {submitting
                  ? "Submitting..."
                  : `Confirm Booking${service.price ? ` • ₹${service.price}` : ""}`}
              </button>
            </div>
          </div>

          {/* ── RIGHT ── */}
          <div className={serviceDetailStyles.rightColumn}>
            <h1 className={serviceDetailStyles.serviceName}>{service.name}</h1>

            {service.about && (
              <div className={serviceDetailStyles.aboutContainer}>
                <h2 className={serviceDetailStyles.aboutTitle}>
                  <FileText size={16} /> About This Service
                </h2>
                <p className={serviceDetailStyles.aboutText}>{service.about}</p>
              </div>
            )}

            <div className={serviceDetailStyles.priceContainer}>
              <IndianRupee size={20} className="text-emerald-600" />
              <span className={serviceDetailStyles.priceText}>{service.price}</span>
            </div>

            {service.instructions && service.instructions.length > 0 && (
              <div className={serviceDetailStyles.instructionsContainer}>
                <h3 className={serviceDetailStyles.instructionsTitle}>
                  Pre-Test Instructions
                </h3>
                <ul className={serviceDetailStyles.instructionsList}>
                  {service.instructions.map((instr, idx) => (
                    <li key={idx}>{instr}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Booking summary */}
            <div className={serviceDetailStyles.summaryContainer}>
              <h3 className={serviceDetailStyles.summaryTitle}>Booking Summary</h3>
              <div className={serviceDetailStyles.summaryContent}>
                <p><b>Name:</b> {customerName || "Not filled"}</p>
                <p><b>Mobile:</b> {mobile || "Not filled"}</p>
                <p><b>Age:</b> {age || "Not filled"}</p>
                <p><b>Gender:</b> {gender || "Not selected"}</p>
                <p><b>Date:</b> {selectedDate || "Not selected"}</p>
                <p><b>Time:</b> {selectedTime || "Not selected"}</p>
                <p><b>Payment:</b> {paymentMethod}</p>
                <p><b>Price:</b> ₹{service.price}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}