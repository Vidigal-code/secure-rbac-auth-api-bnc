BEGIN TRY

BEGIN TRAN;

-- Enterprise hardening:
-- - remove columns de refresh antigo (User.refreshTokenHash / refreshTokenExpiresAt)
-- - adiciona isActive + tokenVersion
-- - cria tabela RefreshToken (hash + rotação + revogação)

-- Drop old refresh columns (se existirem)
IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE Name = N'refreshTokenHash' AND Object_ID = Object_ID(N'dbo.[User]')
)
BEGIN
    ALTER TABLE [dbo].[User] DROP COLUMN [refreshTokenHash];
END

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE Name = N'refreshTokenExpiresAt' AND Object_ID = Object_ID(N'dbo.[User]')
)
BEGIN
    ALTER TABLE [dbo].[User] DROP COLUMN [refreshTokenExpiresAt];
END

-- Add isActive
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE Name = N'isActive' AND Object_ID = Object_ID(N'dbo.[User]')
)
BEGIN
    ALTER TABLE [dbo].[User] ADD [isActive] BIT NOT NULL CONSTRAINT [User_isActive_df] DEFAULT 1;
END

-- Add tokenVersion
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE Name = N'tokenVersion' AND Object_ID = Object_ID(N'dbo.[User]')
)
BEGIN
    ALTER TABLE [dbo].[User] ADD [tokenVersion] INT NOT NULL CONSTRAINT [User_tokenVersion_df] DEFAULT 0;
END

-- CreateTable RefreshToken
IF OBJECT_ID(N'dbo.[RefreshToken]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RefreshToken] (
        [id] INT NOT NULL IDENTITY(1,1),
        [tokenHash] NVARCHAR(1000) NOT NULL,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [RefreshToken_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [expiresAt] DATETIME2 NOT NULL,
        [revokedAt] DATETIME2,
        [replacedByTokenHash] NVARCHAR(1000),
        [createdByIp] NVARCHAR(1000),
        [createdByUserAgent] NVARCHAR(1000),
        [userId] INT NOT NULL,
        CONSTRAINT [RefreshToken_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [RefreshToken_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
    );

    CREATE NONCLUSTERED INDEX [RefreshToken_userId_idx] ON [dbo].[RefreshToken]([userId]);

    ALTER TABLE [dbo].[RefreshToken] ADD CONSTRAINT [RefreshToken_userId_fkey]
      FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;
END

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH


