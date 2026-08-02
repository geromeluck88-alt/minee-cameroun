-- CreateTable
CREATE TABLE `utilisateurs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `motDePasse` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'CHEF_PROJET', 'CHEF_EQUIPE', 'INSPECTEUR') NOT NULL,
    `telephone` VARCHAR(191) NULL,
    `photo` VARCHAR(191) NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `dateCreation` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `utilisateurs_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `dateDebut` DATETIME(3) NOT NULL,
    `dateFin` DATETIME(3) NOT NULL,
    `statut` ENUM('EN_ATTENTE', 'EN_COURS', 'TERMINE', 'EN_RETARD', 'SUSPENDU') NOT NULL DEFAULT 'EN_ATTENTE',
    `priorite` ENUM('BASSE', 'NORMALE', 'HAUTE', 'URGENTE') NOT NULL DEFAULT 'NORMALE',
    `budget` DOUBLE NULL,
    `chefProjetId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `taches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titre` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `dateDebut` DATETIME(3) NOT NULL,
    `dateFinPrevue` DATETIME(3) NOT NULL,
    `statut` ENUM('A_FAIRE', 'EN_COURS', 'TERMINE', 'BLOQUE', 'EN_RETARD') NOT NULL DEFAULT 'A_FAIRE',
    `priorite` ENUM('BASSE', 'NORMALE', 'HAUTE', 'URGENTE') NOT NULL DEFAULT 'NORMALE',
    `avancement` INTEGER NOT NULL DEFAULT 0,
    `projetId` INTEGER NOT NULL,
    `assigneAId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `equipes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `chefEquipeId` INTEGER NOT NULL,
    `projetId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `membres_equipe` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `equipeId` INTEGER NOT NULL,
    `utilisateurId` INTEGER NOT NULL,

    UNIQUE INDEX `membres_equipe_equipeId_utilisateurId_key`(`equipeId`, `utilisateurId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rapports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tacheId` INTEGER NOT NULL,
    `chefEquipeId` INTEGER NOT NULL,
    `titre` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `statutTache` ENUM('A_FAIRE', 'EN_COURS', 'TERMINE', 'BLOQUE', 'EN_RETARD') NOT NULL,
    `avancement` INTEGER NOT NULL,
    `observations` TEXT NULL,
    `photos` TEXT NULL,
    `dateCreation` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assistant_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `refId` INTEGER NOT NULL,
    `projetId` INTEGER NULL,
    `content` TEXT NOT NULL,
    `embedding` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `assistant_documents_projetId_idx`(`projetId`),
    UNIQUE INDEX `assistant_documents_type_refId_key`(`type`, `refId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inspections` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projetId` INTEGER NOT NULL,
    `inspecteurId` INTEGER NOT NULL,
    `dateInspection` DATETIME(3) NOT NULL,
    `observations` TEXT NULL,
    `recommandations` TEXT NULL,
    `statut` ENUM('EN_ATTENTE', 'EN_COURS', 'TERMINE') NOT NULL DEFAULT 'EN_ATTENTE',
    `conforme` BOOLEAN NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `projets` ADD CONSTRAINT `projets_chefProjetId_fkey` FOREIGN KEY (`chefProjetId`) REFERENCES `utilisateurs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taches` ADD CONSTRAINT `taches_projetId_fkey` FOREIGN KEY (`projetId`) REFERENCES `projets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taches` ADD CONSTRAINT `taches_assigneAId_fkey` FOREIGN KEY (`assigneAId`) REFERENCES `utilisateurs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipes` ADD CONSTRAINT `equipes_chefEquipeId_fkey` FOREIGN KEY (`chefEquipeId`) REFERENCES `utilisateurs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipes` ADD CONSTRAINT `equipes_projetId_fkey` FOREIGN KEY (`projetId`) REFERENCES `projets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `membres_equipe` ADD CONSTRAINT `membres_equipe_equipeId_fkey` FOREIGN KEY (`equipeId`) REFERENCES `equipes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `membres_equipe` ADD CONSTRAINT `membres_equipe_utilisateurId_fkey` FOREIGN KEY (`utilisateurId`) REFERENCES `utilisateurs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rapports` ADD CONSTRAINT `rapports_tacheId_fkey` FOREIGN KEY (`tacheId`) REFERENCES `taches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rapports` ADD CONSTRAINT `rapports_chefEquipeId_fkey` FOREIGN KEY (`chefEquipeId`) REFERENCES `utilisateurs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inspections` ADD CONSTRAINT `inspections_projetId_fkey` FOREIGN KEY (`projetId`) REFERENCES `projets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inspections` ADD CONSTRAINT `inspections_inspecteurId_fkey` FOREIGN KEY (`inspecteurId`) REFERENCES `utilisateurs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
