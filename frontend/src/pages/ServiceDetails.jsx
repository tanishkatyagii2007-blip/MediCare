import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Clock,
  FileText,
  IndianRupee,
  Send,
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { serviceDetailStyles } from "../assets/frontend/dummyStyles";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const DEFAULT_HOST = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

// ── Normalise service shape coming from the API ────────────────────────────────
function transformServiceShape(doc) {
  if (!doc) return doc;
  const out = { ...doc };

  out.id = out._id || out.id;
  out.name = out.name || out.serviceName || "Service";
  out.image = out.imageUrl || out.image || "";
  out.about = out.about || out.description || "";
  out.price =
    out.price !== undefined
      ? out.price
      : out.fee !== undefined
      ? out.fee
      : 0;

  // MongoDB Map serialises to a plain object { "date": ["slot1", ...] }
  // Handle all variants:  Map | plain object | array
  if (out.slots instanceof Map) {
    const map = {};
    out.slots.forEach((v, k) => (map[k] = v));
    out.slots = map;
  } else if (Array.isArray(out.slots)) {
    // old format: flat array of slot strings — attach to all dates
    const arrSlots = out.slots.slice();
    const dates =
      Array.isArray(out.dates) && out.dates.length > 0
        ? out.dates
        : [new Date().toISOString().split("T")[0]];
    const map = {};
    dates.forEach((d) => (map[d] = arrSlots));
    out.slots = map;
    out.dates = dates;
  } else if (!out.slots || typeof out.slots !== "object") {
    const today = new Date().toISOString().split("T")[0];
    out.slots = { [today]: [] };
    out.dates = [today];
  }

  // Derive dates from slots keys if dates array is empty / missing
  if (!Array.isArray(out.dates) || out.dates.length === 0) {
    out.dates = Object.keys(out.slots).sort();
  }

  return out;
}

