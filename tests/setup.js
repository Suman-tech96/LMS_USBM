import mongoose from 'mongoose';
import { env } from '../config/env.js';

process.env.NODE_ENV = 'test';

export const connectTestDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.MONGO_TEST_URI);
  }
};

export const clearTestDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
};

export const closeTestDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await clearTestDB();
    await mongoose.disconnect();
  }
};
