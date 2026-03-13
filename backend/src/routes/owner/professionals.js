/**
 * Owner Professionals Routes
 * CRUD for professionals scoped by tenant_id
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authenticate, authorize } = require('../../middleware/auth');
const tenantFromJWT = require('../../middleware/tenantFromJWT');
const { Professional, User } = require('../../models');

router.use(authenticate);
router.use(tenantFromJWT);
router.use(authorize('owner', 'admin', 'professional'));

// Helper: map Professional + User to friendly format
function mapProfessional(p) {
  const plain = p.toJSON ? p.toJSON() : p;
  return {
    id: plain.id,
    user_id: plain.user_id,
    name: plain.user ? `${plain.user.first_name || ''} ${plain.user.last_name || ''}`.trim() : (plain.specialty || 'Profissional'),
    first_name: plain.user?.first_name,
    last_name: plain.user?.last_name,
    email: plain.user?.email,
    phone: plain.user?.phone,
    specialty: plain.specialty,
    commission: plain.commission_rate,
    commission_rate: plain.commission_rate,
    is_active: plain.user?.is_active !== false,
  };
}

// GET /api/professionals - List professionals for tenant
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ success: false, message: 'Tenant not found' });
    }

    const professionals = await Professional.findAll({
      where: { tenant_id: tenantId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'is_active'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    const data = professionals.map(mapProfessional);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[Professionals] List error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/professionals - Create professional (creates User + Professional)
router.post('/', authorize('owner', 'admin'), async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ success: false, message: 'Tenant not found' });
    }

    const { first_name, last_name, email, phone, specialty, commission, commission_rate, is_active } = req.body;

    if (!first_name) {
      return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
    }

    // Check if email already exists
    if (email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email já está em uso' });
      }
    }

    // Create user with role professional and a default password
    const defaultPassword = await bcrypt.hash('123456', 10);
    const user = await User.create({
      first_name,
      last_name: last_name || '',
      email: email || `${first_name.toLowerCase().replace(/\s/g, '')}.${Date.now()}@temp.local`,
      phone: phone || null,
      password: defaultPassword,
      role: 'professional',
      tenant_id: tenantId,
      is_active: is_active !== false,
    });

    // Create professional record
    const professional = await Professional.create({
      user_id: user.id,
      tenant_id: tenantId,
      specialty: specialty || null,
      commission_rate: commission ?? commission_rate ?? 0,
    });

    // Reload with user association
    const full = await Professional.findByPk(professional.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'is_active'] }],
    });

    return res.status(201).json({ success: true, data: mapProfessional(full), message: 'Profissional criado com sucesso' });
  } catch (error) {
    console.error('[Professionals] Create error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/professionals/:id - Update professional
router.put('/:id', authorize('owner', 'admin'), async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const { id } = req.params;

    const professional = await Professional.findOne({
      where: { id, tenant_id: tenantId },
      include: [{ model: User, as: 'user' }],
    });

    if (!professional) {
      return res.status(404).json({ success: false, message: 'Profissional não encontrado' });
    }

    const { first_name, last_name, email, phone, specialty, commission, commission_rate, is_active } = req.body;

    // Update user fields
    if (professional.user) {
      const userUpdates = {};
      if (first_name !== undefined) userUpdates.first_name = first_name;
      if (last_name !== undefined) userUpdates.last_name = last_name;
      if (phone !== undefined) userUpdates.phone = phone;
      if (is_active !== undefined) userUpdates.is_active = is_active;
      if (email !== undefined && email !== professional.user.email) {
        const existing = await User.findOne({ where: { email } });
        if (existing) {
          return res.status(400).json({ success: false, message: 'Email já está em uso' });
        }
        userUpdates.email = email;
      }
      if (Object.keys(userUpdates).length > 0) {
        await professional.user.update(userUpdates);
      }
    }

    // Update professional fields
    const profUpdates = {};
    if (specialty !== undefined) profUpdates.specialty = specialty;
    if (commission !== undefined) profUpdates.commission_rate = commission;
    if (commission_rate !== undefined) profUpdates.commission_rate = commission_rate;
    if (Object.keys(profUpdates).length > 0) {
      await professional.update(profUpdates);
    }

    // Reload
    const full = await Professional.findByPk(id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'is_active'] }],
    });

    return res.json({ success: true, data: mapProfessional(full), message: 'Profissional atualizado com sucesso' });
  } catch (error) {
    console.error('[Professionals] Update error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/professionals/:id - Delete professional
router.delete('/:id', authorize('owner', 'admin'), async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const { id } = req.params;

    const professional = await Professional.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!professional) {
      return res.status(404).json({ success: false, message: 'Profissional não encontrado' });
    }

    // Soft-delete professional (paranoid mode)
    await professional.destroy();

    // Deactivate the linked user
    await User.update({ is_active: false }, { where: { id: professional.user_id } });

    return res.json({ success: true, message: 'Profissional excluído com sucesso' });
  } catch (error) {
    console.error('[Professionals] Delete error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
