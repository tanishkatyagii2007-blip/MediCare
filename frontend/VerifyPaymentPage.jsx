import axios from "axios";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const VerifyPaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [statusMessage, setStatusMessage] = useState("Verifying your payment...");

  useEffect(() => {
    let cancelled = false;

    const verifyPayment = async () => {
      const params = new URLSearchParams(location.search || "");
      const sessionId = params.get("session_id");

      if (location.pathname === "/appointment/cancel") {
        if (!cancelled) {
          setStatusMessage("Payment cancelled. Redirecting...");
          navigate("/appointments?payment_status=Cancelled", {
            replace: true,
          });
        }
        return;
      }

      if (!sessionId) {
        if (!cancelled) {
          setStatusMessage("No session found. Redirecting...");
          navigate("/appointments?payment_status=failed", {
            replace: true,
          });
        }
        return;
      }

      try {
        const res = await axios.get(
          `${API_BASE}/api/appointments/confirm`,
          {
            params: { session_id: sessionId },
            timeout: 15000,
          }
        );

        if (cancelled) return;

        if (res.data?.success) {
          setStatusMessage("Payment verified! Redirecting to appointments...");
          navigate("/appointments?payment_status=paid", {
            replace: true,
          });
        } else {
          setStatusMessage("Verification failed. Redirecting...");
          navigate("/appointments?payment_status=failed", {
            replace: true,
          });
        }
      } catch (error) {
        console.error("Payment verification failed:", error);

        if (!cancelled) {
          setStatusMessage("Verification error. Redirecting...");
          navigate("/appointments?payment_status=failed", {
            replace: true,
          });
        }
      }
    };

    verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50/50 px-4">
      <div className="max-w-md w-full p-8 bg-white rounded-3xl shadow-sm border border-emerald-100 text-center">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold text-emerald-900 mb-2">
          Verifying Appointment Payment
        </h2>
        <p className="text-sm text-emerald-700">
          {statusMessage}
        </p>
      </div>
    </div>
  );
};

export default VerifyPaymentPage;