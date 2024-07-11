CREATE TABLE [users] ( 
  [id] INTEGER PRIMARY KEY AUTOINCREMENT,
  [handle] VARCHAR(250) NULL,
  "indexedAt" DATETIME NULL
, [followers] INT NULL, [did] VARCHAR(250) NULL, [posts] INT NULL, [follows] INT NULL, "createdAt" DATETIME NULL, [displayName] VARCHAR(250) NULL, [localPosts] INT NULL, [localPostsRatio] INT NULL, [lastPostDate] DATETIME NULL, [labels] TEXT NULL, [description] TEXT NULL, [followerPostRatio] INT NULL, [redacted] BOOLEAN NULL DEFAULT false, [profileLastUpdated] DATETIME NULL, [optout] BOOLEAN NULL DEFAULT false, [deleted] BOOLEAN NULL DEFAULT false, [firstPostDate] DATETIME NULL, [avatar] TEXT NULL, [included] BOOLEAN NULL DEFAULT false, [twitter] VARCHAR(250) NULL, [likeCountSum] INT NULL, [repostCountSum] INT NULL, [replyCountSum] INT NULL, [czechNational] BOOLEAN NULL DEFAULT false);
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE [posts] ( 
  [uri] VARCHAR(250) NOT NULL,
  [author] VARCHAR(250) NULL,
  [text] TEXT NULL,
  [createdAt] VARCHAR(250) NULL,
  [langs] VARCHAR(250) NULL, [labels] TEXT NULL, [likeCount] INT NULL, [repostCount] INT NULL, [replyCount] INT NULL, [indexedAt] DATETIME NULL, [updatedAt] DATETIME NULL, [langDetected] VARCHAR(250) NULL, [deleted] BOOLEAN NULL,
   PRIMARY KEY ([uri])
);
CREATE INDEX [author] 
ON [posts] (
  [author] ASC
);
CREATE INDEX [createdAt] 
ON [posts] (
  [createdAt] DESC
);
CREATE INDEX [langDetected] 
ON [posts] (
  [langDetected] ASC
);
CREATE UNIQUE INDEX [IX_users_did] 
ON [users] (
  [did] ASC
);
CREATE UNIQUE INDEX [uri] 
ON [posts] (
  [uri] ASC
);
CREATE INDEX [updatedAt] 
ON [posts] (
  [updatedAt] ASC
);
