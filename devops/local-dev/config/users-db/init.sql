SET GLOBAL wait_timeout = 604800;

CREATE DATABASE IF NOT EXISTS metacube;
USE metacube;

DROP TABLE IF EXISTS `Players`;
CREATE TABLE `Players` (
  `publicKey` char(64) NOT NULL,
  `username` varchar(16) DEFAULT NULL,
  `suspendedUntil` bigint DEFAULT NULL,
  `coins` int DEFAULT NULL,
  `hp` tinyint DEFAULT NULL,
  `damageLevel` tinyint DEFAULT NULL,
  `multiplierLevel` tinyint DEFAULT NULL,
  `healthLevel` tinyint DEFAULT NULL,
  `attackRangeLevel` tinyint DEFAULT NULL,
  `flyLevel` tinyint DEFAULT NULL,
  `criticalHitLevel` tinyint DEFAULT NULL,
  `banned` tinyint(1) DEFAULT NULL,
  `skinId` tinyint DEFAULT NULL,
  `statistics` json DEFAULT NULL,
  `name` varchar(256) DEFAULT NULL,
  `email` varchar(256) DEFAULT NULL,
  `rewardAddress` char(64) DEFAULT NULL,
  PRIMARY KEY (`publicKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `NFTs`;
CREATE TABLE `NFTs` (
  `NFT_ID` int NOT NULL,
  `ownerPublicKey` char(64) NOT NULL,
  `timestamp` bigint DEFAULT NULL,
  `sent` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`NFT_ID`),
  KEY `ownerPublicKey` (`ownerPublicKey`),
  CONSTRAINT `NFTs_ibfk_1` FOREIGN KEY (`ownerPublicKey`) REFERENCES `Players` (`publicKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `Referrals`;
CREATE TABLE `Referrals` (
  `referrer` char(64) NOT NULL,
  `referred` char(64) NOT NULL,
  `succeeded` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`referred`),
  FOREIGN KEY (`referrer`) REFERENCES `Players` (`publicKey`),
  FOREIGN KEY (`referred`) REFERENCES `Players` (`publicKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS 'metacube'@'%' IDENTIFIED BY 'metacube';
GRANT SELECT, INSERT, UPDATE ON metacube.* TO 'metacube'@'%';
