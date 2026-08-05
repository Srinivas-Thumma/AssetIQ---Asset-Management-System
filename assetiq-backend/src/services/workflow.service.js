/**
 * Workflow Engine Service:
 * Enforces valid state transitions and role privileges for Maintenance Tickets.
 */

const VALID_TRANSITIONS = {
  open: ['assigned', 'cancelled', 'pending_approval'],
  assigned: ['accepted', 'open', 'in_progress', 'cancelled', 'pending_approval'],
  accepted: ['in_progress', 'waiting_user', 'waiting_vendor', 'pending_approval', 'cancelled'],
  waiting_user: ['in_progress', 'accepted', 'cancelled'],
  waiting_vendor: ['in_progress', 'accepted', 'cancelled'],
  pending_approval: ['in_progress', 'cancelled'], // Can only move after approval decision
  in_progress: ['waiting_user', 'waiting_vendor', 'resolved', 'cancelled'],
  resolved: ['closed', 'in_progress'], // Re-open or finalize
  closed: [],                         // Final state
  cancelled: [],                      // Final state
};

export const validateStateTransition = (currentStatus, targetStatus, userRole) => {
  if (currentStatus === targetStatus) return true;

  const allowedTargets = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowedTargets.includes(targetStatus)) {
    const error = new Error(
      `Invalid ticket state transition: Cannot move ticket from '${currentStatus}' to '${targetStatus}'.`
    );
    error.statusCode = 400;
    throw error;
  }

  // Employees can only cancel their own open/assigned tickets
  if (userRole === 'employee' && targetStatus !== 'cancelled') {
    const error = new Error('Employees are not authorized to execute this state transition.');
    error.statusCode = 403;
    throw error;
  }

  return true;
};
