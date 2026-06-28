-- CommunityHero Database Schema
-- Run this in your Supabase SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  badge TEXT DEFAULT 'Citizen',
  avatar TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Issues table
CREATE TABLE IF NOT EXISTS "Issue" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  "imageUrl" TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  "upvoteCount" INTEGER DEFAULT 0,
  "verifiedCount" INTEGER DEFAULT 0,
  "aiAnalysis" JSONB,
  department TEXT,
  "resolvedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "userId" TEXT NOT NULL REFERENCES "User"(id)
);

-- Upvotes table
CREATE TABLE IF NOT EXISTS "Upvote" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "User"(id),
  "issueId" TEXT NOT NULL REFERENCES "Issue"(id),
  type TEXT DEFAULT 'upvote',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("userId", "issueId")
);

-- Comments table
CREATE TABLE IF NOT EXISTS "Comment" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  text TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "User"(id),
  "issueId" TEXT NOT NULL REFERENCES "Issue"(id),
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_issue_status ON "Issue"(status);
CREATE INDEX IF NOT EXISTS idx_issue_category ON "Issue"(category);
CREATE INDEX IF NOT EXISTS idx_issue_user ON "Issue"("userId");
CREATE INDEX IF NOT EXISTS idx_upvote_issue ON "Upvote"("issueId");
CREATE INDEX IF NOT EXISTS idx_comment_issue ON "Comment"("issueId");

-- RLS policies (run after enabling RLS in Supabase dashboard)
-- ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Issue" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Upvote" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "service_role_all" ON "User" FOR ALL TO service_role USING (true) WITH CHECK (true);
-- CREATE POLICY "service_role_all" ON "Issue" FOR ALL TO service_role USING (true) WITH CHECK (true);
-- CREATE POLICY "service_role_all" ON "Upvote" FOR ALL TO service_role USING (true) WITH CHECK (true);
-- CREATE POLICY "service_role_all" ON "Comment" FOR ALL TO service_role USING (true) WITH CHECK (true);

SELECT 'Schema created successfully' as result;
