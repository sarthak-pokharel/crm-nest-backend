#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Module } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createTypeOrmConfig } from '../apps/crm/src/typeorm.config.shared';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
})
class AppConfigModule {}

// ── Helper ──────────────────────────────────────────────
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ── Demo data definitions ───────────────────────────────
const ORGS = [
  { name: 'Acme Corporation', slug: 'acme-corp', description: 'Technology solutions provider', website: 'https://acme-corp.example.com' },
  { name: 'Summit Ventures', slug: 'summit-ventures', description: 'Investment and consulting firm', website: 'https://summit-ventures.example.com' },
];

const ROLES_DEFS = [
  { name: 'admin', description: 'Organization administrator' },
  { name: 'sales_manager', description: 'Sales team manager' },
  { name: 'sales_rep', description: 'Sales representative' },
];

const ADMIN_PERMISSIONS = [
  'user:read', 'user:create', 'user:update', 'user:delete',
  'role:read', 'role:create', 'role:update',
  'organization:read', 'organization:update', 'organization:manage_users',
  'company:read', 'company:create', 'company:update', 'company:delete',
  'contact:read', 'contact:create', 'contact:update', 'contact:delete',
  'lead:read', 'lead:create', 'lead:update', 'lead:delete', 'lead:assign',
  'deal:read', 'deal:create', 'deal:update', 'deal:delete', 'deal:approve', 'deal:close',
  'activity:read', 'activity:create', 'activity:update', 'activity:delete',
  'task:read', 'task:create', 'task:update', 'task:delete', 'task:complete',
];

const SALES_MGR_PERMISSIONS = [
  'company:read', 'company:create', 'company:update',
  'contact:read', 'contact:create', 'contact:update',
  'lead:read', 'lead:create', 'lead:update', 'lead:assign',
  'deal:read', 'deal:create', 'deal:update', 'deal:approve', 'deal:close',
  'activity:read', 'activity:create', 'activity:update',
  'task:read', 'task:create', 'task:update', 'task:complete',
  'user:read',
];

const SALES_REP_PERMISSIONS = [
  'company:read',
  'contact:read', 'contact:create', 'contact:update',
  'lead:read', 'lead:create', 'lead:update',
  'deal:read', 'deal:create', 'deal:update',
  'activity:read', 'activity:create', 'activity:update',
  'task:read', 'task:create', 'task:update', 'task:complete',
];

const USERS = [
  { email: 'alice@acme-corp.example.com', firstName: 'Alice', lastName: 'Johnson', role: 'admin', orgSlug: 'acme-corp' },
  { email: 'bob@acme-corp.example.com', firstName: 'Bob', lastName: 'Smith', role: 'sales_manager', orgSlug: 'acme-corp' },
  { email: 'carol@acme-corp.example.com', firstName: 'Carol', lastName: 'Williams', role: 'sales_rep', orgSlug: 'acme-corp' },
  { email: 'dave@acme-corp.example.com', firstName: 'Dave', lastName: 'Brown', role: 'sales_rep', orgSlug: 'acme-corp' },
  { email: 'eve@summit-ventures.example.com', firstName: 'Eve', lastName: 'Davis', role: 'admin', orgSlug: 'summit-ventures' },
  { email: 'frank@summit-ventures.example.com', firstName: 'Frank', lastName: 'Miller', role: 'sales_rep', orgSlug: 'summit-ventures' },
];

