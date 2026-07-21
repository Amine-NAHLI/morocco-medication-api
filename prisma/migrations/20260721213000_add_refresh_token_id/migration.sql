-- Stores the JWT ID alongside the hashed refresh token so a rotated token is
-- invalidated deterministically even under concurrent requests.
ALTER TABLE "User" ADD COLUMN "refreshTokenId" TEXT;
CREATE UNIQUE INDEX "User_refreshTokenId_key" ON "User"("refreshTokenId");
