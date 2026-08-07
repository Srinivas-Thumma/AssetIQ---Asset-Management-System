import mongoose from 'mongoose';
import { env } from './env.js';

// Mongoose connectDB() — called once at startup.

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1); // 1 - exit with failure
  }
};
