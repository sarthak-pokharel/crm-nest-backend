import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePermissionSystem1766938280507 implements MigrationInterface {
    name = 'CreatePermissionSystem1766938280507'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new columns to existing user table
        await queryRunner.query(`ALTER TABLE "user" ADD "companyId" integer`);
        await queryRunner.query(`ALTER TABLE "user" ADD "departmentId" integer`);
        await queryRunner.query(`ALTER TABLE "user" ADD "teamId" integer`);
        
        // Create new tables
        await queryRunner.query(`CREATE TABLE "user_roles" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "roleId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8acd5cf26ebd158416f477de799" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_88481b0c4ed9ada47e9fdd6747" ON "user_roles" ("userId", "roleId") `);
        await queryRunner.query(`CREATE TYPE "public"."role_permissions_scope_enum" AS ENUM('global', 'company', 'department', 'team', 'self')`);
        await queryRunner.query(`CREATE TABLE "role_permissions" ("id" SERIAL NOT NULL, "roleId" integer NOT NULL, "permissionKey" character varying NOT NULL, "scope" "public"."role_permissions_scope_enum" NOT NULL DEFAULT 'self', "conditions" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_84059017c90bfcb701b8fa42297" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_de4a83bbc1aa3e836d4324f753" ON "role_permissions" ("roleId", "permissionKey") `);
        await queryRunner.query(`CREATE TABLE "roles" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "user_roles" ADD CONSTRAINT "FK_472b25323af01488f1f66a06b67" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_roles" ADD CONSTRAINT "FK_86033897c009fcca8b6505d6be2" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_b4599f8b8f548d35850afa2d12c" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_b4599f8b8f548d35850afa2d12c"`);
        await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT "FK_86033897c009fcca8b6505d6be2"`);
        await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT "FK_472b25323af01488f1f66a06b67"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_de4a83bbc1aa3e836d4324f753"`);
        await queryRunner.query(`DROP TABLE "role_permissions"`);
        await queryRunner.query(`DROP TYPE "public"."role_permissions_scope_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_88481b0c4ed9ada47e9fdd6747"`);
        await queryRunner.query(`DROP TABLE "user_roles"`);
        
        // Remove columns from user table
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "teamId"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "departmentId"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "companyId"`);
    }

}
