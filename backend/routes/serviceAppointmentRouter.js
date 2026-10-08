import express from "express";

import {
  cancelServiceAppointment,
  confirmServicePayment,
  createServiceAppointment,
  getServiceAppointmentById,
  getServiceAppointmentStats,
  getServiceAppointments,
  getServiceAppointmentsByPatient,
  updateServiceAppointment,
} from "../controllers/serviceAppointmentController.js";

const serviceAppointmentRouter = express.Router();

serviceAppointmentRouter.get("/", getServiceAppointments);
serviceAppointmentRouter.get("/confirm", confirmServicePayment);
serviceAppointmentRouter.get(
  "/stats/summary",
  getServiceAppointmentStats
);

serviceAppointmentRouter.post(
  "/",
  createServiceAppointment
);

serviceAppointmentRouter.get(
  "/me",
  getServiceAppointmentsByPatient
);

serviceAppointmentRouter.get(
  "/:id",
  getServiceAppointmentById
);

serviceAppointmentRouter.put(
  "/:id",
  updateServiceAppointment
);

serviceAppointmentRouter.post(
  "/:id/cancel",
  cancelServiceAppointment
);

export default serviceAppointmentRouter;