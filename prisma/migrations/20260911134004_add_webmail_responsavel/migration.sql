-- CreateTable
CREATE TABLE `webmail_responsaveis` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `matricula` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `cpf` VARCHAR(191) NULL,
    `divisaoNome` VARCHAR(191) NULL,
    `subdivisaoNome` VARCHAR(191) NULL,
    `unidadeNome` VARCHAR(191) NULL,
    `atual` BOOLEAN NOT NULL DEFAULT true,
    `vinculadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `webmail_responsaveis_username_idx`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
