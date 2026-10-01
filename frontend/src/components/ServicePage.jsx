import React, { useEffect, useState } from "react";
import { servicePageStyles, serviceCardStyles } from "../assets/frontend/dummyStyles";
import { Link } from "react-router-dom";

const DEFAULT_HOST = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

// ── ServiceCard ────────────────────────────────────────────────────────────────
const ServiceCard = ({ service }) => {
  const isAvailable = service.available !== false;

  return (
    <div className={serviceCardStyles.card}>
      <div className={serviceCardStyles.imageContainer}>
        {service.image ? (
          <picture className={serviceCardStyles.picture}>
            <img
              src={service.image}
              alt={service.name}
              className={serviceCardStyles.responsiveImage}
              onError={(e) => {
                e.currentTarget.src = "";
              }}
            />
          </picture>
        ) : (
          <div className={`${serviceCardStyles.fallbackImage} bg-emerald-50 flex items-center justify-center`}>
            <span className="text-emerald-400 text-4xl">🏥</span>
          </div>
        )}
      </div>

      <div className={serviceCardStyles.content}>
        <p className={serviceCardStyles.serviceName}>{service.name}</p>

        <div className={serviceCardStyles.buttonContainer}>
          {isAvailable ? (
            <Link
              to={`/services/${service.id || service._id}`}
              className={serviceCardStyles.buttonAvailable}
            >
              Book Now
            </Link>
          ) : (
            <button disabled className={serviceCardStyles.buttonUnavailable}>
              Unavailable
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── ServicePage ────────────────────────────────────────────────────────────────
const ServicePage = ({ previewCount = 9999 }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${DEFAULT_HOST}/api/services`, {
        headers: { Accept: "application/json" },
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          (json && json.message) || `Server error ${res.status}`
        );
      }

      const items = (json && (json.data || json.services || json)) || [];
      const normalized = (Array.isArray(items) ? items : []).map((s) => ({
        id: s._id || s.id,
        name: s.name || s.serviceName || "Unnamed Service",
        image: s.imageUrl || s.image || s.imageSmall || "",
        available: s.available !== false,
        price: s.price,
      }));

      setServices(normalized);
    } catch (err) {
      setError(err.message || "Failed to load services.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = services.slice(0, previewCount);

  return (
    <div className={servicePageStyles.pageContainer}>
      <div className={servicePageStyles.maxWidthContainer}>
        {/* Header */}
        <header className={servicePageStyles.header}>
          <h1 className={servicePageStyles.title}>Our Diagnostic Services</h1>
          <p className={servicePageStyles.subtitle}>
            Safe, accurate &amp; reliable testing.
          </p>
        </header>

        {/* Error */}
        {error && (
          <div className={servicePageStyles.errorContainer}>
            <div className={servicePageStyles.errorText}>{error}</div>
            <button
              onClick={loadServices}
              className={servicePageStyles.retryButton}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading ? (
          <section className={servicePageStyles.skeletonGrid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={servicePageStyles.skeletonCard}>
                <div className={servicePageStyles.skeletonImage} />
                <div className={servicePageStyles.skeletonText1} />
                <div className={servicePageStyles.skeletonText2}>
                  <div className={servicePageStyles.skeletonButton} />
                </div>
              </div>
            ))}
          </section>
        ) : (
          <section className={servicePageStyles.servicesGrid}>
            {shown.length > 0 ? (
              shown.map((s) => (
                <ServiceCard key={s.id || s.name} service={s} />
              ))
            ) : (
              <div className={servicePageStyles.emptyState}>
                No services available.
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default ServicePage;