const COMPANIES_DATA = [
  { name: 'TechNova Solutions', industry: 'Technology', website: 'https://technova.example.com', email: 'info@technova.example.com', phone: '+1-555-0101', city: 'San Francisco', state: 'CA', country: 'USA', employeeCount: 85, annualRevenue: 12000000, description: 'Cloud infrastructure and DevOps consulting' },
  { name: 'GreenLeaf Organics', industry: 'Agriculture', website: 'https://greenleaf.example.com', email: 'hello@greenleaf.example.com', phone: '+1-555-0102', city: 'Portland', state: 'OR', country: 'USA', employeeCount: 42, annualRevenue: 3500000, description: 'Organic produce distribution and farm management' },
  { name: 'Pinnacle Financial', industry: 'Finance', website: 'https://pinnacle-fin.example.com', email: 'contact@pinnacle-fin.example.com', phone: '+1-555-0103', city: 'New York', state: 'NY', country: 'USA', employeeCount: 210, annualRevenue: 45000000, description: 'Wealth management and financial advisory services' },
  { name: 'BlueSky Media', industry: 'Media & Entertainment', website: 'https://blueskymedia.example.com', email: 'press@blueskymedia.example.com', phone: '+1-555-0104', city: 'Los Angeles', state: 'CA', country: 'USA', employeeCount: 55, annualRevenue: 8000000, description: 'Digital content production and marketing agency' },
  { name: 'Meridian Healthcare', industry: 'Healthcare', website: 'https://meridian-hc.example.com', email: 'info@meridian-hc.example.com', phone: '+1-555-0105', city: 'Chicago', state: 'IL', country: 'USA', employeeCount: 320, annualRevenue: 72000000, description: 'Healthcare IT solutions and telemedicine platform' },
  { name: 'Atlas Logistics', industry: 'Logistics', website: 'https://atlas-log.example.com', email: 'ops@atlas-log.example.com', phone: '+1-555-0106', city: 'Dallas', state: 'TX', country: 'USA', employeeCount: 150, annualRevenue: 28000000, description: 'Supply chain management and freight services' },
  { name: 'Vertex Robotics', industry: 'Manufacturing', website: 'https://vertexbot.example.com', email: 'sales@vertexbot.example.com', phone: '+1-555-0107', city: 'Austin', state: 'TX', country: 'USA', employeeCount: 35, annualRevenue: 6000000, description: 'Industrial automation and robotics integration' },
  { name: 'Clearwater Analytics', industry: 'Technology', website: 'https://clearwater-a.example.com', email: 'info@clearwater-a.example.com', phone: '+1-555-0108', city: 'Seattle', state: 'WA', country: 'USA', employeeCount: 95, annualRevenue: 15000000, description: 'Business intelligence and data analytics platform' },
];

const CONTACTS_DATA = [
  { firstName: 'James', lastName: 'Chen', email: 'james.chen@technova.example.com', phone: '+1-555-1001', jobTitle: 'CTO', department: 'Engineering', companyIdx: 0, linkedInUrl: 'https://linkedin.com/in/jameschen' },
  { firstName: 'Sarah', lastName: 'Park', email: 'sarah.park@technova.example.com', phone: '+1-555-1002', jobTitle: 'VP of Engineering', department: 'Engineering', companyIdx: 0 },
  { firstName: 'Miguel', lastName: 'Santos', email: 'miguel.santos@greenleaf.example.com', phone: '+1-555-1003', jobTitle: 'CEO', department: 'Executive', companyIdx: 1 },
  { firstName: 'Priya', lastName: 'Sharma', email: 'priya.sharma@pinnacle-fin.example.com', phone: '+1-555-1004', jobTitle: 'CFO', department: 'Finance', companyIdx: 2, linkedInUrl: 'https://linkedin.com/in/priyasharma' },
  { firstName: 'David', lastName: 'Kim', email: 'david.kim@pinnacle-fin.example.com', phone: '+1-555-1005', jobTitle: 'Head of IT', department: 'Technology', companyIdx: 2 },
  { firstName: 'Emma', lastName: 'Thompson', email: 'emma.thompson@blueskymedia.example.com', phone: '+1-555-1006', jobTitle: 'Creative Director', department: 'Creative', companyIdx: 3 },
  { firstName: 'Robert', lastName: 'Jackson', email: 'robert.jackson@meridian-hc.example.com', phone: '+1-555-1007', jobTitle: 'VP of Product', department: 'Product', companyIdx: 4, linkedInUrl: 'https://linkedin.com/in/robertjackson' },
  { firstName: 'Lisa', lastName: 'Wang', email: 'lisa.wang@meridian-hc.example.com', phone: '+1-555-1008', jobTitle: 'Director of Operations', department: 'Operations', companyIdx: 4 },
  { firstName: 'Ahmed', lastName: 'Hassan', email: 'ahmed.hassan@atlas-log.example.com', phone: '+1-555-1009', jobTitle: 'Operations Manager', department: 'Operations', companyIdx: 5 },
  { firstName: 'Jessica', lastName: 'Rivera', email: 'jessica.rivera@vertexbot.example.com', phone: '+1-555-1010', jobTitle: 'Sales Director', department: 'Sales', companyIdx: 6 },
  { firstName: 'Tom', lastName: 'Bradley', email: 'tom.bradley@clearwater-a.example.com', phone: '+1-555-1011', jobTitle: 'COO', department: 'Executive', companyIdx: 7 },
  { firstName: 'Nina', lastName: 'Petrov', email: 'nina.petrov@clearwater-a.example.com', phone: '+1-555-1012', jobTitle: 'Data Science Lead', department: 'Analytics', companyIdx: 7, linkedInUrl: 'https://linkedin.com/in/ninapetrov' },
];

