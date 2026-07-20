import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Simple fetch fallback for node-fetch if running in ES modules that don't have it natively in old node, but Node 18+ has it.
// We'll import it just in case, or use native fetch if available.
const pingFetch = typeof fetch === 'function' ? fetch : globalThis.fetch;

const verify = async () => {
  console.log('🔍 Starting AssetIQ Health Diagnostics...\n');

  // 1. Env check
  console.log('1. Checking Environment Variables...');
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/assetiq';
  const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
  const MOCK_AI = process.env.MOCK_AI === 'true';
  console.log(`   - MONGODB_URI: ${MONGODB_URI}`);
  console.log(`   - OLLAMA_URL: ${OLLAMA_URL}`);
  console.log(`   - MOCK_AI: ${MOCK_AI} (${MOCK_AI ? 'Deterministic Fixtures' : 'Active LLM Call'})\n`);

  // 2. Database connection check
  console.log('2. Checking MongoDB Connection...');
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('   ✅ MongoDB Connected Successfully!');
    console.log(`   - Database Host: ${mongoose.connection.host}`);
    console.log(`   - Connection State: Connected (${mongoose.connection.readyState})\n`);
  } catch (err) {
    console.error(`   ❌ MongoDB Connection Failed: ${err.message}\n`);
  }

  // 3. AI Ollama connectivity check
  console.log('3. Checking Ollama LLM Service Connectivity...');
  if (MOCK_AI) {
    console.log('   ℹ️ Ollama ping skipped (MOCK_AI is set to true).\n');
  } else {
    try {
      const res = await pingFetch(`${OLLAMA_URL}/api/tags`);
      if (res.ok) {
        const data = await res.json();
        console.log('   ✅ Ollama Service Responsive!');
        console.log('   - Available Models:', data.models ? data.models.map(m => m.name).join(', ') : 'None');
      } else {
        console.log(`   ⚠️ Ollama responded with status: ${res.status}. Fallback mock mode recommended.`);
      }
    } catch (err) {
      console.log(`   ❌ Ollama Service Unreachable at ${OLLAMA_URL}.`);
      console.log('      (Check if "ollama serve" is running or set MOCK_AI=true in .env to run without it).\n');
    }
  }

  // 4. Schema verification by loading models
  console.log('4. Verifying Mongoose Schemas & Compilation...');
  try {
    await import('../models/Organization.js');
    await import('../models/Plan.js');
    await import('../models/User.js');
    await import('../models/Branch.js');
    await import('../models/Building.js');
    await import('../models/Floor.js');
    await import('../models/Room.js');
    await import('../models/Department.js');
    await import('../models/Category.js');
    await import('../models/Vendor.js');
    await import('../models/Employee.js');
    await import('../models/Asset.js');
    await import('../models/AssetAssignment.js');
    await import('../models/MaintenanceRequest.js');
    await import('../models/MaintenanceHistory.js');
    await import('../models/Warranty.js');
    console.log('   ✅ All Mongoose models imported and compiled successfully without syntax errors!\n');
  } catch (err) {
    console.error(`   ❌ Schema Compilation Error: ${err.message}\n`);
  }

  // Close connection
  await mongoose.disconnect();
  console.log('🏁 Diagnostic completed.');
};

verify();
