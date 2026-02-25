-- ══════════════════════════════════════════════════════════════════════════════
-- BeautyHub - PostgreSQL Init Script
-- Extensions and initial configuration
-- ══════════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_stat_statements for query analysis
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create indexes for multi-tenant queries (run after migrations)
-- These are just placeholders, actual indexes are created in migrations
