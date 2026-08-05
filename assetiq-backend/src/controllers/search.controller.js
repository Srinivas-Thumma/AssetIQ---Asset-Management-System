import { globalSearch } from '../services/search.service.js';
import { sendResponse } from '../utils/apiResponse.js';

export const handleGlobalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    const results = await globalSearch(req.user, req.orgId, q);
    return sendResponse(res, 200, true, 'Search results retrieved', results);
  } catch (error) {
    next(error);
  }
};
