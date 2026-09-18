-- Reconcile social tables that already exist in the development database
-- but were missing from Prisma migration history.

CREATE TYPE IF NOT EXISTS "PostShareChannel" AS ENUM ('REVVAM', 'EXTERNAL');

CREATE TABLE IF NOT EXISTS "PostLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PostShare" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "PostShareChannel" NOT NULL DEFAULT 'REVVAM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostShare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PostMention" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "mentionedUserId" TEXT NOT NULL,
    "mentionedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostMention_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MessageDeletion" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageDeletion_pkey" PRIMARY KEY ("id")
);
