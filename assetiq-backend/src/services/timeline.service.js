import { AuditLog } from '../models/AuditLog.js';
import { MaintenanceRequest } from '../models/MaintenanceRequest.js';
import { MaintenanceHistory } from '../models/MaintenanceHistory.js';
import { AssetAssignment } from '../models/AssetAssignment.js';
import { Warranty } from '../models/Warranty.js';
import { Asset } from '../models/Asset.js';

export const getTicketTimeline = async (requestId) => {
  const auditEntries = await AuditLog.find({
    entityType: 'ticket',
    entityId: requestId,
  }).sort({ timestamp: 1 });

  return auditEntries.map((log) => ({
    id: log._id,
    action: log.action,
    actorName: log.actorName,
    actorRole: log.actorRole,
    changes: log.changes,
    metadata: log.metadata,
    timestamp: log.timestamp,
  }));
};

export const getAssetTimeline = async (assetId) => {
  const asset = await Asset.findById(assetId);
  if (!asset) return [];

  const timelineEvents = [];

  // 1. Purchase & Indexing Event
  timelineEvents.push({
    eventType: 'ASSET_CREATED',
    title: 'Asset Purchased & Indexed',
    description: `Asset ${asset.name} (${asset.assetCode}) added to system inventory at purchase price $${asset.purchasePrice}`,
    timestamp: asset.createdAt || asset.purchaseDate,
    actor: 'System Admin',
  });

  // 2. Custody Assignment Logs
  const assignments = await AssetAssignment.find({ assetId }).populate('employeeId').populate('assignedBy');
  assignments.forEach((assign) => {
    timelineEvents.push({
      eventType: 'ASSET_ASSIGNED',
      title: 'Custody Assigned',
      description: `Assigned to employee ${assign.employeeId?.name || assign.employeeId?.email || 'Staff member'}`,
      timestamp: assign.assignedAt,
      actor: assign.assignedBy?.email || 'Manager',
    });
    if (assign.returnedAt) {
      timelineEvents.push({
        eventType: 'ASSET_RETURNED',
        title: 'Custody Returned',
        description: `Returned from custody and made available in inventory`,
        timestamp: assign.returnedAt,
        actor: 'Manager',
      });
    }
  });

  // 3. Maintenance Requests & Histories
  const historyEntries = await MaintenanceHistory.find({ assetId }).populate('requestId');
  historyEntries.forEach((hist) => {
    timelineEvents.push({
      eventType: 'MAINTENANCE_COMPLETED',
      title: 'Repair Servicing Completed',
      description: `Findings: "${hist.findings}". Actions: "${hist.actionsTaken}". Total Repair Cost: $${hist.cost}`,
      timestamp: hist.date,
      actor: 'Service Technician',
    });
  });

  // 4. Warranty Expiry / Status
  const warranty = await Warranty.findOne({ assetId });
  if (warranty) {
    timelineEvents.push({
      eventType: 'WARRANTY_REGISTERED',
      title: 'Warranty Registered',
      description: `Covered by ${warranty.provider} until ${new Date(warranty.endDate).toLocaleDateString()}`,
      timestamp: warranty.createdAt || asset.purchaseDate,
      actor: 'Vendor Partner',
    });
  }

  // 5. AuditLog System Mutations
  const auditEntries = await AuditLog.find({
    entityType: 'asset',
    entityId: assetId,
  });

  auditEntries.forEach((log) => {
    timelineEvents.push({
      eventType: log.action,
      title: `System Event: ${log.action}`,
      description: JSON.stringify(log.changes || log.metadata || {}),
      timestamp: log.timestamp,
      actor: log.actorName,
    });
  });

  // Sort chronologically ascending
  return timelineEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};
