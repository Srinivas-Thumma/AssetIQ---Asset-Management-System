import { getAssetTimeline, getTicketTimeline } from '../services/timeline.service.js';
import { sendResponse } from '../utils/apiResponse.js';

export const getAssetTimelineById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const timeline = await getAssetTimeline(id);
    return sendResponse(res, 200, true, 'Asset lifecycle timeline retrieved', timeline);
  } catch (error) {
    next(error);
  }
};

export const getTicketTimelineById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const timeline = await getTicketTimeline(id);
    return sendResponse(res, 200, true, 'Ticket audit timeline retrieved', timeline);
  } catch (error) {
    next(error);
  }
};
