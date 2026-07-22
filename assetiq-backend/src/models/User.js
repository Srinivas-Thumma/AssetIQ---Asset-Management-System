import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const userSchema = new mongoose.Schema(
  {
    // Tenant users must belong to an organization. Platform super admins are
    // deliberately global, so their organizationId is null.
    organizationId: {
      type: String,
      default: null,
      index: true,
      required: function () {
        return this.role !== 'super_admin';
      },
    },
    email: {
      type: String,
      required: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['super_admin', 'org_admin', 'asset_manager', 'employee'],
      default: 'employee',
    },
    employeeRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// Compound unique index for email per organization
userSchema.index({ email: 1 }, { unique: true });

// Pre-save hook to hash password if modified
userSchema.pre('save', async function (next) {
  if (this.isModified('passwordHash') && !this.passwordHash.startsWith('$2a$')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

// Apply tenant scoping plugin
userSchema.plugin(tenantScopePlugin);

export const User = mongoose.model('User', userSchema);
