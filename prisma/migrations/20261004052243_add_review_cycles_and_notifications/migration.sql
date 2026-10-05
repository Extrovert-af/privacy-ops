-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Assessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "regulation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stakeholder" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL,
    "workflowStage" INTEGER NOT NULL DEFAULT 1,
    "risksIdentified" INTEGER NOT NULL DEFAULT 0,
    "risksTotal" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "responses" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "reviewCycle" INTEGER NOT NULL DEFAULT 1,
    "lastReviewedAt" DATETIME,
    "reviewDueDate" TEXT,
    "completedAt" DATETIME,
    "createdBy" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    CONSTRAINT "Assessment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Assessment_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Assessment" ("assigneeId", "createdAt", "createdBy", "department", "dueDate", "id", "notes", "regulation", "responses", "risksIdentified", "risksTotal", "stakeholder", "status", "templateId", "title", "updatedAt", "workflowStage") SELECT "assigneeId", "createdAt", "createdBy", "department", "dueDate", "id", "notes", "regulation", "responses", "risksIdentified", "risksTotal", "stakeholder", "status", "templateId", "title", "updatedAt", "workflowStage" FROM "Assessment";
DROP TABLE "Assessment";
ALTER TABLE "new_Assessment" RENAME TO "Assessment";
CREATE INDEX "Assessment_status_idx" ON "Assessment"("status");
CREATE INDEX "Assessment_dueDate_idx" ON "Assessment"("dueDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
