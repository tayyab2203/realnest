import prisma from '../lib/prisma.js';

const sanitizeAgent = (agent) => ({
  id: agent.id,
  name: agent.name,
  email: agent.email,
  phone: agent.phone || null,
  role: agent.role,
  image: agent.image || null,
  createdAt: agent.createdAt,
});

export const listAgents = async (agencyId) => {
  const agents = await prisma.agencyAgent.findMany({
    where: { agencyId },
    orderBy: { createdAt: 'desc' },
  });
  return agents.map(sanitizeAgent);
};

export const addAgent = async (agencyId, payload) => {
  const { name, email, phone, role, image } = payload;

  if (!name?.trim() || !email?.trim()) {
    const err = new Error('Agent name and email are required');
    err.status = 400;
    throw err;
  }

  try {
    const agent = await prisma.agencyAgent.create({
      data: {
        agencyId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        role: role?.trim() || 'Agent',
        image: image || null,
      },
    });
    return sanitizeAgent(agent);
  } catch (err) {
    if (err.code === 'P2002') {
      const dup = new Error('An agent with this email already exists');
      dup.status = 409;
      throw dup;
    }
    throw err;
  }
};

export const updateAgent = async (agencyId, agentId, payload) => {
  const existing = await prisma.agencyAgent.findUnique({ where: { id: agentId } });
  if (!existing || existing.agencyId !== agencyId) {
    const err = new Error('Agent not found');
    err.status = 404;
    throw err;
  }

  const updated = await prisma.agencyAgent.update({
    where: { id: agentId },
    data: {
      ...(payload.name !== undefined && { name: String(payload.name).trim() }),
      ...(payload.email !== undefined && {
        email: String(payload.email).trim().toLowerCase(),
      }),
      ...(payload.phone !== undefined && { phone: payload.phone?.trim() || null }),
      ...(payload.role !== undefined && { role: String(payload.role).trim() || 'Agent' }),
      ...(payload.image !== undefined && { image: payload.image || null }),
    },
  });
  return sanitizeAgent(updated);
};

export const removeAgent = async (agencyId, agentId) => {
  const existing = await prisma.agencyAgent.findUnique({ where: { id: agentId } });
  if (!existing || existing.agencyId !== agencyId) {
    const err = new Error('Agent not found');
    err.status = 404;
    throw err;
  }
  await prisma.agencyAgent.delete({ where: { id: agentId } });
  return { deleted: true };
};

export const updateAgencyProfile = async (agencyId, payload) => {
  const { companyName, companyLogo, companyDescription, officeAddress } = payload;
  return prisma.profile.update({
    where: { id: agencyId },
    data: {
      ...(companyName !== undefined && { companyName: companyName?.trim() || null }),
      ...(companyLogo !== undefined && { companyLogo: companyLogo || null }),
      ...(companyDescription !== undefined && {
        companyDescription: companyDescription?.trim() || null,
      }),
      ...(officeAddress !== undefined && {
        officeAddress: officeAddress?.trim() || null,
      }),
    },
  });
};

const isValidStatus = (status) =>
  ['FOR_SALE', 'FOR_RENT', 'SOLD', 'PAUSED'].includes(status);

/**
 * Bulk-update the status of many of the agency's listings in one shot.
 * Restricted to listings owned by the calling agency for safety.
 */
export const bulkUpdateStatus = async (agencyId, propertyIds, status) => {
  if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
    const err = new Error('propertyIds must be a non-empty array');
    err.status = 400;
    throw err;
  }
  if (!isValidStatus(status)) {
    const err = new Error('Invalid status');
    err.status = 400;
    throw err;
  }

  const result = await prisma.property.updateMany({
    where: { id: { in: propertyIds }, sellerId: agencyId },
    data: { status },
  });
  return { updated: result.count };
};

export const bulkDelete = async (agencyId, propertyIds) => {
  if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
    const err = new Error('propertyIds must be a non-empty array');
    err.status = 400;
    throw err;
  }

  const result = await prisma.property.deleteMany({
    where: { id: { in: propertyIds }, sellerId: agencyId },
  });
  return { deleted: result.count };
};
