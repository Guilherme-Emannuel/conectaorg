-- CreateTable
CREATE TABLE `org_units` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `sigla` VARCHAR(191) NULL,
    `gestor` VARCHAR(191) NULL,
    `foto` TEXT NULL,
    `fotoVisivel` BOOLEAN NOT NULL DEFAULT true,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `parentId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `org_units` ADD CONSTRAINT `org_units_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `org_units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
