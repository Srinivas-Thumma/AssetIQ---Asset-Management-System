import { Branch } from '../models/Branch.js';
import { Building } from '../models/Building.js';
import { Floor } from '../models/Floor.js';
import { Room } from '../models/Room.js';
import { sendResponse } from '../utils/apiResponse.js';

// --- Branch ---
export const getBranches = async (req, res, next) => {
  try {
    const branches = await Branch.find();
    return sendResponse(res, 200, true, 'Branches retrieved', branches);
  } catch (error) {
    next(error);
  }
};

export const createBranch = async (req, res, next) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) {
      return sendResponse(res, 400, false, 'Name and code are required');
    }
    const branch = await Branch.create({ name, code });
    return sendResponse(res, 201, true, 'Branch created', branch);
  } catch (error) {
    next(error);
  }
};

// --- Building ---
export const getBuildings = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.branchId) filter.branchId = req.query.branchId;
    
    const buildings = await Building.find(filter).populate('branchId');
    return sendResponse(res, 200, true, 'Buildings retrieved', buildings);
  } catch (error) {
    next(error);
  }
};

export const createBuilding = async (req, res, next) => {
  try {
    const { branchId, name, code } = req.body;
    if (!branchId || !name || !code) {
      return sendResponse(res, 400, false, 'branchId, name, and code are required');
    }
    const building = await Building.create({ branchId, name, code });
    return sendResponse(res, 201, true, 'Building created', building);
  } catch (error) {
    next(error);
  }
};

// --- Floor ---
export const getFloors = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.buildingId) filter.buildingId = req.query.buildingId;

    const floors = await Floor.find(filter).populate({
      path: 'buildingId',
      populate: { path: 'branchId' }
    });
    return sendResponse(res, 200, true, 'Floors retrieved', floors);
  } catch (error) {
    next(error);
  }
};

export const createFloor = async (req, res, next) => {
  try {
    const { buildingId, name, number } = req.body;
    if (!buildingId || !name || number === undefined) {
      return sendResponse(res, 400, false, 'buildingId, name, and floor number are required');
    }
    const floor = await Floor.create({ buildingId, name, number });
    return sendResponse(res, 201, true, 'Floor created', floor);
  } catch (error) {
    next(error);
  }
};

// --- Room ---
export const getRooms = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.floorId) filter.floorId = req.query.floorId;

    const rooms = await Room.find(filter).populate({
      path: 'floorId',
      populate: {
        path: 'buildingId',
        populate: { path: 'branchId' }
      }
    });
    return sendResponse(res, 200, true, 'Rooms retrieved', rooms);
  } catch (error) {
    next(error);
  }
};

export const createRoom = async (req, res, next) => {
  try {
    const { floorId, name, code } = req.body;
    if (!floorId || !name || !code) {
      return sendResponse(res, 400, false, 'floorId, name, and code are required');
    }
    const room = await Room.create({ floorId, name, code });
    return sendResponse(res, 201, true, 'Room created', room);
  } catch (error) {
    next(error);
  }
};

// --- Hierarchy Tree View ---
export const getLocationTree = async (req, res, next) => {
  try {
    const branches = await Branch.find().lean();
    const buildings = await Building.find().lean();
    const floors = await Floor.find().lean();
    const rooms = await Room.find().lean();

    // Map hierarchy
    const tree = branches.map((branch) => {
      const branchBuildings = buildings
        .filter((b) => b.branchId.toString() === branch._id.toString())
        .map((building) => {
          const buildingFloors = floors
            .filter((f) => f.buildingId.toString() === building._id.toString())
            .map((floor) => {
              const floorRooms = rooms.filter(
                (r) => r.floorId.toString() === floor._id.toString()
              );
              return { ...floor, rooms: floorRooms };
            });
          return { ...building, floors: buildingFloors };
        });
      return { ...branch, buildings: branchBuildings };
    });

    return sendResponse(res, 200, true, 'Location hierarchy tree retrieved', tree);
  } catch (error) {
    next(error);
  }
};
