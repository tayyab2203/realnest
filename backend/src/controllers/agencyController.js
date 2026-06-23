import prisma from '../lib/prisma.js';
import {
  listAgents,
  addAgent,
  updateAgent,
  removeAgent,
  updateAgencyProfile,
  bulkUpdateStatus,
  bulkDelete,
} from '../services/agencyService.js';

const handle = (res, err, fallback) => {
  console.error(fallback, err);
  return res.status(err.status || 500).json({
    error: err.message || fallback,
  });
};

// GET /api/agency/profile
export const getAgencyProfile = async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.user.profile.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        companyName: true,
        companyLogo: true,
        companyDescription: true,
        officeAddress: true,
        subscriptionPlan: true,
        subscriptionEndDate: true,
        isVerified: true,
      },
    });
    return res.json({ profile });
  } catch (err) {
    return handle(res, err, 'Failed to fetch agency profile');
  }
};

// PUT /api/agency/profile
export const updateProfile = async (req, res) => {
  try {
    const updated = await updateAgencyProfile(req.user.profile.id, req.body);
    return res.json({ profile: updated });
  } catch (err) {
    return handle(res, err, 'Failed to update agency profile');
  }
};

// GET /api/agency/agents
export const getAgents = async (req, res) => {
  try {
    const agents = await listAgents(req.user.profile.id);
    return res.json({ agents });
  } catch (err) {
    return handle(res, err, 'Failed to fetch agents');
  }
};

// POST /api/agency/agents
export const createAgent = async (req, res) => {
  try {
    const agent = await addAgent(req.user.profile.id, req.body);
    return res.status(201).json({ agent });
  } catch (err) {
    return handle(res, err, 'Failed to add agent');
  }
};

// PUT /api/agency/agents/:id
export const editAgent = async (req, res) => {
  try {
    const agent = await updateAgent(req.user.profile.id, req.params.id, req.body);
    return res.json({ agent });
  } catch (err) {
    return handle(res, err, 'Failed to update agent');
  }
};

// DELETE /api/agency/agents/:id
export const deleteAgent = async (req, res) => {
  try {
    await removeAgent(req.user.profile.id, req.params.id);
    return res.json({ message: 'Agent removed' });
  } catch (err) {
    return handle(res, err, 'Failed to remove agent');
  }
};

// PATCH /api/agency/listings/bulk-status
export const bulkStatusUpdate = async (req, res) => {
  try {
    const { propertyIds, status } = req.body;
    const result = await bulkUpdateStatus(req.user.profile.id, propertyIds, status);
    return res.json({ message: `${result.updated} listing(s) updated`, ...result });
  } catch (err) {
    return handle(res, err, 'Failed to bulk update listings');
  }
};

// DELETE /api/agency/listings/bulk
export const bulkDeleteListings = async (req, res) => {
  try {
    const { propertyIds } = req.body;
    const result = await bulkDelete(req.user.profile.id, propertyIds);
    return res.json({ message: `${result.deleted} listing(s) deleted`, ...result });
  } catch (err) {
    return handle(res, err, 'Failed to bulk delete listings');
  }
};
