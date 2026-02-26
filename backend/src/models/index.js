const { Sequelize } = require('sequelize');
const env = require('../config/env');
const logger = require('../utils/logger');

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'postgres',
  logging: env.nodeEnv === 'development' ? (msg) => logger.debug(msg) : false,
  define: {
    timestamps: true,
    underscored: true,
    paranoid: true,
  },
  pool: {
    max: 20,
    min: 5,
    acquire: 60000,
    idle: 10000,
  },
});

// Import models
const User = require('./User')(sequelize);
const Establishment = require('./Establishment')(sequelize);
const Professional = require('./Professional')(sequelize);
const Service = require('./Service')(sequelize);
const Client = require('./Client')(sequelize);
const Appointment = require('./Appointment')(sequelize);
const PaymentMethod = require('./PaymentMethod')(sequelize);
const FinancialEntry = require('./FinancialEntry')(sequelize);
const FinancialExit = require('./FinancialExit')(sequelize);
const Notification = require('./Notification')(sequelize);

// Import OWNER module models
const Tenant = require('../modules/tenants/tenant.model')(sequelize);
const ProfessionalDetail = require('../modules/professionals/professionalDetail.model')(sequelize);
const ProfessionalSpecialty = require('../modules/professionals/professionalSpecialty.model')(sequelize);
const ProfessionalServiceCommission = require('../modules/professionals/professionalServiceCommission.model')(sequelize);
const Supplier = require('../modules/suppliers/supplier.model')(sequelize);
const Product = require('../modules/inventory/product.model')(sequelize);
const Purchase = require('../modules/purchases/purchase.model')(sequelize);
const PurchaseItem = require('../modules/purchases/purchaseItem.model')(sequelize);
const InventoryMovement = require('../modules/inventory/inventoryMovement.model')(sequelize);
const PaymentTransaction = require('../modules/financial/paymentTransaction.model')(sequelize);

// ── Associations ──

// User <-> Establishment (Admin owns establishment)
User.hasOne(Establishment, { foreignKey: 'user_id', as: 'establishment' });
Establishment.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });

// User <-> Professional
User.hasOne(Professional, { foreignKey: 'user_id', as: 'professional' });
Professional.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Establishment <-> Professional
Establishment.hasMany(Professional, { foreignKey: 'establishment_id', as: 'professionals' });
Professional.belongsTo(Establishment, { foreignKey: 'establishment_id', as: 'establishment' });

// Establishment <-> Service
Establishment.hasMany(Service, { foreignKey: 'establishment_id', as: 'services' });
Service.belongsTo(Establishment, { foreignKey: 'establishment_id', as: 'establishment' });

// Establishment <-> Client
Establishment.hasMany(Client, { foreignKey: 'establishment_id', as: 'clients' });
Client.belongsTo(Establishment, { foreignKey: 'establishment_id', as: 'establishment' });

// Appointment associations
Establishment.hasMany(Appointment, { foreignKey: 'establishment_id', as: 'appointments' });
Appointment.belongsTo(Establishment, { foreignKey: 'establishment_id', as: 'establishment' });

Client.hasMany(Appointment, { foreignKey: 'client_id', as: 'appointments' });
Appointment.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

Professional.hasMany(Appointment, { foreignKey: 'professional_id', as: 'appointments' });
Appointment.belongsTo(Professional, { foreignKey: 'professional_id', as: 'professional' });

Service.hasMany(Appointment, { foreignKey: 'service_id', as: 'appointments' });
Appointment.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });

// Financial Entry associations
Establishment.hasMany(FinancialEntry, { foreignKey: 'establishment_id', as: 'financialEntries' });
FinancialEntry.belongsTo(Establishment, { foreignKey: 'establishment_id', as: 'establishment' });

Appointment.hasOne(FinancialEntry, { foreignKey: 'appointment_id', as: 'financialEntry' });
FinancialEntry.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });

Client.hasMany(FinancialEntry, { foreignKey: 'client_id', as: 'financialEntries' });
FinancialEntry.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

PaymentMethod.hasMany(FinancialEntry, { foreignKey: 'payment_method_id', as: 'financialEntries' });
FinancialEntry.belongsTo(PaymentMethod, { foreignKey: 'payment_method_id', as: 'paymentMethod' });

// Financial Exit associations
Establishment.hasMany(FinancialExit, { foreignKey: 'establishment_id', as: 'financialExits' });
FinancialExit.belongsTo(Establishment, { foreignKey: 'establishment_id', as: 'establishment' });

// Notification associations
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ── OWNER Module Associations ──
const allModels = {
  User, Establishment, Professional, Service, Client, Appointment,
  PaymentMethod, FinancialEntry, FinancialExit, Notification,
  Tenant, ProfessionalDetail, ProfessionalSpecialty, ProfessionalServiceCommission,
  Supplier, Product, Purchase, PurchaseItem,
  InventoryMovement, PaymentTransaction
};

// Call associate methods for OWNER models
if (Tenant.associate) Tenant.associate(allModels);
if (ProfessionalDetail.associate) ProfessionalDetail.associate(allModels);
if (ProfessionalSpecialty.associate) ProfessionalSpecialty.associate(allModels);
if (ProfessionalServiceCommission.associate) ProfessionalServiceCommission.associate(allModels);
if (Supplier.associate) Supplier.associate(allModels);
if (Product.associate) Product.associate(allModels);
if (Purchase.associate) Purchase.associate(allModels);
if (PurchaseItem.associate) PurchaseItem.associate(allModels);
if (InventoryMovement.associate) InventoryMovement.associate(allModels);
if (PaymentTransaction.associate) PaymentTransaction.associate(allModels);

module.exports = {
  sequelize,
  Sequelize,
  User,
  Establishment,
  Professional,
  Service,
  Client,
  Appointment,
  PaymentMethod,
  FinancialEntry,
  FinancialExit,
  Notification,
  // OWNER models
  Tenant,
  ProfessionalDetail,
  ProfessionalSpecialty,
  ProfessionalServiceCommission,
  Supplier,
  Product,
  Purchase,
  PurchaseItem,
  InventoryMovement,
  PaymentTransaction,
};
