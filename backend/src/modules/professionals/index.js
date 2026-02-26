/**
 * Professionals Module
 * Manages professional details, specialties, and commissions
 */

const ProfessionalDetailModel = require('./professionalDetail.model');
const ProfessionalSpecialtyModel = require('./professionalSpecialty.model');
const ProfessionalServiceCommissionModel = require('./professionalServiceCommission.model');
const ProfessionalDetailRepository = require('./professionalDetail.repository');
const ProfessionalDetailService = require('./professionalDetail.service');
const ProfessionalDetailController = require('./professionalDetail.controller');
const createProfessionalRoutes = require('./professionalDetail.routes');

/**
 * Initialize professionals module
 */
function initProfessionalsModule(sequelize, models = {}) {
  // Initialize models
  const ProfessionalDetail = ProfessionalDetailModel(sequelize);
  const ProfessionalSpecialty = ProfessionalSpecialtyModel(sequelize);
  const ProfessionalServiceCommission = ProfessionalServiceCommissionModel(sequelize);

  // Combine with existing models
  const allModels = {
    ...models,
    ProfessionalDetail,
    ProfessionalSpecialty,
    ProfessionalServiceCommission,
  };

  // Setup associations
  if (ProfessionalDetail.associate) {
    ProfessionalDetail.associate(allModels);
  }
  if (ProfessionalSpecialty.associate) {
    ProfessionalSpecialty.associate(allModels);
  }
  if (ProfessionalServiceCommission.associate) {
    ProfessionalServiceCommission.associate(allModels);
  }

  // Initialize repository, service, controller
  const repository = new ProfessionalDetailRepository(allModels);
  const service = new ProfessionalDetailService(repository, allModels);
  const controller = new ProfessionalDetailController(service);

  return {
    models: {
      ProfessionalDetail,
      ProfessionalSpecialty,
      ProfessionalServiceCommission,
    },
    repository,
    service,
    controller,
    createRoutes: (middleware) => createProfessionalRoutes(controller, middleware),
  };
}

module.exports = {
  initProfessionalsModule,
  ProfessionalDetailModel,
  ProfessionalSpecialtyModel,
  ProfessionalServiceCommissionModel,
};