const LEADS_DATA = [
  { firstName: 'Marcus', lastName: 'Lee', email: 'marcus.lee@newcorp.example.com', phone: '+1-555-2001', jobTitle: 'VP Sales', companyName: 'NewCorp Industries', status: 'new', source: 'website', score: 72, estimatedValue: 50000, notes: 'Inbound from pricing page. Interested in enterprise plan.' },
  { firstName: 'Sophia', lastName: 'Martinez', email: 'sophia.m@startupx.example.com', phone: '+1-555-2002', jobTitle: 'Founder', companyName: 'StartupX', status: 'contacted', source: 'referral', score: 85, estimatedValue: 25000, notes: 'Referred by James Chen. Series A startup looking for CRM integration.' },
  { firstName: 'Daniel', lastName: 'Okafor', email: 'daniel.o@globalretail.example.com', phone: '+1-555-2003', jobTitle: 'IT Director', companyName: 'Global Retail Co', status: 'qualified', source: 'event', score: 90, estimatedValue: 120000, notes: 'Met at SaaStr conference. Budget approved, evaluating 3 vendors.' },
  { firstName: 'Aiko', lastName: 'Tanaka', email: 'aiko.t@neodesign.example.com', phone: '+1-555-2004', jobTitle: 'Design Lead', companyName: 'NeoDesign Studio', status: 'new', source: 'social_media', score: 45, estimatedValue: 15000, notes: 'Engaged with LinkedIn ad. Small team, might not be ICP.' },
  { firstName: 'Chris', lastName: 'Anderson', email: 'chris.a@megahealth.example.com', phone: '+1-555-2005', jobTitle: 'Procurement Manager', companyName: 'MegaHealth Systems', status: 'contacted', source: 'cold_call', score: 60, estimatedValue: 200000, notes: 'Large healthcare system. Long sales cycle expected. Decision committee involved.' },
  { firstName: 'Elena', lastName: 'Volkov', email: 'elena.v@eurotrade.example.com', phone: '+44-20-5556006', jobTitle: 'Managing Director', companyName: 'EuroTrade Partners', status: 'qualified', source: 'referral', score: 78, estimatedValue: 85000, notes: 'UK-based trading firm. Needs multi-currency support.' },
  { firstName: 'Ryan', lastName: 'Walsh', email: 'ryan.w@constructpro.example.com', phone: '+1-555-2007', jobTitle: 'Operations Head', companyName: 'ConstructPro LLC', status: 'new', source: 'email_campaign', score: 55, estimatedValue: 35000, notes: 'Opened 4 emails in drip campaign. Downloaded whitepaper.' },
  { firstName: 'Fatima', lastName: 'Al-Rashid', email: 'fatima.ar@gulfventures.example.com', phone: '+971-4-5558008', jobTitle: 'CEO', companyName: 'Gulf Ventures Group', status: 'contacted', source: 'event', score: 88, estimatedValue: 300000, notes: 'Met at GITEX. Very interested. Wants custom demo for their team.' },
  { firstName: 'Kevin', lastName: 'Nguyen', email: 'kevin.n@cloudfirst.example.com', phone: '+1-555-2009', jobTitle: 'CTO', companyName: 'CloudFirst Inc', status: 'unqualified', source: 'website', score: 20, estimatedValue: 10000, notes: 'Budget too small. Recommended free tier.' },
  { firstName: 'Hannah', lastName: 'Müller', email: 'hannah.m@berlintech.example.com', phone: '+49-30-5550010', jobTitle: 'Head of Partnerships', companyName: 'Berlin Tech Hub', status: 'converted', source: 'referral', score: 95, estimatedValue: 75000, notes: 'Converted to deal. Great fit for our EU expansion.' },
  { firstName: 'Oscar', lastName: 'Reyes', email: 'oscar.r@latamlogistics.example.com', phone: '+52-55-5550011', jobTitle: 'Supply Chain Director', companyName: 'LatAm Logistics SA', status: 'new', source: 'website', score: 65, estimatedValue: 45000 },
  { firstName: 'Isabella', lastName: 'Ferretti', email: 'isabella.f@milanofoods.example.com', phone: '+39-02-5550012', jobTitle: 'COO', companyName: 'Milano Foods SpA', status: 'lost', source: 'cold_call', score: 40, estimatedValue: 60000, notes: 'Went with competitor. Price was the deciding factor.' },
];

const DEAL_STAGES = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] as const;
const DEAL_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

