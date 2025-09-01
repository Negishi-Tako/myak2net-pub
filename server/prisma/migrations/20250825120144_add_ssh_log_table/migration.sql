-- CreateTable
CREATE TABLE `SshLog` (
    `id` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `hostname` VARCHAR(191) NOT NULL,
    `service` VARCHAR(191) NOT NULL,
    `pid` INTEGER NULL,
    `username` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `port` INTEGER NULL,
    `action` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `logType` ENUM('SSH_DISCONNECT', 'SSH_CONNECT', 'SSH_AUTH_FAIL', 'SSH_AUTH_SUCCESS', 'CRON_SESSION', 'OTHER') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
