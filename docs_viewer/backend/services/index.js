/**
 * Service Layer
 * 
 * This module serves as a central export point for all service classes.
 * Import services from this file to ensure proper initialization and avoid circular dependencies.
 */

const fileService = require('./fileService');
const llmService = require('./llmService');
const ragService = require('./ragService');
const teamsService = require('./teamsService');

// Initialize services that need it
// (Currently all services are self-initializing)

module.exports = {
  fileService,
  llmService,
  ragService,
  teamsService,
};
