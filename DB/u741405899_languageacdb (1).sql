-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Apr 05, 2026 at 09:08 PM
-- Server version: 11.8.6-MariaDB-log
-- PHP Version: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u741405899_languageacdb`
--

-- --------------------------------------------------------

--
-- Table structure for table `accounts`
--

CREATE TABLE `accounts` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `code` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('asset','liability','equity','revenue','expense') NOT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `sub_type` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `accounts`
--

INSERT INTO `accounts` (`id`, `branch_id`, `code`, `name`, `type`, `parent_id`, `is_active`, `created_at`, `updated_at`, `sub_type`) VALUES
(1, 1, '1001', 'CASH-HQ', 'asset', NULL, 1, '2026-03-24 19:06:43', '2026-03-24 19:06:43', 'cash'),
(2, 1, '4000', 'Tuition Revenue', 'revenue', NULL, 1, '2026-03-24 19:07:52', '2026-03-24 19:07:52', NULL),
(3, 1, '1002', 'Brack Bank', 'asset', NULL, 1, '2026-03-24 19:10:19', '2026-03-24 19:10:19', 'bank'),
(4, 1, '5001', 'Rent', 'expense', NULL, 1, '2026-03-24 19:32:55', '2026-03-24 19:32:55', NULL),
(5, 1, '5002', 'Office Expense', 'expense', NULL, 1, '2026-03-27 10:36:30', '2026-03-27 10:36:30', NULL),
(8, 1, '5003', 'Office Expense', 'expense', NULL, 1, '2026-03-27 10:36:31', '2026-03-27 10:36:31', NULL),
(9, 1, '1003', 'bkash', 'asset', NULL, 1, '2026-03-27 11:56:32', '2026-03-27 11:56:32', 'mfs'),
(10, 1, '1004', 'Nagad', 'asset', NULL, 1, '2026-03-27 11:56:44', '2026-03-27 11:56:44', 'mfs'),
(11, 1, '5004', 'Office Supplies', 'expense', NULL, 1, '2026-03-27 13:50:00', '2026-03-27 13:50:00', NULL),
(12, 1, '1000', 'Cash in Hand', 'asset', NULL, 0, '2026-04-03 08:31:01', '2026-04-03 09:38:38', NULL),
(15, 1, '4010', 'Custom Income Revenue', 'revenue', NULL, 1, '2026-04-03 09:56:30', '2026-04-03 09:56:30', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `applicants`
--

CREATE TABLE `applicants` (
  `id` int(11) NOT NULL,
  `job_posting_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `resume_url` varchar(500) DEFAULT NULL,
  `cover_letter` text DEFAULT NULL,
  `stage` enum('applied','screening','interview','offer','hired','rejected') DEFAULT 'applied',
  `rating` int(11) DEFAULT 0,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `applicants`
--

INSERT INTO `applicants` (`id`, `job_posting_id`, `name`, `email`, `phone`, `resume_url`, `cover_letter`, `stage`, `rating`, `notes`, `created_at`, `updated_at`) VALUES
(1, 1, 'Tuhin', 'xyz@gmail.com', '01871186562', NULL, '4544', 'hired', 0, NULL, '2026-04-05 15:20:05', '2026-04-05 15:20:15');

-- --------------------------------------------------------

--
-- Table structure for table `assets`
--

CREATE TABLE `assets` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('hardware','furniture','appliance','stationery','other') DEFAULT 'hardware',
  `serial_no` varchar(255) DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT 0.00,
  `status` enum('active','maintenance','retired','lost') DEFAULT 'active',
  `last_maintained` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `student_id` int(11) DEFAULT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `status` enum('present','absent','late','leave') DEFAULT 'absent',
  `method` enum('manual','qr') DEFAULT 'manual',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `entity` varchar(255) NOT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `old_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_value`)),
  `new_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_value`)),
  `ip_address` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `user_id`, `branch_id`, `action`, `entity`, `entity_id`, `old_value`, `new_value`, `ip_address`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'create', 'LiquidityMovement', 1, NULL, '{\"previous_balance\":0,\"new_balance\":0,\"actual_balance\":0,\"variance_amount\":0,\"id\":1,\"account_id\":1,\"related_account_id\":3,\"movement_date\":\"2026-03-27\",\"transaction_type\":\"transfer_out\",\"direction\":\"outflow\",\"amount\":50000,\"reference\":\"TRF-1774642040039\",\"remarks\":\"transfer to saving\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1774642040039\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-27T20:07:20.479Z\",\"createdAt\":\"2026-03-27T20:07:20.479Z\"}', '::ffff:127.0.0.1', '2026-03-27 20:07:21', '2026-03-27 20:07:21'),