const DEALS_DATA = [
  { title: 'TechNova Platform Upgrade', value: 85000, stage: 'negotiation', priority: 'high', probability: 75, description: 'Enterprise platform upgrade with custom integrations', companyIdx: 0, contactIdx: 0, expectedCloseDays: 14 },
  { title: 'GreenLeaf Supply Chain Tool', value: 32000, stage: 'proposal', priority: 'medium', probability: 50, description: 'Supply chain management module for organic distribution', companyIdx: 1, contactIdx: 2, expectedCloseDays: 30 },
  { title: 'Pinnacle CRM Migration', value: 150000, stage: 'qualification', priority: 'urgent', probability: 40, description: 'Full CRM migration from legacy system for 200+ users', companyIdx: 2, contactIdx: 3, expectedCloseDays: 60 },
  { title: 'BlueSky Content Dashboard', value: 28000, stage: 'prospecting', priority: 'medium', probability: 20, description: 'Custom analytics dashboard for content performance', companyIdx: 3, contactIdx: 5, expectedCloseDays: 45 },
  { title: 'Meridian Telemedicine Integration', value: 220000, stage: 'proposal', priority: 'high', probability: 60, description: 'Integration with existing telemedicine platform', companyIdx: 4, contactIdx: 6, expectedCloseDays: 21 },
  { title: 'Atlas Fleet Tracking Add-on', value: 45000, stage: 'negotiation', priority: 'medium', probability: 80, description: 'Real-time fleet tracking module for logistics operations', companyIdx: 5, contactIdx: 8, expectedCloseDays: 7 },
  { title: 'Vertex Automation Suite', value: 95000, stage: 'qualification', priority: 'high', probability: 35, description: 'End-to-end automation suite for manufacturing floor', companyIdx: 6, contactIdx: 9, expectedCloseDays: 90 },
  { title: 'Clearwater BI Expansion', value: 65000, stage: 'closed_won', priority: 'medium', probability: 100, description: 'Expanded BI license with additional data connectors', companyIdx: 7, contactIdx: 10, actualCloseDaysAgo: 5 },
  { title: 'Pinnacle Mobile App', value: 40000, stage: 'closed_lost', priority: 'low', probability: 0, description: 'Mobile companion app for financial advisors', companyIdx: 2, contactIdx: 4, lostReason: 'Budget cut due to Q4 restructuring', actualCloseDaysAgo: 12 },
  { title: 'Meridian Patient Portal', value: 180000, stage: 'prospecting', priority: 'high', probability: 15, description: 'Patient-facing portal with appointment scheduling', companyIdx: 4, contactIdx: 7, expectedCloseDays: 120 },
];

const TASK_STATUSES = ['todo', 'in_progress', 'completed', 'cancelled'] as const;
const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

const TASKS_DATA = [
  { title: 'Prepare proposal for TechNova', description: 'Draft pricing and SOW for platform upgrade project', status: 'in_progress', priority: 'high', dueDays: 3, relatedToType: 'deal', relatedToIdx: 0 },
  { title: 'Follow up with GreenLeaf CEO', description: 'Send follow-up email after demo call', status: 'todo', priority: 'medium', dueDays: 1, relatedToType: 'contact', relatedToIdx: 2 },
  { title: 'Schedule Pinnacle migration assessment', description: 'Coordinate with their IT team for system audit', status: 'todo', priority: 'urgent', dueDays: 5, relatedToType: 'deal', relatedToIdx: 2 },
  { title: 'Send Meridian integration specs', description: 'Technical specs document for telemedicine API integration', status: 'completed', priority: 'high', dueDays: -2, relatedToType: 'deal', relatedToIdx: 4, completedDaysAgo: 1 },
  { title: 'Update Atlas contract terms', description: 'Revise fleet tracking pricing based on negotiation', status: 'in_progress', priority: 'medium', dueDays: 2, relatedToType: 'deal', relatedToIdx: 5 },
  { title: 'Research Vertex competitors', description: 'Competitive analysis for automation suite pitch', status: 'todo', priority: 'low', dueDays: 10, relatedToType: 'company', relatedToIdx: 6 },
  { title: 'Onboarding call with Clearwater', description: 'Post-sale kickoff call with COO', status: 'todo', priority: 'high', dueDays: 2, relatedToType: 'deal', relatedToIdx: 7 },
  { title: 'Quarterly pipeline review', description: 'Prepare slides for Q2 pipeline review meeting', status: 'todo', priority: 'medium', dueDays: 7 },
  { title: 'Update CRM contact records', description: 'Ensure all BlueSky contacts have correct info', status: 'completed', priority: 'low', dueDays: -5, relatedToType: 'company', relatedToIdx: 3, completedDaysAgo: 4 },
  { title: 'Send cold outreach batch', description: 'Draft and send 20 personalized cold emails to target accounts', status: 'in_progress', priority: 'medium', dueDays: 1 },
  { title: 'Demo prep for Gulf Ventures', description: 'Customize demo environment with MENA-specific data', status: 'todo', priority: 'urgent', dueDays: 2, relatedToType: 'lead', relatedToIdx: 7 },
  { title: 'Close loop on Berlin Tech deal', description: 'Send final contract and collect signatures', status: 'completed', priority: 'high', dueDays: -3, relatedToType: 'lead', relatedToIdx: 9, completedDaysAgo: 2 },
];

