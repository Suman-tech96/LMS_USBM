import { connectDB, disconnectDB } from '../config/db.js';
import { Admin } from '../models/Admin.js';
import { env } from '../config/env.js';
import { passwordService } from '../services/passwordService.js';

const seedAdmin = async () => {
  try {
    console.log('[Seed Admin] Connecting to database...');
    await connectDB();

    const name = env.SEED_ADMIN_NAME;
    const email = env.SEED_ADMIN_EMAIL?.toLowerCase().trim();
    const password = env.SEED_ADMIN_PASSWORD;

    if (!email || !password) {
      console.error('[Seed Admin Error] SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be defined in your environment.');
      process.exit(1);
    }

    const strengthCheck = passwordService.validatePasswordStrength(password);
    if (!strengthCheck.valid) {
      console.error(`[Seed Admin Error] ${strengthCheck.message}`);
      process.exit(1);
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      console.log(`[Seed Admin Notice] Administrator with email '${email}' already exists.`);
      console.log(`[Seed Admin Notice] No changes were made to avoid overwriting existing credentials.`);
      console.log(`[Seed Admin Notice] To update administrator credentials, run 'npm run admin:change'.`);
      await disconnectDB();
      process.exit(0);
    }

    // Create new admin
    const newAdmin = await Admin.create({
      name: name || 'Admin',
      email,
      password, // Pre-save hook hashes this securely
      role: 'admin',
      status: 'active'
    });

    console.log(`===================================================`);
    console.log(`[Seed Admin Success] Initial Administrator created!`);
    console.log(`  Name:  ${newAdmin.name}`);
    console.log(`  Email: ${newAdmin.email}`);
    console.log(`  Role:  ${newAdmin.role}`);
    console.log(`  Security: Password securely hashed with bcrypt.`);
    console.log(`===================================================`);

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error(`[Seed Admin Failed] ${error.message}`);
    await disconnectDB();
    process.exit(1);
  }
};

seedAdmin();
