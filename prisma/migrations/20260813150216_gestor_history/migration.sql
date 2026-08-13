-- CreateTable
CREATE TABLE `gestor_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orgUnitId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `inicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atual` BOOLEAN NOT NULL DEFAULT false,
    `docTipo` VARCHAR(191) NULL,
    `docNumero` VARCHAR(191) NULL,
    `docUrl` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `gestor_history` ADD CONSTRAINT `gestor_history_orgUnitId_fkey` FOREIGN KEY (`orgUnitId`) REFERENCES `org_units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
