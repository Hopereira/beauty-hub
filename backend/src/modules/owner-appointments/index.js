/**
 * Owner Appointments Module
 */

const OwnerAppointmentService = require('./appointment.service');
const OwnerAppointmentController = require('./appointment.controller');
const createAppointmentRoutes = require('./appointment.routes');

function initOwnerAppointmentsModule(sequelize, models) {
  const service = new OwnerAppointmentService(models);
  const controller = new OwnerAppointmentController(service);

  return {
    service,
    controller,
    createRoutes: (middleware) => createAppointmentRoutes(controller, middleware),
  };
}

module.exports = { initOwnerAppointmentsModule };
