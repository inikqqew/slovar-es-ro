-- CreateTable
CREATE TABLE "SavedWord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    CONSTRAINT "SavedWord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SavedWord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SavedWord_userId_idx" ON "SavedWord"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedWord_userId_wordId_key" ON "SavedWord"("userId", "wordId");
