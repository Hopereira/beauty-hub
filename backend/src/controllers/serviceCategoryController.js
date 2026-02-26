const { ServiceCategory } = require('../models');
const logger = require('../utils/logger');

async function list(req, res) {
  try {
    const { establishment_id } = req.query;
    
    const where = {};
    if (establishment_id) {
      where.establishment_id = establishment_id;
    }

    const categories = await ServiceCategory.findAll({
      where,
      order: [['name', 'ASC']],
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error('[ServiceCategory] List error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service categories',
      error: { code: 'SERVICE_CATEGORY_LIST_ERROR', details: error.message },
    });
  }
}

async function getById(req, res) {
  try {
    const category = await ServiceCategory.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Service category not found',
        error: { code: 'SERVICE_CATEGORY_NOT_FOUND', details: null },
      });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    logger.error('[ServiceCategory] Get by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service category',
      error: { code: 'SERVICE_CATEGORY_FETCH_ERROR', details: error.message },
    });
  }
}

async function create(req, res) {
  try {
    const { name, description, color, icon, active, establishment_id } = req.body;

    const category = await ServiceCategory.create({
      name,
      description,
      color,
      icon,
      active,
      establishment_id,
    });

    res.status(201).json({
      success: true,
      message: 'Service category created successfully',
      data: category,
    });
  } catch (error) {
    logger.error('[ServiceCategory] Create error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating service category',
      error: { code: 'SERVICE_CATEGORY_CREATE_ERROR', details: error.message },
    });
  }
}

async function update(req, res) {
  try {
    const category = await ServiceCategory.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Service category not found',
        error: { code: 'SERVICE_CATEGORY_NOT_FOUND', details: null },
      });
    }

    const { name, description, color, icon, active } = req.body;
    await category.update({ name, description, color, icon, active });

    res.json({
      success: true,
      message: 'Service category updated successfully',
      data: category,
    });
  } catch (error) {
    logger.error('[ServiceCategory] Update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating service category',
      error: { code: 'SERVICE_CATEGORY_UPDATE_ERROR', details: error.message },
    });
  }
}

async function remove(req, res) {
  try {
    const category = await ServiceCategory.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Service category not found',
        error: { code: 'SERVICE_CATEGORY_NOT_FOUND', details: null },
      });
    }

    await category.destroy();

    res.json({
      success: true,
      message: 'Service category deleted successfully',
      data: null,
    });
  } catch (error) {
    logger.error('[ServiceCategory] Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting service category',
      error: { code: 'SERVICE_CATEGORY_DELETE_ERROR', details: error.message },
    });
  }
}

module.exports = { list, getById, create, update, remove };
