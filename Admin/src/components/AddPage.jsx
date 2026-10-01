import { useState, useRef, useEffect } from 'react';
import { doctorDetailStyles as s } from '../assets/dummyStyles';
import { User, Eye, EyeOff, Plus, X, Calendar, CheckCircle, XCircle } from 'lucide-react';

//Helper
function timeStringToMinutes(t) {
  if (!t) return 0;
  const [hhmm, ampm] = t.split(" ");
  let [h, m] = hhmm.split(":").map(Number);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function formatDateISO(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "June",
    "July",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = String(Number(d));
  const month = monthNames[dateObj.getMonth()] || "";
  return `${day} ${month} ${y}`;
}

const AddPage = () => {
  const [doctorList, setDoctorList] = useState([]);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    specialization: "",
    imageFile: null,
    imagePreview: "",
    experience: "",
    qualifications: "",
    location: "",
    about: "",
    fee: "",
    success: "",
    patients: "",
    rating: "",
    schedule: {},
    availability: "Available",
    email: "",
    password: "",
  });

  const [slotDate, setSlotDate] = useState("");
  const [slotHour, setSlotHour] = useState("");
  const [slotMinute, setSlotMinute] = useState("00");
  const [slotAmpm, setSlotAmpm] = useState("AM");

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [today] = useState(() => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - tzOffset * 60000);
    return local.toISOString().split("T")[0];
  });

  useEffect(() => {
    if (!toast.show) return;
    const t = setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    return () => clearTimeout(t);
  }, [toast.show]);

  const showToast = (type, message) => setToast({ show: true, type, message });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  function handleImage(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (form.imagePreview && form.imageFile) {
      try {
        URL.revokeObjectURL(form.imagePreview);
      } catch (err) {}
    }
    setForm((p) => ({
      ...p,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    }));
  }

  function removeImage() {
    if (form.imagePreview && form.imageFile) {
      try {
        URL.revokeObjectURL(form.imagePreview);
      } catch (err) {}
    }
    setForm((p) => ({ ...p, imageFile: null, imagePreview: "" }));
    if (fileInputRef.current) {
      try {
        fileInputRef.current.value = "";
      } catch (err) {}
    }
  }

  function addSlotToForm() {
    if (!slotDate || !slotHour) {
      showToast("error", "Select date + time");
      return;
    }
    if (slotDate < today) {
      showToast("error", "Cannot add a slot in the past");
      return;
    }
    const time = `${slotHour}:${slotMinute} ${slotAmpm}`;

    if (slotDate === today) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const slotMinutes = timeStringToMinutes(time);
      if (slotMinutes <= nowMinutes) {
        showToast("error", "Cannot add a time that has already passed today");
        return;
      }
    }

    setForm((f) => {
      const sched = { ...f.schedule };
      if (!sched[slotDate]) sched[slotDate] = [];
      if (!sched[slotDate].includes(time)) sched[slotDate].push(time);

      sched[slotDate] = sched[slotDate].sort(
        (a, b) => timeStringToMinutes(a) - timeStringToMinutes(b),
      );
      return { ...f, schedule: sched };
    });

    setSlotHour("");
    setSlotMinute("00");
  }

  function removeSlot(date, time) {
    setForm((f) => {
      const sched = { ...f.schedule };
      sched[date] = sched[date].filter((t) => t !== time);
      if (!sched[date].length) delete sched[date];
      return { ...f, schedule: sched };
    });
  }

  function getFlatSlots(schedule) {
    const arr = [];
    Object.keys(schedule)
      .sort()
      .forEach((d) => {
        schedule[d].forEach((t) => arr.push({ date: d, time: t }));
      });
    return arr;
  }

  function validate(f) {
    const req = [
      "name",
      "specialization",
      "experience",
      "qualifications",
      "location",
      "about",
      "fee",
      "success",
      "patients",
      "rating",
      "email",
      "password",
    ];

    for (let k of req) if (!f[k]) return false;
    if (!f.imageFile) return false;
    if (!Object.keys(f.schedule).length) return false;
    return true;
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!validate(form)) {
      showToast("error", "Fill all fields + upload image + add slot");
      return;
    }
    const r = Number(form.rating);
    if (Number.isNaN(r) || r < 1 || r > 5) {
      showToast("error", "Rating must be a number between 1 and 5");
      return;
    }
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("specialization", form.specialization || "");
      fd.append("experience", form.experience || "");
      fd.append("qualifications", form.qualifications || "");
      fd.append("location", form.location || "");
      fd.append("about", form.about || "");
      fd.append("fee", form.fee === "" ? "0" : String(form.fee));
      fd.append("success", form.success || "");
      fd.append("patients", form.patients || "");
      fd.append("rating", form.rating === "" ? "0" : String(form.rating));
      fd.append("availability", form.availability || "Available");
      fd.append("email", form.email);
      fd.append("password", form.password);
      fd.append("schedule", JSON.stringify(form.schedule || {}));

      if (form.imageFile) fd.append("image", form.imageFile);

      const API_BASE = "http://localhost:4000/api";

      const res = await fetch(`${API_BASE}/doctors`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.message || `Server error (${res.status})`;
        showToast("error", msg);
        setLoading(false);
        return;
      }

      showToast("success", "Doctor Added Successfully!");

      if (data?.token) {
        try {
          localStorage.setItem("token", data.token);
        } catch (err) {}
      }

      const doctorFromServer = data?.data
        ? data.data
        : { id: Date.now(), ...form, imageUrl: form.imagePreview };

      setDoctorList((old) => [doctorFromServer, ...old]);

      // cleanup: revoke object URL if used
      if (form.imagePreview && form.imageFile) {
        try {
          URL.revokeObjectURL(form.imagePreview);
        } catch (err) {}
      }

      setForm({
        name: "",
        specialization: "",
        imageFile: null,
        imagePreview: "",
        experience: "",
        qualifications: "",
        location: "",
        about: "",
        fee: "",
        success: "",
        patients: "",
        rating: "",
        schedule: {},
        availability: "Available",
        email: "",
        password: "",
      });

      if (fileInputRef.current) {
        try {
          fileInputRef.current.value = "";
        } catch (err) {}
      }

      setSlotDate("");
      setSlotHour("");
      setSlotMinute("00");
      setShowPassword(false);
    } catch (err) {
      console.error("submit error:", err);
      showToast("error", "Network or server error");
    } finally {
      setLoading(false);
    }
  }

  const flatSlots = getFlatSlots(form.schedule);
  const isValid = validate(form);

  return (
    <div className={s.pageContainer}>
      {/* Toast */}
      {toast.show && (
        <div className={s.toastContainer + " " + (toast.type === "success" ? s.toastSuccess : s.toastError)}>
          {toast.message}
        </div>
      )}

      <div className={s.maxWidthContainer + " " + s.headerContainer}>
        <div className={s.headerFlexContainer}>
          <div className={s.headerIconContainer}>
            <User className="text-white" size={32} />
          </div>
          <h1 className={s.headerTitle}>Add New Doctor</h1>
        </div>
      </div>

      {/* Form */}
      <div className={s.maxWidthContainer + " " + s.formContainer}>
        <form onSubmit={handleAdd} className={s.formGrid}>

          {/* Image Upload */}
          <div className="md:col-span-2">
            <label className={s.label}>Upload Profile Image</label>
            <div className="flex flex-wrap items-center gap-4">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImage}
                className={s.fileInput}
              />
              {form.imagePreview && (
                <div className="relative">
                  <img
                    src={form.imagePreview}
                    alt="preview"
                    className={s.imagePreview}
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className={s.removeImageButton}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className={s.label}>Doctor Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Dr. Full Name"
              className={s.inputBase}
            />
          </div>

          {/* Email */}
          <div>
            <label className={s.label}>Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="doctor@email.com"
              className={s.inputBase}
            />
          </div>

          {/* Password */}
          <div>
            <label className={s.label}>Password</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                placeholder="Password"
                className={s.inputBase + " " + s.inputWithIcon}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={s.passwordToggleButton}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Specialization */}
          <div>
            <label className={s.label}>Specialization</label>
            <input
              name="specialization"
              value={form.specialization}
              onChange={handleChange}
              placeholder="e.g. Cardiologist"
              className={s.inputBase}
            />
          </div>

          {/* Experience */}
          <div>
            <label className={s.label}>Experience</label>
            <input
              name="experience"
              value={form.experience}
              onChange={handleChange}
              placeholder="e.g. 10 years"
              className={s.inputBase}
            />
          </div>

          {/* Qualifications */}
          <div>
            <label className={s.label}>Qualifications</label>
            <input
              name="qualifications"
              value={form.qualifications}
              onChange={handleChange}
              placeholder="e.g. MBBS, MD"
              className={s.inputBase}
            />
          </div>

          {/* Location */}
          <div>
            <label className={s.label}>Location</label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="e.g. Delhi"
              className={s.inputBase}
            />
          </div>

          {/* Fee */}
          <div>
            <label className={s.label}>Consultation Fee (₹)</label>
            <input
              name="fee"
              type="number"
              value={form.fee}
              onChange={handleChange}
              placeholder="e.g. 500"
              className={s.inputBase}
            />
          </div>

          {/* Success Rate */}
          <div>
            <label className={s.label}>Success Rate</label>
            <input
              name="success"
              value={form.success}
              onChange={handleChange}
              placeholder="e.g. 98%"
              className={s.inputBase}
            />
          </div>

          {/* Patients */}
          <div>
            <label className={s.label}>Patients</label>
            <input
              name="patients"
              value={form.patients}
              onChange={handleChange}
              placeholder="e.g. 5000+"
              className={s.inputBase}
            />
          </div>

          {/* Rating */}
          <div>
            <label className={s.label}>Rating (1-5)</label>
            <input
              name="rating"
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={form.rating}
              onChange={handleChange}
              placeholder="e.g. 4.5"
              className={s.inputBase}
            />
          </div>

          {/* Availability */}
          <div>
            <label className={s.label}>Availability</label>
            <select
              name="availability"
              value={form.availability}
              onChange={handleChange}
              className={s.inputBase}
            >
              <option value="Available">Available</option>
              <option value="Unavailable">Unavailable</option>
            </select>
          </div>

          {/* About */}
          <div className="md:col-span-2">
            <label className={s.label}>About</label>
            <textarea
              name="about"
              value={form.about}
              onChange={handleChange}
              placeholder="Brief description about the doctor..."
              rows={3}
              className={s.textareaBase}
            />
          </div>

          {/* Schedule Section */}
          <div className="md:col-span-2">
            <div className={s.scheduleContainer}>
              <div className={s.scheduleHeader}>
                <Calendar size={20} className="text-emerald-600" />
                <h3 className={s.scheduleTitle}>Schedule Slots</h3>
              </div>

              <div className={s.scheduleInputsContainer}>
                <input
                  type="date"
                  value={slotDate}
                  min={today}
                  onChange={(e) => setSlotDate(e.target.value)}
                  className={s.scheduleDateInput}
                />
                <select
                  value={slotHour}
                  onChange={(e) => setSlotHour(e.target.value)}
                  className={s.scheduleTimeSelect}
                >
                  <option value="">Hour</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={String(h).padStart(2, "0")}>
                      {String(h).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <select
                  value={slotMinute}
                  onChange={(e) => setSlotMinute(e.target.value)}
                  className={s.scheduleTimeSelect}
                >
                  {["00", "15", "30", "45"].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={slotAmpm}
                  onChange={(e) => setSlotAmpm(e.target.value)}
                  className={s.scheduleTimeSelect}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>

                <button
                  type="button"
                  onClick={addSlotToForm}
                  className={s.addSlotButton + " " + s.cursorPointer}
                >
                  <Plus size={16} /> Add Slot
                </button>
              </div>

              {/* Display Slots */}
              {flatSlots.length > 0 && (
                <div className={s.slotsGrid}>
                  {flatSlots.map((slot, idx) => (
                    <div key={idx} className={s.slotItem}>
                      <span>
                        {formatDateISO(slot.date)} — {slot.time}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSlot(slot.date, slot.time)}
                        className="text-rose-500 hover:text-rose-700 cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className={s.submitButtonContainer}>
            <button
              type="submit"
              disabled={loading || !isValid}
              className={
                s.submitButton +
                " " +
                (loading || !isValid ? s.submitButtonDisabled : s.submitButtonEnabled) +
                " " +
                s.cursorPointer
              }
            >
              {loading ? "Adding Doctor..." : "Add Doctor"}
            </button>
          </div>
        </form>
      </div>
       {/* TOAST */}
      {toast.show && (
        <div
          className={s.toastContainer + " " + 
            (toast.type === "success" ? s.toastSuccess : s.toastError)}
        >
          {toast.type === "success" ? (
            <CheckCircle size={22} />
          ) : (
            <XCircle size={22} />
          )}
          <span>{toast.message}</span>
        </div>
      )}
      {/* Simple overview of added doc */}
<div className={s.doctorListContainer}>
  {doctorList.length ? (
    <div className={s.doctorListGrid}>
      {doctorList.map((d) => (
        <div key={d.id || d._id} className={s.doctorCard}>
          <div className={s.doctorCardContent}>
            <img
              src={d.imageUrl || d.imagePreview}
              alt={d.name}
              className={s.doctorImage}
            />

            <div>
              <div className={s.doctorName}>{d.name}</div>

              <div className={s.doctorSpecialization}>
                {d.specialization}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p className={s.emptyState}> No Doctor Yet</p>
  )}
</div>
    </div>
  );
};

export default AddPage;
