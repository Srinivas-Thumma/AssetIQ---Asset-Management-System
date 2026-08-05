import cron from 'node-cron';
import { checkSlaBreaches } from '../services/sla.service.js';

export const startSlaCheckJob = () => {
  // Run every 5 minutes to check SLA resolution deadlines
  cron.schedule('*/5 * * * *', async () => {
    try {
      await checkSlaBreaches();
    } catch (err) {
      console.error('❌ SLA Check Job error:', err.message);
    }
  });

  console.log('⚙️ SLA Check cron job initialized (runs every 5 minutes — cron: "*/5 * * * *")');
};
