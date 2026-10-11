import { connectDB, disconnectDB } from '../config/db.js';
import { Admin } from '../models/Admin.js';
import { env } from '../config/env.js';
import { passwordService } from '../services/passwordService.js';

/**
 * Script to securely change an admin's credentials
 * Requires either:
 * 1. TARGET_ADMIN_EMAIL + CURRENT_PASSWORD + NEW_PASSWORD (+ optional NEW_EMAIL)
 * OR
 * 2. TARGET_ADMIN_EMAIL + ADMIN_RECOVERY_KEY + NEW_PASSWORD (+ optional NEW_EMAIL)
 */
const changeAdminCredentials = async () => {
  try {
    console.log('[Admin Credential Change] Connecting to database...');
    await connectDB();

    const targetEmail = (process.env.TARGET_ADMIN_EMAIL || env.SEED_ADMIN_EMAIL)?.toLowerCase().trim();
    const currentPassword = process.env.CURRENT_PASSWORD;
    const recoveryKey = process.env.ADMIN_RECOVERY_KEY_INPUT || process.env.ADMIN_RECOVERY_KEY;
    const newPassword = process.env.NEW_PASSWORD;
    const newEmail = process.env.NEW_EMAIL?.toLowerCase().trim();

    if (!targetEmail) {
      console.error('[Error] TARGET_ADMIN_EMAIL or SEED_ADMIN_EMAIL is required.');
      await disconnectDB();
      process.exit(1);
    }

    if (!newPassword && !newEmail) {
      console.error('[Error] Please supply NEW_PASSWORD and/or NEW_EMAIL.');
      await disconnectDB();
      process.exit(1);
    }

    const admin = await Admin.findOne({ email: targetEmail, isDeleted: { $ne: true } }).select('+password');

    if (!admin) {
      console.error(`[Error] No administrator found for email '${targetEmail}'.`);
      await disconnectDB();
      process.exit(1);
    }

    // Verify Authorization: either valid recovery key OR current password
    let authorized = false;

    if (recoveryKey && recoveryKey === env.ADMIN_RECOVERY_KEY) {
      authorized = true;
      console.log('[Auth] Authorized using Administrative Recovery Key.');
    } else if (currentPassword) {
      const match = await admin.comparePassword(currentPassword);
      if (match) {
        authorized = true;
        console.log('[Auth] Authorized using Current Administrator Password.');
      } else {
        console.error('[Error] Current password verification failed.');
        await disconnectDB();
        process.exit(1);
      }
    } else {
      console.error('[Error] Authorization required. Supply CURRENT_PASSWORD or ADMIN_RECOVERY_KEY.');
      await disconnectDB();
      process.exit(1);
    }

    if (newPassword) {
      const check = passwordService.validatePasswordStrength(newPassword);
      if (!check.valid) {
        console.error(`[Error] ${check.message}`);
        await disconnectDB();
        process.exit(1);
      }
      admin.password = newPassword; // Pre-save hook will hash it
    }

    if (newEmail && newEmail !== admin.email) {
      const emailExists = await Admin.findOne({ email: newEmail, _id: { $ne: admin._id } });
      if (emailExists) {
        console.error(`[Error] Email '${newEmail}' is already used by another administrator.`);
        await disconnectDB();
        process.exit(1);
      }
      admin.email = newEmail;
    }

    // Invalidate any active reset tokens
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpire = undefined;

    await admin.save();

    console.log(`=======================================================`);
    console.log(`[Success] Administrator credentials updated safely!`);
    console.log(`  Admin ID:  ${admin._id}`);
    console.log(`  Email:     ${admin.email}`);
    console.log(`  Password:  [UPDATED & BCRYPT HASHED]`);
    console.log(`=======================================================`);

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error(`[Error] Failed to change credentials: ${error.message}`);
    await disconnectDB();
    process.exit(1);
  }
};

changeAdminCredentials();