const ACTIVITIES_DATA = [
  { type: 'call', subject: 'Discovery call with TechNova', description: 'Discussed current pain points and requirements for platform upgrade', relationType: 'company', relationIdx: 0, duration: 45, daysAgo: 3, isCompleted: true, outcome: 'Positive — moving to proposal stage' },
  { type: 'email', subject: 'Sent pricing proposal to GreenLeaf', description: 'Emailed detailed pricing breakdown and ROI analysis', relationType: 'contact', relationIdx: 2, daysAgo: 2, isCompleted: true },
  { type: 'meeting', subject: 'Pinnacle stakeholder alignment', description: 'Meeting with CFO and IT Head to align on migration timeline', relationType: 'deal', relationIdx: 2, duration: 60, daysAgo: 5, isCompleted: true, outcome: 'Need to address security compliance concerns' },
  { type: 'note', subject: 'BlueSky internal note', description: 'Creative Director prefers visual dashboards. Send Figma mockups next.', relationType: 'contact', relationIdx: 5, daysAgo: 1, isCompleted: true },
  { type: 'call', subject: 'Meridian follow-up call', description: 'Reviewed integration specs with VP of Product', relationType: 'deal', relationIdx: 4, duration: 30, daysAgo: 1, isCompleted: true, outcome: 'Approved — sending SOW this week' },
  { type: 'meeting', subject: 'Atlas contract negotiation', description: 'Final pricing discussion with Operations Manager', relationType: 'deal', relationIdx: 5, duration: 40, daysAgo: 0, isCompleted: false },
  { type: 'email', subject: 'Clearwater BI onboarding docs', description: 'Sent onboarding guide and API documentation', relationType: 'deal', relationIdx: 7, daysAgo: 4, isCompleted: true },
  { type: 'call', subject: 'Cold call — LatAm Logistics', description: 'Initial outreach to Supply Chain Director', relationType: 'lead', relationIdx: 10, duration: 15, daysAgo: 1, isCompleted: true, outcome: 'Interested — sending info deck' },
  { type: 'meeting', subject: 'Weekly sales standup', description: 'Team pipeline review and blockers discussion', relationType: 'company', relationIdx: 0, duration: 30, daysAgo: 0, isCompleted: false },
  { type: 'email', subject: 'Follow-up to GITEX meeting', description: 'Sent Gulf Ventures a personalized deck after the event', relationType: 'lead', relationIdx: 7, daysAgo: 6, isCompleted: true, outcome: 'Demo scheduled for next week' },
  { type: 'call', subject: 'Vertex technical deep-dive', description: 'Call with Sales Director to understand manufacturing workflow', relationType: 'company', relationIdx: 6, duration: 55, daysAgo: 4, isCompleted: true, outcome: 'Complex requirements — need solutions architect on next call' },
  { type: 'note', subject: 'Lost deal post-mortem — Pinnacle Mobile', description: 'Price sensitivity was main factor. Consider flexible pricing tiers for similar deals.', relationType: 'deal', relationIdx: 8, daysAgo: 10, isCompleted: true },
];

