-- Reconcile social-schema objects that already exist in the development
-- database but were missing from Prisma migration history.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'PostShareChannel'
    ) THEN
        CREATE TYPE "PostShareChannel" AS ENUM ('REVVAM', 'EXTERNAL');
    END IF;
END $$;

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

CREATE UNIQUE INDEX IF NOT EXISTS "PostLike_postId_userId_key"
ON "PostLike"("postId", "userId");

CREATE INDEX IF NOT EXISTS "PostLike_userId_createdAt_idx"
ON "PostLike"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "PostComment_postId_createdAt_idx"
ON "PostComment"("postId", "createdAt");

CREATE INDEX IF NOT EXISTS "PostComment_authorId_createdAt_idx"
ON "PostComment"("authorId", "createdAt");

CREATE INDEX IF NOT EXISTS "PostComment_parentId_createdAt_idx"
ON "PostComment"("parentId", "createdAt");

CREATE INDEX IF NOT EXISTS "PostShare_postId_createdAt_idx"
ON "PostShare"("postId", "createdAt");

CREATE INDEX IF NOT EXISTS "PostShare_userId_createdAt_idx"
ON "PostShare"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "PostMention_mentionedUserId_idx"
ON "PostMention"("mentionedUserId");

CREATE INDEX IF NOT EXISTS "PostMention_mentionedById_idx"
ON "PostMention"("mentionedById");

CREATE UNIQUE INDEX IF NOT EXISTS "PostMention_postId_mentionedUserId_key"
ON "PostMention"("postId", "mentionedUserId");

CREATE INDEX IF NOT EXISTS "MessageDeletion_userId_deletedAt_idx"
ON "MessageDeletion"("userId", "deletedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "MessageDeletion_messageId_userId_key"
ON "MessageDeletion"("messageId", "userId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'PostLike_postId_fkey'
    ) THEN
        ALTER TABLE "PostLike"
        ADD CONSTRAINT "PostLike_postId_fkey"
        FOREIGN KEY ("postId")
        REFERENCES "Post"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'PostLike_userId_fkey'
    ) THEN
        ALTER TABLE "PostLike"
        ADD CONSTRAINT "PostLike_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "User"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'PostComment_postId_fkey'
    ) THEN
        ALTER TABLE "PostComment"
        ADD CONSTRAINT "PostComment_postId_fkey"
        FOREIGN KEY ("postId")
        REFERENCES "Post"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'PostComment_authorId_fkey'
    ) THEN
        ALTER TABLE "PostComment"
        ADD CONSTRAINT "PostComment_authorId_fkey"
        FOREIGN KEY ("authorId")
        REFERENCES "User"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'PostComment_parentId_fkey'
    ) THEN
        ALTER TABLE "PostComment"
        ADD CONSTRAINT "PostComment_parentId_fkey"
        FOREIGN KEY ("parentId")
        REFERENCES "PostComment"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'PostShare_postId_fkey'
    ) THEN
        ALTER TABLE "PostShare"
        ADD CONSTRAINT "PostShare_postId_fkey"
        FOREIGN KEY ("postId")
        REFERENCES "Post"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'PostShare_userId_fkey'
    ) THEN
        ALTER TABLE "PostShare"
        ADD CONSTRAINT "PostShare_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "User"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'PostMention_postId_fkey'
    ) THEN
        ALTER TABLE "PostMention"
        ADD CONSTRAINT "PostMention_postId_fkey"
        FOREIGN KEY ("postId")
        REFERENCES "Post"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'PostMention_mentionedUserId_fkey'
    ) THEN
        ALTER TABLE "PostMention"
        ADD CONSTRAINT "PostMention_mentionedUserId_fkey"
        FOREIGN KEY ("mentionedUserId")
        REFERENCES "User"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'PostMention_mentionedById_fkey'
    ) THEN
        ALTER TABLE "PostMention"
        ADD CONSTRAINT "PostMention_mentionedById_fkey"
        FOREIGN KEY ("mentionedById")
        REFERENCES "User"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'MessageDeletion_messageId_fkey'
    ) THEN
        ALTER TABLE "MessageDeletion"
        ADD CONSTRAINT "MessageDeletion_messageId_fkey"
        FOREIGN KEY ("messageId")
        REFERENCES "Message"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'MessageDeletion_userId_fkey'
    ) THEN
        ALTER TABLE "MessageDeletion"
        ADD CONSTRAINT "MessageDeletion_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "User"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
END $$;
