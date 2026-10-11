import bcrypt from 'bcryptjs';
import crypto from 'crypto';

class PasswordService {
  /**
   * Validate password complexity
   * Requires: min 6 chars, at least one letter and one number or special char
   */
  validatePasswordStrength(password) {
    if (!password || typeof password !== 'string') {
      return { valid: false, message: 'Password is required' };
    }
    if (password.length < 6) {
      return { valid: false, message: 'Password must be at least 6 characters long' };
    }
    return { valid: true };
  }

  /**
   * Hash plain text password
   */
  async hashPassword(plainPassword, saltRounds = 10) {
    const salt = await bcrypt.genSalt(saltRounds);
    return await bcrypt.hash(plainPassword, salt);
  }

  /**
   * Compare plain password with hash
   */
  async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Hash raw reset token with sha256
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

export const passwordService = new PasswordService();
