-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADVISOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Season" AS ENUM ('SPRING', 'SUMMER', 'FALL');

-- CreateEnum
CREATE TYPE "Goal" AS ENUM ('INDUSTRY', 'GRAD_SCHOOL', 'UNDECIDED');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('COMPLETED', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "RequirementKind" AS ENUM ('ALL_OF', 'CREDITS_FROM');

-- CreateEnum
CREATE TYPE "OpportunityCategory" AS ENUM ('POST_GRAD', 'EXPERIENCE');

-- CreateEnum
CREATE TYPE "OpportunityKind" AS ENUM ('GRAD_PROGRAM', 'JOB', 'INTERNSHIP', 'RESEARCH', 'CERTIFICATION', 'CLUB');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SAVED', 'APPLIED', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "programId" TEXT,
    "goal" "Goal" NOT NULL DEFAULT 'UNDECIDED',
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxCreditsPerTerm" INTEGER NOT NULL DEFAULT 15,
    "targetSeason" "Season",
    "targetYear" INTEGER,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "termsOffered" "Season"[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "courses_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "prerequisite_groups" (
    "id" SERIAL NOT NULL,
    "courseCode" TEXT NOT NULL,
    "concurrentAllowed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "prerequisite_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prerequisite_options" (
    "groupId" INTEGER NOT NULL,
    "courseCode" TEXT NOT NULL,

    CONSTRAINT "prerequisite_options_pkey" PRIMARY KEY ("groupId","courseCode")
);

-- CreateTable
CREATE TABLE "degree_programs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalCredits" INTEGER NOT NULL,

    CONSTRAINT "degree_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_categories" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "RequirementKind" NOT NULL,
    "creditsRequired" INTEGER,
    "position" INTEGER NOT NULL,

    CONSTRAINT "requirement_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_courses" (
    "categoryId" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,

    CONSTRAINT "requirement_courses_pkey" PRIMARY KEY ("categoryId","courseCode")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "category" "OpportunityCategory" NOT NULL,
    "kind" "OpportunityKind" NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "goals" "Goal"[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relatedCourses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deadline" DATE,
    "url" TEXT,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL,
    "grade" TEXT,
    "season" "Season",
    "year" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_courses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "season" "Season" NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dismissed_courses" (
    "userId" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dismissed_courses_pkey" PRIMARY KEY ("userId","courseCode")
);

-- CreateTable
CREATE TABLE "dismissed_opportunities" (
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dismissed_opportunities_pkey" PRIMARY KEY ("userId","opportunityId")
);

-- CreateTable
CREATE TABLE "saved_opportunities" (
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SAVED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_opportunities_pkey" PRIMARY KEY ("userId","opportunityId")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "prerequisite_groups_courseCode_idx" ON "prerequisite_groups"("courseCode");

-- CreateIndex
CREATE INDEX "prerequisite_options_courseCode_idx" ON "prerequisite_options"("courseCode");

-- CreateIndex
CREATE UNIQUE INDEX "requirement_categories_programId_key_key" ON "requirement_categories"("programId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "academic_records_userId_courseCode_key" ON "academic_records"("userId", "courseCode");

-- CreateIndex
CREATE UNIQUE INDEX "plan_courses_userId_courseCode_key" ON "plan_courses"("userId", "courseCode");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_programId_fkey" FOREIGN KEY ("programId") REFERENCES "degree_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prerequisite_groups" ADD CONSTRAINT "prerequisite_groups_courseCode_fkey" FOREIGN KEY ("courseCode") REFERENCES "courses"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prerequisite_options" ADD CONSTRAINT "prerequisite_options_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "prerequisite_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prerequisite_options" ADD CONSTRAINT "prerequisite_options_courseCode_fkey" FOREIGN KEY ("courseCode") REFERENCES "courses"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_categories" ADD CONSTRAINT "requirement_categories_programId_fkey" FOREIGN KEY ("programId") REFERENCES "degree_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_courses" ADD CONSTRAINT "requirement_courses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "requirement_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_courses" ADD CONSTRAINT "requirement_courses_courseCode_fkey" FOREIGN KEY ("courseCode") REFERENCES "courses"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_records" ADD CONSTRAINT "academic_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_records" ADD CONSTRAINT "academic_records_courseCode_fkey" FOREIGN KEY ("courseCode") REFERENCES "courses"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_courses" ADD CONSTRAINT "plan_courses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_courses" ADD CONSTRAINT "plan_courses_courseCode_fkey" FOREIGN KEY ("courseCode") REFERENCES "courses"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dismissed_courses" ADD CONSTRAINT "dismissed_courses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dismissed_courses" ADD CONSTRAINT "dismissed_courses_courseCode_fkey" FOREIGN KEY ("courseCode") REFERENCES "courses"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dismissed_opportunities" ADD CONSTRAINT "dismissed_opportunities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dismissed_opportunities" ADD CONSTRAINT "dismissed_opportunities_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_opportunities" ADD CONSTRAINT "saved_opportunities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_opportunities" ADD CONSTRAINT "saved_opportunities_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
