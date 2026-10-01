import mongoose from "mongoose";
import dns from "dns";

export const connectDB = async () => {
  try {
    dns.setDefaultResultOrder?.("ipv4first");
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
  } catch (err) {
    console.warn("Warning: Could not set DNS options:", err);
  }

  const uri = process.env.MONGODB_URI || "mongodb+srv://tanishkatyagii2007_db_user:myzV2hw0UhpkrqNM@cluster0.5ujgrry.mongodb.net/MediCare";

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("DB CONNECTED");
  } catch (err) {
    console.error("DB Connection Error:", err.message);
  }
};