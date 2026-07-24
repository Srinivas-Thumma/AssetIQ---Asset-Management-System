import { Branch } from '../models/Branch.js';
import { Building } from '../models/Building.js';
import { Floor } from '../models/Floor.js';
import { Room } from '../models/Room.js';
import { Asset } from '../models/Asset.js';
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

export const updateBranch = async (req, res, next) => {
  try {
    const { name, code } = req.body;
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return sendResponse(res, 404, false, 'Branch not found');
    }
    if (name) branch.name = name;
    if (code) branch.code = code;
    await branch.save();
    return sendResponse(res, 200, true, 'Branch updated successfully', branch);
  } catch (error) {
    next(error);
  }
};

export const deleteBranch = async (req, res, next) => {
  try {
    const hasBuildings = await Building.exists({ branchId: req.params.id });
    if (hasBuildings) {
      return sendResponse(res, 400, false, 'Cannot delete branch: it still contains buildings');
    }
    const branch = await Branch.findByIdAndDelete(req.params.id);
    if (!branch) {
      return sendResponse(res, 404, false, 'Branch not found');
    }
    return sendResponse(res, 200, true, 'Branch deleted successfully', null);
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

export const updateBuilding = async (req, res, next) => {
  try {
    const { name, code, branchId } = req.body;
    const building = await Building.findById(req.params.id);
    if (!building) {
      return sendResponse(res, 404, false, 'Building not found');
    }
    if (name) building.name = name;
    if (code) building.code = code;
    if (branchId) building.branchId = branchId;
    await building.save();
    return sendResponse(res, 200, true, 'Building updated successfully', building);
  } catch (error) {
    next(error);
  }
};

export const deleteBuilding = async (req, res, next) => {
  try {
    const hasFloors = await Floor.exists({ buildingId: req.params.id });
    if (hasFloors) {
      return sendResponse(res, 400, false, 'Cannot delete building: it still contains floors');
    }
    const building = await Building.findByIdAndDelete(req.params.id);
    if (!building) {
      return sendResponse(res, 404, false, 'Building not found');
    }
    return sendResponse(res, 200, true, 'Building deleted successfully', null);
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

export const updateFloor = async (req, res, next) => {
  try {
    const { name, number, buildingId } = req.body;
    const floor = await Floor.findById(req.params.id);
    if (!floor) {
      return sendResponse(res, 404, false, 'Floor not found');
    }
    if (name) floor.name = name;
    if (number !== undefined) floor.number = number;
    if (buildingId) floor.buildingId = buildingId;
    await floor.save();
    return sendResponse(res, 200, true, 'Floor updated successfully', floor);
  } catch (error) {
    next(error);
  }
};

export const deleteFloor = async (req, res, next) => {
  try {
    const hasRooms = await Room.exists({ floorId: req.params.id });
    if (hasRooms) {
      return sendResponse(res, 400, false, 'Cannot delete floor: it still contains rooms');
    }
    const floor = await Floor.findByIdAndDelete(req.params.id);
    if (!floor) {
      return sendResponse(res, 404, false, 'Floor not found');
    }
    return sendResponse(res, 200, true, 'Floor deleted successfully', null);
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

export const updateRoom = async (req, res, next) => {
  try {
    const { name, code, floorId } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) {
      return sendResponse(res, 404, false, 'Room not found');
    }
    if (name) room.name = name;
    if (code) room.code = code;
    if (floorId) room.floorId = floorId;
    await room.save();
    return sendResponse(res, 200, true, 'Room updated successfully', room);
  } catch (error) {
    next(error);
  }
};

export const deleteRoom = async (req, res, next) => {
  try {
    const hasAssets = await Asset.exists({ roomId: req.params.id });
    if (hasAssets) {
      return sendResponse(res, 400, false, 'Cannot delete room: assets are currently mapped here');
    }
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) {
      return sendResponse(res, 404, false, 'Room not found');
    }
    return sendResponse(res, 200, true, 'Room deleted successfully', null);
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