// ── Main seed function ──────────────────────────────────
async function seedDemoData() {
  console.log('🌱 Starting demo data seeding...\n');

  const app = await NestFactory.createApplicationContext(AppConfigModule, {
    logger: false,
  });

  const config = app.get(ConfigService);
  const dataSource = new DataSource({
    ...createTypeOrmConfig(config),
  });

  await dataSource.initialize();

  try {
    // ─── 1. Organizations ───────────────────────────────
    console.log('🏢 Creating organizations...');
    const orgIds: Record<string, number> = {};

    for (const org of ORGS) {
      const existing = await dataSource.query(
        'SELECT id FROM organizations WHERE slug = $1 AND "isActive" = true',
        [org.slug],
      );
      if (existing.length > 0) {
        orgIds[org.slug] = existing[0].id;
        console.log(`  ⊙ ${org.name} already exists (id: ${existing[0].id})`);
      } else {
        const result = await dataSource.query(
          `INSERT INTO organizations (name, slug, description, website, "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, true, NOW(), NOW()) RETURNING id`,
          [org.name, org.slug, org.description, org.website],
        );
        orgIds[org.slug] = result[0].id;
        console.log(`  ✓ Created ${org.name} (id: ${result[0].id})`);
      }
    }

    // ─── 2. Roles ───────────────────────────────────────
    console.log('\n👥 Creating roles...');
    const roleIds: Record<string, number> = {};

    for (const role of ROLES_DEFS) {
      const existing = await dataSource.query(
        'SELECT id FROM roles WHERE name = $1',
        [role.name],
      );
      if (existing.length > 0) {
        roleIds[role.name] = existing[0].id;
        console.log(`  ⊙ ${role.name} already exists (id: ${existing[0].id})`);
      } else {
        const result = await dataSource.query(
          `INSERT INTO roles (name, description, "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, true, NOW(), NOW()) RETURNING id`,
          [role.name, role.description],
        );
        roleIds[role.name] = result[0].id;
        console.log(`  ✓ Created ${role.name} (id: ${result[0].id})`);
      }
    }

    // ─── 3. Role permissions ────────────────────────────
    console.log('\n🔑 Assigning role permissions...');
    const permMap: Record<string, string[]> = {
      admin: ADMIN_PERMISSIONS,
      sales_manager: SALES_MGR_PERMISSIONS,
      sales_rep: SALES_REP_PERMISSIONS,
    };

    for (const [roleName, perms] of Object.entries(permMap)) {
      let count = 0;
      for (const perm of perms) {
        const result = await dataSource.query(
          `INSERT INTO role_permissions ("roleId", "permissionKey", scope, "createdAt")
           VALUES ($1, $2, 'global', NOW()) ON CONFLICT DO NOTHING RETURNING id`,
          [roleIds[roleName], perm],
        );
        if (result.length > 0) count++;
      }
      console.log(`  ✓ ${roleName}: ${count} new permissions (${perms.length} total)`);
    }

    // ─── 4. Users ───────────────────────────────────────
    console.log('\n👤 Creating users...');
    const userIds: Record<string, number> = {};
    const DEFAULT_PASSWORD = 'Demo@12345';
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    for (const user of USERS) {
      const orgId = orgIds[user.orgSlug];
      const existing = await dataSource.query(
        'SELECT id FROM "user" WHERE email = $1',
        [user.email],
      );
      if (existing.length > 0) {
        userIds[user.email] = existing[0].id;
        console.log(`  ⊙ ${user.email} already exists (id: ${existing[0].id})`);
      } else {
        const result = await dataSource.query(
          `INSERT INTO "user" (email, "firstName", "lastName", password, "isActive", "organizationId")
           VALUES ($1, $2, $3, $4, true, $5) RETURNING id`,
          [user.email, user.firstName, user.lastName, hashedPassword, orgId],
        );
        userIds[user.email] = result[0].id;
        console.log(`  ✓ Created ${user.firstName} ${user.lastName} (${user.email})`);
      }

      const userId = userIds[user.email];
      const roleId = roleIds[user.role];

      // user_roles
      await dataSource.query(
        `INSERT INTO user_roles ("userId", "roleId", "createdAt")
         VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING`,
        [userId, roleId],
      );

      // user_organization_roles
      await dataSource.query(
        `INSERT INTO user_organization_roles ("userId", "organizationId", "roleId", "createdAt")
         VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING`,
        [userId, orgId, roleId],
      );
    }

    // Use first org (Acme) as the primary demo org
    const primaryOrgId = orgIds['acme-corp'];
    const acmeUsers = USERS.filter(u => u.orgSlug === 'acme-corp');
    const acmeUserIds = acmeUsers.map(u => userIds[u.email]);

    // ─── 5. Companies ───────────────────────────────────
    console.log('\n🏭 Creating companies...');
    const companyIds: number[] = [];

    for (const comp of COMPANIES_DATA) {
      const existing = await dataSource.query(
        'SELECT id FROM companies WHERE name = $1 AND "organizationId" = $2',
        [comp.name, primaryOrgId],
      );
      if (existing.length > 0) {
        companyIds.push(existing[0].id);
        console.log(`  ⊙ ${comp.name} already exists`);
      } else {
        const ownerId = randomItem(acmeUserIds);
        const result = await dataSource.query(
          `INSERT INTO companies (name, industry, website, email, phone, city, state, country, "employeeCount", "annualRevenue", description, "isActive", "organizationId", "ownerId", "createdById", "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,$12,$13,$13, NOW(), NOW()) RETURNING id`,
          [comp.name, comp.industry, comp.website, comp.email, comp.phone, comp.city, comp.state, comp.country, comp.employeeCount, comp.annualRevenue, comp.description, primaryOrgId, ownerId],
        );
        companyIds.push(result[0].id);
        console.log(`  ✓ ${comp.name}`);
      }
    }

    // ─── 6. Contacts ────────────────────────────────────
    console.log('\n📇 Creating contacts...');
    const contactIds: number[] = [];

    for (const ct of CONTACTS_DATA) {
      const companyId = companyIds[ct.companyIdx];
      const existing = await dataSource.query(
        'SELECT id FROM contacts WHERE email = $1',
        [ct.email],
      );
      if (existing.length > 0) {
        contactIds.push(existing[0].id);
        console.log(`  ⊙ ${ct.firstName} ${ct.lastName} already exists`);
      } else {
        const ownerId = randomItem(acmeUserIds);
        const result = await dataSource.query(
          `INSERT INTO contacts ("firstName", "lastName", email, phone, "jobTitle", department, "companyId", "linkedInUrl", "isPrimary", "isActive", "organizationId", "ownerId", "createdById", "createdAt", "updatedAt", "lastContactedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,true,$9,$10,$10, NOW(), NOW(), $11) RETURNING id`,
          [ct.firstName, ct.lastName, ct.email, ct.phone, ct.jobTitle, ct.department, companyId, ct.linkedInUrl || null, primaryOrgId, ownerId, daysAgo(randomInt(0, 14))],
        );
        contactIds.push(result[0].id);
        console.log(`  ✓ ${ct.firstName} ${ct.lastName} — ${ct.jobTitle} at ${COMPANIES_DATA[ct.companyIdx].name}`);
      }
    }

    // ─── 7. Leads ───────────────────────────────────────
    console.log('\n🎯 Creating leads...');
    const leadIds: number[] = [];

    for (const lead of LEADS_DATA) {
      const existing = await dataSource.query(
        'SELECT id FROM leads WHERE email = $1',
        [lead.email],
      );
      if (existing.length > 0) {
        leadIds.push(existing[0].id);
        console.log(`  ⊙ ${lead.firstName} ${lead.lastName} already exists`);
      } else {
        const ownerId = randomItem(acmeUserIds);
        const assignedToId = randomItem(acmeUserIds);
        const result = await dataSource.query(
          `INSERT INTO leads ("firstName", "lastName", email, phone, "jobTitle", "companyName", status, source, score, "estimatedValue", notes, "organizationId", "ownerId", "assignedToId", "createdById", "createdAt", "updatedAt", "lastContactedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$13, NOW(), NOW(), $15) RETURNING id`,
          [lead.firstName, lead.lastName, lead.email, lead.phone, lead.jobTitle, lead.companyName, lead.status, lead.source, lead.score, lead.estimatedValue, lead.notes || null, primaryOrgId, ownerId, assignedToId, lead.status !== 'new' ? daysAgo(randomInt(0, 7)) : null],
        );
        leadIds.push(result[0].id);
        console.log(`  ✓ ${lead.firstName} ${lead.lastName} — ${lead.status} (${lead.source})`);
      }
    }

    // ─── 8. Deals ───────────────────────────────────────
    console.log('\n💰 Creating deals...');
    const dealIds: number[] = [];

    for (const deal of DEALS_DATA) {
      const existing = await dataSource.query(
        'SELECT id FROM deals WHERE title = $1 AND "organizationId" = $2',
        [deal.title, primaryOrgId],
      );
      if (existing.length > 0) {
        dealIds.push(existing[0].id);
        console.log(`  ⊙ ${deal.title} already exists`);
      } else {
        const ownerId = randomItem(acmeUserIds);
        const assignedToId = randomItem(acmeUserIds);
        const companyId = companyIds[deal.companyIdx];
        const contactId = contactIds[deal.contactIdx];
        const expectedCloseDate = deal.expectedCloseDays ? daysFromNow(deal.expectedCloseDays) : null;
        const actualCloseDate = (deal as any).actualCloseDaysAgo ? daysAgo((deal as any).actualCloseDaysAgo) : null;

        const result = await dataSource.query(
          `INSERT INTO deals (title, value, stage, priority, probability, "companyId", "contactId", "expectedCloseDate", "actualCloseDate", description, "assignedToId", "ownerId", "lostReason", "isActive", "organizationId", "createdById", "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,$14,$12, NOW(), NOW()) RETURNING id`,
          [deal.title, deal.value, deal.stage, deal.priority, deal.probability, companyId, contactId, expectedCloseDate, actualCloseDate, deal.description, assignedToId, ownerId, (deal as any).lostReason || null, primaryOrgId],
        );
        dealIds.push(result[0].id);
        const stageEmoji = deal.stage === 'closed_won' ? '🟢' : deal.stage === 'closed_lost' ? '🔴' : '🔵';
        console.log(`  ${stageEmoji} ${deal.title} — $${deal.value.toLocaleString()} (${deal.stage})`);
      }
    }

    // ─── 9. Activities ──────────────────────────────────
    console.log('\n📝 Creating activities...');
    const activityRelationIds: Record<string, number[]> = {
      company: companyIds,
      contact: contactIds,
      lead: leadIds,
      deal: dealIds,
    };

    for (const act of ACTIVITIES_DATA) {
      const relationId = activityRelationIds[act.relationType][act.relationIdx];
      const userId = randomItem(acmeUserIds);
      await dataSource.query(
        `INSERT INTO activities (type, subject, description, "relationType", "relationId", duration, "activityDate", "isCompleted", outcome, "userId", "organizationId", "createdById", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$10, NOW(), NOW())`,
        [act.type, act.subject, act.description, act.relationType, relationId, act.duration || null, daysAgo(act.daysAgo), act.isCompleted, act.outcome || null, userId, primaryOrgId],
      );
      const icon = { call: '📞', email: '✉️', meeting: '🤝', note: '📝', task: '✅', deal: '💼', other: '📌' }[act.type] || '📌';
      console.log(`  ${icon} ${act.subject}`);
    }

    // ─── 10. Tasks ──────────────────────────────────────
    console.log('\n✅ Creating tasks...');
    const taskRelationIds: Record<string, number[]> = {
      company: companyIds,
      contact: contactIds,
      lead: leadIds,
      deal: dealIds,
    };

    for (const task of TASKS_DATA) {
      const assignedToId = randomItem(acmeUserIds);
      const ownerId = randomItem(acmeUserIds);
      const relatedToId = task.relatedToType ? taskRelationIds[task.relatedToType]?.[task.relatedToIdx!] : null;
      const completedAt = (task as any).completedDaysAgo ? daysAgo((task as any).completedDaysAgo) : null;

      await dataSource.query(
        `INSERT INTO tasks (title, description, status, priority, "dueDate", "completedAt", "assignedToId", "ownerId", "relatedToType", "relatedToId", "organizationId", "createdById", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$8, NOW(), NOW())`,
        [task.title, task.description, task.status, task.priority, daysFromNow(task.dueDays), completedAt, assignedToId, ownerId, task.relatedToType || null, relatedToId || null, primaryOrgId],
      );
      const statusIcon = { todo: '⬜', in_progress: '🔄', completed: '✅', cancelled: '❌' }[task.status];
      console.log(`  ${statusIcon} ${task.title}`);
    }

    // ─── Done ───────────────────────────────────────────
    console.log('\n' + '═'.repeat(50));
    console.log('✅ Demo data seeding completed!\n');
    console.log('📊 Summary:');
    console.log(`  Organizations: ${ORGS.length}`);
    console.log(`  Roles:         ${ROLES_DEFS.length} (admin, sales_manager, sales_rep)`);
    console.log(`  Users:         ${USERS.length}`);
    console.log(`  Companies:     ${COMPANIES_DATA.length}`);
    console.log(`  Contacts:      ${CONTACTS_DATA.length}`);
    console.log(`  Leads:         ${LEADS_DATA.length}`);
    console.log(`  Deals:         ${DEALS_DATA.length}`);
    console.log(`  Activities:    ${ACTIVITIES_DATA.length}`);
    console.log(`  Tasks:         ${TASKS_DATA.length}`);
    console.log('\n🔐 Login credentials:');
    console.log(`  Password for all demo users: ${DEFAULT_PASSWORD}`);
    console.log(`  Admin:         alice@acme-corp.example.com`);
    console.log(`  Sales Manager: bob@acme-corp.example.com`);
    console.log(`  Sales Reps:    carol@acme-corp.example.com, dave@acme-corp.example.com`);
    console.log(`  (Org 2 Admin): eve@summit-ventures.example.com`);
    console.log(`\n  Primary demo org: Acme Corporation (slug: acme-corp)\n`);

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    await app.close();
  }
}

seedDemoData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
