import React, { useState, useEffect } from 'react';
import { homeDoctorsStyles } from "../assets/frontend/dummyStyles";
import { Link } from "react-router-dom";
import { Calendar, UserCheck, Stethoscope } from "lucide-react";

const HomeDoctors = ({ previewCount = 8 }) => {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // To fetch doctors from the server
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/api/doctors`);
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          const msg =
            (json && json.message) || `Failed to load doctors (${res.status})`;
          if (!mounted) return;
          setError(msg);
          setDoctors([]);
          setLoading(false);
          return;
        }
        const items = (json && (json.data || json.doctors || json)) || [];
        const normalized = (Array.isArray(items) ? items : []).map((d) => {
          const id = d._id || d.id;
          const image =
            d.imageUrl || d.image || d.imageSmall || d.imageSrc || "";
          const available =
            (typeof d.availability === "string"
              ? d.availability.toLowerCase() === "available"
              : typeof d.available === "boolean"
                ? d.available
                : d.availability === true) || d.availability === "Available";
          return {
            id,
            name: d.name || "Unknown",
            specialization: d.specialization || d.speciality || "",
            image,
            experience:
              d.experience || d.experience === 0 ? String(d.experience) : "",
            fee: d.fee ?? d.fees ?? d.price ?? 0,
            available,
            raw: d,
          };
        });

        if (!mounted) return;
        setDoctors(normalized);
      } catch (err) {
        if (!mounted) return;
        console.error("load doctors error:", err);
        setError("Network error while loading doctors.");
        setDoctors([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [API_BASE]);

  const preview = doctors.slice(0, previewCount);

  return (
    <section className={homeDoctorsStyles.section}>
      <div className={homeDoctorsStyles.container}>
        <div className={homeDoctorsStyles.header}>
          <h1 className={homeDoctorsStyles.title}>
            Our{" "}
            <span className={homeDoctorsStyles.titleSpan}>
              Medical Team
            </span>
          </h1>

          <p className={homeDoctorsStyles.subtitle}>
            Book appointments quickly with our verified specialists
          </p>
        </div>

        {/* error / retry */}
        {error ? (
          <div className={homeDoctorsStyles.errorContainer}>
            <div className={homeDoctorsStyles.errorText}>{error}</div>
            <button
              onClick={() => {
                setLoading(true);
                setError("");
                (async () => {
                  try {
                    const res = await fetch(`${API_BASE}/api/doctors`);
                    const json = await res.json().catch(() => null);
                    const items = (json && (json.data || json.doctors || json)) || [];
                    const normalized = (Array.isArray(items) ? items : []).map(
                      (d) => {
                        const id = d._id || d.id;
                        const image = d.imageUrl || d.image || "";
                        const available =
                          (typeof d.availability === "string"
                            ? d.availability.toLowerCase() === "available"
                            : typeof d.available === "boolean"
                              ? d.available
                              : d.availability === true) ||
                          d.availability === "Available";
                        return {
                          id,
                          name: d.name || "Unknown",
                          specialization: d.specialization || d.speciality || "",
                          image,
                          experience: d.experience || "",
                          fee: d.fee ?? d.fees ?? d.price ?? 0,
                          available,
                          raw: d,
                        };
                      }
                    );
                    setDoctors(normalized);
                    setError("");
                  } catch (err) {
                    console.error(err);
                    setError("Network error while loading doctors.");
                    setDoctors([]);
                  } finally {
                    setLoading(false);
                  }
                })();
              }}
              className={homeDoctorsStyles.retryButton}
            >
              Retry
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className={homeDoctorsStyles.skeletonGrid}>
            {Array.from({ length: previewCount }).map((_, i) => (
              <div
                key={i}
                className={homeDoctorsStyles.skeletonCard}
              >
                <div className={homeDoctorsStyles.skeletonImage}></div>
                <div className={homeDoctorsStyles.skeletonText1}></div>
                <div className={homeDoctorsStyles.skeletonText2}></div>

                <div className="flex gap-2 mt-auto">
                  <div className={homeDoctorsStyles.skeletonButton}></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={homeDoctorsStyles.doctorsGrid}>
            {preview.map((doctor) => (
              <article
                key={doctor.id || doctor.name}
                className={homeDoctorsStyles.article}
              >
                {doctor.available ? (
                  <Link
                    to={`/doctors/${doctor.id}`}
                    state={{
                      doctor: doctor.raw || doctor,
                    }}
                  >
                    <div className={homeDoctorsStyles.imageContainerAvailable}>
                      <img
                        src={doctor.image || "/placeholder-doctor.jpg"}
                        alt={doctor.name}
                        loading="lazy"
                        className={homeDoctorsStyles.image}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/placeholder-doctor.jpg";
                        }}
                      />
                    </div>
                  </Link>
                ) : (
                  <div className={homeDoctorsStyles.imageContainerUnavailable}>
                    <img
                      src={doctor.image || "/placeholder-doctor.jpg"}
                      alt={doctor.name}
                      loading="lazy"
                      className={homeDoctorsStyles.image}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/placeholder-doctor.jpg";
                      }}
                    />
                    <div className={homeDoctorsStyles.unavailableBadge}>
                      Not Available
                    </div>
                  </div>
                )}

                <div className={homeDoctorsStyles.cardBody}>
                  <h3 className={homeDoctorsStyles.doctorName}>{doctor.name}</h3>
                  <p className={homeDoctorsStyles.specialization}>
                    {doctor.specialization}
                  </p>

                  {doctor.experience && (
                    <div className={homeDoctorsStyles.experienceContainer}>
                      <span className={homeDoctorsStyles.experienceBadge}>
                        <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                        {doctor.experience} yrs experience
                      </span>
                    </div>
                  )}

                  <div className={homeDoctorsStyles.buttonContainer}>
                    {doctor.available ? (
                      <Link
                        to={`/doctors/${doctor.id}`}
                        state={{ doctor: doctor.raw || doctor }}
                        className={homeDoctorsStyles.buttonAvailable}
                      >
                        <Calendar className="w-4 h-4" /> Book Appointment
                      </Link>
                    ) : (
                      <button
                        disabled
                        className={homeDoctorsStyles.buttonUnavailable}
                      >
                        <UserCheck className="w-4 h-4" /> Unavailable
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <style>{homeDoctorsStyles.customCSS}</style>
    </section>
  );
};

export default HomeDoctors;
