-- CreateTable
CREATE TABLE `UfwLog` (
    `id` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `hostname` VARCHAR(191) NOT NULL,
    `service` VARCHAR(191) NOT NULL,
    `pid` INTEGER NULL,
    `ipAddress` VARCHAR(191) NULL,
    `port` INTEGER NULL,
    `protocol` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `logType` ENUM('UFW_DROP', 'UFW_ACCEPT', 'UFW_REJECT', 'UFW_LIMIT', 'UFW_LOG', 'UFW_BLOCK', 'OTHER') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
