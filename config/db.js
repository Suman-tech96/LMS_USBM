import mongoose from 'mongoose';
import { env } from './env.js';

let isConnected = false;

export const connectDB = async (uri = env.MONGO_URI) => {
  if (isConnected) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri);
    isConnected = true;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);
    }
    return conn;
  } catch (error) {
    console.error(`[MongoDB Connection Error] ${error.message}`);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDB = async () => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
  }
};
