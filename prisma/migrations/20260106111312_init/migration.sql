-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'REFRESH_TOKEN', 'CHANGE_PASSWORD', 'REGISTER', 'CREATE', 'READ', 'UPDATE', 'DELETE', 'ROLE_CHANGE', 'PERMISSION_CHANGE', 'USER_ACTIVATE', 'USER_DEACTIVATE', 'SESSION_REVOKE', 'CONFIG_CHANGE', 'SYSTEM_EVENT');

-- CreateEnum
CREATE TYPE "public"."AuditResource" AS ENUM ('USER', 'USER_SESSION', 'AUTH', 'ROLE', 'PERMISSION', 'DEPARTMENT', 'POSITION', 'SALARY', 'EMPLOYEE', 'CONFIG', 'SYSTEM');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "role" "public"."UserRole" NOT NULL DEFAULT 'USER',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "password_changed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "user_agent" TEXT,
    "ip_address" TEXT,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    "username" TEXT,
    "user_role" TEXT,
    "action" "public"."AuditAction" NOT NULL,
    "resource" "public"."AuditResource" NOT NULL,
    "resource_id" TEXT,
    "method" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "session_id" TEXT,
    "request_id" TEXT,
    "changes_before" JSONB,
    "changes_after" JSONB,
    "metadata" JSONB,
    "status_code" INTEGER NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refresh_token_key" ON "public"."user_sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_timestamp_idx" ON "public"."audit_logs"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_action_timestamp_idx" ON "public"."audit_logs"("action", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_resource_timestamp_idx" ON "public"."audit_logs"("resource", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "public"."audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_session_id_idx" ON "public"."audit_logs"("session_id");

-- AddForeignKey
ALTER TABLE "public"."user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
