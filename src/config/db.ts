// src/config/db.ts
import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI as string);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // error from a catch block is typed `unknown` under strict mode -
    // we can't assume it has a `.message` until we check.
    const message = error instanceof Error ? error.message : String(error);
    console.error(`MongoDB Error: ${message}`);
    process.exit(1); // Kill the server if DB fails - no point running without DB
  }
};

export default connectDB;
