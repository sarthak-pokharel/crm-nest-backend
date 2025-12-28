import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1766951074630 implements MigrationInterface {
    name = 'Init1766951074630'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_roles" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "roleId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8acd5cf26ebd158416f477de799" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_88481b0c4ed9ada47e9fdd6747" ON "user_roles" ("userId", "roleId") `);
        await queryRunner.query(`CREATE TYPE "public"."role_permissions_scope_enum" AS ENUM('global', 'owner', 'company', 'department', 'team', 'self')`);
        await queryRunner.query(`CREATE TABLE "role_permissions" ("id" SERIAL NOT NULL, "roleId" integer NOT NULL, "permissionKey" character varying NOT NULL, "scope" "public"."role_permissions_scope_enum" NOT NULL DEFAULT 'global', "conditions" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_84059017c90bfcb701b8fa42297" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_de4a83bbc1aa3e836d4324f753" ON "role_permissions" ("roleId", "permissionKey") `);
        await queryRunner.query(`CREATE TABLE "roles" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_organization_roles" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "organizationId" integer NOT NULL, "roleId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bef544f773011ec6f64feb27ed5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "organizationId" integer, "companyId" integer, "departmentId" integer, "teamId" integer, CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "organizations" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "slug" character varying, "isActive" boolean NOT NULL DEFAULT true, "logo" character varying, "website" character varying, "settings" jsonb, "createdById" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9b7ca6d30b94fef571cff876884" UNIQUE ("name"), CONSTRAINT "UQ_963693341bd612aa01ddf3a4b68" UNIQUE ("slug"), CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "companies" ("organizationId" integer NOT NULL, "createdById" integer, "updatedById" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "name" character varying NOT NULL, "industry" character varying, "website" character varying, "email" character varying, "phone" character varying, "address" text, "city" character varying, "state" character varying, "country" character varying, "zipCode" character varying, "employeeCount" integer NOT NULL DEFAULT '0', "annualRevenue" numeric(15,2), "description" text, "isActive" boolean NOT NULL DEFAULT true, "ownerId" integer, CONSTRAINT "UQ_3dacbb3eb4f095e29372ff8e131" UNIQUE ("name"), CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "contacts" ("organizationId" integer NOT NULL, "createdById" integer, "updatedById" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying, "mobile" character varying, "jobTitle" character varying, "department" character varying, "companyId" integer, "linkedInUrl" character varying, "twitterHandle" character varying, "notes" text, "address" character varying, "city" character varying, "state" character varying, "country" character varying, "zipCode" character varying, "birthday" date, "isPrimary" boolean NOT NULL DEFAULT true, "isActive" boolean NOT NULL DEFAULT true, "ownerId" integer, "lastContactedAt" TIMESTAMP, CONSTRAINT "UQ_752866c5247ddd34fd05559537d" UNIQUE ("email"), CONSTRAINT "PK_b99cd40cfd66a99f1571f4f72e6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."deals_stage_enum" AS ENUM('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost')`);
        await queryRunner.query(`CREATE TYPE "public"."deals_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent')`);
        await queryRunner.query(`CREATE TABLE "deals" ("organizationId" integer NOT NULL, "createdById" integer, "updatedById" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "title" character varying NOT NULL, "value" numeric(15,2) NOT NULL, "stage" "public"."deals_stage_enum" NOT NULL DEFAULT 'prospecting', "priority" "public"."deals_priority_enum" NOT NULL DEFAULT 'medium', "probability" integer NOT NULL DEFAULT '0', "companyId" integer, "contactId" integer, "expectedCloseDate" date, "actualCloseDate" date, "description" text, "notes" text, "assignedToId" integer, "ownerId" integer, "lostReason" character varying, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_8c66f03b250f613ff8615940b4b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."activities_type_enum" AS ENUM('call', 'email', 'meeting', 'note', 'task', 'deal', 'other')`);
        await queryRunner.query(`CREATE TYPE "public"."activities_relationtype_enum" AS ENUM('lead', 'contact', 'company', 'deal')`);
        await queryRunner.query(`CREATE TABLE "activities" ("organizationId" integer NOT NULL, "createdById" integer, "updatedById" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "type" "public"."activities_type_enum" NOT NULL, "subject" character varying NOT NULL, "description" text, "relationType" "public"."activities_relationtype_enum" NOT NULL, "relationId" integer NOT NULL, "duration" integer, "activityDate" TIMESTAMP, "isCompleted" boolean NOT NULL DEFAULT false, "outcome" character varying, "userId" integer, "companyId" integer, CONSTRAINT "PK_7f4004429f731ffb9c88eb486a8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."leads_status_enum" AS ENUM('new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost')`);
        await queryRunner.query(`CREATE TYPE "public"."leads_source_enum" AS ENUM('website', 'referral', 'social_media', 'email_campaign', 'cold_call', 'event', 'other')`);
        await queryRunner.query(`CREATE TABLE "leads" ("organizationId" integer NOT NULL, "createdById" integer, "updatedById" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying, "jobTitle" character varying, "companyName" character varying, "companyId" integer, "status" "public"."leads_status_enum" NOT NULL DEFAULT 'new', "source" "public"."leads_source_enum" NOT NULL DEFAULT 'other', "score" integer DEFAULT '0', "estimatedValue" numeric(15,2), "notes" text, "website" character varying, "address" character varying, "city" character varying, "state" character varying, "country" character varying, "zipCode" character varying, "assignedToId" integer, "ownerId" integer, "lastContactedAt" TIMESTAMP, CONSTRAINT "UQ_b3eea7add0e16594dba102716c5" UNIQUE ("email"), CONSTRAINT "PK_cd102ed7a9a4ca7d4d8bfeba406" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."tasks_status_enum" AS ENUM('todo', 'in_progress', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TYPE "public"."tasks_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent')`);
        await queryRunner.query(`CREATE TABLE "tasks" ("organizationId" integer NOT NULL, "createdById" integer, "updatedById" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "title" character varying NOT NULL, "description" text, "status" "public"."tasks_status_enum" NOT NULL DEFAULT 'todo', "priority" "public"."tasks_priority_enum" NOT NULL DEFAULT 'medium', "dueDate" TIMESTAMP, "completedAt" TIMESTAMP, "assignedToId" integer, "ownerId" integer, "relatedToType" character varying, "relatedToId" integer, "companyId" integer, "isReminder" boolean NOT NULL DEFAULT false, "reminderDate" TIMESTAMP, CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "user_roles" ADD CONSTRAINT "FK_472b25323af01488f1f66a06b67" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_roles" ADD CONSTRAINT "FK_86033897c009fcca8b6505d6be2" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_b4599f8b8f548d35850afa2d12c" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_organization_roles" ADD CONSTRAINT "FK_660917e4a563a2d52e1d648db5b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_organization_roles" ADD CONSTRAINT "FK_8cb9c055c577ab5d0c281bf4df4" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_organization_roles" ADD CONSTRAINT "FK_3b2765619a1830da86a8e34d2d4" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_dfda472c0af7812401e592b6a61" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organizations" ADD CONSTRAINT "FK_3a7ce4d98134ccb1d56a30e72be" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "companies" ADD CONSTRAINT "FK_cfa7d558ce458748965fca390d6" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "companies" ADD CONSTRAINT "FK_ff7919ef0e4b04801188c4aa591" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "companies" ADD CONSTRAINT "FK_fed8091b15f02e38562d8165686" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD CONSTRAINT "FK_17e19c05cb1da4070f68f83c8e4" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD CONSTRAINT "FK_8fe0c68fafb3cecf70144cc6615" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD CONSTRAINT "FK_4f22e057d812752c2c587ee3ca7" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD CONSTRAINT "FK_f4809f4f9ad4a220959788def42" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "deals" ADD CONSTRAINT "FK_06dfc4ea0eb80fd2445dd31aac9" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "deals" ADD CONSTRAINT "FK_4260149bb6b3f717a18a33969ee" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "deals" ADD CONSTRAINT "FK_1580c403dd8d4f005f6bb8d37f4" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "deals" ADD CONSTRAINT "FK_8824c76128d5ed303cec18e4d71" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "deals" ADD CONSTRAINT "FK_329413f450746425e2a3d20b3d9" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "activities" ADD CONSTRAINT "FK_b8168e2c3e209999463d40cead5" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "activities" ADD CONSTRAINT "FK_579056df0c92b0f6432e96b2048" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "activities" ADD CONSTRAINT "FK_baa9ee4a5ff8837c5a9767343ee" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leads" ADD CONSTRAINT "FK_6333c8e93a24b6a6c1d41fb9ac9" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leads" ADD CONSTRAINT "FK_6fb5366e90bc6455ebf2f749d65" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leads" ADD CONSTRAINT "FK_87219604e711425455fc71001d0" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leads" ADD CONSTRAINT "FK_b27f38bac494d6a2a8d899e3caf" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_a9a5a9fada64fc56e2aaf2f9464" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_660898d912c6e71107e9ef8f38d" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_968181605275afeddec0d898b26" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_968181605275afeddec0d898b26"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_660898d912c6e71107e9ef8f38d"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_a9a5a9fada64fc56e2aaf2f9464"`);
        await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT "FK_b27f38bac494d6a2a8d899e3caf"`);
        await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT "FK_87219604e711425455fc71001d0"`);
        await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT "FK_6fb5366e90bc6455ebf2f749d65"`);
        await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT "FK_6333c8e93a24b6a6c1d41fb9ac9"`);
        await queryRunner.query(`ALTER TABLE "activities" DROP CONSTRAINT "FK_baa9ee4a5ff8837c5a9767343ee"`);
        await queryRunner.query(`ALTER TABLE "activities" DROP CONSTRAINT "FK_579056df0c92b0f6432e96b2048"`);
        await queryRunner.query(`ALTER TABLE "activities" DROP CONSTRAINT "FK_b8168e2c3e209999463d40cead5"`);
        await queryRunner.query(`ALTER TABLE "deals" DROP CONSTRAINT "FK_329413f450746425e2a3d20b3d9"`);
        await queryRunner.query(`ALTER TABLE "deals" DROP CONSTRAINT "FK_8824c76128d5ed303cec18e4d71"`);
        await queryRunner.query(`ALTER TABLE "deals" DROP CONSTRAINT "FK_1580c403dd8d4f005f6bb8d37f4"`);
        await queryRunner.query(`ALTER TABLE "deals" DROP CONSTRAINT "FK_4260149bb6b3f717a18a33969ee"`);
        await queryRunner.query(`ALTER TABLE "deals" DROP CONSTRAINT "FK_06dfc4ea0eb80fd2445dd31aac9"`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP CONSTRAINT "FK_f4809f4f9ad4a220959788def42"`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP CONSTRAINT "FK_4f22e057d812752c2c587ee3ca7"`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP CONSTRAINT "FK_8fe0c68fafb3cecf70144cc6615"`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP CONSTRAINT "FK_17e19c05cb1da4070f68f83c8e4"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP CONSTRAINT "FK_fed8091b15f02e38562d8165686"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP CONSTRAINT "FK_ff7919ef0e4b04801188c4aa591"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP CONSTRAINT "FK_cfa7d558ce458748965fca390d6"`);
        await queryRunner.query(`ALTER TABLE "organizations" DROP CONSTRAINT "FK_3a7ce4d98134ccb1d56a30e72be"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_dfda472c0af7812401e592b6a61"`);
        await queryRunner.query(`ALTER TABLE "user_organization_roles" DROP CONSTRAINT "FK_3b2765619a1830da86a8e34d2d4"`);
        await queryRunner.query(`ALTER TABLE "user_organization_roles" DROP CONSTRAINT "FK_8cb9c055c577ab5d0c281bf4df4"`);
        await queryRunner.query(`ALTER TABLE "user_organization_roles" DROP CONSTRAINT "FK_660917e4a563a2d52e1d648db5b"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_b4599f8b8f548d35850afa2d12c"`);
        await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT "FK_86033897c009fcca8b6505d6be2"`);
        await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT "FK_472b25323af01488f1f66a06b67"`);
        await queryRunner.query(`DROP TABLE "tasks"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
        await queryRunner.query(`DROP TABLE "leads"`);
        await queryRunner.query(`DROP TYPE "public"."leads_source_enum"`);
        await queryRunner.query(`DROP TYPE "public"."leads_status_enum"`);
        await queryRunner.query(`DROP TABLE "activities"`);
        await queryRunner.query(`DROP TYPE "public"."activities_relationtype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."activities_type_enum"`);
        await queryRunner.query(`DROP TABLE "deals"`);
        await queryRunner.query(`DROP TYPE "public"."deals_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."deals_stage_enum"`);
        await queryRunner.query(`DROP TABLE "contacts"`);
        await queryRunner.query(`DROP TABLE "companies"`);
        await queryRunner.query(`DROP TABLE "organizations"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "user_organization_roles"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_de4a83bbc1aa3e836d4324f753"`);
        await queryRunner.query(`DROP TABLE "role_permissions"`);
        await queryRunner.query(`DROP TYPE "public"."role_permissions_scope_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_88481b0c4ed9ada47e9fdd6747"`);
        await queryRunner.query(`DROP TABLE "user_roles"`);
    }

}
