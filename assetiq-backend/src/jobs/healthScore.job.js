import cron from 'node-cron';
import { Asset } from '../models/Asset.js';
import { analyzeAssetHealth } from '../services/ai.service.js';

export const startHealthScoreJob = () => {
  // Run nightly at 02:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('⏰ AI Health Score Job: Starting nightly calculations...');
    try {
      // Find all assets that are not retired
      // No AsyncLocalStorage store is active here, so this scans all tenants.
      const activeAssets = await Asset.find({ status: { $ne: 'retired' } });

      console.log(`⏰ AI Health Score Job: Found ${activeAssets.length} active assets to analyze.`);

      for (const asset of activeAssets) {
        try {
          // Force a recompute during the nightly cron job
          const analysis = await analyzeAssetHealth(asset, true);
          
          asset.ai = {
            healthScore: analysis.healthScore,
            insights: analysis.insights,
            lastAnalyzedAt: analysis.lastAnalyzedAt,
          };

          // Temporarily bypass tenant validation or save within the context of the asset's own tenant
          // Since the document already has organizationId, saving is simple.
          await asset.save();
          console.log(`✅ Calculated health score for asset: ${asset.name} (${asset.assetCode}) -> ${analysis.healthScore}`);
        } catch (err) {
          console.error(`❌ Failed to update health score for asset ${asset._id}:`, err.message);
        }
      }
      console.log('⏰ AI Health Score Job: Nightly recalculation complete.');
    } catch (error) {
      console.error('❌ AI Health Score Job failed:', error.message);
    }
  });
  
  console.log('⚙️ AI Health Score cron job initialized (runs nightly at 2:00 AM)');
};
