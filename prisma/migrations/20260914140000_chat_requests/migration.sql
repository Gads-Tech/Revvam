-- Chat requests gate private conversations between users.
ALTER TYPE "NotificationType" ADD VALUE 'CHAT_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE 'CHAT_ACCEPTED';

CREATE TYPE "ChatRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

CREATE TABLE "ChatRequest" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "status" "ChatRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Notification" ADD COLUMN "chatRequestId" TEXT;

CREATE UNIQUE INDEX "ChatRequest_senderId_recipientId_key" ON "ChatRequest"("senderId", "recipientId");
CREATE INDEX "ChatRequest_recipientId_status_idx" ON "ChatRequest"("recipientId", "status");
CREATE INDEX "ChatRequest_senderId_status_idx" ON "ChatRequest"("senderId", "status");
CREATE UNIQUE INDEX "Notification_chatRequestId_key" ON "Notification"("chatRequestId");

ALTER TABLE "ChatRequest" ADD CONSTRAINT "ChatRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatRequest" ADD CONSTRAINT "ChatRequest_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_chatRequestId_fkey" FOREIGN KEY ("chatRequestId") REFERENCES "ChatRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
