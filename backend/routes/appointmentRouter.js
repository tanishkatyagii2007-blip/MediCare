import express from "express";
import {
  confirmPayment,
  createAppointment,
  getAppointments,
  getAppointmentsByDoctor,
  getAppointmentsByPatient,
  getRegisteredUserCount,
  getStats,
  cancelAppointment,
  updateAppointment,
} from "../controllers/appointmentController.js";

const appointmentRouter = express.Router();

appointmentRouter.get("/", getAppointments);
appointmentRouter.get("/confirm", confirmPayment);
appointmentRouter.get("/stats/summary", getStats);


// authentic routes
appointmentRouter.post(
  "/",
  createAppointment
);

appointmentRouter.get(
  "/me",
  getAppointmentsByPatient
);

appointmentRouter.get(
  "/doctor/:doctorId",
  getAppointmentsByDoctor
);

appointmentRouter.post("/:id/cancel", cancelAppointment);

appointmentRouter.get(
  "/patients/count",
  getRegisteredUserCount
);

appointmentRouter.put("/:id", updateAppointment);

export default appointmentRouter;