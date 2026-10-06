import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { clerkMiddleware } from '@clerk/express';
import doctorRouter from './routes/doctorRouter.js';
import serviceRouter from './routes/serviceRouter.js';
import appointmentRouter from './routes/appointmentRouter.js';
import serviceAppointmentRouter from './routes/serviceAppointmentRouter.js';

import { connectDB} from './config/db.js'; 

const app = express();
const port = process.env.PORT || 4000;

const FRONTEND_URL = process.env.FRONTEND_URL || "";
const ADMIN_URL = process.env.ADMIN_URL || "";

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  ...(FRONTEND_URL ? [FRONTEND_URL.replace(/\/$/, "")] : []),
  ...(ADMIN_URL ? [ADMIN_URL.replace(/\/$/, "")] : []),
];
// Middlewares
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
); 

app.use(clerkMiddleware());

app.use(express.json({ limit: "20mb" }));

app.use(
  express.urlencoded({
    limit: "20mb",
    extended: true,
  })
);

// DB
connectDB();

// Routes
app.use("/api/doctors", doctorRouter);
app.use("/api/services", serviceRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/service-appointments", serviceAppointmentRouter);

app.get("/", (req, res) => {
  res.send("API WORKING");
});

// Local dev
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server Started on http://localhost:${port}`);
  });
}

export default app;