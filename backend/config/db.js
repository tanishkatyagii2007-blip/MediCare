import mongoose from "mongoose";

let isConnected = false;

export const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState >= 1) {
    return;
  }

  const uri = process.env.MONGODB_URI || "mongodb+srv://tanishkatyagii2007_db_user:myzV2hw0UhpkrqNM@cluster0.5ujgrry.mongodb.net/MediCare";

  try {
    const db = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 6000,
    });
    isConnected = db.connections[0].readyState === 1;
    console.log("DB CONNECTED");
  } catch (err) {
    console.error("DB Connection Error:", err.message);
  }
};