// ── Validation helpers ─────────────────────────────────────────────────────────
const isValidMobile = (m) => /^\d{10}$/.test(m);
const isValidAge = (a) => {
  if (a === "" || a === null || a === undefined) return false;
  const n = Number(a);
  return Number.isInteger(n) && n > 0 && n < 150;
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ServiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSignedIn, getToken } = useAuth();

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  // Data state
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // ── Fetch service details ────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const controller = new AbortController();

    async function fetchService() {
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

        // API may wrap data in json.data, json.service, or return it directly
        const raw = json?.data ?? json?.service ?? json;
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
          setFetchError("Invalid service data received.");
          setLoading(false);
          return;
        }

        const svc = transformServiceShape(raw);
        setService(svc);

        // Auto-select first available date
        if (svc.dates && svc.dates.length > 0) {
          setSelectedDate(svc.dates[0]);
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        if (mounted) setFetchError("Failed to fetch service. Please retry.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchService();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [id]);

  // ── Form validation ──────────────────────────────────────────────────────────
  function getMissingFields() {
    const missing = [];
    if (!customerName.trim()) missing.push("Patient Name");
    if (!isValidMobile(mobile)) missing.push("Mobile (10 digits)");
    if (!isValidAge(age)) missing.push("Age");
    if (!gender) missing.push("Gender");
    if (!selectedDate) missing.push("Date");
    if (!selectedTime) missing.push("Time");
    return missing;
  }

  const isFormValid = () => getMissingFields().length === 0;

  // ── Handle booking submission ────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    if (!isSignedIn) {
      toast.error("Please sign in to book an appointment.");
      return;
    }

    const missing = getMissingFields();
    if (missing.length > 0) {
      setSubmitError(`Please fill in: ${missing.join(", ")}`);
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();

      const payload = {
        serviceId: id,
        serviceName: service?.name || "",
        patientName: customerName.trim(),
        mobile,
        email: email.trim() || undefined,
        age: Number(age),
        gender,
        date: selectedDate,
        time: selectedTime,            // e.g. "10:00 AM" — backend parses it
        paymentMethod,
        fees: service?.price ?? 0,    // backend requires fees/amount
        amount: service?.price ?? 0,
      };

      const res = await fetch(`${DEFAULT_HOST}/api/service-appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          (json && json.message) || `Booking failed (${res.status})`
        );
      }

      // Online payment → redirect to Stripe checkout
      if (json?.checkoutUrl) {
        window.location.href = json.checkoutUrl;
        return;
      }

      // Cash / free booking confirmed
      toast.success("Appointment booked successfully! 🎉");
      setSuccessMessage("Your appointment has been booked successfully!");
      setCustomerName("");
      setMobile("");
      setAge("");
      setGender("");
      setEmail("");
      setSelectedTime("");
    } catch (err) {
      const msg = err.message || "Booking failed. Please try again.";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Slots for selected date ──────────────────────────────────────────────────
  const availableSlots =
    service && selectedDate && service.slots
      ? service.slots[selectedDate] || []
      : [];

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <Navbar />
        <div className={serviceDetailStyles.loadingContainer}>
          <div className={serviceDetailStyles.loadingCard}>
            <p className={serviceDetailStyles.loadingTitle}>Loading…</p>
            <p className={serviceDetailStyles.loadingText}>
              Fetching service details.
            </p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // ── Fetch error ──────────────────────────────────────────────────────────────
  if (fetchError || !service) {
    return (
      <>
        <Navbar />
        <div className={serviceDetailStyles.loadingContainer}>
          <div className={serviceDetailStyles.loadingCard}>
            <p className="text-rose-600 text-lg font-semibold mb-4">
              {fetchError || "Service not found."}
            </p>
            <Link to="/services" className={serviceDetailStyles.backToServices}>
              ← Back to Services
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <ToastContainer position="top-center" autoClose={3500} />
      <Navbar />

      <div className={serviceDetailStyles.pageContainer}>
        {/* Back button */}
        <div className={serviceDetailStyles.navBar}>
          <div className={serviceDetailStyles.navContainer}>
            <button
              onClick={() => navigate(-1)}
              className={serviceDetailStyles.backButton}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
        </div>

        {/* Two-column layout */}
        <div className={serviceDetailStyles.mainGrid}>

          {/* ── LEFT COLUMN ── */}
          <div className={serviceDetailStyles.leftColumn}>

            {/* Service image */}
            <div className={serviceDetailStyles.imageContainer}>
              {service.image ? (
                <img
                  src={service.image}
                  alt={service.name}
                  className={serviceDetailStyles.image}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-full bg-emerald-50 flex items-center justify-center rounded-3xl">
                  <span className="text-emerald-300 text-7xl select-none">🏥</span>
                </div>
              )}
            </div>

            {/* Booking form */}
            <form
              onSubmit={handleSubmit}
              className={serviceDetailStyles.detailsContainer}
            >
              <h2 className={serviceDetailStyles.detailsTitle}>
                <FileText size={16} />
                Patient Details
              </h2>

              <div className={serviceDetailStyles.detailsGrid}>
                {/* Name */}
                <input
                  type="text"
                  placeholder="Patient Name *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={
                    customerName.trim()
                      ? serviceDetailStyles.input
                      : serviceDetailStyles.invalidInput
                  }
                />

                {/* Mobile */}
                <input
                  type="tel"
                  placeholder="Mobile (10 digits) *"
                  value={mobile}
                  maxLength={10}
                  onChange={(e) =>
                    setMobile(e.target.value.replace(/\D/g, ""))
                  }
                  className={
                    isValidMobile(mobile)
                      ? serviceDetailStyles.input
                      : serviceDetailStyles.invalidInput
                  }
                />

                {/* Age */}
                <input
                  type="number"
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

                {/* Gender */}
                <select
                  value={gender}
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

                {/* Email (optional, full width) */}
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={serviceDetailStyles.emailInput}
                />
              </div>

              {/* Payment method */}
              <div className="mt-4">
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
                        name="paymentMethod"
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

              {/* Date selection */}
              {service.dates && service.dates.length > 0 && (
                <div className={serviceDetailStyles.dateSection}>
                  <h3 className={serviceDetailStyles.dateTitle}>
                    Select Date
                  </h3>
                  <div className={serviceDetailStyles.dateScrollContainer}>
                    <div className={serviceDetailStyles.dateButtonsContainer}>
                      {service.dates.map((d) => (
                        <button
                          key={d}
                          type="button"
                          className={serviceDetailStyles.dateButton(
                            selectedDate === d
                          )}
                          onClick={() => {
                            setSelectedDate(d);
                            setSelectedTime("");
                          }}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Time slot selection */}
              <div className={serviceDetailStyles.timeSection}>
                <h3 className={serviceDetailStyles.timeTitle}>Select Time</h3>
                {selectedDate ? (
                  <div className={serviceDetailStyles.timeScrollContainer}>
                    <div className={serviceDetailStyles.timeButtonsContainer}>
                      {availableSlots.length > 0 ? (
                        availableSlots.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={serviceDetailStyles.timeButton(
                              selectedTime === t
                            )}
                            onClick={() => setSelectedTime(t)}
                          >
                            <Clock size={13} />
                            {t}
                          </button>
                        ))
                      ) : (
                        <p className={serviceDetailStyles.noSlotsMessage}>
                          No slots available for this date.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className={serviceDetailStyles.noSlotsMessage}>
                    Please select a date first.
                  </p>
                )}
              </div>

              {/* Validation / success messages */}
              {submitError && (
                <p className={serviceDetailStyles.errorMessage}>
                  ⚠️ {submitError}
                </p>
              )}
              {successMessage && (
                <p className={serviceDetailStyles.successMessage}>
                  ✅ {successMessage}
                </p>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={!isFormValid() || submitting}
                className={serviceDetailStyles.submitButton(
                  isFormValid(),
                  submitting
                )}
              >
                <Send size={16} />
                {submitting ? "Booking…" : "Book Appointment"}
              </button>
            </form>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className={serviceDetailStyles.rightColumn}>

            {/* Service name */}
            <h1 className={serviceDetailStyles.serviceName}>{service.name}</h1>

            {/* About */}
            {service.about && (
              <div className={serviceDetailStyles.aboutContainer}>
                <h2 className={serviceDetailStyles.aboutTitle}>
                  <FileText size={16} />
                  About this Service
                </h2>
                <p className={serviceDetailStyles.aboutText}>{service.about}</p>
              </div>
            )}

            {/* Price */}
            {service.price !== null && service.price !== undefined && (
              <div className={serviceDetailStyles.priceContainer}>
                <IndianRupee size={20} className="text-emerald-600" />
                <span className={serviceDetailStyles.priceText}>
                  {service.price}
                </span>
              </div>
            )}

            {/* Instructions */}
            {Array.isArray(service.instructions) &&
              service.instructions.length > 0 && (
                <div className={serviceDetailStyles.instructionsContainer}>
                  <h3 className={serviceDetailStyles.instructionsTitle}>
                    Instructions
                  </h3>
                  <ul className={serviceDetailStyles.instructionsList}>
                    {service.instructions.map((instr, i) => (
                      <li key={i}>{instr}</li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Live booking summary */}
            {(customerName || selectedDate || selectedTime) && (
              <div className={serviceDetailStyles.summaryContainer}>
                <h3 className={serviceDetailStyles.summaryTitle}>
                  Booking Summary
                </h3>
                <div className={serviceDetailStyles.summaryContent}>
                  {customerName && (
                    <p className={serviceDetailStyles.summaryItem}>
                      👤 <strong>Patient:</strong> {customerName}
                    </p>
                  )}
                  {selectedDate && (
                    <p className={serviceDetailStyles.summaryItem}>
                      📅 <strong>Date:</strong> {selectedDate}
                    </p>
                  )}
                  {selectedTime && (
                    <p className={serviceDetailStyles.summaryItem}>
                      🕐 <strong>Time:</strong> {selectedTime}
                    </p>
                  )}
                  <p className={serviceDetailStyles.summaryItem}>
                    💳 <strong>Payment:</strong> {paymentMethod}
                  </p>
                  {service.price > 0 && (
                    <p className={serviceDetailStyles.summaryItem}>
                      💰 <strong>Fee:</strong> ₹{service.price}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