(2, 1, 1, 'create', 'LiquidityMovement', 2, NULL, '{\"previous_balance\":0,\"new_balance\":0,\"actual_balance\":0,\"variance_amount\":0,\"id\":2,\"account_id\":3,\"related_account_id\":1,\"movement_date\":\"2026-03-27\",\"transaction_type\":\"transfer_in\",\"direction\":\"inflow\",\"amount\":50000,\"reference\":\"TRF-1774642040039\",\"remarks\":\"transfer to saving\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1774642040039\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-27T20:07:21.708Z\",\"createdAt\":\"2026-03-27T20:07:21.708Z\"}', '::ffff:127.0.0.1', '2026-03-27 20:07:21', '2026-03-27 20:07:21'),
(3, 1, 1, 'create', 'LiquidityMovement', 3, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":3,\"account_id\":1,\"movement_date\":\"2026-03-28\",\"transaction_type\":\"collection\",\"direction\":\"inflow\",\"amount\":50000,\"reference\":null,\"remarks\":\"Manual collection entry\",\"source_model\":\"ManualEntry\",\"source_id\":null,\"branch_id\":1,\"previous_balance\":-57000,\"new_balance\":-7000,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-27T20:14:54.094Z\",\"createdAt\":\"2026-03-27T20:14:54.094Z\"}', '::ffff:127.0.0.1', '2026-03-27 20:14:54', '2026-03-27 20:14:54'),
(4, 1, 1, 'create', 'LiquidityMovement', 4, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":4,\"account_id\":1,\"related_account_id\":3,\"movement_date\":\"2026-03-27\",\"transaction_type\":\"transfer_out\",\"direction\":\"outflow\",\"amount\":81000,\"reference\":\"TRF-1774645127474\",\"remarks\":\"cash to bank\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1774645127474\",\"branch_id\":1,\"previous_balance\":-57000,\"new_balance\":-138000,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-27T20:58:48.482Z\",\"createdAt\":\"2026-03-27T20:58:48.482Z\"}', '::ffff:127.0.0.1', '2026-03-27 20:58:48', '2026-03-27 20:58:48'),
(5, 1, 1, 'create', 'LiquidityMovement', 5, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":5,\"account_id\":3,\"related_account_id\":1,\"movement_date\":\"2026-03-27\",\"transaction_type\":\"transfer_in\",\"direction\":\"inflow\",\"amount\":81000,\"reference\":\"TRF-1774645127474\",\"remarks\":\"cash to bank\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1774645127474\",\"branch_id\":1,\"previous_balance\":50000,\"new_balance\":131000,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-27T20:58:50.185Z\",\"createdAt\":\"2026-03-27T20:58:50.185Z\"}', '::ffff:127.0.0.1', '2026-03-27 20:58:50', '2026-03-27 20:58:50'),
(6, 1, 1, 'create', 'LiquidityMovement', 6, NULL, '{\"id\":6,\"account_id\":1,\"movement_date\":\"2026-03-28\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":-88000,\"new_balance\":-88000,\"actual_balance\":0,\"variance_amount\":88000,\"reference\":\"CLOSE-2026-03-28\",\"remarks\":\"Closing submitted for CASH-HQ\",\"reason\":\"nothing\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-27T20:59:50.041Z\",\"createdAt\":\"2026-03-27T20:59:50.041Z\"}', '::ffff:127.0.0.1', '2026-03-27 20:59:50', '2026-03-27 20:59:50'),
(7, 1, 1, 'create', 'LiquidityMovement', 7, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":7,\"account_id\":9,\"movement_date\":\"2026-03-28\",\"transaction_type\":\"opening_balance\",\"direction\":\"inflow\",\"amount\":15000,\"reference\":\"OPEN-2026-03-28\",\"remarks\":\"Opening balance set to 15000\",\"reason\":\"opening balance\",\"branch_id\":1,\"previous_balance\":0,\"new_balance\":15000,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-27T21:02:04.575Z\",\"createdAt\":\"2026-03-27T21:02:04.575Z\"}', '::ffff:127.0.0.1', '2026-03-27 21:02:05', '2026-03-27 21:02:05'),
(8, 1, 1, 'create', 'LiquidityMovement', 8, NULL, '{\"id\":8,\"account_id\":9,\"movement_date\":\"2026-03-28\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":15000,\"new_balance\":15000,\"actual_balance\":10000,\"variance_amount\":-5000,\"reference\":\"CLOSE-2026-03-28\",\"remarks\":\"Closing submitted for bkash\",\"reason\":\"5000 cost charge\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-27T21:06:17.306Z\",\"createdAt\":\"2026-03-27T21:06:17.306Z\"}', '::ffff:127.0.0.1', '2026-03-27 21:06:17', '2026-03-27 21:06:17'),
(9, 1, 1, 'create', 'LiquidityMovement', 9, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":9,\"account_id\":9,\"related_account_id\":3,\"movement_date\":\"2026-03-27\",\"transaction_type\":\"transfer_out\",\"direction\":\"outflow\",\"amount\":30000,\"reference\":\"TRF-1774645710100\",\"remarks\":\"txid 9934\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1774645710100\",\"branch_id\":1,\"previous_balance\":0,\"new_balance\":-30000,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-27T21:08:31.109Z\",\"createdAt\":\"2026-03-27T21:08:31.109Z\"}', '::ffff:127.0.0.1', '2026-03-27 21:08:31', '2026-03-27 21:08:31'),
(10, 1, 1, 'create', 'LiquidityMovement', 10, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":10,\"account_id\":3,\"related_account_id\":9,\"movement_date\":\"2026-03-27\",\"transaction_type\":\"transfer_in\",\"direction\":\"inflow\",\"amount\":30000,\"reference\":\"TRF-1774645710100\",\"remarks\":\"txid 9934\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1774645710100\",\"branch_id\":1,\"previous_balance\":131000,\"new_balance\":161000,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-27T21:08:32.815Z\",\"createdAt\":\"2026-03-27T21:08:32.815Z\"}', '::ffff:127.0.0.1', '2026-03-27 21:08:33', '2026-03-27 21:08:33'),
(11, 1, 1, 'create', 'LiquidityMovement', 11, NULL, '{\"id\":11,\"account_id\":1,\"movement_date\":\"2026-03-28\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":-88000,\"new_balance\":-88000,\"actual_balance\":10000,\"variance_amount\":98000,\"reference\":\"CLOSE-2026-03-28\",\"remarks\":\"Closing submitted for CASH-HQ\",\"reason\":\"today closing\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-27T21:14:20.258Z\",\"createdAt\":\"2026-03-27T21:14:20.258Z\"}', '::ffff:127.0.0.1', '2026-03-27 21:14:20', '2026-03-27 21:14:20'),
(12, 1, 1, 'create', 'LiquidityMovement', 12, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":12,\"account_id\":1,\"movement_date\":\"2026-03-28\",\"transaction_type\":\"opening_adjustment\",\"direction\":\"inflow\",\"amount\":138000,\"reference\":\"OPEN-2026-03-28\",\"remarks\":\"Opening balance set to 0\",\"reason\":\"start with zero\",\"branch_id\":1,\"previous_balance\":-88000,\"new_balance\":50000,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-27T21:15:36.467Z\",\"createdAt\":\"2026-03-27T21:15:36.467Z\"}', '::ffff:127.0.0.1', '2026-03-27 21:15:36', '2026-03-27 21:15:36'),
(13, 1, 1, 'create', 'LiquidityMovement', 13, NULL, '{\"id\":13,\"account_id\":1,\"movement_date\":\"2026-03-28\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":50000,\"new_balance\":50000,\"actual_balance\":5000,\"variance_amount\":-45000,\"reference\":\"CLOSE-2026-03-28\",\"remarks\":\"Closing submitted for CASH-HQ\",\"reason\":\"10k count\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-27T21:16:06.828Z\",\"createdAt\":\"2026-03-27T21:16:06.828Z\"}', '::ffff:127.0.0.1', '2026-03-27 21:16:07', '2026-03-27 21:16:07'),
(14, 1, 1, 'create', 'LiquidityMovement', 14, NULL, '{\"id\":14,\"account_id\":1,\"movement_date\":\"2026-03-28\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":50000,\"new_balance\":50000,\"actual_balance\":0,\"variance_amount\":-50000,\"reference\":\"CLOSE-2026-03-28\",\"remarks\":\"Closing submitted for CASH-HQ\",\"reason\":\"20k check\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-27T21:38:07.010Z\",\"createdAt\":\"2026-03-27T21:38:07.010Z\"}', '::ffff:127.0.0.1', '2026-03-27 21:38:07', '2026-03-27 21:38:07'),
(15, 1, 1, 'create', 'LiquidityMovement', 15, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":15,\"account_id\":1,\"movement_date\":\"2026-03-29\",\"transaction_type\":\"opening_balance\",\"direction\":\"outflow\",\"amount\":50000,\"reference\":\"OPEN-2026-03-29\",\"remarks\":\"Opening balance set to 0\",\"reason\":\"set zero\",\"branch_id\":1,\"previous_balance\":50000,\"new_balance\":0,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-27T21:39:02.855Z\",\"createdAt\":\"2026-03-27T21:39:02.855Z\"}', '::ffff:127.0.0.1', '2026-03-27 21:39:03', '2026-03-27 21:39:03'),
(16, 1, 1, 'create', 'LiquidityMovement', 16, NULL, '{\"id\":16,\"account_id\":1,\"movement_date\":\"2026-03-29\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":50000,\"new_balance\":50000,\"actual_balance\":50000,\"variance_amount\":0,\"reference\":\"CLOSE-2026-03-29\",\"remarks\":\"Closing submitted for CASH-HQ\",\"reason\":\"50k check\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-27T21:40:10.946Z\",\"createdAt\":\"2026-03-27T21:40:10.946Z\"}', '::ffff:127.0.0.1', '2026-03-27 21:40:11', '2026-03-27 21:40:11'),
(17, 1, 1, 'create', 'LiquidityMovement', 17, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":17,\"account_id\":1,\"movement_date\":\"2026-03-28\",\"transaction_type\":\"opening_adjustment\",\"direction\":\"inflow\",\"amount\":241000,\"reference\":\"OPEN-2026-03-28\",\"remarks\":\"Opening balance set to 103000\",\"reason\":\"ch#\",\"branch_id\":1,\"previous_balance\":50000,\"new_balance\":291000,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-27T21:42:30.491Z\",\"createdAt\":\"2026-03-27T21:42:30.491Z\"}', '::ffff:127.0.0.1', '2026-03-27 21:42:30', '2026-03-27 21:42:30'),
(18, 1, 1, 'create', 'LiquidityMovement', 18, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":18,\"account_id\":1,\"movement_date\":\"2026-03-27\",\"transaction_type\":\"opening_balance\",\"direction\":\"inflow\",\"amount\":5000,\"reference\":\"OPEN-2026-03-27\",\"remarks\":\"Opening balance set to 0\",\"reason\":\"set zero\",\"branch_id\":1,\"previous_balance\":-138000,\"new_balance\":-133000,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-27T21:43:38.256Z\",\"createdAt\":\"2026-03-27T21:43:38.256Z\"}', '::ffff:127.0.0.1', '2026-03-27 21:43:38', '2026-03-27 21:43:38'),
(19, 1, 1, 'create', 'LiquidityMovement', 19, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":19,\"account_id\":1,\"movement_date\":\"2026-03-28\",\"transaction_type\":\"opening_adjustment\",\"direction\":\"inflow\",\"amount\":138000,\"reference\":\"OPEN-2026-03-28\",\"remarks\":\"Opening balance set to 5000\",\"reason\":\"io\'\",\"branch_id\":1,\"previous_balance\":296000,\"new_balance\":434000,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-28T18:52:17.380Z\",\"createdAt\":\"2026-03-28T18:52:17.380Z\"}', '::ffff:127.0.0.1', '2026-03-28 18:52:17', '2026-03-28 18:52:17'),
(20, 1, 1, 'create', 'LiquidityMovement', 20, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":20,\"account_id\":1,\"related_account_id\":3,\"movement_date\":\"2026-03-28\",\"transaction_type\":\"transfer_out\",\"direction\":\"outflow\",\"amount\":420000,\"reference\":\"TRF-1774724086718\",\"remarks\":\"CASH-HQ -> Brack Bank\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1774724086718\",\"branch_id\":1,\"previous_balance\":434000,\"new_balance\":14000,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-28T18:54:48.119Z\",\"createdAt\":\"2026-03-28T18:54:48.119Z\"}', '::ffff:127.0.0.1', '2026-03-28 18:54:48', '2026-03-28 18:54:48'),
(21, 1, 1, 'create', 'LiquidityMovement', 21, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":21,\"account_id\":3,\"related_account_id\":1,\"movement_date\":\"2026-03-28\",\"transaction_type\":\"transfer_in\",\"direction\":\"inflow\",\"amount\":420000,\"reference\":\"TRF-1774724086718\",\"remarks\":\"CASH-HQ -> Brack Bank\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1774724086718\",\"branch_id\":1,\"previous_balance\":161000,\"new_balance\":581000,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-28T18:54:50.029Z\",\"createdAt\":\"2026-03-28T18:54:50.029Z\"}', '::ffff:127.0.0.1', '2026-03-28 18:54:50', '2026-03-28 18:54:50'),
(22, 1, 1, 'create', 'LiquidityMovement', 22, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":22,\"account_id\":1,\"related_account_id\":3,\"movement_date\":\"2026-03-28\",\"transaction_type\":\"transfer_out\",\"direction\":\"outflow\",\"amount\":67000,\"reference\":\"TRF-1774724154588\",\"remarks\":\"CASH-HQ -> Brack Bank\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1774724154588\",\"branch_id\":1,\"previous_balance\":14000,\"new_balance\":-53000,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-28T18:55:55.909Z\",\"createdAt\":\"2026-03-28T18:55:55.909Z\"}', '::ffff:127.0.0.1', '2026-03-28 18:55:56', '2026-03-28 18:55:56'),
(23, 1, 1, 'create', 'LiquidityMovement', 23, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":23,\"account_id\":3,\"related_account_id\":1,\"movement_date\":\"2026-03-28\",\"transaction_type\":\"transfer_in\",\"direction\":\"inflow\",\"amount\":67000,\"reference\":\"TRF-1774724154588\",\"remarks\":\"CASH-HQ -> Brack Bank\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1774724154588\",\"branch_id\":1,\"previous_balance\":581000,\"new_balance\":648000,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-28T18:55:57.830Z\",\"createdAt\":\"2026-03-28T18:55:57.830Z\"}', '::ffff:127.0.0.1', '2026-03-28 18:55:58', '2026-03-28 18:55:58'),
(24, 1, 1, 'create', 'LiquidityMovement', 24, NULL, '{\"id\":24,\"account_id\":1,\"movement_date\":\"2026-03-28\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":-53000,\"new_balance\":-53000,\"actual_balance\":0,\"variance_amount\":53000,\"reference\":\"CLOSE-2026-03-28\",\"remarks\":\"Closing submitted for CASH-HQ\",\"reason\":\"Today Closing is zero\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-28T18:57:02.023Z\",\"createdAt\":\"2026-03-28T18:57:02.023Z\"}', '::ffff:127.0.0.1', '2026-03-28 18:57:02', '2026-03-28 18:57:02'),
(25, 1, 1, 'create', 'LiquidityMovement', 25, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":25,\"account_id\":1,\"movement_date\":\"2026-03-29\",\"transaction_type\":\"opening_adjustment\",\"direction\":\"inflow\",\"amount\":58000,\"reference\":\"OPEN-2026-03-29\",\"remarks\":\"Opening balance set to 5000\",\"reason\":\"check without evidence why 5000?\",\"branch_id\":1,\"previous_balance\":-103000,\"new_balance\":-45000,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-28T18:57:56.814Z\",\"createdAt\":\"2026-03-28T18:57:56.814Z\"}', '::ffff:127.0.0.1', '2026-03-28 18:57:57', '2026-03-28 18:57:57'),
(26, 1, 1, 'create', 'LiquidityMovement', 26, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":26,\"account_id\":1,\"related_account_id\":3,\"movement_date\":\"2026-03-29\",\"transaction_type\":\"transfer_out\",\"direction\":\"outflow\",\"amount\":58000,\"reference\":\"TRF-1774724364800\",\"remarks\":\"CASH-HQ -> Brack Bank\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1774724364800\",\"branch_id\":1,\"previous_balance\":-45000,\"new_balance\":-103000,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-28T18:59:26.033Z\",\"createdAt\":\"2026-03-28T18:59:26.033Z\"}', '::ffff:127.0.0.1', '2026-03-28 18:59:26', '2026-03-28 18:59:26'),
(27, 1, 1, 'create', 'LiquidityMovement', 27, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":27,\"account_id\":3,\"related_account_id\":1,\"movement_date\":\"2026-03-29\",\"transaction_type\":\"transfer_in\",\"direction\":\"inflow\",\"amount\":58000,\"reference\":\"TRF-1774724364800\",\"remarks\":\"CASH-HQ -> Brack Bank\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1774724364800\",\"branch_id\":1,\"previous_balance\":648000,\"new_balance\":706000,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-28T18:59:27.943Z\",\"createdAt\":\"2026-03-28T18:59:27.943Z\"}', '::ffff:127.0.0.1', '2026-03-28 18:59:28', '2026-03-28 18:59:28'),
(28, 1, 1, 'create', 'LiquidityMovement', 28, NULL, '{\"id\":28,\"account_id\":1,\"movement_date\":\"2026-03-29\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":-103000,\"new_balance\":-103000,\"actual_balance\":0,\"variance_amount\":103000,\"reference\":\"CLOSE-2026-03-29\",\"remarks\":\"Closing submitted for CASH-HQ\",\"reason\":\"nothing balance\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-28T19:00:17.154Z\",\"createdAt\":\"2026-03-28T19:00:17.154Z\"}', '::ffff:127.0.0.1', '2026-03-28 19:00:17', '2026-03-28 19:00:17'),
(29, 1, 1, 'create', 'LiquidityMovement', 29, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":29,\"account_id\":1,\"movement_date\":\"2026-03-30\",\"transaction_type\":\"opening_balance\",\"direction\":\"inflow\",\"amount\":103100,\"reference\":\"OPEN-2026-03-30\",\"remarks\":\"Opening balance set to 100\",\"reason\":\"stest\",\"branch_id\":1,\"previous_balance\":-103000,\"new_balance\":100,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-28T19:01:15.880Z\",\"createdAt\":\"2026-03-28T19:01:15.880Z\"}', '::ffff:127.0.0.1', '2026-03-28 19:01:16', '2026-03-28 19:01:16'),
(30, 1, 1, 'create', 'LiquidityMovement', 30, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":30,\"account_id\":1,\"related_account_id\":3,\"movement_date\":\"2026-03-30\",\"transaction_type\":\"transfer_out\",\"direction\":\"outflow\",\"amount\":103100,\"reference\":\"TRF-1774726599862\",\"remarks\":\"zero\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1774726599862\",\"branch_id\":1,\"previous_balance\":5100,\"new_balance\":-98000,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-28T19:36:41.834Z\",\"createdAt\":\"2026-03-28T19:36:41.834Z\"}', '::ffff:127.0.0.1', '2026-03-28 19:36:42', '2026-03-28 19:36:42'),
(31, 1, 1, 'create', 'LiquidityMovement', 31, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":31,\"account_id\":3,\"related_account_id\":1,\"movement_date\":\"2026-03-30\",\"transaction_type\":\"transfer_in\",\"direction\":\"inflow\",\"amount\":103100,\"reference\":\"TRF-1774726599862\",\"remarks\":\"zero\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1774726599862\",\"branch_id\":1,\"previous_balance\":706000,\"new_balance\":809100,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-28T19:36:44.406Z\",\"createdAt\":\"2026-03-28T19:36:44.406Z\"}', '::ffff:127.0.0.1', '2026-03-28 19:36:44', '2026-03-28 19:36:44'),
(32, 1, 1, 'create', 'LiquidityMovement', 32, NULL, '{\"id\":32,\"account_id\":1,\"movement_date\":\"2026-03-30\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":-98000,\"new_balance\":-98000,\"actual_balance\":0,\"variance_amount\":98000,\"reference\":\"CLOSE-2026-03-30\",\"remarks\":\"Closing submitted for CASH-HQ\",\"reason\":\"submit zero\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-28T19:39:30.751Z\",\"createdAt\":\"2026-03-28T19:39:30.751Z\"}', '::ffff:127.0.0.1', '2026-03-28 19:39:31', '2026-03-28 19:39:31'),
(33, 1, 1, 'create', 'LiquidityMovement', 33, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":33,\"account_id\":1,\"movement_date\":\"2026-03-31\",\"transaction_type\":\"opening_balance\",\"direction\":\"inflow\",\"amount\":98000,\"reference\":\"OPEN-2026-03-31\",\"remarks\":\"Opening balance set to 0\",\"reason\":\"test\",\"branch_id\":1,\"previous_balance\":-98000,\"new_balance\":0,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-28T19:40:37.764Z\",\"createdAt\":\"2026-03-28T19:40:37.764Z\"}', '::ffff:127.0.0.1', '2026-03-28 19:40:38', '2026-03-28 19:40:38'),
(34, 1, 1, 'create', 'LiquidityMovement', 34, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":34,\"account_id\":1,\"related_account_id\":3,\"movement_date\":\"2026-03-31\",\"transaction_type\":\"transfer_out\",\"direction\":\"outflow\",\"amount\":98000,\"reference\":\"TRF-1774726920174\",\"remarks\":\"tt\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1774726920174\",\"branch_id\":1,\"previous_balance\":0,\"new_balance\":-98000,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-28T19:42:01.360Z\",\"createdAt\":\"2026-03-28T19:42:01.360Z\"}', '::ffff:127.0.0.1', '2026-03-28 19:42:01', '2026-03-28 19:42:01'),
(35, 1, 1, 'create', 'LiquidityMovement', 35, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":35,\"account_id\":3,\"related_account_id\":1,\"movement_date\":\"2026-03-31\",\"transaction_type\":\"transfer_in\",\"direction\":\"inflow\",\"amount\":98000,\"reference\":\"TRF-1774726920174\",\"remarks\":\"tt\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1774726920174\",\"branch_id\":1,\"previous_balance\":809100,\"new_balance\":907100,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-28T19:42:03.288Z\",\"createdAt\":\"2026-03-28T19:42:03.288Z\"}', '::ffff:127.0.0.1', '2026-03-28 19:42:03', '2026-03-28 19:42:03'),
(36, 1, 1, 'create', 'LiquidityMovement', 37, NULL, '{\"id\":37,\"account_id\":1,\"movement_date\":\"2026-03-31\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":-45000,\"new_balance\":-45000,\"actual_balance\":-45000,\"variance_amount\":0,\"reference\":\"CLOSE-2026-03-31\",\"remarks\":\"Closing submitted for CASH-HQ\",\"reason\":\"sub mit closing\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-03-28T19:46:59.431Z\",\"createdAt\":\"2026-03-28T19:46:59.431Z\"}', '::ffff:127.0.0.1', '2026-03-28 19:46:59', '2026-03-28 19:46:59'),
(37, 1, 1, 'create', 'LiquidityMovement', 38, NULL, '{\"id\":38,\"account_id\":1,\"movement_date\":\"2026-04-03\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":-45000,\"new_balance\":-45000,\"actual_balance\":-45000,\"variance_amount\":0,\"reference\":\"CLOSE-2026-04-03\",\"remarks\":\"Closing submitted for CASH-HQ\",\"reason\":\"\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-04-02T18:48:05.088Z\",\"createdAt\":\"2026-04-02T18:48:05.088Z\"}', '::ffff:127.0.0.1', '2026-04-02 18:48:05', '2026-04-02 18:48:05'),
(38, 1, 1, 'create', 'LiquidityMovement', 39, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":39,\"account_id\":1,\"related_account_id\":3,\"movement_date\":\"2026-04-03\",\"transaction_type\":\"transfer_out\",\"direction\":\"outflow\",\"amount\":423000,\"reference\":\"TRF-1775158388155\",\"remarks\":\"CASH-HQ -> Brack Bank\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1775158388155\",\"branch_id\":1,\"previous_balance\":-50000,\"new_balance\":-473000,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-04-02T19:33:08.436Z\",\"createdAt\":\"2026-04-02T19:33:08.436Z\"}', '::ffff:127.0.0.1', '2026-04-02 19:33:08', '2026-04-02 19:33:08'),
(39, 1, 1, 'create', 'LiquidityMovement', 40, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":40,\"account_id\":3,\"related_account_id\":1,\"movement_date\":\"2026-04-03\",\"transaction_type\":\"transfer_in\",\"direction\":\"inflow\",\"amount\":423000,\"reference\":\"TRF-1775158388155\",\"remarks\":\"CASH-HQ -> Brack Bank\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1775158388155\",\"branch_id\":1,\"previous_balance\":907100,\"new_balance\":1330100,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-04-02T19:33:08.859Z\",\"createdAt\":\"2026-04-02T19:33:08.859Z\"}', '::ffff:127.0.0.1', '2026-04-02 19:33:08', '2026-04-02 19:33:08'),
(40, 1, 1, 'create', 'LiquidityMovement', 41, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":41,\"account_id\":3,\"related_account_id\":1,\"movement_date\":\"2026-04-03\",\"transaction_type\":\"transfer_out\",\"direction\":\"outflow\",\"amount\":5000,\"reference\":\"TRF-1775158993773\",\"remarks\":\"Brack Bank -> CASH-HQ\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1775158993773\",\"branch_id\":1,\"previous_balance\":1330100,\"new_balance\":1325100,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-04-02T19:43:14.048Z\",\"createdAt\":\"2026-04-02T19:43:14.048Z\"}', '::ffff:127.0.0.1', '2026-04-02 19:43:14', '2026-04-02 19:43:14'),
(41, 1, 1, 'create', 'LiquidityMovement', 42, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":42,\"account_id\":1,\"related_account_id\":3,\"movement_date\":\"2026-04-03\",\"transaction_type\":\"transfer_in\",\"direction\":\"inflow\",\"amount\":5000,\"reference\":\"TRF-1775158993773\",\"remarks\":\"Brack Bank -> CASH-HQ\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1775158993773\",\"branch_id\":1,\"previous_balance\":0,\"new_balance\":5000,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-04-02T19:43:14.470Z\",\"createdAt\":\"2026-04-02T19:43:14.470Z\"}', '::ffff:127.0.0.1', '2026-04-02 19:43:14', '2026-04-02 19:43:14'),
(42, 1, 1, 'create', 'LiquidityMovement', 43, NULL, '{\"id\":43,\"account_id\":1,\"movement_date\":\"2026-04-03\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":4000,\"new_balance\":4000,\"actual_balance\":4000,\"variance_amount\":0,\"reference\":\"CLOSE-2026-04-03\",\"remarks\":\"Closing submitted for CASH-HQ\",\"reason\":\"\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-04-02T19:45:13.852Z\",\"createdAt\":\"2026-04-02T19:45:13.852Z\"}', '::ffff:127.0.0.1', '2026-04-02 19:45:13', '2026-04-02 19:45:13'),
(43, 1, 1, 'create', 'LiquidityMovement', 44, NULL, '{\"id\":44,\"account_id\":10,\"movement_date\":\"2026-04-03\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":23500,\"new_balance\":23500,\"actual_balance\":23500,\"variance_amount\":0,\"reference\":\"CLOSE-2026-04-03\",\"remarks\":\"Closing submitted for Nagad\",\"reason\":\"\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-04-03T10:00:46.331Z\",\"createdAt\":\"2026-04-03T10:00:46.331Z\"}', '::ffff:127.0.0.1', '2026-04-03 10:00:46', '2026-04-03 10:00:46');

-- --------------------------------------------------------

--
-- Table structure for table `automation_rules`
--

CREATE TABLE `automation_rules` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `trigger_type` enum('fee_overdue','student_absent','new_lead','batch_full','enrollment_confirmed') NOT NULL,
  `action_type` enum('send_sms','send_whatsapp','create_notification','send_email') NOT NULL,
  `template` text NOT NULL COMMENT 'Supports placeholders like {student_name}, {amount}, {date}',
  `is_active` tinyint(1) DEFAULT 1,
  `config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional configuration like delay in hours' CHECK (json_valid(`config`)),
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `automation_rules`
--

INSERT INTO `automation_rules` (`id`, `branch_id`, `name`, `trigger_type`, `action_type`, `template`, `is_active`, `config`, `created_at`, `updated_at`) VALUES
(1, 1, 'New Lead Welcome', 'new_lead', 'send_whatsapp', 'Hi {name}, thanks for inquiring at Language Academy! Our counselor will call you soon.', 1, NULL, '2026-03-18 12:04:01', '2026-03-18 12:04:01'),
(2, 1, 'Fee Overdue Alert', 'fee_overdue', 'send_sms', 'Dear {student_name}, your fee of {amount} is overdue since {date}. Please settle it ASAP.', 1, NULL, '2026-03-18 12:04:01', '2026-03-18 12:04:01');

-- --------------------------------------------------------

--
-- Table structure for table `bank_accounts`
--

CREATE TABLE `bank_accounts` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `branch_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `account_name` varchar(255) NOT NULL,
  `account_number` varchar(255) NOT NULL,
  `bank_name` varchar(255) NOT NULL,
  `currency` varchar(255) DEFAULT 'BDT',
  `balance` decimal(15,2) DEFAULT 0.00,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bank_account_ledger_maps`
--

CREATE TABLE `bank_account_ledger_maps` (
  `id` int(11) NOT NULL,
  `bank_account_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `account_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `channel` enum('cash','bank','bkash','nagad','card','bank_transfer','website') NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bank_statement_lines`
--

CREATE TABLE `bank_statement_lines` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `branch_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `bank_account_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `date` date NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `status` enum('unmatched','matched','ignored') DEFAULT 'unmatched',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `batches`
--

CREATE TABLE `batches` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `code` varchar(255) NOT NULL,
  `trainer_id` int(11) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `status` enum('enrolling','active','starting_soon','completed') DEFAULT 'enrolling',
  `capacity` int(11) DEFAULT NULL,
  `schedule` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`schedule`)),
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `enrolled` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `batches`
--

INSERT INTO `batches` (`id`, `branch_id`, `course_id`, `code`, `trainer_id`, `name`, `status`, `capacity`, `schedule`, `start_date`, `end_date`, `created_at`, `updated_at`, `enrolled`) VALUES
(1, 1, 1, 'PTE-A3-MORNING', 1, 'PTE Morning Batch A3', 'active', 20, '\"Mon, Wed, Fri\"', NULL, NULL, '2026-03-17 12:02:11', '2026-04-02 22:11:05', 3),
(2, 2, 2, 'IELTS-E2-EVENING', 2, 'IELTS Evening Batch E2', '', 15, '\"Tue, Thu\"', NULL, NULL, '2026-03-17 12:02:12', '2026-03-17 12:02:12', 0),
(3, 1, 1, 'PTE-943', 1, 'PTE EVENING', '', 20, '\"MON, 9PM\"', '2026-03-27', '2026-03-28', '2026-03-27 09:47:28', '2026-03-27 09:47:28', 0),
(4, 1, 3, 'PTE-55', 1, 'EVENING ONLINE', 'enrolling', 40, '{\"days\":[\"tue\",\"mon\",\"thu\",\"sun\"],\"start_time\":\"18:00\",\"duration_minutes\":90,\"end_time\":\"19:30\"}', '2026-04-12', '2026-06-12', '2026-04-01 22:56:31', '2026-04-01 22:56:31', 0);

-- --------------------------------------------------------

--
-- Table structure for table `blog_posts`
--

CREATE TABLE `blog_posts` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `author_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `excerpt` varchar(255) DEFAULT NULL,
  `content` text NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `is_published` tinyint(1) DEFAULT 0,
  `published_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `branches`
--

CREATE TABLE `branches` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(255) NOT NULL,
  `type` enum('head','branch') DEFAULT 'branch',
  `address` text DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `manager_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `branches`
--

INSERT INTO `branches` (`id`, `name`, `code`, `type`, `address`, `phone`, `email`, `is_active`, `manager_id`, `created_at`, `updated_at`) VALUES
(1, 'Dhanmondi Branch (HQ)', 'DHN-HQ', 'head', 'SEL SUFI SQUARE, Unit: 1104, Level: 11, Plot: 58, Road: 16 (New) / 27 (Old), Dhanmondi R/A, Dhaka 1209', '+8801700000001', 'info@languageacademy.com.bd', 1, NULL, '2026-03-17 12:02:10', '2026-04-05 17:57:20'),
(2, 'Uttara Branch (Removed)', 'DHK-02', 'branch', 'Sector 7, Uttara', '+8801700000002', NULL, 0, NULL, '2026-03-17 12:02:10', '2026-04-05 18:01:50'),
(5, 'Test-1', 'TEST-01', 'branch', 'Dhaka', '01871186562', 'aarsayem@gmail.com', 0, 55, '2026-04-05 17:56:46', '2026-04-05 18:01:50');

-- --------------------------------------------------------

--
-- Table structure for table `budgets`
--

CREATE TABLE `budgets` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `period` enum('monthly','quarterly','yearly') DEFAULT 'monthly',
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `allocated` decimal(14,2) NOT NULL,
  `spent` decimal(14,2) DEFAULT 0.00,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `campaign_templates`
--

CREATE TABLE `campaign_templates` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `channel` enum('email','whatsapp','sms') DEFAULT 'email',
  `subject` varchar(255) DEFAULT NULL COMMENT 'Email subject or WhatsApp template name',
  `body` text NOT NULL,
  `status` enum('draft','sent','scheduled') DEFAULT 'draft',
  `target_audience` enum('all_leads','new_leads','interested','trial','lost','all_contacts') DEFAULT 'all_leads',
  `sent_at` datetime DEFAULT NULL,
  `sent_count` int(11) DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `attachment_url` varchar(255) DEFAULT NULL COMMENT 'Optional URL to an attachment file'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contacts`
--

CREATE TABLE `contacts` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL COMMENT 'Company or institution name',
  `designation` varchar(255) DEFAULT NULL,
  `source` varchar(255) DEFAULT NULL COMMENT 'How they found us: Facebook, Walk-in, Referral, etc.',
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `contacts`
--

INSERT INTO `contacts` (`id`, `branch_id`, `name`, `phone`, `email`, `address`, `company`, `designation`, `source`, `tags`, `notes`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'Sayem', '01999454', 'aarsayem002@gmail.com', NULL, 'al helal', NULL, 'Walk-in', '[]', '', 1, '2026-03-25 10:52:22', '2026-03-25 10:52:22'),
(2, 1, 'Tahsin', '019893', 'test@gmail.com', NULL, NULL, NULL, 'Walk-in', '[]', NULL, 1, '2026-03-27 09:02:28', '2026-03-27 09:02:28'),
(3, 1, 'Sayemto', '932', '', NULL, NULL, NULL, 'Walk-in', '[]', NULL, 1, '2026-03-27 11:29:50', '2026-03-27 11:29:50'),
(4, 1, 'TEST ', '03', 's@g.com', NULL, NULL, NULL, 'Walk-in', '[]', NULL, 1, '2026-03-27 14:27:30', '2026-03-27 14:27:30'),
(5, 1, 'Abdullah Al Sahaj', '034', 'jk@w.com', NULL, NULL, NULL, 'Referral', '[]', NULL, 1, '2026-03-27 17:03:19', '2026-03-27 17:03:19'),
(6, 1, 'Tahsin', '0343', 'ad', NULL, NULL, NULL, 'Walk-in', '[]', NULL, 1, '2026-03-27 17:28:33', '2026-03-27 17:28:33'),
(7, 1, 'Sayem', '01569555', 'business.intech@gmail.com', NULL, NULL, NULL, 'website', '[]', '', 1, '2026-04-02 18:43:20', '2026-04-02 18:43:20'),
(8, 1, 'tre', '', '', NULL, '', NULL, 'Walk-in', '[]', '', 1, '2026-04-02 20:05:10', '2026-04-02 20:05:10'),
(9, 1, 'TEST 51025', '0215', '3@b.com', NULL, NULL, NULL, 'Walk-in', '[]', NULL, 1, '2026-04-05 15:46:50', '2026-04-05 15:46:50'),
(10, 1, 'Jane Doe', '170000000', 'jane@example.com', NULL, NULL, NULL, 'Facebook', '[]', 'Interested in PTE', 1, '2026-04-05 16:06:18', '2026-04-05 16:06:18');

-- --------------------------------------------------------

--
-- Table structure for table `courses`
--

CREATE TABLE `courses` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(255) DEFAULT NULL,
  `base_fee` decimal(12,2) NOT NULL,
  `duration_weeks` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `short_description` varchar(255) DEFAULT NULL,
  `level` enum('beginner','intermediate','advanced') DEFAULT 'beginner',
  `image_url` varchar(255) DEFAULT NULL,
  `instructor_name` varchar(255) DEFAULT NULL,
  `instructor_bio` text DEFAULT NULL,
  `instructor_video_url` varchar(255) DEFAULT NULL,
  `what_you_will_learn` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`what_you_will_learn`)),
  `modules` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`modules`)),
  `tags` varchar(255) DEFAULT NULL,
  `is_published` tinyint(1) DEFAULT 1,
  `status` enum('active','inactive','archived') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `courses`
--

INSERT INTO `courses` (`id`, `branch_id`, `title`, `description`, `category`, `base_fee`, `duration_weeks`, `created_at`, `updated_at`, `slug`, `short_description`, `level`, `image_url`, `instructor_name`, `instructor_bio`, `instructor_video_url`, `what_you_will_learn`, `modules`, `tags`, `is_published`, `status`) VALUES
(1, 1, 'PTE Academic Standard', NULL, 'PTE', 15000.00, 8, '2026-03-17 12:02:11', '2026-04-01 22:49:16', '/', NULL, 'beginner', NULL, NULL, NULL, NULL, '[]', '[]', NULL, 0, 'active'),
(2, 1, 'IELTS Academic Masterclass', NULL, 'IELTS', 12000.00, 10, '2026-03-17 12:02:11', '2026-04-01 23:00:28', NULL, NULL, 'beginner', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'active'),
(3, 1, 'PTE Basic', 'Perfect for students who need a quick refresher. Covers the PTE format over 4 specialized classes, and includes access to our unlimited mock test platform.', 'PTE', 5500.00, 2, '2026-04-01 22:23:17', '2026-04-01 22:23:17', 'pte-basic', '2 Weeks, 4 classes. (Unlimited Mock test Included).', 'beginner', NULL, NULL, NULL, NULL, '[\"Understanding the PTE Exam Format\",\"Quick refresh of core modules: Speaking, Writing, Reading, Listening\",\"Time management strategies\",\"Unlimited Mock tests for confidence building\"]', '[{\"title\":\"Week 1: Foundations\",\"lessons\":[{\"title\":\"Class 1: Speaking & Writing\",\"duration\":\"120\"},{\"title\":\"Class 2: Reading & Listening\",\"duration\":\"120\"}]},{\"title\":\"Week 2: Mock Tests & Reviews\",\"lessons\":[{\"title\":\"Class 3: Assessment\",\"duration\":\"120\"},{\"title\":\"Class 4: Final Tips\",\"duration\":\"120\"}]}]', NULL, 1, 'active'),
(4, 1, 'PTE Core', 'Our most popular standard tier. Gain solid insights over 4 weeks with 8 focused classes, plus unlimited access to live classes and our mock examination platform.', 'PTE', 10500.00, 4, '2026-04-01 22:23:17', '2026-04-01 22:23:17', 'pte-core', '4 Weeks, 8 Classes. (Unlimited Mock test and class access).', 'intermediate', NULL, NULL, NULL, NULL, '[\"Detailed strategies for high-weightage questions\",\"Template utilization for essays and spoken responses\",\"Pronunciation and fluency improvement techniques\",\"Unlimited mock test access with AI scoring\"]', '[{\"title\":\"Week 1-2: Intensive Speaking & Writing\",\"lessons\":[{\"title\":\"Session 1-4\",\"duration\":\"120\"}]},{\"title\":\"Week 3-4: Intensive Reading & Listening\",\"lessons\":[{\"title\":\"Session 5-8\",\"duration\":\"120\"}]}]', NULL, 1, 'active'),
(5, 1, 'PTE Advanced', 'For students aiming for a 79+ superior score. Spend 8 weeks practicing advanced grammar, complex reading passages, and native-level fluency with 16 dedicated classes.', 'PTE', 18000.00, 8, '2026-04-01 22:23:17', '2026-04-01 22:23:17', 'pte-advanced', '8 Weeks, 16 Classes. (Unlimited Mock test and class access).', 'advanced', NULL, NULL, NULL, NULL, '[\"Advanced grammatical structures for maximum points\",\"Handling complex audio cues in listening\",\"Reading fill-in-the-blanks mastery\",\"Weekly one-on-one evaluations\"]', '[{\"title\":\"Month 1: Core Fundamentals & Intermediate Concepts\",\"lessons\":[{\"title\":\"8 Classes on all 4 modules\",\"duration\":\"120\"}]},{\"title\":\"Month 2: Advanced Perfection\",\"lessons\":[{\"title\":\"8 Classes focusing on high-difficulty questions\",\"duration\":\"120\"}]}]', NULL, 1, 'active'),
(6, 1, 'PTE Premium', 'Our flagship 3-month comprehensive package. Enjoy 24 extensive classes that build your English skills from the ground up to advanced PTE superiority.', 'PTE', 25000.00, 12, '2026-04-01 22:23:17', '2026-04-01 22:23:18', 'pte-premium', '12 Weeks, 24 Classes. (Unlimited Mock test and class access).', 'advanced', NULL, NULL, NULL, NULL, '[\"Absolute ground-up fundamentals for struggling speakers\",\"Comprehensive grammar and vocabulary building\",\"AI-driven error correction over 3 months\",\"Complete unlimited access to all platform tools\"]', '[{\"title\":\"Month 1: General English Enhancement\",\"lessons\":[{\"title\":\"8 Classes\",\"duration\":\"120\"}]},{\"title\":\"Month 2: PTE Core Strategy\",\"lessons\":[{\"title\":\"8 Classes\",\"duration\":\"120\"}]},{\"title\":\"Month 3: Advanced Scoring & Mock Trials\",\"lessons\":[{\"title\":\"8 Classes\",\"duration\":\"120\"}]}]', NULL, 1, 'active'),
(7, 1, 'TEST', '', 'IELTS', 15000.00, 12, '2026-04-05 18:00:21', '2026-04-05 18:00:21', 'test', '', 'beginner', '', '', NULL, '', '[]', '[]', NULL, 1, 'active');

-- --------------------------------------------------------

--
-- Table structure for table `crm_activities`
--

CREATE TABLE `crm_activities` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `type` enum('call','email','meeting','demo','whatsapp','note','task') NOT NULL DEFAULT 'note',
  `subject` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `outcome` varchar(255) DEFAULT NULL COMMENT 'What happened: e.g. "Interested, will call back"',
  `due_date` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `is_done` tinyint(1) DEFAULT 0,
  `lead_id` int(11) DEFAULT NULL,
  `contact_id` int(11) DEFAULT NULL,
  `opportunity_id` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `student_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `crm_activities`
--

INSERT INTO `crm_activities` (`id`, `branch_id`, `type`, `subject`, `description`, `outcome`, `due_date`, `completed_at`, `is_done`, `lead_id`, `contact_id`, `opportunity_id`, `created_by`, `created_at`, `updated_at`, `student_id`) VALUES
(1, 1, 'call', 'TEST', 'TEST', NULL, NULL, NULL, 0, 12, NULL, NULL, 1, '2026-03-30 20:22:05', '2026-03-30 20:22:05', NULL),
(2, 1, 'email', 'TRESF', 'Sds', NULL, NULL, NULL, 0, 12, NULL, NULL, 1, '2026-03-30 20:22:10', '2026-03-30 20:22:10', NULL),
(3, 1, 'meeting', 'terdf', 'fdfdf', NULL, NULL, NULL, 0, 12, NULL, NULL, 1, '2026-03-30 20:22:14', '2026-03-30 20:22:14', NULL),
(4, 1, 'email', 'sdssds', 'sdsd', NULL, NULL, NULL, 0, 4, NULL, NULL, 1, '2026-04-05 15:33:56', '2026-04-05 15:33:56', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `branch_id`, `name`, `phone`, `email`, `company`, `address`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'TEST', '', '', '', '', 0, '2026-04-02 23:03:10', '2026-04-03 08:30:43'),
(2, 1, 'das', '', '', '', '', 0, '2026-04-02 23:11:42', '2026-04-03 08:30:41'),
(3, 1, 'TEST', '', '', '', '', 1, '2026-04-03 07:07:56', '2026-04-03 07:07:56'),
(4, 1, 'E2E Customer', '01205060919', NULL, NULL, NULL, 1, '2026-04-03 08:31:00', '2026-04-03 08:31:00');

-- --------------------------------------------------------

--
-- Table structure for table `enrollments`
--

CREATE TABLE `enrollments` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `student_id` int(11) DEFAULT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `total_fee` decimal(12,2) NOT NULL,
  `discount` decimal(12,2) DEFAULT 0.00,
  `paid_amount` decimal(12,2) DEFAULT 0.00,
  `status` enum('paid','partial','pending','overdue','cancelled') DEFAULT 'pending',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `enrollments`
--

INSERT INTO `enrollments` (`id`, `branch_id`, `student_id`, `batch_id`, `total_fee`, `discount`, `paid_amount`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 2, 1, 15000.00, 0.00, 15000.00, 'paid', '2026-03-24 18:22:36', '2026-03-24 19:07:50'),
(2, 1, 3, NULL, 15000.00, 0.00, 15000.00, 'paid', '2026-03-27 09:02:27', '2026-03-27 09:03:17'),
(3, 1, 4, 1, 15000.00, 0.00, 15000.00, 'paid', '2026-03-27 09:45:37', '2026-03-27 09:45:57'),
(4, 1, 5, 3, 15000.00, 0.00, 15000.00, 'paid', '2026-03-27 09:48:13', '2026-03-27 09:50:44'),
(5, 1, 16, 1, 15000.00, 0.00, 15000.00, 'paid', '2026-03-27 11:29:49', '2026-03-27 14:43:09'),
(6, 1, NULL, 3, 15000.00, 0.00, 15000.00, 'paid', '2026-03-27 14:27:27', '2026-03-27 14:45:49'),
(7, 1, 18, NULL, 15000.00, 0.00, 15000.00, 'paid', '2026-03-27 17:03:17', '2026-03-27 17:03:46'),
(8, 1, 19, 3, 15000.00, 0.00, 45000.00, 'paid', '2026-03-27 17:07:58', '2026-03-27 17:30:26'),
(9, 1, 20, 1, 15000.00, 0.00, 15000.00, 'paid', '2026-03-27 17:28:30', '2026-03-27 17:30:09'),
(10, 1, 21, 1, 15000.00, 0.00, 15000.00, 'paid', '2026-03-27 17:34:18', '2026-03-27 17:34:43'),
(11, 1, 22, 3, 15000.00, 0.00, 0.00, 'pending', '2026-03-27 17:42:17', '2026-03-27 17:42:17'),
(12, 1, 23, 3, 15000.00, 0.00, 15000.00, 'paid', '2026-03-27 17:49:43', '2026-03-27 17:50:03'),
(13, 1, 24, 3, 12000.00, 0.00, 0.00, 'pending', '2026-03-27 18:10:26', '2026-03-27 18:10:26'),
(14, 1, 25, 1, 15000.00, 0.00, 15000.00, 'paid', '2026-03-27 21:11:24', '2026-03-27 21:12:04'),
(15, 1, 2, 1, 15000.00, 0.00, 15000.00, 'paid', '2026-03-31 02:20:02', '2026-03-31 02:20:20'),
(16, 1, 26, 1, 15000.00, 0.00, 15000.00, 'paid', '2026-04-02 18:43:20', '2026-04-02 18:43:45'),
(17, 1, 2, 4, 5500.00, 0.00, 5500.00, 'paid', '2026-04-02 21:40:02', '2026-04-02 21:40:02'),
(18, 1, 2, 4, 5500.00, 0.00, 5500.00, 'paid', '2026-04-02 21:40:02', '2026-04-02 21:40:02'),
(19, 1, 27, 1, 15000.00, 0.00, 0.00, 'cancelled', '2026-04-02 22:10:29', '2026-04-02 22:11:05'),
(20, 1, 28, 4, 15000.00, 0.00, 15000.00, 'paid', '2026-04-03 06:35:15', '2026-04-03 06:51:31');

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `description` varchar(255) NOT NULL,
  `category` varchar(255) DEFAULT NULL,
  `payment_method` enum('cash','bkash','nagad','bank_transfer','card') DEFAULT 'cash',
  `receipt_url` varchar(255) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `status` enum('pending','verified','approved','rejected','deleted') DEFAULT 'pending',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `verified_by` int(11) DEFAULT NULL,
  `verification_date` datetime DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `deletion_reason` text DEFAULT NULL,
  `deleted_by` int(11) DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `expenses`
--

INSERT INTO `expenses` (`id`, `branch_id`, `account_id`, `amount`, `description`, `category`, `payment_method`, `receipt_url`, `date`, `approved_by`, `status`, `created_at`, `updated_at`, `verified_by`, `verification_date`, `rejection_reason`, `deletion_reason`, `deleted_by`, `deleted_at`) VALUES
(5, 1, 1, 1000.00, 'Test', 'Office Expense', 'cash', NULL, '2026-04-03', 1, 'deleted', '2026-04-02 19:44:39', '2026-04-02 21:50:21', 1, '2026-04-02 19:44:44', NULL, 'Wrong entry', 1, '2026-04-02 21:50:21'),
(6, 1, 1, 2000.00, '', 'Office Expense', 'cash', NULL, '2026-04-03', 1, 'approved', '2026-04-02 21:56:22', '2026-04-02 21:56:22', NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `expense_categories`
--

CREATE TABLE `expense_categories` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `type` enum('head','sub') DEFAULT 'head',
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `expense_categories`
--

INSERT INTO `expense_categories` (`id`, `branch_id`, `name`, `parent_id`, `type`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(10, 1, 'Office Expense', NULL, 'head', '', 1, '2026-03-24 20:02:56', '2026-03-24 20:02:56'),
(11, 1, 'Office Supplies', NULL, 'head', '', 1, '2026-03-25 10:03:14', '2026-03-25 10:03:14'),
(12, 1, 'Office Supplies', NULL, 'head', '', 0, '2026-03-25 10:04:18', '2026-04-02 21:57:06'),
(13, 1, 'Office Supplies', NULL, 'head', '', 0, '2026-03-25 10:05:08', '2026-04-02 21:57:10'),
(14, 1, 'Rent', 10, 'sub', '', 1, '2026-04-02 21:57:27', '2026-04-02 21:57:27'),
(15, 1, 'Pitty Cash', 10, 'sub', '', 1, '2026-04-02 21:57:44', '2026-04-02 21:57:44');

-- --------------------------------------------------------

--
-- Table structure for table `income_categories`
--

CREATE TABLE `income_categories` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `type` enum('head','sub') DEFAULT 'head',
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `income_categories`
--

INSERT INTO `income_categories` (`id`, `branch_id`, `name`, `parent_id`, `type`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'TEST', NULL, 'head', NULL, 0, '2026-04-02 23:02:55', '2026-04-03 08:29:58'),
(2, 1, 'TEST', NULL, 'head', NULL, 0, '2026-04-02 23:03:05', '2026-04-03 08:30:01'),
(4, 1, 'TEST', NULL, 'head', NULL, 0, '2026-04-02 23:11:01', '2026-04-03 08:30:04'),
(5, 1, 'Consultation Fee', NULL, 'head', NULL, 1, '2026-04-02 23:17:25', '2026-04-02 23:17:25'),
(6, 1, 're', NULL, 'head', NULL, 0, '2026-04-02 23:24:06', '2026-04-03 08:30:12'),
(7, 1, 'TEST', NULL, 'head', NULL, 0, '2026-04-03 06:46:59', '2026-04-03 08:30:26'),
(8, 1, 'TEST', NULL, 'head', NULL, 0, '2026-04-03 07:07:51', '2026-04-03 08:30:23'),
(9, 1, 'test', NULL, 'head', NULL, 0, '2026-04-03 08:20:41', '2026-04-03 08:30:17'),
(10, 1, 'TEST', NULL, 'head', NULL, 0, '2026-04-03 08:20:49', '2026-04-03 08:30:20'),
(11, 1, 'TEST', NULL, 'head', NULL, 0, '2026-04-03 08:27:59', '2026-04-03 08:30:15'),
(12, 1, 'E2E Test Income Type 1775205060113', NULL, 'head', NULL, 1, '2026-04-03 08:31:00', '2026-04-03 08:31:00');

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `invoice_no` varchar(255) NOT NULL,
  `enrollment_id` int(11) DEFAULT NULL,
  `student_id` int(11) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `paid` decimal(12,2) DEFAULT 0.00,
  `status` enum('draft','pending','paid','overdue','partial','rejected') DEFAULT 'pending',
  `due_date` date DEFAULT NULL,
  `issued_at` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `invoice_type` enum('tuition','custom') DEFAULT 'tuition',
  `income_category_id` int(11) DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_phone` varchar(255) DEFAULT NULL,
  `customer_email` varchar(255) DEFAULT NULL,
  `customer_company` varchar(255) DEFAULT NULL,
  `customer_address` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `invoices`
--

INSERT INTO `invoices` (`id`, `branch_id`, `invoice_no`, `enrollment_id`, `student_id`, `amount`, `paid`, `status`, `due_date`, `issued_at`, `notes`, `created_at`, `updated_at`, `invoice_type`, `income_category_id`, `customer_id`, `customer_name`, `customer_phone`, `customer_email`, `customer_company`, `customer_address`) VALUES
(1, 1, 'INV-1774376557281-2', 1, 2, 15000.00, 15000.00, 'paid', '2026-04-01', '2026-03-24 18:22:37', 'Admission Fee & Tuition for PTE Academic Standard', '2026-03-24 18:22:37', '2026-03-24 19:08:09', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(2, 1, 'CRM-INV-1-0002', 2, 3, 15000.00, 15000.00, 'paid', '2026-04-10', '2026-03-27 09:02:28', 'CRM Lead: Tahsin — PTE Academic Standard. Pending fee collection via POS.', '2026-03-27 09:02:28', '2026-03-27 09:03:19', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(3, 1, 'INV-1774604737899-4', 3, 4, 15000.00, 15000.00, 'paid', '2026-04-03', '2026-03-27 09:45:37', 'Admission Fee & Tuition for PTE Academic Standard', '2026-03-27 09:45:37', '2026-03-27 09:45:58', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(4, 1, 'INV-1774604893975-5', 4, 5, 15000.00, 15000.00, 'paid', '2026-04-03', '2026-03-27 09:48:13', 'Admission Fee & Tuition for PTE Academic Standard', '2026-03-27 09:48:13', '2026-03-27 09:50:45', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(5, 1, 'CRM-INV-1-0005', 5, 16, 15000.00, 15000.00, 'paid', '2026-04-10', '2026-03-27 11:29:49', 'CRM Lead: Sayemto — PTE Academic Standard. Pending fee collection via POS.', '2026-03-27 11:29:49', '2026-03-27 14:43:23', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(6, 1, 'CRM-INV-1-0006', 6, NULL, 15000.00, 15000.00, 'paid', '2026-04-10', '2026-03-27 14:27:28', 'CRM Lead: TEST  — PTE Academic Standard. Pending fee collection via POS.', '2026-03-27 14:27:28', '2026-03-27 14:45:59', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(7, 1, 'CRM-INV-1-0007', 7, 18, 15000.00, 15000.00, 'paid', '2026-04-10', '2026-03-27 17:03:18', 'CRM Lead: Abdullah Al Sahaj — PTE Academic Standard. Pending fee collection via POS.', '2026-03-27 17:03:18', '2026-03-27 17:03:52', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(8, 1, 'INV-1774631279698-19', 8, 19, 15000.00, 0.00, 'rejected', '2026-04-03', '2026-03-27 17:07:59', 'Admission Fee & Tuition for PTE Academic Standard\n[Fee Rejected 2026-03-27T17:48:23.726Z by Super Admin] did not paid | Student: Sudha New Test', '2026-03-27 17:07:59', '2026-03-27 17:48:23', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(9, 1, 'CRM-INV-1-0009', 9, 20, 15000.00, 15000.00, 'paid', '2026-04-10', '2026-03-27 17:28:31', 'CRM Lead: Tahsin — PTE Academic Standard. Pending fee collection via POS.', '2026-03-27 17:28:31', '2026-03-27 17:30:09', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(10, 1, 'INV-1774632858650-21', 10, 21, 15000.00, 0.00, 'rejected', '2026-04-03', '2026-03-27 17:34:18', 'Admission Fee & Tuition for PTE Academic Standard\n[Fee Rejected 2026-03-27T17:48:15.325Z by Super Admin] didnot paid | Student: Success Student', '2026-03-27 17:34:18', '2026-03-27 17:48:15', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(11, 1, 'INV-1774633338666-22', 11, 22, 15000.00, 0.00, 'rejected', '2026-04-03', '2026-03-27 17:42:18', 'Admission Fee & Tuition for PTE Academic Standard\n[Fee Rejected 2026-03-27T17:48:01.918Z by Super Admin] did not pay | Student: Test TEST', '2026-03-27 17:42:18', '2026-03-27 17:48:01', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(12, 1, 'INV-1774633784385-23', 12, 23, 15000.00, 15000.00, 'paid', '2026-04-03', '2026-03-27 17:49:44', 'Direct student entry for PTE Academic Standard. Pending fee collection via POS.', '2026-03-27 17:49:44', '2026-03-27 17:50:03', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(13, 1, 'INV-1774635027204-24', 13, 24, 12000.00, 0.00, 'rejected', '2026-04-04', '2026-03-27 18:10:27', 'Direct student entry for IELTS Academic Masterclass. Pending fee collection via POS.\n[Fee Rejected 2026-03-27T18:10:46.213Z by Super Admin] test purpose | Student: TEST TES', '2026-03-27 18:10:27', '2026-03-27 18:10:46', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(14, 1, 'INV-1774645884989-25', 14, 25, 15000.00, 15000.00, 'paid', '2026-04-04', '2026-03-27 21:11:24', 'Direct student entry for PTE Academic Standard. Pending fee collection via POS.', '2026-03-27 21:11:24', '2026-03-27 21:12:04', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(15, 1, 'CRM-INV-1-0015', 15, 2, 15000.00, 15000.00, 'paid', '2026-04-14', '2026-03-31 02:20:03', 'CRM Lead ID: 13 | CRM Lead: Sayem — PTE Academic Standard. Pending fee collection via POS. | Opportunity ID: 6', '2026-03-31 02:20:03', '2026-03-31 02:20:20', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(16, 1, 'CRM-INV-1-0016', NULL, NULL, 15000.00, 0.00, 'rejected', '2026-04-07', '2026-03-31 02:23:36', 'CRM Deal: Sayemto – PTE Academic Standard\n[Fee Rejected 2026-04-01T22:56:50.752Z by Super Admin] UNKNOWN | Student: Unknown Student', '2026-03-31 02:23:36', '2026-04-01 22:56:50', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(17, 1, 'CRM-INV-1-0017', 16, 26, 15000.00, 15000.00, 'paid', '2026-04-17', '2026-04-02 18:43:20', 'CRM Lead ID: 14 | CRM Lead: Sayem — PTE Academic Standard. Pending fee collection via POS. | Opportunity ID: 7', '2026-04-02 18:43:20', '2026-04-02 18:43:45', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(18, 1, 'INV-1775166002411', 17, 2, 5500.00, 5500.00, 'paid', '2026-04-03', '2026-04-02 21:40:02', NULL, '2026-04-02 21:40:02', '2026-04-02 21:40:02', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(19, 1, 'INV-1775166002417', 18, 2, 5500.00, 5500.00, 'paid', '2026-04-03', '2026-04-02 21:40:02', NULL, '2026-04-02 21:40:02', '2026-04-02 21:40:02', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(20, 1, 'INV-1775167829829-27', 19, 27, 15000.00, 0.00, 'rejected', '2026-04-10', '2026-04-02 22:10:29', 'Direct student entry for PTE Academic Standard. Pending fee collection via POS.\n[Fee Rejected 2026-04-02T22:11:05.644Z by Super Admin] FAILED | Student: TEST 55 er', '2026-04-02 22:10:29', '2026-04-02 22:11:06', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(21, 1, 'INV-1775198115286-28', 20, 28, 15000.00, 15000.00, 'paid', '2026-04-10', '2026-04-03 06:35:15', 'Direct student entry for PTE Academic Standard. Pending fee collection via POS.', '2026-04-03 06:35:15', '2026-04-03 06:51:31', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(22, 1, 'INV-2026-0022', NULL, NULL, 3500.00, 7000.00, 'paid', '2026-04-03', '2026-04-03 08:31:01', 'Testing manual invoice flow', '2026-04-03 08:31:01', '2026-04-03 08:31:33', 'custom', 12, 4, 'E2E Customer', NULL, NULL, NULL, NULL),
(23, 1, 'INV-2026-0023', NULL, NULL, 5000.00, 5000.00, 'paid', '2024-04-03', '2026-04-03 08:31:01', '', '2026-04-03 08:31:01', '2026-04-03 08:33:34', 'custom', 5, 3, 'TEST', '', '', '', ''),
(24, 1, 'INV-2026-0024', NULL, NULL, 3600.00, 3600.00, 'paid', '2026-04-25', '2026-04-03 08:59:15', '', '2026-04-03 08:59:15', '2026-04-03 08:59:45', 'custom', 5, 3, 'TEST', '', '', '', ''),
(25, 1, 'INV-2026-0025', NULL, NULL, 3600.00, 3600.00, 'paid', '2026-04-03', '2026-04-03 09:56:11', '', '2026-04-03 09:56:11', '2026-04-03 09:56:30', 'custom', 5, 4, 'E2E Customer', '01205060919', '', '', '');

-- --------------------------------------------------------

--
-- Table structure for table `job_postings`
--

CREATE TABLE `job_postings` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `department` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `requirements` text DEFAULT NULL,
  `salary_range` varchar(100) DEFAULT NULL,
  `status` enum('open','closed','on_hold') DEFAULT 'open',
  `posted_by` int(11) DEFAULT NULL,
  `deadline` date DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `job_postings`
--

INSERT INTO `job_postings` (`id`, `branch_id`, `title`, `department`, `description`, `requirements`, `salary_range`, `status`, `posted_by`, `deadline`, `created_at`, `updated_at`) VALUES
(1, 1, 'PEON', 'CRM', '', '', '10000', 'open', 1, '2026-05-02', '2026-04-05 15:19:25', '2026-04-05 15:19:25');

-- --------------------------------------------------------

--
-- Table structure for table `journal_entries`
--

CREATE TABLE `journal_entries` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `ref_no` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `date` date NOT NULL,
  `posted_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `journal_entries`
--

INSERT INTO `journal_entries` (`id`, `branch_id`, `ref_no`, `description`, `date`, `posted_by`, `created_at`, `updated_at`) VALUES
(1, 1, 'PAY-7', 'Fee Collection - Student: 2 | Ref: N/A', '2026-03-25', 1, '2026-03-24 19:07:53', '2026-03-24 19:07:53'),
(3, 1, 'PAY-8', 'Fee Collection - Enrollment: 2 | Ref: N/A', '2026-03-27', 1, '2026-03-27 09:03:18', '2026-03-27 09:03:18'),
(4, 1, 'PAY-9', 'Fee Collection - Enrollment: 3 | Ref: N/A', '2026-03-27', 1, '2026-03-27 09:45:57', '2026-03-27 09:45:57'),
(5, 1, 'PAY-10', 'Fee Collection - Enrollment: 4 | Ref: N/A', '2026-03-27', 1, '2026-03-27 09:50:45', '2026-03-27 09:50:45'),
(6, 1, 'EXP-APP-2-1774607790452', 'Approved Expense: Office Expense', '2026-03-27', 1, '2026-03-27 10:36:30', '2026-03-27 10:36:30'),
(7, 1, 'EXP-APP-2-1774607792403', 'Approved Expense: Office Expense', '2026-03-27', 1, '2026-03-27 10:36:32', '2026-03-27 10:36:32'),
(8, 1, 'EXP-APP-3-1774619400931', 'Approved Expense: Office Supplies', '2026-03-27', 1, '2026-03-27 13:50:00', '2026-03-27 13:50:00'),
(9, 1, 'PAY-22', 'Fee Collection - Enrollment: 5 | Ref: N/A', '2026-03-27', 1, '2026-03-27 14:43:17', '2026-03-27 14:43:17'),
(10, 1, 'PAY-23', 'Fee Collection - Enrollment: 6 | Ref: N/A', '2026-03-27', 1, '2026-03-27 14:45:54', '2026-03-27 14:45:54'),
(11, 1, 'PAY-24', 'Fee Collection - Enrollment: 7 | Ref: N/A', '2026-03-27', 1, '2026-03-27 17:03:50', '2026-03-27 17:03:50'),
(12, 1, 'PAY-25', 'Fee Collection - Enrollment: 8 | Ref: N/A', '2026-03-27', 1, '2026-03-27 17:08:50', '2026-03-27 17:08:50'),
(13, 1, 'PAY-26', 'Fee Collection - Enrollment: 8 | Ref: N/A', '2026-03-27', 1, '2026-03-27 17:09:21', '2026-03-27 17:09:21'),
(14, 1, 'PAY-27', 'Fee Collection - Enrollment: 9 | Ref: N/A', '2026-03-27', 1, '2026-03-27 17:30:12', '2026-03-27 17:30:12'),
(15, 1, 'PAY-28', 'Fee Collection - Enrollment: 8 | Ref: N/A', '2026-03-27', 1, '2026-03-27 17:30:27', '2026-03-27 17:30:27'),
(16, 1, 'PAY-29', 'Fee Collection - Enrollment: 10 | Ref: N/A', '2026-03-27', 1, '2026-03-27 17:34:45', '2026-03-27 17:34:45'),
(17, 1, 'PAY-30', 'Fee Collection - Enrollment: 12 | Ref: N/A', '2026-03-27', 1, '2026-03-27 17:50:04', '2026-03-27 17:50:04'),
(18, 1, 'PAY-31', 'Fee Collection - Enrollment: 14 | Ref: N/A', '2026-03-28', 1, '2026-03-27 21:12:06', '2026-03-27 21:12:06'),
(19, 1, 'PAY-32', 'Fee Collection - Enrollment: 15 | Ref: N/A', '2026-03-31', 1, '2026-03-31 02:20:21', '2026-03-31 02:20:21'),
(20, 1, 'PAY-33', 'Fee Collection - Enrollment: 16 | Ref: N/A', '2026-04-03', 1, '2026-04-02 18:43:46', '2026-04-02 18:43:46'),
(21, 1, 'EXP-APP-4-1775156159605', 'Approved Expense: Office Expense', '2026-04-03', 1, '2026-04-02 18:55:59', '2026-04-02 18:55:59'),
(22, 1, 'EXP-APP-5-1775159084872', 'Test', '2026-04-03', 1, '2026-04-02 19:44:44', '2026-04-02 19:44:44'),
(23, 1, 'EXP-REV-5-1775166621671', 'Reversal: Test (Deleted)', '2026-04-03', 1, '2026-04-02 21:50:21', '2026-04-02 21:50:21'),
(24, 1, 'EXP-APP-6-1775166982407', 'Approved Expense: Office Expense', '2026-04-03', 1, '2026-04-02 21:56:22', '2026-04-02 21:56:22'),
(25, 1, 'PAY-36', 'Fee Collection - Enrollment: 20 | Ref: N/A', '2026-04-03', 1, '2026-04-03 06:51:31', '2026-04-03 06:51:31'),
(26, 1, 'MR-CUST-1775205062083', 'Custom Income: E2E Test Income Type 1775205060113 - E2E Customer', '2026-04-03', 1, '2026-04-03 08:31:02', '2026-04-03 08:31:02'),
(27, 1, 'MR-CUST-1775205092863', 'Custom Income: E2E Test Income Type 1775205060113 - E2E Customer', '2026-04-03', 1, '2026-04-03 08:31:33', '2026-04-03 08:31:33'),
(28, 1, 'MR-CUST-1775205214780', 'Custom Income: Consultation Fee - TEST', '2026-04-03', 1, '2026-04-03 08:33:34', '2026-04-03 08:33:34'),
(29, 1, 'MR-CUST-1775206785772', 'Custom Income: Consultation Fee - TEST', '2026-04-03', 1, '2026-04-03 08:59:45', '2026-04-03 08:59:45'),
(30, 1, 'MR-CUST-1775210190760', 'Custom Income: Consultation Fee - E2E Customer', '2026-04-03', 1, '2026-04-03 09:56:30', '2026-04-03 09:56:30');

-- --------------------------------------------------------

--
-- Table structure for table `journal_lines`
--

CREATE TABLE `journal_lines` (
  `id` int(11) NOT NULL,
  `journal_entry_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `debit` decimal(14,4) DEFAULT 0.0000,
  `credit` decimal(14,4) DEFAULT 0.0000,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `journal_lines`
--

INSERT INTO `journal_lines` (`id`, `journal_entry_id`, `account_id`, `debit`, `credit`, `notes`, `created_at`, `updated_at`) VALUES
(2, 1, 2, 0.0000, 15000.0000, 'Tuition Revenue', '2026-03-24 19:08:06', '2026-03-24 19:08:06'),
(6, 3, 2, 0.0000, 15000.0000, 'Tuition Revenue', '2026-03-27 09:03:18', '2026-03-27 09:03:18'),
(8, 4, 2, 0.0000, 15000.0000, 'Tuition Revenue', '2026-03-27 09:45:58', '2026-03-27 09:45:58'),
(10, 5, 2, 0.0000, 15000.0000, 'Tuition Revenue', '2026-03-27 09:50:45', '2026-03-27 09:50:45'),
(11, 6, 5, 2000.0000, 0.0000, '', '2026-03-27 10:36:30', '2026-03-27 10:36:30'),
(13, 7, 8, 2000.0000, 0.0000, '', '2026-03-27 10:36:32', '2026-03-27 10:36:32'),
(15, 8, 11, 5000.0000, 0.0000, '', '2026-03-27 13:50:01', '2026-03-27 13:50:01'),
(17, 9, 3, 15000.0000, 0.0000, 'POS Payment', '2026-03-27 14:43:18', '2026-03-27 14:43:18'),
(18, 9, 2, 0.0000, 15000.0000, 'Tuition Revenue', '2026-03-27 14:43:18', '2026-03-27 14:43:18'),
(19, 10, 3, 15000.0000, 0.0000, 'POS Payment', '2026-03-27 14:45:55', '2026-03-27 14:45:55'),
(20, 10, 2, 0.0000, 15000.0000, 'Tuition Revenue', '2026-03-27 14:45:55', '2026-03-27 14:45:55'),
(21, 11, 9, 15000.0000, 0.0000, 'POS Payment', '2026-03-27 17:03:51', '2026-03-27 17:03:51'),
(22, 11, 2, 0.0000, 15000.0000, 'Tuition Revenue', '2026-03-27 17:03:51', '2026-03-27 17:03:51'),
(23, 12, 10, 15000.0000, 0.0000, 'POS Payment', '2026-03-27 17:08:51', '2026-03-27 17:08:51'),
(24, 12, 2, 0.0000, 15000.0000, 'Tuition Revenue', '2026-03-27 17:08:51', '2026-03-27 17:08:51'),
(25, 13, 10, 15000.0000, 0.0000, 'POS Payment', '2026-03-27 17:09:21', '2026-03-27 17:09:21'),
(26, 13, 2, 0.0000, 15000.0000, 'Tuition Revenue', '2026-03-27 17:09:21', '2026-03-27 17:09:21'),
(27, 14, 10, 15000.0000, 0.0000, 'POS Payment', '2026-03-27 17:30:12', '2026-03-27 17:30:12'),
(28, 14, 2, 0.0000, 15000.0000, 'Tuition Revenue', '2026-03-27 17:30:12', '2026-03-27 17:30:12'),
(29, 15, 10, 15000.0000, 0.0000, 'POS Payment', '2026-03-27 17:30:28', '2026-03-27 17:30:28'),
(30, 15, 2, 0.0000, 15000.0000, 'Tuition Revenue', '2026-03-27 17:30:28', '2026-03-27 17:30:28'),
(32, 16, 2, 0.0000, 15000.0000, 'Tuition Revenue', '2026-03-27 17:34:45', '2026-03-27 17:34:45'),
(34, 17, 2, 0.0000, 15000.0000, 'Tuition Revenue', '2026-03-27 17:50:05', '2026-03-27 17:50:05'),
(36, 18, 2, 0.0000, 15000.0000, 'Tuition Revenue', '2026-03-27 21:12:07', '2026-03-27 21:12:07'),
(38, 19, 2, 0.0000, 15000.0000, 'Tuition Revenue', '2026-03-31 02:20:21', '2026-03-31 02:20:21'),
(40, 20, 2, 0.0000, 15000.0000, 'Tuition Revenue', '2026-04-02 18:43:46', '2026-04-02 18:43:46'),
(41, 21, 5, 5000.0000, 0.0000, '', '2026-04-02 18:55:59', '2026-04-02 18:55:59'),
(43, 22, 5, 1000.0000, 0.0000, 'Test', '2026-04-02 19:44:44', '2026-04-02 19:44:44'),
(44, 22, 1, 0.0000, 1000.0000, 'Paid via cash', '2026-04-02 19:44:44', '2026-04-02 19:44:44'),
(45, 23, 5, 0.0000, 1000.0000, 'Reversal - Test', '2026-04-02 21:50:21', '2026-04-02 21:50:21'),
(46, 23, 1, 1000.0000, 0.0000, 'Reversal - refund via cash', '2026-04-02 21:50:21', '2026-04-02 21:50:21'),
(47, 24, 5, 2000.0000, 0.0000, '', '2026-04-02 21:56:22', '2026-04-02 21:56:22'),
(48, 24, 1, 0.0000, 2000.0000, 'Paid via cash', '2026-04-02 21:56:22', '2026-04-02 21:56:22'),
(49, 25, 10, 15000.0000, 0.0000, 'POS Payment', '2026-04-03 06:51:31', '2026-04-03 06:51:31'),
(50, 25, 2, 0.0000, 15000.0000, 'Tuition Revenue', '2026-04-03 06:51:31', '2026-04-03 06:51:31'),
(52, 26, 2, 0.0000, 3500.0000, 'Revenue: E2E Test Income Type 1775205060113', '2026-04-03 08:31:02', '2026-04-03 08:31:02'),
(53, 27, 10, 3500.0000, 0.0000, 'Payment Received', '2026-04-03 08:31:33', '2026-04-03 08:31:33'),
(54, 27, 2, 0.0000, 3500.0000, 'Revenue Accrued', '2026-04-03 08:31:33', '2026-04-03 08:31:33'),
(55, 28, 10, 5000.0000, 0.0000, 'Custom Income - Consultation Fee', '2026-04-03 08:33:35', '2026-04-03 08:33:35'),
(56, 28, 2, 0.0000, 5000.0000, 'Revenue: Consultation Fee', '2026-04-03 08:33:35', '2026-04-03 08:33:35'),
(57, 29, 9, 3600.0000, 0.0000, 'Custom Income - Consultation Fee', '2026-04-03 08:59:46', '2026-04-03 08:59:46'),
(58, 29, 2, 0.0000, 3600.0000, 'Revenue: Consultation Fee', '2026-04-03 08:59:46', '2026-04-03 08:59:46'),
(59, 30, 3, 3600.0000, 0.0000, 'Custom Income - Consultation Fee', '2026-04-03 09:56:31', '2026-04-03 09:56:31'),
(60, 30, 15, 0.0000, 3600.0000, 'Revenue: Consultation Fee', '2026-04-03 09:56:31', '2026-04-03 09:56:31');

-- --------------------------------------------------------

--
-- Table structure for table `leads`
--

CREATE TABLE `leads` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `source` varchar(255) DEFAULT NULL,
  `status` enum('new','contacted','interested','trial','enrolled','fees_pending','payment_rejected','successful','lost') DEFAULT 'new',
  `counselor_id` int(11) DEFAULT NULL,
  `batch_interest` varchar(255) DEFAULT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `notes` text DEFAULT NULL,
  `trial_date` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `score` int(11) DEFAULT 0 COMMENT '0-100 lead quality score',
  `deal_value` decimal(12,2) DEFAULT 0.00 COMMENT 'Expected enrollment fee value',
  `priority` enum('low','medium','high','hot') DEFAULT 'medium',
  `expected_close` date DEFAULT NULL,
  `last_activity_at` datetime DEFAULT NULL,
  `lost_reason` varchar(255) DEFAULT NULL,
  `course_id` int(11) DEFAULT NULL COMMENT 'Selected course — auto-fills deal_value from course.base_fee',
  `batch_id` int(11) DEFAULT NULL COMMENT 'Selected batch from website enquiry or checkout',
  `payment_ref` varchar(255) DEFAULT NULL COMMENT 'Session reference for website checkout payment',
  `destination_country` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `leads`
--

INSERT INTO `leads` (`id`, `branch_id`, `name`, `phone`, `email`, `source`, `status`, `counselor_id`, `batch_interest`, `tags`, `notes`, `trial_date`, `created_at`, `updated_at`, `score`, `deal_value`, `priority`, `expected_close`, `last_activity_at`, `lost_reason`, `course_id`, `batch_id`, `payment_ref`, `destination_country`) VALUES
(1, 1, 'Zahirul Islam', '01911111111', 'zahir@gmail.com', 'Facebook', 'lost', 1, 'PTE Academic', NULL, NULL, NULL, '2026-03-17 12:02:12', '2026-03-25 11:24:58', 0, 0.00, 'medium', NULL, '2026-03-25 11:24:58', NULL, NULL, NULL, NULL, NULL),
(2, 1, 'Nusrat Jahan', '01922222222', 'nusrat@gmail.com', 'Referral', 'lost', 1, 'IELTS Academic', NULL, NULL, NULL, '2026-03-17 12:02:12', '2026-03-25 11:24:57', 0, 0.00, 'medium', NULL, '2026-03-25 11:24:57', NULL, NULL, NULL, NULL, NULL),
(3, 2, 'Ariful Haque', '01933333333', 'arif@gmail.com', 'Google Search', 'interested', 2, 'PTE Core', NULL, NULL, NULL, '2026-03-17 12:02:12', '2026-03-17 12:02:12', 0, 0.00, 'medium', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(4, 1, 'Sayem', '0182355', '', 'Walk-in', 'lost', NULL, '', NULL, NULL, NULL, '2026-03-25 10:53:27', '2026-04-05 15:36:01', 70, 13000.00, 'medium', NULL, '2026-04-05 15:36:01', NULL, NULL, NULL, NULL, NULL),
(5, 1, 'Sayem', '0187118784', 'aarsayem33@gmail.com', 'Walk-in', 'lost', NULL, NULL, NULL, NULL, NULL, '2026-03-25 11:17:22', '2026-03-25 11:25:05', 85, 0.00, 'low', NULL, '2026-03-25 11:25:05', NULL, NULL, NULL, NULL, NULL),
(6, 1, 'Sudha', '01837239670', 'shajnen002@gmail.com', 'Walk-in', 'fees_pending', NULL, 'PTE Academic Standard', NULL, NULL, NULL, '2026-03-25 11:28:32', '2026-03-27 09:01:43', 85, 15000.00, 'medium', NULL, '2026-03-27 09:01:43', NULL, 1, NULL, NULL, NULL),
(7, 1, 'Tahsin', '019893', 'test@gmail.com', 'Walk-in', 'successful', NULL, 'PTE Academic Standard', NULL, NULL, NULL, '2026-03-27 09:02:06', '2026-03-27 09:03:17', 100, 15000.00, 'medium', NULL, '2026-03-27 09:03:17', NULL, 1, NULL, NULL, NULL),
(8, 1, 'Sayemto', '932', '', 'Walk-in', 'fees_pending', NULL, 'PTE Academic Standard', NULL, NULL, NULL, '2026-03-27 11:29:16', '2026-03-30 20:22:44', 85, 15000.00, 'medium', NULL, '2026-03-30 20:22:44', NULL, 1, NULL, NULL, NULL),
(9, 1, 'TEST ', '03', 's@g.com', 'Walk-in', 'successful', NULL, 'PTE Academic Standard', NULL, NULL, NULL, '2026-03-27 14:27:03', '2026-03-27 14:43:12', 100, 15000.00, 'medium', NULL, '2026-03-27 14:43:12', NULL, 1, NULL, NULL, NULL),
(10, 1, 'Abdullah Al Sahaj', '034', 'jk@w.com', 'Referral', 'successful', NULL, 'PTE Academic Standard', NULL, NULL, NULL, '2026-03-27 17:03:08', '2026-03-27 17:03:48', 100, 15000.00, 'medium', NULL, '2026-03-27 17:03:48', NULL, 1, NULL, NULL, NULL),
(11, 1, 'Tahsin', '0343', 'ad', 'Walk-in', 'lost', NULL, 'PTE Academic Standard', NULL, NULL, NULL, '2026-03-27 17:27:41', '2026-04-01 22:54:41', 100, 15000.00, 'medium', NULL, '2026-04-01 22:54:41', NULL, 1, NULL, NULL, NULL),
(12, 1, 'RED', '01558', 'ddd@gmail.com', 'website', 'lost', NULL, 'IELTS Academic Masterclass', NULL, '', NULL, '2026-03-30 20:14:50', '2026-04-05 15:35:58', 65, 12000.00, 'high', NULL, '2026-04-05 15:35:58', NULL, 2, NULL, NULL, NULL),
(13, 1, 'Sayem', '01871186562', 'aarsayem002@gmail.com', 'Website Enquiry', 'successful', NULL, 'PTE Academic Standard', NULL, 'Subject: General Booking/Consultation\nMessage: ', NULL, '2026-03-31 02:19:13', '2026-03-31 02:20:20', 70, 15000.00, 'medium', NULL, '2026-03-31 02:20:20', NULL, 1, NULL, NULL, 'Australia'),
(14, 1, 'Sayem', '0156955545', 'business.intech@gmail.com', 'website', 'successful', NULL, 'PTE Academic Standard', NULL, '', NULL, '2026-04-02 18:40:43', '2026-04-02 18:43:45', 65, 15000.00, 'high', NULL, '2026-04-02 18:43:45', NULL, 1, NULL, NULL, 'Australia'),
(15, 1, 'Three Piece', '0410 807 546', 'aarsayem002@gmail.com', 'website', 'successful', NULL, NULL, NULL, 'Payment Method Initiated: demo_bkash', NULL, '2026-04-02 21:39:58', '2026-04-02 21:40:02', 0, 5500.00, 'high', NULL, NULL, NULL, 3, 4, 'PAY-256DFCD9', NULL),
(16, 1, 'TEST', '', '', 'Walk-in', 'new', NULL, 'PTE Basic', NULL, NULL, NULL, '2026-04-05 15:36:50', '2026-04-05 15:36:50', 65, 5500.00, 'medium', NULL, NULL, NULL, 3, NULL, NULL, NULL),
(17, 1, 'TEST 05', '', '', 'Walk-in', 'new', NULL, NULL, NULL, NULL, NULL, '2026-04-05 15:37:08', '2026-04-05 15:37:08', 50, 0.00, 'medium', NULL, NULL, NULL, 0, NULL, NULL, NULL),
(18, 1, 'TEST', '', '', 'Walk-in', 'new', NULL, NULL, NULL, NULL, NULL, '2026-04-05 15:39:41', '2026-04-05 15:39:41', 50, 0.00, 'medium', NULL, NULL, NULL, 0, NULL, NULL, NULL),
(19, 1, 'u0988', '', '', 'Walk-in', 'new', NULL, NULL, NULL, NULL, NULL, '2026-04-05 15:39:49', '2026-04-05 15:39:49', 50, 0.00, 'medium', NULL, NULL, NULL, 0, NULL, NULL, NULL),
(20, 1, 'TEST 51025', '0215', '3@b.com', 'Walk-in', 'new', NULL, NULL, NULL, NULL, NULL, '2026-04-05 15:46:49', '2026-04-05 15:46:49', 85, 0.00, 'medium', NULL, NULL, NULL, 0, NULL, NULL, NULL),
(21, 1, 'TEST2369', '0112', 'affdfsd@r.com', 'Website Enquiry', 'new', NULL, 'Batch Schedule', NULL, 'Subject: Batch Schedule\nMessage: Hi\n', NULL, '2026-04-05 15:48:31', '2026-04-05 15:48:31', 70, 0.00, 'medium', NULL, '2026-04-05 15:48:31', NULL, NULL, NULL, NULL, NULL),
(22, 1, 'TEST9999', '000', 'p@b.com', 'website', 'interested', NULL, '', NULL, '', NULL, '2026-04-05 15:53:26', '2026-04-05 15:53:26', 65, 0.00, 'high', NULL, '2026-04-05 15:53:26', NULL, 0, NULL, NULL, 'Australia'),
(23, 1, 'TEST6754', '000', 'p@b.com', 'Website Enquiry', 'new', NULL, 'General Booking/Consultation', NULL, 'Subject: General Booking/Consultation\nMessage: ', NULL, '2026-04-05 16:02:59', '2026-04-05 16:02:59', 70, 0.00, 'medium', NULL, '2026-04-05 16:02:59', NULL, NULL, NULL, NULL, 'Australia'),
(24, 1, 'TEST6754', '0004EER', 'p@b.com', 'website', 'interested', NULL, '', NULL, '', NULL, '2026-04-05 16:04:41', '2026-04-05 16:04:41', 65, 0.00, 'high', NULL, '2026-04-05 16:04:41', NULL, 0, NULL, NULL, 'Australia'),
(25, 1, 'ZOHAIB', '47932', 'POPER@P.COM', 'website', 'interested', NULL, '', NULL, '', NULL, '2026-04-05 16:05:38', '2026-04-05 16:05:38', 65, 0.00, 'high', NULL, '2026-04-05 16:05:38', NULL, 0, NULL, NULL, 'UK'),
(26, 1, 'Jane Doe', '170000000', 'jane@example.com', 'Facebook', 'new', NULL, NULL, NULL, 'Interested in PTE', NULL, '2026-04-05 16:06:18', '2026-04-05 16:06:18', 65, 0.00, 'medium', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(27, 1, 'Sayem', '01871186562', NULL, 'Website Enquiry', 'contacted', NULL, 'Website Live Chat Enquiry', NULL, 'Subject: Website Live Chat Enquiry\nMessage: Test from website', NULL, '2026-04-05 16:30:28', '2026-04-05 18:29:20', 55, 0.00, 'medium', NULL, '2026-04-05 18:29:20', NULL, NULL, NULL, NULL, NULL),
(28, 1, 'TEST 9688', '3223', '232@p.com', 'website', 'contacted', NULL, '', NULL, '', NULL, '2026-04-05 17:06:14', '2026-04-05 17:06:36', 65, 0.00, 'high', NULL, '2026-04-05 17:06:36', NULL, 0, NULL, NULL, 'Australia');

-- --------------------------------------------------------

--
-- Table structure for table `leave_balances`
--

CREATE TABLE `leave_balances` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `leave_type_id` int(11) NOT NULL,
  `year` int(11) NOT NULL,
  `entitled` decimal(4,1) DEFAULT 0.0,
  `used` decimal(4,1) DEFAULT 0.0,
  `carried_over` decimal(4,1) DEFAULT 0.0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `leave_balances`
--

INSERT INTO `leave_balances` (`id`, `user_id`, `leave_type_id`, `year`, `entitled`, `used`, `carried_over`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 2026, 0.0, 14.0, 0.0, '2026-04-02 20:46:51', '2026-04-02 20:46:51');

-- --------------------------------------------------------

--
-- Table structure for table `leave_requests`
--

CREATE TABLE `leave_requests` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `leave_type_id` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `total_days` decimal(4,1) NOT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('pending','approved','rejected','cancelled') DEFAULT 'pending',
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejection_note` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `leave_requests`
--

INSERT INTO `leave_requests` (`id`, `user_id`, `branch_id`, `leave_type_id`, `start_date`, `end_date`, `total_days`, `reason`, `status`, `approved_by`, `approved_at`, `rejection_note`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 1, '2026-04-03', '2026-04-10', 7.0, '', 'approved', 1, '2026-04-02 20:46:51', NULL, '2026-04-02 20:46:39', '2026-04-02 20:46:51');

-- --------------------------------------------------------

--
-- Table structure for table `leave_types`
--

CREATE TABLE `leave_types` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `days_per_year` int(11) DEFAULT 0,
  `is_paid` tinyint(1) DEFAULT 1,
  `color` varchar(7) DEFAULT '#00D4FF',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `leave_types`
--

INSERT INTO `leave_types` (`id`, `name`, `days_per_year`, `is_paid`, `color`, `created_at`, `updated_at`) VALUES
(1, 'Annual Leave', 14, 1, '#00D4FF', '2026-04-02 18:37:53', '2026-04-02 18:37:53');

-- --------------------------------------------------------

--
-- Table structure for table `liquidity_movements`
--

CREATE TABLE `liquidity_movements` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `related_account_id` int(11) DEFAULT NULL,
  `movement_date` date NOT NULL,
  `transaction_type` enum('opening_balance','opening_adjustment','collection','direct_bank_receipt','mobile_receipt','transfer_in','transfer_out','expense','closing_submission','closing_adjustment','manual_adjustment','reversal') NOT NULL,
  `direction` enum('inflow','outflow','neutral') NOT NULL DEFAULT 'neutral',
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `previous_balance` decimal(15,2) DEFAULT 0.00,
  `new_balance` decimal(15,2) DEFAULT 0.00,
  `actual_balance` decimal(15,2) DEFAULT 0.00,
  `variance_amount` decimal(15,2) DEFAULT 0.00,
  `reference` varchar(255) DEFAULT NULL,
  `source_model` varchar(255) DEFAULT NULL,
  `source_id` varchar(255) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `liquidity_movements`
--

INSERT INTO `liquidity_movements` (`id`, `branch_id`, `account_id`, `related_account_id`, `movement_date`, `transaction_type`, `direction`, `amount`, `previous_balance`, `new_balance`, `actual_balance`, `variance_amount`, `reference`, `source_model`, `source_id`, `remarks`, `reason`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(2, 1, 3, 1, '2026-03-27', 'transfer_in', 'inflow', 50000.00, 0.00, 0.00, 0.00, 0.00, 'TRF-1774642040039', 'LiquidityTransfer', 'TRF-1774642040039', 'transfer to saving', NULL, 1, 1, '2026-03-27 20:07:21', '2026-03-27 20:07:21'),
(5, 1, 3, 1, '2026-03-27', 'transfer_in', 'inflow', 81000.00, 50000.00, 131000.00, 0.00, 0.00, 'TRF-1774645127474', 'LiquidityTransfer', 'TRF-1774645127474', 'cash to bank', NULL, 1, 1, '2026-03-27 20:58:50', '2026-03-27 20:58:50'),
(7, 1, 9, NULL, '2026-03-28', 'opening_balance', 'inflow', 15000.00, 0.00, 15000.00, 0.00, 0.00, 'OPEN-2026-03-28', NULL, NULL, 'Opening balance set to 15000', 'opening balance', 1, 1, '2026-03-27 21:02:04', '2026-03-27 21:02:04'),
(8, 1, 9, NULL, '2026-03-28', 'closing_submission', 'neutral', 0.00, 15000.00, 15000.00, 10000.00, -5000.00, 'CLOSE-2026-03-28', NULL, NULL, 'Closing submitted for bkash', '5000 cost charge', 1, 1, '2026-03-27 21:06:17', '2026-03-27 21:06:17'),
(9, 1, 9, 3, '2026-03-27', 'transfer_out', 'outflow', 30000.00, 0.00, -30000.00, 0.00, 0.00, 'TRF-1774645710100', 'LiquidityTransfer', 'TRF-1774645710100', 'txid 9934', NULL, 1, 1, '2026-03-27 21:08:31', '2026-03-27 21:08:31'),
(10, 1, 3, 9, '2026-03-27', 'transfer_in', 'inflow', 30000.00, 131000.00, 161000.00, 0.00, 0.00, 'TRF-1774645710100', 'LiquidityTransfer', 'TRF-1774645710100', 'txid 9934', NULL, 1, 1, '2026-03-27 21:08:32', '2026-03-27 21:08:32'),
(21, 1, 3, 1, '2026-03-28', 'transfer_in', 'inflow', 420000.00, 161000.00, 581000.00, 0.00, 0.00, 'TRF-1774724086718', 'LiquidityTransfer', 'TRF-1774724086718', 'CASH-HQ -> Brack Bank', NULL, 1, 1, '2026-03-28 18:54:50', '2026-03-28 18:54:50'),
(23, 1, 3, 1, '2026-03-28', 'transfer_in', 'inflow', 67000.00, 581000.00, 648000.00, 0.00, 0.00, 'TRF-1774724154588', 'LiquidityTransfer', 'TRF-1774724154588', 'CASH-HQ -> Brack Bank', NULL, 1, 1, '2026-03-28 18:55:57', '2026-03-28 18:55:57'),
(27, 1, 3, 1, '2026-03-29', 'transfer_in', 'inflow', 58000.00, 648000.00, 706000.00, 0.00, 0.00, 'TRF-1774724364800', 'LiquidityTransfer', 'TRF-1774724364800', 'CASH-HQ -> Brack Bank', NULL, 1, 1, '2026-03-28 18:59:27', '2026-03-28 18:59:27'),
(31, 1, 3, 1, '2026-03-30', 'transfer_in', 'inflow', 103100.00, 706000.00, 809100.00, 0.00, 0.00, 'TRF-1774726599862', 'LiquidityTransfer', 'TRF-1774726599862', 'zero', NULL, 1, 1, '2026-03-28 19:36:44', '2026-03-28 19:36:44'),
(35, 1, 3, 1, '2026-03-31', 'transfer_in', 'inflow', 98000.00, 809100.00, 907100.00, 0.00, 0.00, 'TRF-1774726920174', 'LiquidityTransfer', 'TRF-1774726920174', 'tt', NULL, 1, 1, '2026-03-28 19:42:03', '2026-03-28 19:42:03'),
(40, 1, 3, 1, '2026-04-03', 'transfer_in', 'inflow', 423000.00, 907100.00, 1330100.00, 0.00, 0.00, 'TRF-1775158388155', 'LiquidityTransfer', 'TRF-1775158388155', 'CASH-HQ -> Brack Bank', NULL, 1, 1, '2026-04-02 19:33:08', '2026-04-02 19:33:08'),
(41, 1, 3, 1, '2026-04-03', 'transfer_out', 'outflow', 5000.00, 1330100.00, 1325100.00, 0.00, 0.00, 'TRF-1775158993773', 'LiquidityTransfer', 'TRF-1775158993773', 'Brack Bank -> CASH-HQ', NULL, 1, 1, '2026-04-02 19:43:14', '2026-04-02 19:43:14'),
(42, 1, 1, 3, '2026-04-03', 'transfer_in', 'inflow', 5000.00, 0.00, 5000.00, 0.00, 0.00, 'TRF-1775158993773', 'LiquidityTransfer', 'TRF-1775158993773', 'Brack Bank -> CASH-HQ', NULL, 1, 1, '2026-04-02 19:43:14', '2026-04-02 19:43:14'),
(43, 1, 1, NULL, '2026-04-03', 'closing_submission', 'neutral', 0.00, 4000.00, 4000.00, 4000.00, 0.00, 'CLOSE-2026-04-03', NULL, NULL, 'Closing submitted for CASH-HQ', '', 1, 1, '2026-04-02 19:45:13', '2026-04-02 19:45:13'),
(44, 1, 10, NULL, '2026-04-03', 'closing_submission', 'neutral', 0.00, 23500.00, 23500.00, 23500.00, 0.00, 'CLOSE-2026-04-03', NULL, NULL, 'Closing submitted for Nagad', '', 1, 1, '2026-04-03 10:00:46', '2026-04-03 10:00:46');

-- --------------------------------------------------------

--
-- Table structure for table `materials`
--

CREATE TABLE `materials` (
  `id` int(11) NOT NULL,
  `batch_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `url` varchar(255) NOT NULL,
  `type` enum('document','video','link','meeting') DEFAULT 'document',
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('info','alert','success','warning') DEFAULT 'info',
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `opportunities`
--

CREATE TABLE `opportunities` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL COMMENT 'e.g. "Rashida – PTE Academic Enrollment"',
  `contact_id` int(11) DEFAULT NULL,
  `lead_id` int(11) DEFAULT NULL COMMENT 'Originating lead if converted',
  `stage` enum('qualification','proposal','demo','negotiation','won','lost') DEFAULT 'qualification',
  `value` decimal(12,2) DEFAULT 0.00 COMMENT 'Expected revenue amount in BDT',
  `probability` int(11) DEFAULT 20 COMMENT 'Win probability 0-100%',
  `expected_close` date DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `lost_reason` varchar(255) DEFAULT NULL,
  `invoice_id` int(11) DEFAULT NULL COMMENT 'Linked invoice created on win',
  `course_interest` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `opportunities`
--

INSERT INTO `opportunities` (`id`, `branch_id`, `title`, `contact_id`, `lead_id`, `stage`, `value`, `probability`, `expected_close`, `closed_at`, `assigned_to`, `description`, `lost_reason`, `invoice_id`, `course_interest`, `created_at`, `updated_at`) VALUES
(1, 1, 'Tahsin – PTE Academic Standard', 2, 7, 'won', 15000.00, 100, NULL, '2026-03-27 09:03:18', 1, NULL, NULL, 2, 'PTE Academic Standard', '2026-03-27 09:02:28', '2026-03-27 09:03:18'),
(2, 1, 'Sayemto – PTE Academic Standard', 3, 8, 'won', 15000.00, 100, NULL, '2026-03-31 02:23:36', 1, NULL, NULL, 16, 'PTE Academic Standard', '2026-03-27 11:29:50', '2026-03-31 02:23:36'),
(3, 1, 'TEST  – PTE Academic Standard', 4, 9, 'won', 15000.00, 100, NULL, '2026-03-27 14:43:15', 1, NULL, NULL, 5, 'PTE Academic Standard', '2026-03-27 14:27:31', '2026-03-27 14:43:15'),
(4, 1, 'Abdullah Al Sahaj – PTE Academic Standard', 5, 10, 'won', 15000.00, 100, NULL, '2026-03-27 17:03:48', 1, NULL, NULL, 7, 'PTE Academic Standard', '2026-03-27 17:03:20', '2026-03-27 17:03:48'),
(5, 1, 'Tahsin – PTE Academic Standard', 6, 11, 'won', 15000.00, 100, NULL, '2026-03-27 17:30:10', 1, NULL, NULL, 9, 'PTE Academic Standard', '2026-03-27 17:28:34', '2026-03-27 17:30:10'),
(6, 1, 'Sayem – PTE Academic Standard', 1, 13, 'won', 15000.00, 100, NULL, '2026-03-31 02:20:20', 1, 'Enrollment ID: 15', NULL, 15, 'PTE Academic Standard', '2026-03-31 02:20:03', '2026-03-31 02:20:20'),
(7, 1, 'Sayem – PTE Academic Standard', 7, 14, 'won', 15000.00, 100, NULL, '2026-04-02 18:43:45', 1, 'Enrollment ID: 16', NULL, 17, 'PTE Academic Standard', '2026-04-02 18:43:21', '2026-04-02 18:43:45'),
(8, 1, 'TEST 51025 – Initial Inquiry', 9, 20, 'qualification', 0.00, 20, NULL, NULL, 1, NULL, NULL, NULL, NULL, '2026-04-05 15:46:50', '2026-04-05 15:46:50'),
(9, 1, 'Jane Doe – Imported', 10, 26, 'qualification', 0.00, 20, NULL, NULL, 1, NULL, NULL, NULL, NULL, '2026-04-05 16:06:19', '2026-04-05 16:06:19');

-- --------------------------------------------------------

--
-- Table structure for table `payrolls`
--

CREATE TABLE `payrolls` (
  `id` int(11) NOT NULL,
  `staff_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `month` int(11) NOT NULL,
  `year` int(11) NOT NULL,
  `base_salary` decimal(15,2) NOT NULL,
  `allowances` decimal(15,2) DEFAULT 0.00,
  `deductions` decimal(15,2) DEFAULT 0.00,
  `net_salary` decimal(15,2) NOT NULL,
  `status` enum('draft','paid') DEFAULT 'draft',
  `journal_entry_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payrolls`
--

INSERT INTO `payrolls` (`id`, `staff_id`, `branch_id`, `month`, `year`, `base_salary`, `allowances`, `deductions`, `net_salary`, `status`, `journal_entry_id`, `created_at`, `updated_at`) VALUES
(1, 42, 1, 4, 2026, 20000.00, 0.00, 0.00, 20000.00, 'draft', NULL, '2026-04-02 17:18:11', '2026-04-02 17:18:11');

-- --------------------------------------------------------

--
-- Table structure for table `performance_reviews`
--

CREATE TABLE `performance_reviews` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `reviewer_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `review_period` varchar(50) DEFAULT NULL,
  `ratings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ratings`)),
  `overall_score` decimal(3,1) DEFAULT NULL,
  `strengths` text DEFAULT NULL,
  `improvements` text DEFAULT NULL,
  `goals` text DEFAULT NULL,
  `status` enum('draft','submitted','acknowledged') DEFAULT 'draft',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pte_attempts`
--

CREATE TABLE `pte_attempts` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `student_id` int(11) DEFAULT NULL,
  `task_id` int(11) DEFAULT NULL,
  `response` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`response`)),
  `score` decimal(5,2) DEFAULT NULL,
  `evaluation` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`evaluation`)),
  `is_mock_test` tinyint(1) DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pte_attempts`
--

INSERT INTO `pte_attempts` (`id`, `branch_id`, `student_id`, `task_id`, `response`, `score`, `evaluation`, `is_mock_test`, `created_at`, `updated_at`) VALUES
(4, 1, NULL, 1, '{\"text\":\"Recorded Audio Response [Simulated Transcript]\"}', 34.00, '{\"content\":1,\"fluency\":1,\"pronunciation\":4}', 0, '2026-04-02 17:32:49', '2026-04-02 17:32:49'),
(5, 1, NULL, 3, '{\"text\":\"{\\\"answer\\\":1}\"}', 5.00, '{\"accuracy\":0,\"completion\":1}', 0, '2026-04-02 17:48:38', '2026-04-02 17:48:38'),
(6, 1, NULL, 4, '{\"text\":\"dsfdfd\"}', 5.00, '{\"accuracy\":0,\"completion\":1}', 0, '2026-04-02 20:40:04', '2026-04-02 20:40:04'),
(7, 1, NULL, 2, '{\"text\":\"rerererer\"}', 36.00, '{\"content\":1,\"form\":1,\"grammar\":5,\"vocabulary\":1}', 0, '2026-04-02 20:40:26', '2026-04-02 20:40:26'),
(8, 1, NULL, 3, '{\"text\":\"{\\\"prompt\\\":\\\"The rapid ___ of technology has transformed the way we communicate. (evolution, decline, stability)\\\"}\"}', 11.00, '{\"accuracy\":0,\"completion\":2}', 0, '2026-04-02 22:05:42', '2026-04-02 22:05:42');

-- --------------------------------------------------------

--
-- Table structure for table `pte_tasks`
--

CREATE TABLE `pte_tasks` (
  `id` int(11) NOT NULL,
  `section` enum('speaking','writing','reading','listening') NOT NULL,
  `type` varchar(255) NOT NULL,
  `content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`content`)),
  `correct_answer` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`correct_answer`)),
  `max_score` int(11) DEFAULT 90,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `is_free_available` tinyint(1) DEFAULT 1,
  `is_premium_only` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pte_tasks`
--

INSERT INTO `pte_tasks` (`id`, `section`, `type`, `content`, `correct_answer`, `max_score`, `created_at`, `updated_at`, `is_free_available`, `is_premium_only`) VALUES
(1, 'speaking', 'Read Aloud', '{\"prompt\":\"The study of humanities and social sciences provides students with the critical thinking skills necessary to navigate the complexities of the modern world.\"}', '\"humanities, critical thinking, navigate, modern world\"', 90, '2026-03-26 21:18:54', '2026-03-26 21:18:54', 1, 0),
(2, 'writing', 'Summarize Written Text', '{\"prompt\":\"Climate change is the defining crisis of our time and it is happening even more quickly than we feared. No corner of the globe is immune from the devastating consequences of rising temperatures.\"}', '\"climate change, crisis, devastating, globe, immune\"', 90, '2026-03-26 21:18:55', '2026-03-26 21:18:55', 1, 0),
(3, 'reading', 'Fill in the Blanks', '{\"prompt\":\"The rapid ___ of technology has transformed the way we communicate. (evolution, decline, stability)\"}', '\"evolution\"', 90, '2026-03-26 21:18:56', '2026-03-26 21:18:56', 1, 0),
(4, 'listening', 'Write From Dictation', '{\"prompt\":\"Audio placeholder: Education is the most powerful weapon which you can use to change the world.\"}', '\"education, powerful, weapon, change, world\"', 90, '2026-03-26 21:18:57', '2026-03-26 21:18:57', 1, 0);

-- --------------------------------------------------------

--
-- Table structure for table `rbac_configs`
--

CREATE TABLE `rbac_configs` (
  `id` int(11) NOT NULL,
  `config_json` longtext NOT NULL DEFAULT '{}',
  `custom_roles_json` longtext NOT NULL DEFAULT '[]',
  `updated_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `rbac_configs`
--

INSERT INTO `rbac_configs` (`id`, `config_json`, `custom_roles_json`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, '{\"super_admin\":{\"admin\":{\"enabled\":true,\"features\":{\"cockpit\":true,\"crm\":true,\"students\":true,\"lms\":true,\"pos\":true,\"finance\":true,\"invoices\":true,\"expenses\":true,\"reconciliation\":true,\"budget\":true,\"ledger\":true,\"journal\":true,\"cashflow\":true,\"reports\":true,\"pte\":true,\"erp\":true,\"assets\":true,\"payroll\":true,\"attendance\":true,\"branches\":true,\"automation\":true,\"website\":true,\"rbac\":true}},\"student\":{\"enabled\":true,\"features\":{\"dashboard\":true,\"pte\":true,\"attendance\":true,\"schedule\":true,\"materials\":true,\"billing\":true}},\"teacher\":{\"enabled\":true,\"features\":{\"dashboard\":true,\"batches\":true,\"materials\":true,\"pte\":true,\"attendance\":true,\"reports\":true}},\"accounting\":{\"enabled\":true,\"features\":{\"overview\":true,\"pos\":true,\"reconciliation\":true,\"ledger\":true,\"invoices\":true,\"journal\":true,\"expenses\":true,\"budget\":true,\"cashflow\":true,\"reports\":true}},\"hrm\":{\"enabled\":true,\"features\":{\"dashboard\":true,\"staff\":true,\"attendance\":true,\"payroll\":true,\"leave\":true,\"recruit\":true}},\"brandmanager\":{\"enabled\":true,\"features\":{\"dashboard\":true,\"campaigns\":true,\"social\":true,\"content\":true,\"templates\":true,\"leads\":true}}},\"branch_admin\":{\"admin\":{\"enabled\":true,\"features\":{\"cockpit\":true,\"crm\":true,\"students\":true,\"lms\":true,\"pos\":true,\"finance\":true,\"invoices\":true,\"expenses\":true,\"reconciliation\":true,\"budget\":true,\"ledger\":true,\"journal\":true,\"cashflow\":true,\"reports\":true,\"pte\":true,\"erp\":true,\"assets\":true,\"payroll\":true,\"attendance\":true,\"branches\":true,\"automation\":true,\"website\":true,\"rbac\":true}},\"student\":{\"enabled\":true,\"features\":{\"dashboard\":true,\"pte\":true,\"attendance\":true,\"schedule\":true,\"materials\":true,\"billing\":true}},\"teacher\":{\"enabled\":true,\"features\":{\"dashboard\":true,\"batches\":true,\"materials\":true,\"pte\":true,\"attendance\":true,\"reports\":true}},\"accounting\":{\"enabled\":true,\"features\":{\"overview\":true,\"pos\":true,\"reconciliation\":true,\"ledger\":true,\"invoices\":true,\"journal\":true,\"expenses\":true,\"budget\":true,\"cashflow\":true,\"reports\":true}},\"hrm\":{\"enabled\":true,\"features\":{\"dashboard\":true,\"staff\":true,\"attendance\":true,\"payroll\":true,\"leave\":true,\"recruit\":true}},\"brandmanager\":{\"enabled\":true,\"features\":{\"dashboard\":true,\"campaigns\":true,\"social\":true,\"content\":true,\"templates\":true,\"leads\":true}}},\"accounting\":{\"admin\":{\"enabled\":true,\"features\":{\"cockpit\":false,\"crm\":false,\"students\":true,\"lms\":true,\"pos\":true,\"finance\":true,\"invoices\":true,\"expenses\":true,\"reconciliation\":true,\"budget\":true,\"ledger\":true,\"journal\":true,\"cashflow\":true,\"reports\":true,\"pte\":false,\"erp\":false,\"assets\":true,\"payroll\":true,\"attendance\":true,\"branches\":false,\"automation\":false,\"website\":false,\"rbac\":false}},\"student\":{\"enabled\":true,\"features\":{\"dashboard\":true,\"pte\":false,\"attendance\":false,\"schedule\":false,\"materials\":true,\"billing\":true}},\"teacher\":{\"enabled\":true,\"features\":{\"dashboard\":false,\"batches\":false,\"materials\":false,\"pte\":false,\"attendance\":false,\"reports\":false}},\"accounting\":{\"enabled\":true,\"features\":{\"overview\":true,\"pos\":true,\"reconciliation\":true,\"ledger\":true,\"invoices\":true,\"journal\":true,\"expenses\":true,\"budget\":true,\"cashflow\":true,\"reports\":true}},\"hrm\":{\"enabled\":true,\"features\":{\"dashboard\":false,\"staff\":true,\"attendance\":true,\"payroll\":true,\"leave\":true,\"recruit\":true}},\"brandmanager\":{\"enabled\":false,\"features\":{\"dashboard\":false,\"campaigns\":false,\"social\":false,\"content\":false,\"templates\":false,\"leads\":false}}},\"teacher\":{\"admin\":{\"enabled\":false,\"features\":{\"cockpit\":false,\"crm\":false,\"students\":false,\"lms\":false,\"pos\":false,\"finance\":false,\"invoices\":false,\"expenses\":false,\"reconciliation\":false,\"budget\":false,\"ledger\":false,\"journal\":false,\"cashflow\":false,\"reports\":false,\"pte\":false,\"erp\":false,\"assets\":false,\"payroll\":false,\"attendance\":false,\"branches\":false,\"automation\":false,\"website\":false,\"rbac\":false}},\"student\":{\"enabled\":true,\"features\":{\"dashboard\":true,\"pte\":true,\"attendance\":true,\"schedule\":true,\"materials\":true,\"billing\":true}},\"teacher\":{\"enabled\":true,\"features\":{\"dashboard\":true,\"batches\":true,\"materials\":true,\"pte\":true,\"attendance\":true,\"reports\":true}},\"accounting\":{\"enabled\":false,\"features\":{\"overview\":false,\"pos\":false,\"reconciliation\":false,\"ledger\":false,\"invoices\":false,\"journal\":false,\"expenses\":false,\"budget\":false,\"cashflow\":false,\"reports\":false}},\"hrm\":{\"enabled\":false,\"features\":{\"dashboard\":false,\"staff\":false,\"attendance\":false,\"payroll\":false,\"leave\":false,\"recruit\":false}},\"brandmanager\":{\"enabled\":false,\"features\":{\"dashboard\":false,\"campaigns\":false,\"social\":false,\"content\":false,\"templates\":false,\"leads\":false}}},\"crm\":{\"admin\":{\"enabled\":true,\"features\":{\"cockpit\":false,\"crm\":true,\"students\":true,\"lms\":false,\"pos\":false,\"finance\":false,\"invoices\":false,\"expenses\":false,\"reconciliation\":false,\"budget\":false,\"ledger\":false,\"journal\":false,\"cashflow\":false,\"reports\":false,\"pte\":false,\"erp\":false,\"assets\":false,\"payroll\":false,\"attendance\":true,\"branches\":false,\"automation\":false,\"website\":false,\"rbac\":false}},\"student\":{\"enabled\":false,\"features\":{\"dashboard\":false,\"pte\":false,\"attendance\":false,\"schedule\":false,\"materials\":false,\"billing\":false}},\"teacher\":{\"enabled\":false,\"features\":{\"dashboard\":false,\"batches\":false,\"materials\":false,\"pte\":false,\"attendance\":false,\"reports\":false}},\"accounting\":{\"enabled\":false,\"features\":{\"overview\":false,\"pos\":false,\"reconciliation\":false,\"ledger\":false,\"invoices\":false,\"journal\":false,\"expenses\":false,\"budget\":false,\"cashflow\":false,\"reports\":false}},\"hrm\":{\"enabled\":false,\"features\":{\"dashboard\":false,\"staff\":false,\"attendance\":false,\"payroll\":false,\"leave\":false,\"recruit\":false}},\"brandmanager\":{\"enabled\":false,\"features\":{\"dashboard\":false,\"campaigns\":false,\"social\":false,\"content\":false,\"templates\":false,\"leads\":false}}},\"hrm\":{\"admin\":{\"enabled\":true,\"features\":{\"cockpit\":false,\"crm\":false,\"students\":false,\"lms\":false,\"pos\":false,\"finance\":false,\"invoices\":false,\"expenses\":false,\"reconciliation\":false,\"budget\":false,\"ledger\":false,\"journal\":false,\"cashflow\":false,\"reports\":false,\"pte\":false,\"erp\":false,\"assets\":false,\"payroll\":true,\"attendance\":true,\"branches\":false,\"automation\":false,\"website\":false,\"rbac\":true}},\"student\":{\"enabled\":false,\"features\":{\"dashboard\":false,\"pte\":false,\"attendance\":false,\"schedule\":false,\"materials\":false,\"billing\":false}},\"teacher\":{\"enabled\":false,\"features\":{\"dashboard\":false,\"batches\":false,\"materials\":false,\"pte\":false,\"attendance\":false,\"reports\":false}},\"accounting\":{\"enabled\":false,\"features\":{\"overview\":false,\"pos\":false,\"reconciliation\":false,\"ledger\":false,\"invoices\":false,\"journal\":false,\"expenses\":false,\"budget\":false,\"cashflow\":false,\"reports\":false}},\"hrm\":{\"enabled\":true,\"features\":{\"dashboard\":true,\"staff\":true,\"attendance\":true,\"payroll\":true,\"leave\":true,\"recruit\":true}},\"brandmanager\":{\"enabled\":false,\"features\":{\"dashboard\":false,\"campaigns\":false,\"social\":false,\"content\":false,\"templates\":false,\"leads\":false}}},\"staff\":{\"admin\":{\"enabled\":false,\"features\":{\"cockpit\":false,\"crm\":false,\"students\":false,\"lms\":false,\"pos\":false,\"finance\":false,\"invoices\":false,\"expenses\":false,\"reconciliation\":false,\"budget\":false,\"ledger\":false,\"journal\":false,\"cashflow\":false,\"reports\":false,\"pte\":false,\"erp\":false,\"assets\":false,\"payroll\":false,\"attendance\":false,\"branches\":false,\"automation\":false,\"website\":false,\"rbac\":false}},\"student\":{\"enabled\":false,\"features\":{\"dashboard\":false,\"pte\":false,\"attendance\":false,\"schedule\":false,\"materials\":false,\"billing\":false}},\"teacher\":{\"enabled\":false,\"features\":{\"dashboard\":false,\"batches\":false,\"materials\":false,\"pte\":false,\"attendance\":false,\"reports\":false}},\"accounting\":{\"enabled\":false,\"features\":{\"overview\":false,\"pos\":false,\"reconciliation\":false,\"ledger\":false,\"invoices\":false,\"journal\":false,\"expenses\":false,\"budget\":false,\"cashflow\":false,\"reports\":false}},\"hrm\":{\"enabled\":false,\"features\":{\"dashboard\":false,\"staff\":false,\"attendance\":false,\"payroll\":false,\"leave\":false,\"recruit\":false}},\"brandmanager\":{\"enabled\":false,\"features\":{\"dashboard\":false,\"campaigns\":false,\"social\":false,\"content\":false,\"templates\":false,\"leads\":false}}},\"unassigned\":{\"admin\":{\"enabled\":false,\"features\":{\"cockpit\":false,\"crm\":false,\"students\":false,\"lms\":false,\"pos\":false,\"finance\":false,\"invoices\":false,\"expenses\":false,\"reconciliation\":false,\"budget\":false,\"ledger\":false,\"journal\":false,\"cashflow\":false,\"reports\":false,\"pte\":false,\"erp\":false,\"assets\":false,\"payroll\":false,\"attendance\":false,\"branches\":false,\"automation\":false,\"website\":false,\"rbac\":false}},\"student\":{\"enabled\":false,\"features\":{\"dashboard\":false,\"pte\":false,\"attendance\":false,\"schedule\":false,\"materials\":false,\"billing\":false}},\"teacher\":{\"enabled\":false,\"features\":{\"dashboard\":false,\"batches\":false,\"materials\":false,\"pte\":false,\"attendance\":false,\"reports\":false}},\"accounting\":{\"enabled\":false,\"features\":{\"overview\":false,\"pos\":false,\"reconciliation\":false,\"ledger\":false,\"invoices\":false,\"journal\":false,\"expenses\":false,\"budget\":false,\"cashflow\":false,\"reports\":false}},\"hrm\":{\"enabled\":false,\"features\":{\"dashboard\":false,\"staff\":false,\"attendance\":false,\"payroll\":false,\"leave\":false,\"recruit\":false}},\"brandmanager\":{\"enabled\":false,\"features\":{\"dashboard\":false,\"campaigns\":false,\"social\":false,\"content\":false,\"templates\":false,\"leads\":false}}}}', '[]', 1, '2026-04-02 18:07:31', '2026-04-02 19:16:15');

-- --------------------------------------------------------

--
-- Table structure for table `reconciliations`
--

CREATE TABLE `reconciliations` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `branch_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `bank_account_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `statement_date` date DEFAULT NULL,
  `reconciled_at` datetime DEFAULT NULL,
  `status` enum('draft','completed') DEFAULT 'draft',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reconciliation_events`
--

CREATE TABLE `reconciliation_events` (
  `id` int(11) NOT NULL,
  `session_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `details` text DEFAULT NULL,
  `old_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_value`)),
  `new_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_value`)),
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reconciliation_events`
--

INSERT INTO `reconciliation_events` (`id`, `session_id`, `branch_id`, `user_id`, `action`, `details`, `old_value`, `new_value`, `created_at`, `updated_at`) VALUES
(3, 3, 1, 1, 'closing_submission', 'nothing', '{\"expected\":-88000}', '{\"actual\":0,\"variance\":88000,\"movement_id\":6}', '2026-03-27 20:59:51', '2026-03-27 20:59:51'),
(4, 3, 1, 1, 'opening_balance_update', 'opening balance', '{\"opening_balance\":0}', '{\"opening_balance\":15000,\"movement_id\":7}', '2026-03-27 21:02:05', '2026-03-27 21:02:05'),
(5, 3, 1, 1, 'closing_submission', '5000 cost charge', '{\"expected\":15000}', '{\"actual\":10000,\"variance\":-5000,\"movement_id\":8}', '2026-03-27 21:06:19', '2026-03-27 21:06:19'),
(6, 3, 1, 1, 'closing_submission', 'today closing', '{\"expected\":-88000}', '{\"actual\":10000,\"variance\":98000,\"movement_id\":11}', '2026-03-27 21:14:22', '2026-03-27 21:14:22'),
(7, 3, 1, 1, 'opening_balance_update', 'start with zero', '{\"opening_balance\":-138000}', '{\"opening_balance\":0,\"movement_id\":12}', '2026-03-27 21:15:37', '2026-03-27 21:15:37'),
(8, 3, 1, 1, 'closing_submission', '10k count', '{\"expected\":50000}', '{\"actual\":5000,\"variance\":-45000,\"movement_id\":13}', '2026-03-27 21:16:08', '2026-03-27 21:16:08'),
(9, 3, 1, 1, 'closing_submission', '20k check', '{\"expected\":50000}', '{\"actual\":0,\"variance\":-50000,\"movement_id\":14}', '2026-03-27 21:38:08', '2026-03-27 21:38:08'),
(10, 4, 1, 1, 'opening_balance_update', 'set zero', '{\"opening_balance\":50000}', '{\"opening_balance\":0,\"movement_id\":15}', '2026-03-27 21:39:04', '2026-03-27 21:39:04'),
(11, 4, 1, 1, 'closing_submission', '50k check', '{\"expected\":50000}', '{\"actual\":50000,\"variance\":0,\"movement_id\":16}', '2026-03-27 21:40:12', '2026-03-27 21:40:12'),
(12, 3, 1, 1, 'opening_balance_update', 'ch#', '{\"opening_balance\":-138000}', '{\"opening_balance\":103000,\"movement_id\":17}', '2026-03-27 21:42:31', '2026-03-27 21:42:31'),
(13, 5, 1, 1, 'opening_balance_update', 'set zero', '{\"opening_balance\":-5000}', '{\"opening_balance\":0,\"movement_id\":18}', '2026-03-27 21:43:39', '2026-03-27 21:43:39'),
(14, 3, 1, 1, 'opening_balance_update', 'io\'', '{\"opening_balance\":-133000}', '{\"opening_balance\":5000,\"movement_id\":19}', '2026-03-28 18:52:18', '2026-03-28 18:52:18'),
(15, 3, 1, 1, 'closing_submission', 'Today Closing is zero', '{\"expected\":-53000}', '{\"actual\":0,\"variance\":53000,\"movement_id\":24}', '2026-03-28 18:57:03', '2026-03-28 18:57:03'),
(16, 4, 1, 1, 'opening_balance_update', 'check without evidence why 5000?', '{\"opening_balance\":-53000}', '{\"opening_balance\":5000,\"movement_id\":25}', '2026-03-28 18:57:58', '2026-03-28 18:57:58'),
(17, 4, 1, 1, 'closing_submission', 'nothing balance', '{\"expected\":-103000}', '{\"actual\":0,\"variance\":103000,\"movement_id\":28}', '2026-03-28 19:00:18', '2026-03-28 19:00:18'),
(18, 6, 1, 1, 'opening_balance_update', 'stest', '{\"opening_balance\":-103000}', '{\"opening_balance\":100,\"movement_id\":29}', '2026-03-28 19:01:17', '2026-03-28 19:01:17'),
(19, 6, 1, 1, 'closing_submission', 'submit zero', '{\"expected\":-98000}', '{\"actual\":0,\"variance\":98000,\"movement_id\":32}', '2026-03-28 19:39:32', '2026-03-28 19:39:32'),
(20, 7, 1, 1, 'opening_balance_update', 'test', '{\"opening_balance\":-98000}', '{\"opening_balance\":0,\"movement_id\":33}', '2026-03-28 19:40:39', '2026-03-28 19:40:39'),
(21, 7, 1, 1, 'closing_submission', 'sub mit closing', '{\"expected\":-45000}', '{\"actual\":-45000,\"variance\":0,\"movement_id\":37}', '2026-03-28 19:47:01', '2026-03-28 19:47:01'),
(22, 8, 1, 1, 'closing_submission', 'Closing submitted', '{\"expected\":-45000}', '{\"actual\":-45000,\"variance\":0,\"movement_id\":38}', '2026-04-02 18:48:05', '2026-04-02 18:48:05'),
(23, 8, 1, 1, 'closing_submission', 'Closing submitted', '{\"expected\":4000}', '{\"actual\":4000,\"variance\":0,\"movement_id\":43}', '2026-04-02 19:45:14', '2026-04-02 19:45:14'),
(24, 8, 1, 1, 'closing_submission', 'Closing submitted', '{\"expected\":23500}', '{\"actual\":23500,\"variance\":0,\"movement_id\":44}', '2026-04-03 10:00:47', '2026-04-03 10:00:47');

-- --------------------------------------------------------

--
-- Table structure for table `reconciliation_lines`
--

CREATE TABLE `reconciliation_lines` (
  `id` int(11) NOT NULL,
  `session_id` int(11) NOT NULL,
  `mapping_id` int(11) DEFAULT NULL,
  `account_id` int(11) DEFAULT NULL,
  `bank_account_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `channel` varchar(255) NOT NULL,
  `operational_inflows` decimal(15,2) DEFAULT 0.00,
  `operational_outflows` decimal(15,2) DEFAULT 0.00,
  `operational_net` decimal(15,2) DEFAULT 0.00,
  `ledger_debit` decimal(15,2) DEFAULT 0.00,
  `ledger_credit` decimal(15,2) DEFAULT 0.00,
  `ledger_net` decimal(15,2) DEFAULT 0.00,
  `variance` decimal(15,2) DEFAULT 0.00,
  `status` enum('matched','variance_minor','variance_major','needs_review') DEFAULT 'matched',
  `notes` text DEFAULT NULL,
  `tx_count` int(11) DEFAULT 0,
  `expense_count` int(11) DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `opening_balance` decimal(15,2) DEFAULT 0.00,
  `expected_closing_balance` decimal(15,2) DEFAULT 0.00,
  `actual_closing_balance` decimal(15,2) DEFAULT 0.00,
  `discrepancy_amount` decimal(15,2) DEFAULT 0.00,
  `discrepancy_reason` text DEFAULT NULL,
  `submitted_by` int(11) DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reconciliation_lines`
--

INSERT INTO `reconciliation_lines` (`id`, `session_id`, `mapping_id`, `account_id`, `bank_account_id`, `channel`, `operational_inflows`, `operational_outflows`, `operational_net`, `ledger_debit`, `ledger_credit`, `ledger_net`, `variance`, `status`, `notes`, `tx_count`, `expense_count`, `created_at`, `updated_at`, `opening_balance`, `expected_closing_balance`, `actual_closing_balance`, `discrepancy_amount`, `discrepancy_reason`, `submitted_by`, `submitted_at`) VALUES
(1, 3, NULL, 1, NULL, 'cash', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'variance_major', 'io\'', 0, 0, '2026-03-27 20:59:48', '2026-03-28 18:57:03', -133000.00, -53000.00, 0.00, 53000.00, 'Today Closing is zero', 1, '2026-03-28 18:57:03'),
(2, 3, NULL, 9, NULL, 'mfs', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'variance_major', 'opening balance', 0, 0, '2026-03-27 21:02:03', '2026-03-27 21:06:18', 0.00, 15000.00, 10000.00, -5000.00, '5000 cost charge', 1, '2026-03-27 21:06:18'),
(3, 4, NULL, 1, NULL, 'cash', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'variance_major', 'check without evidence why 5000?', 0, 0, '2026-03-27 21:39:00', '2026-03-28 19:00:18', -53000.00, -103000.00, 0.00, 103000.00, 'nothing balance', 1, '2026-03-28 19:00:18'),
(4, 5, NULL, 1, NULL, 'cash', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'matched', 'set zero', 0, 0, '2026-03-27 21:43:36', '2026-03-27 21:43:39', 0.00, 0.00, 0.00, 0.00, NULL, NULL, NULL),
(5, 6, NULL, 1, NULL, 'cash', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'variance_major', 'stest', 0, 0, '2026-03-28 19:01:14', '2026-03-28 19:39:31', 5100.00, -98000.00, 0.00, 98000.00, 'submit zero', 1, '2026-03-28 19:39:31'),
(6, 7, NULL, 1, NULL, 'cash', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'matched', 'test', 0, 0, '2026-03-28 19:40:36', '2026-03-28 19:47:00', 53000.00, -45000.00, -45000.00, 0.00, 'sub mit closing', 1, '2026-03-28 19:47:00'),
(7, 8, NULL, 1, NULL, 'cash', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'matched', NULL, 0, 0, '2026-04-02 18:48:04', '2026-04-02 19:45:14', 0.00, 4000.00, 4000.00, 0.00, '', 1, '2026-04-02 19:45:14'),
(8, 8, NULL, 10, NULL, 'mfs', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'matched', NULL, 0, 0, '2026-04-03 10:00:45', '2026-04-03 10:00:46', 0.00, 23500.00, 23500.00, 0.00, '', 1, '2026-04-03 10:00:46');

-- --------------------------------------------------------

--
-- Table structure for table `reconciliation_matches`
--

CREATE TABLE `reconciliation_matches` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `reconciliation_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `statement_line_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `journal_line_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reconciliation_sessions`
--

CREATE TABLE `reconciliation_sessions` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `recon_date` date NOT NULL,
  `status` enum('draft','reviewed','approved','locked') DEFAULT 'draft',
  `total_inflows` decimal(15,2) DEFAULT 0.00,
  `total_outflows` decimal(15,2) DEFAULT 0.00,
  `total_ledger_net` decimal(15,2) DEFAULT 0.00,
  `total_variance` decimal(15,2) DEFAULT 0.00,
  `tolerance_bdt` decimal(10,2) DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `reopen_reason` text DEFAULT NULL,
  `prepared_by` int(11) DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `locked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reconciliation_sessions`
--

INSERT INTO `reconciliation_sessions` (`id`, `branch_id`, `recon_date`, `status`, `total_inflows`, `total_outflows`, `total_ledger_net`, `total_variance`, `tolerance_bdt`, `notes`, `reopen_reason`, `prepared_by`, `reviewed_by`, `approved_by`, `locked_at`, `created_at`, `updated_at`) VALUES
(3, 1, '2026-03-28', 'draft', 0.00, 0.00, 0.00, 339000.00, 0.00, NULL, NULL, 1, NULL, NULL, NULL, '2026-03-27 20:59:47', '2026-03-28 18:57:03'),
(4, 1, '2026-03-29', 'draft', 0.00, 0.00, 0.00, 103000.00, 0.00, NULL, NULL, 1, NULL, NULL, NULL, '2026-03-27 21:38:59', '2026-03-28 19:00:18'),
(5, 1, '2026-03-27', 'draft', 0.00, 0.00, 0.00, 0.00, 0.00, NULL, NULL, 1, NULL, NULL, NULL, '2026-03-27 21:43:35', '2026-03-27 21:43:35'),
(6, 1, '2026-03-30', 'draft', 0.00, 0.00, 0.00, 98000.00, 0.00, NULL, NULL, 1, NULL, NULL, NULL, '2026-03-28 19:01:13', '2026-03-28 19:39:32'),
(7, 1, '2026-03-31', 'draft', 0.00, 0.00, 0.00, 0.00, 0.00, NULL, NULL, 1, NULL, NULL, NULL, '2026-03-28 19:40:35', '2026-03-28 19:47:00'),
(8, 1, '2026-04-03', 'draft', 0.00, 0.00, 0.00, 0.00, 0.00, NULL, NULL, 1, NULL, NULL, NULL, '2026-04-02 18:48:04', '2026-04-03 10:00:46');

-- --------------------------------------------------------

--
-- Table structure for table `rooms`
--

CREATE TABLE `rooms` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `floor` varchar(255) DEFAULT NULL,
  `capacity` int(11) DEFAULT NULL,
  `facilities` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`facilities`)),
  `status` enum('free','occupied','booked','maintenance') DEFAULT 'free',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `room_bookings`
--

CREATE TABLE `room_bookings` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `room_id` int(11) DEFAULT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `shifts`
--

CREATE TABLE `shifts` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `color` varchar(7) DEFAULT '#00D4FF',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staff_attendance`
--

CREATE TABLE `staff_attendance` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `check_in` time DEFAULT NULL,
  `check_out` time DEFAULT NULL,
  `status` enum('present','absent','late','half_day','on_leave') DEFAULT 'absent',
  `method` enum('manual','biometric','qr') DEFAULT 'manual',
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `staff_attendance`
--

INSERT INTO `staff_attendance` (`id`, `user_id`, `branch_id`, `date`, `check_in`, `check_out`, `status`, `method`, `notes`, `created_at`, `updated_at`) VALUES
(1, 45, 1, '2026-04-02', '02:21:00', '02:29:00', 'present', 'manual', NULL, '2026-04-02 19:56:34', '2026-04-02 20:29:23'),
(2, 1, 1, '2026-04-02', '03:19:00', NULL, 'present', 'manual', NULL, '2026-04-02 20:35:25', '2026-04-02 21:19:46'),
(4, 42, 1, '2026-04-03', NULL, NULL, 'absent', 'manual', NULL, '2026-04-02 20:43:18', '2026-04-02 20:43:18'),
(5, 1, 1, '2026-04-03', NULL, NULL, 'present', 'manual', 'FORGOT', '2026-04-02 20:44:57', '2026-04-02 20:44:57'),
(6, 45, 1, '2026-04-03', NULL, NULL, 'present', 'manual', 'FORGOT', '2026-04-02 20:45:05', '2026-04-02 20:45:05'),
(7, 47, 1, '2026-04-03', NULL, NULL, 'absent', 'manual', NULL, '2026-04-02 20:45:08', '2026-04-02 20:45:08'),
(8, 46, 1, '2026-04-03', NULL, NULL, 'absent', 'manual', NULL, '2026-04-02 20:45:08', '2026-04-02 20:45:08'),
(9, 49, 1, '2026-04-03', NULL, NULL, 'absent', 'manual', NULL, '2026-04-02 20:45:08', '2026-04-02 20:45:08'),
(10, 1, 1, '2026-04-05', NULL, '23:58:00', 'present', 'manual', NULL, '2026-04-05 15:17:36', '2026-04-05 17:58:34');

-- --------------------------------------------------------

--
-- Table structure for table `staff_documents`
--

CREATE TABLE `staff_documents` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `category` enum('contract','id','certificate','tax','other') DEFAULT 'other',
  `file_url` varchar(500) NOT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `uploaded_by` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `staff_documents`
--

INSERT INTO `staff_documents` (`id`, `user_id`, `branch_id`, `title`, `category`, `file_url`, `file_type`, `expiry_date`, `uploaded_by`, `notes`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'TEST', 'contract', '/uploads/doc_1775163020772_finance-report-2026-04-01-to-2026-04-02-2.pdf', 'application/pdf', '2026-04-03', 1, NULL, '2026-04-02 20:50:20', '2026-04-02 20:50:20'),
(2, 42, 1, 'TES', 'other', '/uploads/doc_1775170421770_Attendance_Sheet_2026-04-02.pdf', 'application/pdf', NULL, 1, NULL, '2026-04-02 22:53:41', '2026-04-02 22:53:41'),
(3, 1, 1, 'TESA', 'other', '/uploads/doc_1775170431503_Attendance_Sheet_2026-04-02-1.pdf', 'application/pdf', NULL, 1, NULL, '2026-04-02 22:53:51', '2026-04-02 22:53:51');

-- --------------------------------------------------------

--
-- Table structure for table `staff_profiles`
--

CREATE TABLE `staff_profiles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `designation` varchar(255) NOT NULL,
  `base_salary` decimal(15,2) NOT NULL DEFAULT 0.00,
  `bank_name` varchar(255) DEFAULT NULL,
  `account_no` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `father_name` varchar(255) DEFAULT NULL,
  `mother_name` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `contact_details` varchar(255) DEFAULT NULL,
  `educational_background` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`educational_background`)),
  `work_experience` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`work_experience`)),
  `joining_date` date DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `emergency_contact` varchar(255) DEFAULT NULL,
  `blood_group` varchar(5) DEFAULT NULL,
  `nid_number` varchar(20) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `marital_status` enum('single','married','divorced','widowed') DEFAULT NULL,
  `profile_photo` varchar(500) DEFAULT NULL,
  `reports_to` int(11) DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `staff_profiles`
--

INSERT INTO `staff_profiles` (`id`, `user_id`, `branch_id`, `designation`, `base_salary`, `bank_name`, `account_no`, `created_at`, `updated_at`, `father_name`, `mother_name`, `address`, `contact_details`, `educational_background`, `work_experience`, `joining_date`, `phone`, `emergency_contact`, `blood_group`, `nid_number`, `date_of_birth`, `gender`, `marital_status`, `profile_photo`, `reports_to`, `department`) VALUES
(1, 42, 1, 'Trainer', 20000.00, '', '', '2026-03-27 19:22:28', '2026-03-27 19:22:28', '', '', '', '', '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(2, 49, 1, 'rtre', 2322.00, '', '', '2026-04-02 17:20:14', '2026-04-02 17:20:14', '', '', '', '', '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `staff_schedules`
--

CREATE TABLE `staff_schedules` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `shift_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `guardian_id` int(11) DEFAULT NULL,
  `enrollment_date` date DEFAULT NULL,
  `status` enum('active','graduated','dropped') DEFAULT 'active',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `middle_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `father_name` varchar(255) DEFAULT NULL,
  `mother_name` varchar(255) DEFAULT NULL,
  `mobile_no` varchar(255) DEFAULT NULL,
  `nid_birth_cert` varchar(255) DEFAULT NULL,
  `current_address` text DEFAULT NULL,
  `permanent_address` text DEFAULT NULL,
  `passport_no` varchar(255) DEFAULT NULL,
  `photograph_url` varchar(255) DEFAULT NULL,
  `educational_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`educational_details`)),
  `employment_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`employment_details`)),
  `plan_type` enum('free','premium') DEFAULT 'free',
  `premium_start_date` datetime DEFAULT NULL,
  `premium_expiry_date` datetime DEFAULT NULL,
  `active_devices` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`active_devices`)),
  `target_score` int(11) DEFAULT 79,
  `exam_date` date DEFAULT NULL,
  `post_course_goal_type` enum('specific_country','another_purpose') DEFAULT NULL,
  `target_country` varchar(255) DEFAULT NULL,
  `english_level` enum('beginner','intermediate','expert') DEFAULT NULL,
  `final_course_result` varchar(255) DEFAULT NULL,
  `success_destination_country` varchar(255) DEFAULT NULL,
  `success_notes` text DEFAULT NULL,
  `success_recorded_at` datetime DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `religion` varchar(255) DEFAULT NULL,
  `nationality` varchar(255) DEFAULT 'Bangladeshi',
  `gender` enum('male','female','other') DEFAULT NULL,
  `blood_group` varchar(255) DEFAULT NULL,
  `marital_status` enum('single','married','divorced','widowed') DEFAULT NULL,
  `emergency_contact_name` varchar(255) DEFAULT NULL,
  `emergency_contact_relation` varchar(255) DEFAULT NULL,
  `emergency_contact_phone` varchar(255) DEFAULT NULL,
  `passport_expiry` date DEFAULT NULL,
  `visa_status` varchar(255) DEFAULT NULL,
  `profession` varchar(255) DEFAULT NULL,
  `lead_source` enum('facebook','instagram','google','referral','walk_in','website','newspaper','event','other') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`id`, `user_id`, `branch_id`, `batch_id`, `guardian_id`, `enrollment_date`, `status`, `created_at`, `updated_at`, `first_name`, `middle_name`, `last_name`, `father_name`, `mother_name`, `mobile_no`, `nid_birth_cert`, `current_address`, `permanent_address`, `passport_no`, `photograph_url`, `educational_details`, `employment_details`, `plan_type`, `premium_start_date`, `premium_expiry_date`, `active_devices`, `target_score`, `exam_date`, `post_course_goal_type`, `target_country`, `english_level`, `final_course_result`, `success_destination_country`, `success_notes`, `success_recorded_at`, `date_of_birth`, `religion`, `nationality`, `gender`, `blood_group`, `marital_status`, `emergency_contact_name`, `emergency_contact_relation`, `emergency_contact_phone`, `passport_expiry`, `visa_status`, `profession`, `lead_source`) VALUES
(1, 4, 1, 1, NULL, '2026-03-24', 'active', '2026-03-24 17:31:49', '2026-03-24 17:31:49', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'free', NULL, NULL, NULL, 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(2, 5, 1, 1, NULL, '2026-03-25', 'active', '2026-03-24 18:22:35', '2026-03-31 02:20:02', 'Sayem', 'Al', 'test', '', '', '01871186562', '', '', '', '', '', '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, NULL, 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(3, 6, 1, NULL, NULL, '2026-03-27', 'active', '2026-03-27 09:03:17', '2026-03-27 09:03:17', 'Tahsin', NULL, '', NULL, NULL, '019893', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(4, 7, 1, 1, NULL, '2026-03-27', 'active', '2026-03-27 09:45:37', '2026-03-27 09:45:37', 'SAHAJ', 'AL', 'REDOWAN', 'red', 'fg', '0188334', '', '', '', '', '', '[{\"level\":\"SSC or Equivalent\",\"institution\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"level\":\"HSC or Equivalent\",\"institution\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"level\":\"Under-grad\",\"institution\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"level\":\"Post-grad\",\"institution\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', '[{\"company\":\"\",\"designation\":\"\",\"tenure\":\"\"}]', 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(5, 8, 1, 3, NULL, '2026-03-27', 'active', '2026-03-27 09:48:13', '2026-03-27 10:20:19', 'test', 'test', 'test', 'ef', 'rf', '0403', '', '', '', '', '', '[{\"level\":\"SSC or Equivalent\",\"institution\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"level\":\"HSC or Equivalent\",\"institution\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"level\":\"Under-grad\",\"institution\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"level\":\"Post-grad\",\"institution\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', '[{\"company\":\"\",\"designation\":\"\",\"tenure\":\"\"}]', 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(16, 19, 1, 1, NULL, '2026-03-27', 'active', '2026-03-27 14:43:08', '2026-03-27 14:43:08', 'TEST', NULL, '', NULL, NULL, '03', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(17, 34, 1, 1, NULL, '2026-03-27', 'active', '2026-03-27 16:58:33', '2026-03-27 16:59:12', 'TEST', NULL, 'STUDENT', '', '', '01493', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(18, 35, 1, 1, NULL, '2026-03-27', 'active', '2026-03-27 17:03:46', '2026-03-27 17:04:20', 'Abdullah', NULL, 'Al Sahaj', NULL, NULL, '034', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(19, 36, 1, 3, NULL, '2026-03-27', 'active', '2026-03-27 17:07:58', '2026-03-27 17:07:58', 'Sudha New', NULL, 'Test', '', '', '093043', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(20, 37, 1, 1, NULL, '2026-03-27', 'active', '2026-03-27 17:30:08', '2026-03-27 17:30:08', 'Tahsin', NULL, '', NULL, NULL, '0343', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(21, 38, 1, 1, NULL, '2026-03-27', 'active', '2026-03-27 17:34:17', '2026-03-27 17:34:17', 'Success', NULL, 'Student', '', '', '34333', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(22, 39, 1, 3, NULL, '2026-03-27', 'active', '2026-03-27 17:42:16', '2026-03-27 17:42:16', 'Test', NULL, 'TEST', '', '', '3432', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(23, 40, 1, 3, NULL, '2026-03-27', 'active', '2026-03-27 17:49:42', '2026-04-03 06:44:55', 'ABDULLAH AL ', NULL, 'REDOWAN', 'Mohi Uddin', 'Rahima Akter', '01871186562', '2369656', 'Kallanpur, Dhaka', 'Feni Sonagazi', 'BM25666', '/uploads/student_1775197864217_510469081_9836623169770265_4012353025184250297_n.jpg', '[{\"exam_name\":\"SSC\",\"institution_name\":\"AHA\",\"passing_year\":\"2014\",\"result\":\"TEST\"},{\"exam_name\":\"HSC\",\"institution_name\":\"BMARPC\",\"passing_year\":\"2016\",\"result\":\"TEST\"},{\"exam_name\":\"B.SC\",\"institution_name\":\"NSU\",\"passing_year\":\"2021\",\"result\":\"TEST\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, 'specific_country', 'Australia', 'intermediate', NULL, NULL, NULL, NULL, '1995-08-05', 'Islam', 'Bangladeshi', 'male', 'B+', 'married', 'Shajnen Akter', 'Spouse', '0181115555', '2026-02-01', 'pending', 'IT', 'facebook'),
(24, 41, 1, 3, NULL, '2026-03-28', 'active', '2026-03-27 18:10:26', '2026-03-27 18:10:26', 'TEST', NULL, 'TES', '', '', '43', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(25, 43, 1, 1, NULL, '2026-03-28', 'active', '2026-03-27 21:11:23', '2026-03-27 21:11:23', 'TEST', NULL, 'TEST', '', '', '343', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(26, 50, 1, 1, NULL, '2026-04-03', 'active', '2026-04-02 18:43:20', '2026-04-02 23:10:31', 'Abdullah ', NULL, 'Al Redowan', 'Mohi Uddin', 'Rahima Akter', '0156955545', '23369565', 'Dhaka', 'Feni, Sonagazi', NULL, '/uploads/student_1775170840112_CD FINAL LOGO(1).png', '[{\"exam_name\":\"SSC\",\"institution_name\":\"AHA\",\"passing_year\":\"2014\",\"result\":\"5\"},{\"exam_name\":\"HSC\",\"institution_name\":\"RIFELS\",\"passing_year\":\"2016\",\"result\":\"5\"}]', '\"IT\"', 'free', NULL, NULL, '[]', 79, NULL, 'specific_country', NULL, 'intermediate', NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(27, 51, 1, NULL, NULL, '2026-04-03', 'active', '2026-04-02 22:10:29', '2026-04-02 22:11:05', 'TEST 55', NULL, 'er', 'dfsf', 'fsd', '3343', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, 'another_purpose', NULL, 'beginner', NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(28, 52, 1, 4, NULL, '2026-04-03', 'active', '2026-04-03 06:35:15', '2026-04-03 06:35:15', 'REDOWAN ', NULL, 'SAYEM', '', '', '0155', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(255) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_secret` tinyint(1) DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `category` varchar(255) DEFAULT 'general'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `system_settings`
--

INSERT INTO `system_settings` (`id`, `setting_key`, `setting_value`, `description`, `is_secret`, `created_at`, `updated_at`, `category`) VALUES
(1, 'SMTP_HOST', 'smtp.gmail.com', 'Outgoing Mail Server (SMTP)', 0, '2026-04-02 20:26:27', '2026-04-05 15:16:41', 'general'),
(2, 'SMTP_PORT', '465', 'SMTP Port', 0, '2026-04-02 20:26:27', '2026-04-05 15:16:41', 'general'),
(3, 'SMTP_USER', 'redowansayem73@gmail.com', 'SMTP Username / Email', 0, '2026-04-02 20:26:28', '2026-04-05 15:16:41', 'general'),
(4, 'SMTP_PASS', '0e2b900206a14eeac34c99b4e952732b:01fc62497503bcfaced406fd18a96f527bb734e87a33015951ee333610642421', 'SMTP Password', 1, '2026-04-02 20:26:28', '2026-04-05 15:16:41', 'general'),
(5, 'SMS_API_KEY', '', 'Alpha SMS / BulkSMSBD API Key', 1, '2026-04-02 20:26:28', '2026-04-02 20:26:28', 'general'),
(6, 'SMS_SENDER_ID', '', 'Approved Sender ID', 0, '2026-04-02 20:26:28', '2026-04-02 20:26:28', 'general'),
(11, 'FB_PIXEL_ID', '', 'Facebook Pixel ID', 0, '2026-04-05 17:00:50', '2026-04-05 17:00:50', 'facebook'),
(12, 'FB_CAPI_TOKEN', '', 'Conversions API Access Token', 1, '2026-04-05 17:00:50', '2026-04-05 17:00:50', 'facebook'),
(13, 'FB_TEST_EVENT_CODE', '', 'Test Event Code (optional, for debugging)', 0, '2026-04-05 17:00:50', '2026-04-05 17:00:50', 'facebook'),
(14, 'TIKTOK_PIXEL_ID', '', 'TikTok Pixel ID', 0, '2026-04-05 17:00:51', '2026-04-05 17:00:51', 'tiktok'),
(15, 'TIKTOK_ACCESS_TOKEN', '', 'TikTok Events API Access Token', 1, '2026-04-05 17:00:51', '2026-04-05 17:00:51', 'tiktok'),
(16, 'TIKTOK_TEST_EVENT_CODE', '', 'Test Event Code (optional)', 0, '2026-04-05 17:00:51', '2026-04-05 17:00:51', 'tiktok'),
(17, 'GA4_MEASUREMENT_ID', '', 'GA4 Measurement ID (G-XXXXXXXXXX)', 0, '2026-04-05 17:00:51', '2026-04-05 17:00:51', 'google'),
(18, 'GA4_API_SECRET', '', 'GA4 Measurement Protocol API Secret', 1, '2026-04-05 17:00:51', '2026-04-05 17:00:51', 'google'),
(19, 'GTM_CONTAINER_ID', '', 'Google Tag Manager Container ID (GTM-XXXXXXX)', 0, '2026-04-05 17:00:51', '2026-04-05 17:00:51', 'google'),
(20, 'GOOGLE_SEARCH_CONSOLE_META', '', 'Search Console Verification Meta Tag Content', 0, '2026-04-05 17:00:51', '2026-04-05 17:00:51', 'google'),
(21, 'GOOGLE_ADS_ID', '', 'Google Ads Conversion ID (AW-XXXXXXXXX)', 0, '2026-04-05 17:00:51', '2026-04-05 17:00:51', 'google'),
(22, 'GOOGLE_ADS_CONVERSION_LABEL', '', 'Google Ads Conversion Label', 0, '2026-04-05 17:00:51', '2026-04-05 17:00:51', 'google'),
(23, 'SEO_SITE_TITLE', 'Language Academy', 'Default Site Title', 0, '2026-04-05 17:00:52', '2026-04-05 17:00:52', 'seo'),
(24, 'SEO_META_DESCRIPTION', '', 'Default Meta Description', 0, '2026-04-05 17:00:52', '2026-04-05 17:00:52', 'seo'),
(25, 'SEO_META_KEYWORDS', '', 'Default Meta Keywords (comma-separated)', 0, '2026-04-05 17:00:52', '2026-04-05 17:00:52', 'seo'),
(26, 'SEO_OG_IMAGE', '', 'Default Open Graph Image URL', 0, '2026-04-05 17:00:52', '2026-04-05 17:00:52', 'seo'),
(27, 'ROBOTS_TXT_EXTRA', '', 'Extra Robots.txt Rules', 0, '2026-04-05 17:00:52', '2026-04-05 17:00:52', 'seo'),
(28, 'SOCIAL_FACEBOOK', 'https://facebook.com/languageacademybd', 'Facebook Page URL', 0, '2026-04-05 17:00:52', '2026-04-05 17:00:52', 'social'),
(29, 'SOCIAL_INSTAGRAM', 'https://instagram.com/languageacademyb', 'Instagram Profile URL', 0, '2026-04-05 17:00:52', '2026-04-05 17:00:52', 'social'),
(30, 'SOCIAL_YOUTUBE', 'https://youtube.com/@languageacademybd', 'YouTube Channel URL', 0, '2026-04-05 17:00:52', '2026-04-05 17:00:52', 'social'),
(31, 'SOCIAL_LINKEDIN', '', 'LinkedIn Page URL', 0, '2026-04-05 17:00:52', '2026-04-05 17:00:52', 'social'),
(32, 'SOCIAL_TIKTOK', '', 'TikTok Profile URL', 0, '2026-04-05 17:00:52', '2026-04-05 17:00:52', 'social'),
(33, 'SOCIAL_TWITTER', '', 'X (Twitter) Profile URL', 0, '2026-04-05 17:00:53', '2026-04-05 17:00:53', 'social'),
(34, 'CONTACT_PHONE_PRIMARY', '+880-1913-373581', 'Primary Phone Number', 0, '2026-04-05 17:00:53', '2026-04-05 17:00:53', 'contact'),
(35, 'CONTACT_PHONE_SECONDARY', '', 'Secondary Phone Number', 0, '2026-04-05 17:00:53', '2026-04-05 17:00:53', 'contact'),
(36, 'CONTACT_WHATSAPP', '+8801913373581', 'WhatsApp Business Number', 0, '2026-04-05 17:00:53', '2026-04-05 17:00:53', 'contact'),
(37, 'CONTACT_EMAIL_PRIMARY', '', 'Primary Contact Email', 0, '2026-04-05 17:00:53', '2026-04-05 17:00:53', 'contact'),
(38, 'CONTACT_EMAIL_SUPPORT', '', 'Support Email Address', 0, '2026-04-05 17:00:53', '2026-04-05 17:00:53', 'contact'),
(39, 'CONTACT_ADDRESS', 'SEL SUFI SQUARE, Unit: 1104, Level: 11, Plot: 58, Road: 16 (New) / 27 (Old), Dhanmondi R/A, Dhaka 1209', 'Business Address', 0, '2026-04-05 17:00:53', '2026-04-05 17:00:53', 'contact'),
(40, 'CONTACT_MAP_EMBED', '', 'Google Maps Embed URL', 0, '2026-04-05 17:00:53', '2026-04-05 17:00:53', 'contact'),
(41, 'BRAND_NAME', 'Language Academy', 'Business / Brand Name', 0, '2026-04-05 17:00:53', '2026-04-05 17:00:53', 'branding'),
(42, 'BRAND_TAGLINE', 'Premium PTE & IELTS Coaching in Dhaka', 'Brand Tagline', 0, '2026-04-05 17:00:53', '2026-04-05 17:00:53', 'branding'),
(43, 'BRAND_LOGO_URL', '', 'Logo URL (light version)', 0, '2026-04-05 17:00:54', '2026-04-05 17:00:54', 'branding'),
(44, 'BRAND_LOGO_DARK_URL', '', 'Logo URL (dark version)', 0, '2026-04-05 17:00:54', '2026-04-05 17:00:54', 'branding'),
(45, 'BRAND_FAVICON_URL', '', 'Favicon URL', 0, '2026-04-05 17:00:54', '2026-04-05 17:00:54', 'branding'),
(46, 'BRAND_PRIMARY_COLOR', '#7bc62e', 'Primary Brand Color (hex)', 0, '2026-04-05 17:00:54', '2026-04-05 17:00:54', 'branding'),
(47, 'BRAND_ACCENT_COLOR', '#275fa7', 'Accent Brand Color (hex)', 0, '2026-04-05 17:00:54', '2026-04-05 17:00:54', 'branding'),
(48, 'TAWK_TO_WIDGET_ID', '', 'Tawk.to Chat Widget ID', 0, '2026-04-05 17:00:54', '2026-04-05 17:00:54', 'integrations'),
(49, 'SSLCOMMERZ_STORE_ID', '', 'SSLCommerz Store ID', 0, '2026-04-05 17:00:54', '2026-04-05 17:00:54', 'integrations'),
(50, 'SSLCOMMERZ_STORE_PASS', '', 'SSLCommerz Store Password', 1, '2026-04-05 17:00:54', '2026-04-05 17:00:54', 'integrations'),
(51, 'SSLCOMMERZ_IS_LIVE', 'false', 'SSLCommerz Live Mode (true/false)', 0, '2026-04-05 17:00:54', '2026-04-05 17:00:54', 'integrations');

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `enrollment_id` int(11) DEFAULT NULL,
  `receipt_no` varchar(255) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `method` enum('bkash','nagad','card','cash','bank_transfer') NOT NULL,
  `transaction_ref` varchar(255) DEFAULT NULL,
  `status` enum('success','pending','failed') DEFAULT 'success',
  `paid_at` datetime DEFAULT NULL,
  `recorded_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `source` enum('pos_fee','premium_plan','website','manual') DEFAULT 'pos_fee',
  `account_id` int(11) DEFAULT NULL,
  `invoice_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`id`, `branch_id`, `enrollment_id`, `receipt_no`, `amount`, `method`, `transaction_ref`, `status`, `paid_at`, `recorded_by`, `created_at`, `updated_at`, `source`, `account_id`, `invoice_id`) VALUES
(7, 1, 1, NULL, 15000.00, 'cash', '', 'success', '2026-03-24 19:07:49', 1, '2026-03-24 19:07:49', '2026-03-24 19:07:49', 'pos_fee', NULL, NULL),
(8, 1, 2, NULL, 15000.00, 'cash', '', 'success', '2026-03-27 09:03:15', 1, '2026-03-27 09:03:15', '2026-03-27 09:03:15', 'pos_fee', NULL, NULL),
(9, 1, 3, NULL, 15000.00, 'cash', '', 'success', '2026-03-27 09:45:57', 1, '2026-03-27 09:45:57', '2026-03-27 09:45:57', 'pos_fee', NULL, NULL),
(10, 1, 4, NULL, 15000.00, 'cash', '', 'success', '2026-03-27 09:50:44', 1, '2026-03-27 09:50:44', '2026-03-27 09:50:44', 'pos_fee', NULL, NULL),
(22, 1, 5, NULL, 15000.00, '', '', 'success', '2026-03-27 14:42:59', 1, '2026-03-27 14:42:59', '2026-03-27 14:42:59', 'pos_fee', NULL, NULL),
(23, 1, 6, NULL, 15000.00, '', '', 'success', '2026-03-27 14:45:48', 1, '2026-03-27 14:45:48', '2026-03-27 14:45:48', 'pos_fee', NULL, NULL),
(24, 1, 7, NULL, 15000.00, '', '', 'success', '2026-03-27 17:03:42', 1, '2026-03-27 17:03:42', '2026-03-27 17:03:42', 'pos_fee', NULL, NULL),
(25, 1, 8, NULL, 15000.00, '', '', 'success', '2026-03-27 17:08:48', 1, '2026-03-27 17:08:48', '2026-03-27 17:08:48', 'pos_fee', NULL, NULL),
(26, 1, 8, NULL, 15000.00, '', '', 'success', '2026-03-27 17:09:19', 1, '2026-03-27 17:09:19', '2026-03-27 17:09:19', 'pos_fee', NULL, NULL),
(27, 1, 9, NULL, 15000.00, '', '', 'success', '2026-03-27 17:30:05', 1, '2026-03-27 17:30:05', '2026-03-27 17:30:05', 'pos_fee', NULL, NULL),
(28, 1, 8, NULL, 15000.00, '', '', 'success', '2026-03-27 17:30:26', 1, '2026-03-27 17:30:26', '2026-03-27 17:30:26', 'pos_fee', NULL, NULL),
(29, 1, 10, NULL, 15000.00, 'cash', '', 'success', '2026-03-27 17:34:43', 1, '2026-03-27 17:34:43', '2026-03-27 17:34:43', 'pos_fee', NULL, NULL),
(30, 1, 12, NULL, 15000.00, 'cash', '', 'success', '2026-03-27 17:50:02', 1, '2026-03-27 17:50:02', '2026-03-27 17:50:02', 'pos_fee', NULL, NULL),
(31, 1, 14, NULL, 15000.00, 'cash', '', 'success', '2026-03-27 21:12:03', 1, '2026-03-27 21:12:03', '2026-03-27 21:12:03', 'pos_fee', NULL, NULL),
(32, 1, 15, NULL, 15000.00, 'cash', '', 'success', '2026-03-31 02:20:20', 1, '2026-03-31 02:20:20', '2026-03-31 02:20:20', 'pos_fee', NULL, NULL),
(33, 1, 16, NULL, 15000.00, 'cash', '', 'success', '2026-04-02 18:43:45', 1, '2026-04-02 18:43:45', '2026-04-02 18:43:45', 'pos_fee', NULL, NULL),
(34, 1, 17, 'REC-1775166002520', 5500.00, 'card', 'PAY-256DFCD9', 'success', '2026-04-02 21:40:02', 5, '2026-04-02 21:40:02', '2026-04-02 21:40:02', 'website', NULL, NULL),
(35, 1, 18, 'REC-1775166002521', 5500.00, 'card', 'PAY-256DFCD9', 'success', '2026-04-02 21:40:02', 5, '2026-04-02 21:40:02', '2026-04-02 21:40:02', 'website', NULL, NULL),
(36, 1, 20, NULL, 15000.00, 'nagad', '', 'success', '2026-04-03 06:51:30', 1, '2026-04-03 06:51:30', '2026-04-03 06:51:30', 'pos_fee', 10, NULL),
(37, 1, NULL, 'MR-CUST-1775205062083', 3500.00, 'cash', NULL, 'success', '2026-04-03 08:31:02', 1, '2026-04-03 08:31:02', '2026-04-03 08:31:02', 'manual', 12, 22),
(38, 1, NULL, 'MR-CUST-1775205092863', 3500.00, 'nagad', NULL, 'success', '2026-04-03 08:31:32', 1, '2026-04-03 08:31:32', '2026-04-03 08:31:32', 'manual', 10, 22),
(39, 1, NULL, 'MR-CUST-1775205214780', 5000.00, 'nagad', '', 'success', '2026-04-03 08:33:34', 1, '2026-04-03 08:33:34', '2026-04-03 08:33:34', 'manual', 10, 23),
(40, 1, NULL, 'MR-CUST-1775206785772', 3600.00, 'bkash', '', 'success', '2026-04-03 08:59:45', 1, '2026-04-03 08:59:45', '2026-04-03 08:59:45', 'manual', 9, 24),
(41, 1, NULL, 'MR-CUST-1775210190760', 3600.00, 'bank_transfer', '', 'success', '2026-04-03 09:56:30', 1, '2026-04-03 09:56:30', '2026-04-03 09:56:30', 'manual', 3, 25);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(255) DEFAULT 'unassigned',
  `status` enum('active','inactive','suspended') DEFAULT 'active',
  `tfa_enabled` tinyint(1) DEFAULT 0,
  `tfa_secret` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `branch_id`, `name`, `email`, `password`, `role`, `status`, `tfa_enabled`, `tfa_secret`, `created_at`, `updated_at`) VALUES
(1, 1, 'Super Admin', 'admin@renetech.com', '$2b$10$Pe0RYsTc8Kce46X/PC9pme9umsNtsxh5OPfPGt7.6hCQC3IsxS9Km', 'super_admin', 'active', 0, NULL, '2026-03-17 12:02:11', '2026-04-05 15:15:54'),
(2, 2, 'Uttara Manager', 'uttara@renetech.com', '$2b$10$MICJEkBLIgBJ4vWqQ1B3guuH9ivoWcVftYmIrFgJV4VmxMys72U6O', 'branch_admin', 'inactive', 0, NULL, '2026-03-17 12:02:11', '2026-04-05 18:01:50'),
(3, 1, 'Rahat Ahmed', 'rahat@student.com', '$2b$10$MICJEkBLIgBJ4vWqQ1B3guuH9ivoWcVftYmIrFgJV4VmxMys72U6O', 'student', 'active', 0, NULL, '2026-03-17 12:02:12', '2026-03-17 12:02:12'),
(4, 1, 'A', 'a@t.com', '$2b$10$0gWzHPZJ1SPSJ3RR6ET/6Op.8ZRwpoZlrO2fPTDk1eEaSpbGpLA7y', 'student', 'active', 0, NULL, '2026-03-24 17:31:48', '2026-03-24 17:31:48'),
(5, 1, 'Sayem test', 'aarsayem002@gmail.com', '$2b$10$CebY7.wTGVRSgpbvvUGpgeX8TxeehE.fwF8A6NoxqhnoBqLbHnKVK', 'student', 'active', 0, NULL, '2026-03-24 18:22:35', '2026-03-31 02:20:02'),
(6, 1, 'Tahsin', 'test@gmail.com', '74oef5', 'student', 'active', 0, NULL, '2026-03-27 09:03:16', '2026-03-27 09:03:16'),
(7, 1, 'SAHAJ AL REDOWAN', 't@fk.com', '$2b$10$6h3eGtRmLpZOJz77S5exEu0ODfZe9lPdelB0haQhMHZBj7hLAGt5m', 'student', 'active', 0, NULL, '2026-03-27 09:45:35', '2026-03-27 09:45:35'),
(8, 1, 'test test test', 'of@test.com', '$2b$10$7t87AEXFNqB7zylaN3H.veHOALRWlSlc8YWZkTB4c7765CUFPUose', 'student', 'active', 0, NULL, '2026-03-27 09:48:12', '2026-03-27 09:48:12'),
(19, 1, 'TEST ', 's@g.com', 'yijynf', 'student', 'active', 0, NULL, '2026-03-27 14:43:04', '2026-03-27 14:43:04'),
(20, 1, 'ad bd', 'ret@t.com', '$2b$10$G48A0jNwszzpIOgSwjm92uXLRgXvpEqg5IytkHm7EJnf/BNcUO/MG', 'student', 'active', 0, NULL, '2026-03-27 14:59:45', '2026-03-27 14:59:45'),
(25, 1, 'ad ss', '3edd@to.com', '$2b$10$aCLVQcHNYVWXIECCNyPiBOlJWt0dP2Zh9/MvwDLy9TTTtyiOHlruK', 'student', 'active', 0, NULL, '2026-03-27 15:02:20', '2026-03-27 15:02:20'),
(26, 1, 'Debug Student', 'debug_student@example.com', '$2b$10$.vCmDX7xBGoYinE2r4TmsuvxRq44kZSxi/GvA9rvqN7DcgmC0kDLi', 'student', 'active', 0, NULL, '2026-03-27 15:10:44', '2026-03-27 15:10:44'),
(30, 1, 'Debug Student', 'admin@rener.com', '$2b$10$hwb..lBg2eYuYO0HZC8zMeWqKJQwHeGtat7fPztH/vuom8nv6PLca', 'student', 'active', 0, NULL, '2026-03-27 15:15:32', '2026-03-27 15:15:32'),
(32, 1, 'Success Student', 'success_student_2@example.com', '$2b$10$N1sqlkQpWVUnzmDfJ8KRSOy1EQz6mrA0Tkt2weA82IA8qSPNRHAgC', 'student', 'active', 0, NULL, '2026-03-27 15:17:49', '2026-03-27 15:17:49'),
(34, 1, 'TEST STUDENT', 'sud@gmail.com', '$2b$10$cIgjQV7pSSrmkbY1phQh7.zgyEqvyOea2pv2EWLwwc96vSv8H/Jem', 'student', 'active', 0, NULL, '2026-03-27 16:58:32', '2026-03-27 16:58:32'),
(35, 1, 'Abdullah Al Sahaj', 'jk@w.com', 'fxov2', 'student', 'active', 0, NULL, '2026-03-27 17:03:45', '2026-03-27 17:03:45'),
(36, 1, 'Sudha New Test', 'aa3333rsayem002@gmail.com', '$2b$10$CuCMls/jqVa2qiXp6qyP3OCBN5yPu.xxzO57aGfoklaLFd3T5lyj.', 'student', 'active', 0, NULL, '2026-03-27 17:07:57', '2026-03-27 17:07:57'),
(37, 1, 'Tahsin', 'ad', '0n884', 'student', 'active', 0, NULL, '2026-03-27 17:30:08', '2026-03-27 17:30:08'),
(38, 1, 'Success Student', 'admin@eee.om', '$2b$10$lBj1G/yTsSZbvXnpkZ3AfO1RUlSPbDOOYTnXyaQesme.o42VsgHMm', 'student', 'active', 0, NULL, '2026-03-27 17:34:16', '2026-03-27 17:34:16'),
(39, 1, 'Test TEST', 'test@gccff.com', '$2b$10$ERUEu7MxcGCoE6qIKFco9.9UtWGdMln0hJuVx0noLWo6joygHl27e', 'student', 'active', 0, NULL, '2026-03-27 17:42:16', '2026-03-27 17:42:16'),
(40, 1, 'ABDULLAH AL  REDOWAN', 'ffjr@gk.com', '$2b$10$4BHaNSS54yOZ/1ca2PIS7O/WFrVXUapXyforQ0eaFs0pRjL.useOS', 'student', 'active', 0, NULL, '2026-03-27 17:49:42', '2026-04-03 06:30:17'),
(41, 1, 'TEST TES', 'ee@d.com', '$2b$10$bHVeQiFzQTs.ZLmT.xE/7ulCDHP.A22bBtD7prpfxwkXQ0bwYfYMa', 'student', 'active', 0, NULL, '2026-03-27 18:10:25', '2026-03-27 18:10:25'),
(42, 1, 'Sam', '234@gk.com', '$2b$10$VbATHbDTJUF0zyx4.y/na.fsCR5hHpxqZVOMB3Jk8RowNetBldLCG', 'branch_admin', 'active', 0, NULL, '2026-03-27 19:22:26', '2026-04-02 17:31:35'),
(43, 1, 'TEST TEST', 'opf@4.com', '$2b$10$81dybOED3PKSjkbEB5GlXuQG1JfBV7x3yRT55Eotmt3PH0ppgEvzy', 'student', 'active', 0, NULL, '2026-03-27 21:11:23', '2026-03-27 21:11:23'),
(45, 1, 'Test', 'test12@example.com', '$2b$10$RtVWIhffYtMh34p5KY0y7eMNVgj/2lbM9tRN89c1g.7azrNfj7XsG', 'accounting', 'active', 0, NULL, '2026-04-02 17:06:44', '2026-04-02 17:52:54'),
(46, 1, 'Test', 'test13@example.com', '$2b$10$kE07aeAIkqBUtMAt9moQJOwDKLrp5SVwM7SAQRZUZ4SpQpo3hV93q', '', 'active', 0, NULL, '2026-04-02 17:13:02', '2026-04-02 17:13:02'),
(47, 1, 'Test New DB Enum', 'test14@example.com', '$2b$10$811mtiKl5Nz.YhRTSqUrzenugsyyzdjYeZow2dxKXO7k6kAYypehC', 'unassigned', 'active', 0, NULL, '2026-04-02 17:18:05', '2026-04-02 17:18:05'),
(49, 1, 'TEST', 'admin@investtrack.pro', '$2b$10$Eu8rJK0Bo8h2XJoZDGQfXedP1Q.piK4cGnSJb9qnNnGS7/SOXfgw.', 'super_admin', 'active', 0, NULL, '2026-04-02 17:20:13', '2026-04-02 17:44:10'),
(50, 1, 'Abdullah  Al Redowan', 'business.intech@gmail.com', '$2b$10$duV2WzUq//ZJfTnKDgP4YuhuRMMDGIKSJq7.X2nRFwD2omR1PLvHy', 'student', 'active', 0, NULL, '2026-04-02 18:43:20', '2026-04-02 18:43:20'),
(51, 1, 'TEST 55 er', '3443@gmail.com', '$2b$10$xbj9xhoXBlJiM7wHn0SqBOIWD4JMEf4iXQ.qrfJnMoLhv766D7d7K', 'student', 'active', 0, NULL, '2026-04-02 22:10:29', '2026-04-02 22:10:29'),
(52, 1, 'REDOWAN  SAYEM', 'tes@k.com', '$2b$10$X5etcpih44gOlQE5dOEPF.D2syWwajkUp.tl7748e8PK5pdG9wIxe', 'student', 'active', 0, NULL, '2026-04-03 06:35:14', '2026-04-03 06:35:14'),
(55, 5, 'Sayem', 'aarsayem@gmail.com', '$2b$10$bgAfP1yaGstAo5tKTo/uB.RMV7FRjrvHO.jokdiII.Zk1XJtdec8a', 'branch_admin', 'inactive', 0, NULL, '2026-04-05 17:56:46', '2026-04-05 18:01:50');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `accounts`
--
ALTER TABLE `accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD UNIQUE KEY `code_2` (`code`),
  ADD UNIQUE KEY `code_3` (`code`),
  ADD UNIQUE KEY `code_4` (`code`),
  ADD UNIQUE KEY `code_5` (`code`),
  ADD UNIQUE KEY `code_6` (`code`),
  ADD UNIQUE KEY `code_7` (`code`),
  ADD UNIQUE KEY `code_8` (`code`),
  ADD UNIQUE KEY `code_9` (`code`),
  ADD UNIQUE KEY `code_10` (`code`),
  ADD UNIQUE KEY `code_11` (`code`),
  ADD UNIQUE KEY `code_12` (`code`),
  ADD UNIQUE KEY `code_13` (`code`),
  ADD UNIQUE KEY `code_14` (`code`),
  ADD UNIQUE KEY `code_15` (`code`),
  ADD UNIQUE KEY `code_16` (`code`),
  ADD UNIQUE KEY `code_17` (`code`),
  ADD UNIQUE KEY `code_18` (`code`),
  ADD UNIQUE KEY `code_19` (`code`),
  ADD UNIQUE KEY `code_20` (`code`),
  ADD UNIQUE KEY `code_21` (`code`),
  ADD UNIQUE KEY `code_22` (`code`),
  ADD UNIQUE KEY `code_23` (`code`),
  ADD UNIQUE KEY `code_24` (`code`),
  ADD UNIQUE KEY `code_25` (`code`),
  ADD UNIQUE KEY `code_26` (`code`),
  ADD UNIQUE KEY `code_27` (`code`),
  ADD UNIQUE KEY `code_28` (`code`),
  ADD UNIQUE KEY `code_29` (`code`),
  ADD UNIQUE KEY `code_30` (`code`),
  ADD UNIQUE KEY `code_31` (`code`),
  ADD UNIQUE KEY `code_32` (`code`),
  ADD UNIQUE KEY `code_33` (`code`),
  ADD UNIQUE KEY `code_34` (`code`),
  ADD UNIQUE KEY `code_35` (`code`),
  ADD UNIQUE KEY `code_36` (`code`),
  ADD UNIQUE KEY `code_37` (`code`),
  ADD UNIQUE KEY `code_38` (`code`),
  ADD UNIQUE KEY `code_39` (`code`),
  ADD UNIQUE KEY `code_40` (`code`),
  ADD UNIQUE KEY `code_41` (`code`),
  ADD UNIQUE KEY `code_42` (`code`),
  ADD UNIQUE KEY `code_43` (`code`),
  ADD UNIQUE KEY `code_44` (`code`),
  ADD UNIQUE KEY `code_45` (`code`),
  ADD UNIQUE KEY `code_46` (`code`),
  ADD UNIQUE KEY `code_47` (`code`),
  ADD UNIQUE KEY `code_48` (`code`),
  ADD UNIQUE KEY `code_49` (`code`),
  ADD UNIQUE KEY `code_50` (`code`),
  ADD UNIQUE KEY `code_51` (`code`),
  ADD UNIQUE KEY `code_52` (`code`),
  ADD UNIQUE KEY `code_53` (`code`),
  ADD UNIQUE KEY `code_54` (`code`),
  ADD UNIQUE KEY `code_55` (`code`),
  ADD UNIQUE KEY `code_56` (`code`),
  ADD UNIQUE KEY `code_57` (`code`),
  ADD UNIQUE KEY `code_58` (`code`),
  ADD UNIQUE KEY `code_59` (`code`),
  ADD UNIQUE KEY `code_60` (`code`),
  ADD UNIQUE KEY `code_61` (`code`),
  ADD KEY `parent_id` (`parent_id`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `applicants`
--
ALTER TABLE `applicants`
  ADD PRIMARY KEY (`id`),
  ADD KEY `job_posting_id` (`job_posting_id`);

--
-- Indexes for table `assets`
--
ALTER TABLE `assets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `serial_no` (`serial_no`),
  ADD UNIQUE KEY `serial_no_2` (`serial_no`),
  ADD UNIQUE KEY `serial_no_3` (`serial_no`),
  ADD UNIQUE KEY `serial_no_4` (`serial_no`),
  ADD UNIQUE KEY `serial_no_5` (`serial_no`),
  ADD UNIQUE KEY `serial_no_6` (`serial_no`),
  ADD UNIQUE KEY `serial_no_7` (`serial_no`),
  ADD UNIQUE KEY `serial_no_8` (`serial_no`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `batch_id` (`batch_id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `automation_rules`
--
ALTER TABLE `automation_rules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `bank_accounts`
--
ALTER TABLE `bank_accounts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `bank_account_ledger_maps`
--
ALTER TABLE `bank_account_ledger_maps`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bank_account_id` (`bank_account_id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `bank_statement_lines`
--
ALTER TABLE `bank_statement_lines`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `batches`
--
ALTER TABLE `batches`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD UNIQUE KEY `code_2` (`code`),
  ADD UNIQUE KEY `code_3` (`code`),
  ADD UNIQUE KEY `code_4` (`code`),
  ADD UNIQUE KEY `code_5` (`code`),
  ADD UNIQUE KEY `code_6` (`code`),
  ADD UNIQUE KEY `code_7` (`code`),
  ADD UNIQUE KEY `code_8` (`code`),
  ADD UNIQUE KEY `code_9` (`code`),
  ADD UNIQUE KEY `code_10` (`code`),
  ADD UNIQUE KEY `code_11` (`code`),
  ADD UNIQUE KEY `code_12` (`code`),
  ADD UNIQUE KEY `code_13` (`code`),
  ADD UNIQUE KEY `code_14` (`code`),
  ADD UNIQUE KEY `code_15` (`code`),
  ADD UNIQUE KEY `code_16` (`code`),
  ADD UNIQUE KEY `code_17` (`code`),
  ADD UNIQUE KEY `code_18` (`code`),
  ADD UNIQUE KEY `code_19` (`code`),
  ADD UNIQUE KEY `code_20` (`code`),
  ADD UNIQUE KEY `code_21` (`code`),
  ADD UNIQUE KEY `code_22` (`code`),
  ADD UNIQUE KEY `code_23` (`code`),
  ADD UNIQUE KEY `code_24` (`code`),
  ADD UNIQUE KEY `code_25` (`code`),
  ADD UNIQUE KEY `code_26` (`code`),
  ADD UNIQUE KEY `code_27` (`code`),
  ADD UNIQUE KEY `code_28` (`code`),
  ADD UNIQUE KEY `code_29` (`code`),
  ADD UNIQUE KEY `code_30` (`code`),
  ADD UNIQUE KEY `code_31` (`code`),
  ADD UNIQUE KEY `code_32` (`code`),
  ADD UNIQUE KEY `code_33` (`code`),
  ADD UNIQUE KEY `code_34` (`code`),
  ADD UNIQUE KEY `code_35` (`code`),
  ADD UNIQUE KEY `code_36` (`code`),
  ADD UNIQUE KEY `code_37` (`code`),
  ADD UNIQUE KEY `code_38` (`code`),
  ADD UNIQUE KEY `code_39` (`code`),
  ADD UNIQUE KEY `code_40` (`code`),
  ADD UNIQUE KEY `code_41` (`code`),
  ADD UNIQUE KEY `code_42` (`code`),
  ADD UNIQUE KEY `code_43` (`code`),
  ADD UNIQUE KEY `code_44` (`code`),
  ADD UNIQUE KEY `code_45` (`code`),
  ADD UNIQUE KEY `code_46` (`code`),
  ADD UNIQUE KEY `code_47` (`code`),
  ADD UNIQUE KEY `code_48` (`code`),
  ADD UNIQUE KEY `code_49` (`code`),
  ADD UNIQUE KEY `code_50` (`code`),
  ADD UNIQUE KEY `code_51` (`code`),
  ADD UNIQUE KEY `code_52` (`code`),
  ADD UNIQUE KEY `code_53` (`code`),
  ADD UNIQUE KEY `code_54` (`code`),
  ADD UNIQUE KEY `code_55` (`code`),
  ADD UNIQUE KEY `code_56` (`code`),
  ADD UNIQUE KEY `code_57` (`code`),
  ADD UNIQUE KEY `code_58` (`code`),
  ADD UNIQUE KEY `code_59` (`code`),
  ADD UNIQUE KEY `code_60` (`code`),
  ADD KEY `trainer_id` (`trainer_id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `course_id` (`course_id`);

--
-- Indexes for table `blog_posts`
--
ALTER TABLE `blog_posts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD UNIQUE KEY `slug_2` (`slug`),
  ADD UNIQUE KEY `slug_3` (`slug`),
  ADD UNIQUE KEY `slug_4` (`slug`),
  ADD UNIQUE KEY `slug_5` (`slug`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `author_id` (`author_id`);

--
-- Indexes for table `branches`
--
ALTER TABLE `branches`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD UNIQUE KEY `code_2` (`code`),
  ADD UNIQUE KEY `code_3` (`code`),
  ADD UNIQUE KEY `code_4` (`code`),
  ADD UNIQUE KEY `code_5` (`code`),
  ADD UNIQUE KEY `code_6` (`code`),
  ADD UNIQUE KEY `code_7` (`code`),
  ADD UNIQUE KEY `code_8` (`code`),
  ADD UNIQUE KEY `code_9` (`code`),
  ADD UNIQUE KEY `code_10` (`code`);

--
-- Indexes for table `budgets`
--
ALTER TABLE `budgets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `account_id` (`account_id`);

--
-- Indexes for table `campaign_templates`
--
ALTER TABLE `campaign_templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `contacts`
--
ALTER TABLE `contacts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `courses`
--
ALTER TABLE `courses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD UNIQUE KEY `slug_2` (`slug`),
  ADD UNIQUE KEY `slug_3` (`slug`),
  ADD UNIQUE KEY `slug_4` (`slug`),
  ADD UNIQUE KEY `slug_5` (`slug`),
  ADD UNIQUE KEY `slug_6` (`slug`),
  ADD UNIQUE KEY `slug_7` (`slug`),
  ADD UNIQUE KEY `slug_8` (`slug`),
  ADD UNIQUE KEY `slug_9` (`slug`),
  ADD UNIQUE KEY `slug_10` (`slug`),
  ADD UNIQUE KEY `slug_11` (`slug`),
  ADD UNIQUE KEY `slug_12` (`slug`),
  ADD UNIQUE KEY `slug_13` (`slug`),
  ADD UNIQUE KEY `slug_14` (`slug`),
  ADD UNIQUE KEY `slug_15` (`slug`),
  ADD UNIQUE KEY `slug_16` (`slug`),
  ADD UNIQUE KEY `slug_17` (`slug`),
  ADD UNIQUE KEY `slug_18` (`slug`),
  ADD UNIQUE KEY `slug_19` (`slug`),
  ADD UNIQUE KEY `slug_20` (`slug`),
  ADD UNIQUE KEY `slug_21` (`slug`),
  ADD UNIQUE KEY `slug_22` (`slug`),
  ADD UNIQUE KEY `slug_23` (`slug`),
  ADD UNIQUE KEY `slug_24` (`slug`),
  ADD UNIQUE KEY `slug_25` (`slug`),
  ADD UNIQUE KEY `slug_26` (`slug`),
  ADD UNIQUE KEY `slug_27` (`slug`),
  ADD UNIQUE KEY `slug_28` (`slug`),
  ADD UNIQUE KEY `slug_29` (`slug`),
  ADD UNIQUE KEY `slug_30` (`slug`),
  ADD UNIQUE KEY `slug_31` (`slug`),
  ADD UNIQUE KEY `slug_32` (`slug`),
  ADD UNIQUE KEY `slug_33` (`slug`),
  ADD UNIQUE KEY `slug_34` (`slug`),
  ADD UNIQUE KEY `slug_35` (`slug`),
  ADD UNIQUE KEY `slug_36` (`slug`),
  ADD UNIQUE KEY `slug_37` (`slug`),
  ADD UNIQUE KEY `slug_38` (`slug`),
  ADD UNIQUE KEY `slug_39` (`slug`),
  ADD UNIQUE KEY `slug_40` (`slug`),
  ADD UNIQUE KEY `slug_41` (`slug`),
  ADD UNIQUE KEY `slug_42` (`slug`),
  ADD UNIQUE KEY `slug_43` (`slug`),
  ADD UNIQUE KEY `slug_44` (`slug`),
  ADD UNIQUE KEY `slug_45` (`slug`),
  ADD UNIQUE KEY `slug_46` (`slug`),
  ADD UNIQUE KEY `slug_47` (`slug`),
  ADD UNIQUE KEY `slug_48` (`slug`),
  ADD UNIQUE KEY `slug_49` (`slug`),
  ADD UNIQUE KEY `slug_50` (`slug`),
  ADD UNIQUE KEY `slug_51` (`slug`),
  ADD UNIQUE KEY `slug_52` (`slug`),
  ADD UNIQUE KEY `slug_53` (`slug`),
  ADD UNIQUE KEY `slug_54` (`slug`),
  ADD UNIQUE KEY `slug_55` (`slug`),
  ADD UNIQUE KEY `slug_56` (`slug`),
  ADD UNIQUE KEY `slug_57` (`slug`),
  ADD UNIQUE KEY `slug_58` (`slug`),
  ADD UNIQUE KEY `slug_59` (`slug`),
  ADD UNIQUE KEY `slug_60` (`slug`),
  ADD UNIQUE KEY `slug_61` (`slug`),
  ADD UNIQUE KEY `slug_62` (`slug`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `crm_activities`
--
ALTER TABLE `crm_activities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `student_id` (`student_id`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `enrollments`
--
ALTER TABLE `enrollments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `batch_id` (`batch_id`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `verified_by` (`verified_by`),
  ADD KEY `deleted_by` (`deleted_by`);

--
-- Indexes for table `expense_categories`
--
ALTER TABLE `expense_categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `parent_id` (`parent_id`);

--
-- Indexes for table `income_categories`
--
ALTER TABLE `income_categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `parent_id` (`parent_id`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invoice_no` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_2` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_3` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_4` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_5` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_6` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_7` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_8` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_9` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_10` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_11` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_12` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_13` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_14` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_15` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_16` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_17` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_18` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_19` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_20` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_21` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_22` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_23` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_24` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_25` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_26` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_27` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_28` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_29` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_30` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_31` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_32` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_33` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_34` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_35` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_36` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_37` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_38` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_39` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_40` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_41` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_42` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_43` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_44` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_45` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_46` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_47` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_48` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_49` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_50` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_51` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_52` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_53` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_54` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_55` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_56` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_57` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_58` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_59` (`invoice_no`),
  ADD UNIQUE KEY `invoice_no_60` (`invoice_no`),
  ADD KEY `enrollment_id` (`enrollment_id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `job_postings`
--
ALTER TABLE `job_postings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `posted_by` (`posted_by`);

--
-- Indexes for table `journal_entries`
--
ALTER TABLE `journal_entries`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ref_no` (`ref_no`),
  ADD UNIQUE KEY `ref_no_2` (`ref_no`),
  ADD UNIQUE KEY `ref_no_3` (`ref_no`),
  ADD UNIQUE KEY `ref_no_4` (`ref_no`),
  ADD UNIQUE KEY `ref_no_5` (`ref_no`),
  ADD UNIQUE KEY `ref_no_6` (`ref_no`),
  ADD UNIQUE KEY `ref_no_7` (`ref_no`),
  ADD UNIQUE KEY `ref_no_8` (`ref_no`),
  ADD UNIQUE KEY `ref_no_9` (`ref_no`),
  ADD UNIQUE KEY `ref_no_10` (`ref_no`),
  ADD UNIQUE KEY `ref_no_11` (`ref_no`),
  ADD UNIQUE KEY `ref_no_12` (`ref_no`),
  ADD UNIQUE KEY `ref_no_13` (`ref_no`),
  ADD UNIQUE KEY `ref_no_14` (`ref_no`),
  ADD UNIQUE KEY `ref_no_15` (`ref_no`),
  ADD UNIQUE KEY `ref_no_16` (`ref_no`),
  ADD UNIQUE KEY `ref_no_17` (`ref_no`),
  ADD UNIQUE KEY `ref_no_18` (`ref_no`),
  ADD UNIQUE KEY `ref_no_19` (`ref_no`),
  ADD UNIQUE KEY `ref_no_20` (`ref_no`),
  ADD UNIQUE KEY `ref_no_21` (`ref_no`),
  ADD UNIQUE KEY `ref_no_22` (`ref_no`),
  ADD UNIQUE KEY `ref_no_23` (`ref_no`),
  ADD UNIQUE KEY `ref_no_24` (`ref_no`),
  ADD UNIQUE KEY `ref_no_25` (`ref_no`),
  ADD UNIQUE KEY `ref_no_26` (`ref_no`),
  ADD UNIQUE KEY `ref_no_27` (`ref_no`),
  ADD UNIQUE KEY `ref_no_28` (`ref_no`),
  ADD UNIQUE KEY `ref_no_29` (`ref_no`),
  ADD UNIQUE KEY `ref_no_30` (`ref_no`),
  ADD UNIQUE KEY `ref_no_31` (`ref_no`),
  ADD UNIQUE KEY `ref_no_32` (`ref_no`),
  ADD UNIQUE KEY `ref_no_33` (`ref_no`),
  ADD UNIQUE KEY `ref_no_34` (`ref_no`),
  ADD UNIQUE KEY `ref_no_35` (`ref_no`),
  ADD UNIQUE KEY `ref_no_36` (`ref_no`),
  ADD UNIQUE KEY `ref_no_37` (`ref_no`),
  ADD UNIQUE KEY `ref_no_38` (`ref_no`),
  ADD UNIQUE KEY `ref_no_39` (`ref_no`),
  ADD UNIQUE KEY `ref_no_40` (`ref_no`),
  ADD UNIQUE KEY `ref_no_41` (`ref_no`),
  ADD UNIQUE KEY `ref_no_42` (`ref_no`),
  ADD UNIQUE KEY `ref_no_43` (`ref_no`),
  ADD UNIQUE KEY `ref_no_44` (`ref_no`),
  ADD UNIQUE KEY `ref_no_45` (`ref_no`),
  ADD UNIQUE KEY `ref_no_46` (`ref_no`),
  ADD UNIQUE KEY `ref_no_47` (`ref_no`),
  ADD UNIQUE KEY `ref_no_48` (`ref_no`),
  ADD UNIQUE KEY `ref_no_49` (`ref_no`),
  ADD UNIQUE KEY `ref_no_50` (`ref_no`),
  ADD UNIQUE KEY `ref_no_51` (`ref_no`),
  ADD UNIQUE KEY `ref_no_52` (`ref_no`),
  ADD UNIQUE KEY `ref_no_53` (`ref_no`),
  ADD UNIQUE KEY `ref_no_54` (`ref_no`),
  ADD UNIQUE KEY `ref_no_55` (`ref_no`),
  ADD UNIQUE KEY `ref_no_56` (`ref_no`),
  ADD UNIQUE KEY `ref_no_57` (`ref_no`),
  ADD UNIQUE KEY `ref_no_58` (`ref_no`),
  ADD UNIQUE KEY `ref_no_59` (`ref_no`),
  ADD UNIQUE KEY `ref_no_60` (`ref_no`),
  ADD UNIQUE KEY `ref_no_61` (`ref_no`),
  ADD KEY `posted_by` (`posted_by`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `journal_lines`
--
ALTER TABLE `journal_lines`
  ADD PRIMARY KEY (`id`),
  ADD KEY `journal_entry_id` (`journal_entry_id`),
  ADD KEY `account_id` (`account_id`);

--
-- Indexes for table `leads`
--
ALTER TABLE `leads`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `payment_ref` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_2` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_3` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_4` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_5` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_6` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_7` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_8` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_9` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_10` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_11` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_12` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_13` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_14` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_15` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_16` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_17` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_18` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_19` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_20` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_21` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_22` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_23` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_24` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_25` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_26` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_27` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_28` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_29` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_30` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_31` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_32` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_33` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_34` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_35` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_36` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_37` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_38` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_39` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_40` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_41` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_42` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_43` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_44` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_45` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_46` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_47` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_48` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_49` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_50` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_51` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_52` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_53` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_54` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_55` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_56` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_57` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_58` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_59` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_60` (`payment_ref`),
  ADD UNIQUE KEY `payment_ref_61` (`payment_ref`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `counselor_id` (`counselor_id`);

--
-- Indexes for table `leave_balances`
--
ALTER TABLE `leave_balances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `leave_balances_user_id_leave_type_id_year` (`user_id`,`leave_type_id`,`year`),
  ADD KEY `leave_type_id` (`leave_type_id`);

--
-- Indexes for table `leave_requests`
--
ALTER TABLE `leave_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `leave_type_id` (`leave_type_id`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `leave_types`
--
ALTER TABLE `leave_types`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `liquidity_movements`
--
ALTER TABLE `liquidity_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `related_account_id` (`related_account_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `materials`
--
ALTER TABLE `materials`
  ADD PRIMARY KEY (`id`),
  ADD KEY `batch_id` (`batch_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `opportunities`
--
ALTER TABLE `opportunities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `assigned_to` (`assigned_to`);

--
-- Indexes for table `payrolls`
--
ALTER TABLE `payrolls`
  ADD PRIMARY KEY (`id`),
  ADD KEY `staff_id` (`staff_id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `journal_entry_id` (`journal_entry_id`);

--
-- Indexes for table `performance_reviews`
--
ALTER TABLE `performance_reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `reviewer_id` (`reviewer_id`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `pte_attempts`
--
ALTER TABLE `pte_attempts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `task_id` (`task_id`);

--
-- Indexes for table `pte_tasks`
--
ALTER TABLE `pte_tasks`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `rbac_configs`
--
ALTER TABLE `rbac_configs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `reconciliations`
--
ALTER TABLE `reconciliations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `reconciliation_events`
--
ALTER TABLE `reconciliation_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `session_id` (`session_id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `reconciliation_lines`
--
ALTER TABLE `reconciliation_lines`
  ADD PRIMARY KEY (`id`),
  ADD KEY `session_id` (`session_id`),
  ADD KEY `mapping_id` (`mapping_id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `bank_account_id` (`bank_account_id`);

--
-- Indexes for table `reconciliation_matches`
--
ALTER TABLE `reconciliation_matches`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `reconciliation_sessions`
--
ALTER TABLE `reconciliation_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `prepared_by` (`prepared_by`),
  ADD KEY `reviewed_by` (`reviewed_by`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `room_bookings`
--
ALTER TABLE `room_bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `batch_id` (`batch_id`);

--
-- Indexes for table `shifts`
--
ALTER TABLE `shifts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `staff_attendance`
--
ALTER TABLE `staff_attendance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `staff_attendance_user_id_date` (`user_id`,`date`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `staff_documents`
--
ALTER TABLE `staff_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `uploaded_by` (`uploaded_by`);

--
-- Indexes for table `staff_profiles`
--
ALTER TABLE `staff_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `reports_to` (`reports_to`);

--
-- Indexes for table `staff_schedules`
--
ALTER TABLE `staff_schedules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `staff_schedules_user_id_date` (`user_id`,`date`),
  ADD KEY `shift_id` (`shift_id`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `batch_id` (`batch_id`),
  ADD KEY `guardian_id` (`guardian_id`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`),
  ADD UNIQUE KEY `setting_key_2` (`setting_key`),
  ADD UNIQUE KEY `setting_key_3` (`setting_key`),
  ADD UNIQUE KEY `setting_key_4` (`setting_key`),
  ADD UNIQUE KEY `setting_key_5` (`setting_key`),
  ADD UNIQUE KEY `setting_key_6` (`setting_key`),
  ADD UNIQUE KEY `setting_key_7` (`setting_key`),
  ADD UNIQUE KEY `setting_key_8` (`setting_key`),
  ADD UNIQUE KEY `setting_key_9` (`setting_key`),
  ADD UNIQUE KEY `setting_key_10` (`setting_key`),
  ADD UNIQUE KEY `setting_key_11` (`setting_key`),
  ADD UNIQUE KEY `setting_key_12` (`setting_key`),
  ADD UNIQUE KEY `setting_key_13` (`setting_key`),
  ADD UNIQUE KEY `setting_key_14` (`setting_key`),
  ADD UNIQUE KEY `setting_key_15` (`setting_key`),
  ADD UNIQUE KEY `setting_key_16` (`setting_key`),
  ADD UNIQUE KEY `setting_key_17` (`setting_key`),
  ADD UNIQUE KEY `setting_key_18` (`setting_key`),
  ADD UNIQUE KEY `setting_key_19` (`setting_key`),
  ADD UNIQUE KEY `setting_key_20` (`setting_key`),
  ADD UNIQUE KEY `setting_key_21` (`setting_key`),
  ADD UNIQUE KEY `setting_key_22` (`setting_key`),
  ADD UNIQUE KEY `setting_key_23` (`setting_key`),
  ADD UNIQUE KEY `setting_key_24` (`setting_key`),
  ADD UNIQUE KEY `setting_key_25` (`setting_key`),
  ADD UNIQUE KEY `setting_key_26` (`setting_key`),
  ADD UNIQUE KEY `setting_key_27` (`setting_key`),
  ADD UNIQUE KEY `setting_key_28` (`setting_key`),
  ADD UNIQUE KEY `setting_key_29` (`setting_key`),
  ADD UNIQUE KEY `setting_key_30` (`setting_key`),
  ADD UNIQUE KEY `setting_key_31` (`setting_key`),
  ADD UNIQUE KEY `setting_key_32` (`setting_key`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `receipt_no` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_2` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_3` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_4` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_5` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_6` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_7` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_8` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_9` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_10` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_11` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_12` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_13` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_14` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_15` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_16` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_17` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_18` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_19` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_20` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_21` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_22` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_23` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_24` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_25` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_26` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_27` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_28` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_29` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_30` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_31` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_32` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_33` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_34` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_35` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_36` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_37` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_38` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_39` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_40` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_41` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_42` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_43` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_44` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_45` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_46` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_47` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_48` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_49` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_50` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_51` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_52` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_53` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_54` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_55` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_56` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_57` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_58` (`receipt_no`),
  ADD UNIQUE KEY `receipt_no_59` (`receipt_no`),
  ADD KEY `recorded_by` (`recorded_by`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `enrollment_id` (`enrollment_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `email_2` (`email`),
  ADD UNIQUE KEY `email_3` (`email`),
  ADD UNIQUE KEY `email_4` (`email`),
  ADD UNIQUE KEY `email_5` (`email`),
  ADD UNIQUE KEY `email_6` (`email`),
  ADD UNIQUE KEY `email_7` (`email`),
  ADD UNIQUE KEY `email_8` (`email`),
  ADD UNIQUE KEY `email_9` (`email`),
  ADD UNIQUE KEY `email_10` (`email`),
  ADD UNIQUE KEY `email_11` (`email`),
  ADD UNIQUE KEY `email_12` (`email`),
  ADD UNIQUE KEY `email_13` (`email`),
  ADD UNIQUE KEY `email_14` (`email`),
  ADD UNIQUE KEY `email_15` (`email`),
  ADD UNIQUE KEY `email_16` (`email`),
  ADD UNIQUE KEY `email_17` (`email`),
  ADD UNIQUE KEY `email_18` (`email`),
  ADD UNIQUE KEY `email_19` (`email`),
  ADD UNIQUE KEY `email_20` (`email`),
  ADD UNIQUE KEY `email_21` (`email`),
  ADD UNIQUE KEY `email_22` (`email`),
  ADD UNIQUE KEY `email_23` (`email`),
  ADD UNIQUE KEY `email_24` (`email`),
  ADD UNIQUE KEY `email_25` (`email`),
  ADD UNIQUE KEY `email_26` (`email`),
  ADD UNIQUE KEY `email_27` (`email`),
  ADD UNIQUE KEY `email_28` (`email`),
  ADD UNIQUE KEY `email_29` (`email`),
  ADD UNIQUE KEY `email_30` (`email`),
  ADD UNIQUE KEY `email_31` (`email`),
  ADD UNIQUE KEY `email_32` (`email`),
  ADD UNIQUE KEY `email_33` (`email`),
  ADD UNIQUE KEY `email_34` (`email`),
  ADD UNIQUE KEY `email_35` (`email`),
  ADD UNIQUE KEY `email_36` (`email`),
  ADD UNIQUE KEY `email_37` (`email`),
  ADD UNIQUE KEY `email_38` (`email`),
  ADD UNIQUE KEY `email_39` (`email`),
  ADD UNIQUE KEY `email_40` (`email`),
  ADD UNIQUE KEY `email_41` (`email`),
  ADD UNIQUE KEY `email_42` (`email`),
  ADD UNIQUE KEY `email_43` (`email`),
  ADD UNIQUE KEY `email_44` (`email`),
  ADD UNIQUE KEY `email_45` (`email`),
  ADD UNIQUE KEY `email_46` (`email`),
  ADD UNIQUE KEY `email_47` (`email`),
  ADD UNIQUE KEY `email_48` (`email`),
  ADD UNIQUE KEY `email_49` (`email`),
  ADD UNIQUE KEY `email_50` (`email`),
  ADD UNIQUE KEY `email_51` (`email`),
  ADD UNIQUE KEY `email_52` (`email`),
  ADD UNIQUE KEY `email_53` (`email`),
  ADD UNIQUE KEY `email_54` (`email`),
  ADD UNIQUE KEY `email_55` (`email`),
  ADD UNIQUE KEY `email_56` (`email`),
  ADD UNIQUE KEY `email_57` (`email`),
  ADD UNIQUE KEY `email_58` (`email`),
  ADD UNIQUE KEY `email_59` (`email`),
  ADD UNIQUE KEY `email_60` (`email`),
  ADD UNIQUE KEY `email_61` (`email`),
  ADD UNIQUE KEY `email_62` (`email`),
  ADD KEY `branch_id` (`branch_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `accounts`
--
ALTER TABLE `accounts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `applicants`
--
ALTER TABLE `applicants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `assets`
--
ALTER TABLE `assets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=44;

--
-- AUTO_INCREMENT for table `automation_rules`
--
ALTER TABLE `automation_rules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `bank_account_ledger_maps`
--
ALTER TABLE `bank_account_ledger_maps`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `batches`
--
ALTER TABLE `batches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `blog_posts`
--
ALTER TABLE `blog_posts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `branches`
--
ALTER TABLE `branches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `budgets`
--
ALTER TABLE `budgets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `campaign_templates`
--
ALTER TABLE `campaign_templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `contacts`
--
ALTER TABLE `contacts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `courses`
--
ALTER TABLE `courses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `crm_activities`
--
ALTER TABLE `crm_activities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `enrollments`
--
ALTER TABLE `enrollments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `expense_categories`
--
ALTER TABLE `expense_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `income_categories`
--
ALTER TABLE `income_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `job_postings`
--
ALTER TABLE `job_postings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `journal_entries`
--
ALTER TABLE `journal_entries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `journal_lines`
--
ALTER TABLE `journal_lines`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT for table `leads`
--
ALTER TABLE `leads`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `leave_balances`
--
ALTER TABLE `leave_balances`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `leave_requests`
--
ALTER TABLE `leave_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `leave_types`
--
ALTER TABLE `leave_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `liquidity_movements`
--
ALTER TABLE `liquidity_movements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT for table `materials`
--
ALTER TABLE `materials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `opportunities`
--
ALTER TABLE `opportunities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `payrolls`
--
ALTER TABLE `payrolls`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `performance_reviews`
--
ALTER TABLE `performance_reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pte_attempts`
--
ALTER TABLE `pte_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `pte_tasks`
--
ALTER TABLE `pte_tasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `rbac_configs`
--
ALTER TABLE `rbac_configs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `reconciliation_events`
--
ALTER TABLE `reconciliation_events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `reconciliation_lines`
--
ALTER TABLE `reconciliation_lines`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `reconciliation_sessions`
--
ALTER TABLE `reconciliation_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `rooms`
--
ALTER TABLE `rooms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `room_bookings`
--
ALTER TABLE `room_bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `shifts`
--
ALTER TABLE `shifts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `staff_attendance`
--
ALTER TABLE `staff_attendance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `staff_documents`
--
ALTER TABLE `staff_documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `staff_profiles`
--
ALTER TABLE `staff_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `staff_schedules`
--
ALTER TABLE `staff_schedules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=52;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=56;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `accounts`
--
ALTER TABLE `accounts`
  ADD CONSTRAINT `accounts_ibfk_120` FOREIGN KEY (`parent_id`) REFERENCES `accounts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `accounts_ibfk_121` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `applicants`
--
ALTER TABLE `applicants`
  ADD CONSTRAINT `applicants_ibfk_1` FOREIGN KEY (`job_posting_id`) REFERENCES `job_postings` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `assets`
--
ALTER TABLE `assets`
  ADD CONSTRAINT `assets_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `attendance`
--
ALTER TABLE `attendance`
  ADD CONSTRAINT `attendance_ibfk_34` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `attendance_ibfk_35` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `attendance_ibfk_36` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_10` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `audit_logs_ibfk_9` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `automation_rules`
--
ALTER TABLE `automation_rules`
  ADD CONSTRAINT `automation_rules_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`);

--
-- Constraints for table `bank_account_ledger_maps`
--
ALTER TABLE `bank_account_ledger_maps`
  ADD CONSTRAINT `bank_account_ledger_maps_ibfk_313` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `bank_account_ledger_maps_ibfk_314` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `bank_account_ledger_maps_ibfk_315` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `batches`
--
ALTER TABLE `batches`
  ADD CONSTRAINT `batches_ibfk_179` FOREIGN KEY (`trainer_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `batches_ibfk_286` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `batches_ibfk_287` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `blog_posts`
--
ALTER TABLE `blog_posts`
  ADD CONSTRAINT `blog_posts_ibfk_10` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `blog_posts_ibfk_9` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `budgets`
--
ALTER TABLE `budgets`
  ADD CONSTRAINT `budgets_ibfk_10` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `budgets_ibfk_9` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `campaign_templates`
--
ALTER TABLE `campaign_templates`
  ADD CONSTRAINT `campaign_templates_ibfk_239` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `campaign_templates_ibfk_240` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `contacts`
--
ALTER TABLE `contacts`
  ADD CONSTRAINT `contacts_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `courses`
--
ALTER TABLE `courses`
  ADD CONSTRAINT `courses_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `crm_activities`
--
ALTER TABLE `crm_activities`
  ADD CONSTRAINT `crm_activities_ibfk_254` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `crm_activities_ibfk_255` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `crm_activities_ibfk_256` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `customers`
--
ALTER TABLE `customers`
  ADD CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `enrollments`
--
ALTER TABLE `enrollments`
  ADD CONSTRAINT `enrollments_ibfk_340` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `enrollments_ibfk_341` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `enrollments_ibfk_342` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `expenses_ibfk_517` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `expenses_ibfk_518` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `expenses_ibfk_519` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `expenses_ibfk_520` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `expenses_ibfk_521` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `expense_categories`
--
ALTER TABLE `expense_categories`
  ADD CONSTRAINT `expense_categories_ibfk_255` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `expense_categories_ibfk_256` FOREIGN KEY (`parent_id`) REFERENCES `expense_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `income_categories`
--
ALTER TABLE `income_categories`
  ADD CONSTRAINT `income_categories_ibfk_43` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `income_categories_ibfk_44` FOREIGN KEY (`parent_id`) REFERENCES `income_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_ibfk_178` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `invoices_ibfk_179` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `invoices_ibfk_180` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `job_postings`
--
ALTER TABLE `job_postings`
  ADD CONSTRAINT `job_postings_ibfk_77` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `job_postings_ibfk_78` FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `journal_entries`
--
ALTER TABLE `journal_entries`
  ADD CONSTRAINT `journal_entries_ibfk_122` FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `journal_entries_ibfk_123` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `journal_lines`
--
ALTER TABLE `journal_lines`
  ADD CONSTRAINT `journal_lines_ibfk_229` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `journal_lines_ibfk_230` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `leads`
--
ALTER TABLE `leads`
  ADD CONSTRAINT `leads_ibfk_194` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `leads_ibfk_195` FOREIGN KEY (`counselor_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `leave_balances`
--
ALTER TABLE `leave_balances`
  ADD CONSTRAINT `leave_balances_ibfk_77` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `leave_balances_ibfk_78` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `leave_requests`
--
ALTER TABLE `leave_requests`
  ADD CONSTRAINT `leave_requests_ibfk_112` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `leave_requests_ibfk_113` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `leave_requests_ibfk_114` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `leave_requests_ibfk_115` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `liquidity_movements`
--
ALTER TABLE `liquidity_movements`
  ADD CONSTRAINT `liquidity_movements_ibfk_456` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `liquidity_movements_ibfk_457` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `liquidity_movements_ibfk_458` FOREIGN KEY (`related_account_id`) REFERENCES `accounts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `liquidity_movements_ibfk_459` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `liquidity_movements_ibfk_460` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `materials`
--
ALTER TABLE `materials`
  ADD CONSTRAINT `materials_ibfk_15` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `materials_ibfk_16` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_15` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `notifications_ibfk_16` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `opportunities`
--
ALTER TABLE `opportunities`
  ADD CONSTRAINT `opportunities_ibfk_219` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `opportunities_ibfk_220` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `payrolls`
--
ALTER TABLE `payrolls`
  ADD CONSTRAINT `payrolls_ibfk_22` FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `payrolls_ibfk_23` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `payrolls_ibfk_24` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `performance_reviews`
--
ALTER TABLE `performance_reviews`
  ADD CONSTRAINT `performance_reviews_ibfk_115` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `performance_reviews_ibfk_116` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `performance_reviews_ibfk_117` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `pte_attempts`
--
ALTER TABLE `pte_attempts`
  ADD CONSTRAINT `pte_attempts_ibfk_28` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `pte_attempts_ibfk_29` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `pte_attempts_ibfk_30` FOREIGN KEY (`task_id`) REFERENCES `pte_tasks` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `reconciliation_events`
--
ALTER TABLE `reconciliation_events`
  ADD CONSTRAINT `reconciliation_events_ibfk_316` FOREIGN KEY (`session_id`) REFERENCES `reconciliation_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `reconciliation_events_ibfk_317` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `reconciliation_events_ibfk_318` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `reconciliation_lines`
--
ALTER TABLE `reconciliation_lines`
  ADD CONSTRAINT `reconciliation_lines_ibfk_416` FOREIGN KEY (`session_id`) REFERENCES `reconciliation_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `reconciliation_lines_ibfk_417` FOREIGN KEY (`mapping_id`) REFERENCES `bank_account_ledger_maps` (`id`),
  ADD CONSTRAINT `reconciliation_lines_ibfk_418` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `reconciliation_lines_ibfk_419` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `reconciliation_sessions`
--
ALTER TABLE `reconciliation_sessions`
  ADD CONSTRAINT `reconciliation_sessions_ibfk_413` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `reconciliation_sessions_ibfk_414` FOREIGN KEY (`prepared_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `reconciliation_sessions_ibfk_415` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `reconciliation_sessions_ibfk_416` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `rooms`
--
ALTER TABLE `rooms`
  ADD CONSTRAINT `rooms_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `room_bookings`
--
ALTER TABLE `room_bookings`
  ADD CONSTRAINT `room_bookings_ibfk_25` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `room_bookings_ibfk_26` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `room_bookings_ibfk_27` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `shifts`
--
ALTER TABLE `shifts`
  ADD CONSTRAINT `shifts_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `staff_attendance`
--
ALTER TABLE `staff_attendance`
  ADD CONSTRAINT `staff_attendance_ibfk_77` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `staff_attendance_ibfk_78` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `staff_documents`
--
ALTER TABLE `staff_documents`
  ADD CONSTRAINT `staff_documents_ibfk_77` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `staff_documents_ibfk_78` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `staff_documents_ibfk_79` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `staff_profiles`
--
ALTER TABLE `staff_profiles`
  ADD CONSTRAINT `staff_profiles_ibfk_93` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `staff_profiles_ibfk_94` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `staff_profiles_ibfk_95` FOREIGN KEY (`reports_to`) REFERENCES `users` (`id`);

--
-- Constraints for table `staff_schedules`
--
ALTER TABLE `staff_schedules`
  ADD CONSTRAINT `staff_schedules_ibfk_77` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `staff_schedules_ibfk_78` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `students_ibfk_379` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `students_ibfk_380` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `students_ibfk_381` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `students_ibfk_382` FOREIGN KEY (`guardian_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_221` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `transactions_ibfk_222` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `transactions_ibfk_321` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `transactions_ibfk_322` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
