-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: May 10, 2026 at 04:21 PM
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
(12, 1, '1000', 'Cash in Hand', 'asset', NULL, 0, '2026-04-03 08:31:01', '2026-04-03 09:38:38', 'cash'),
(15, 1, '4010', 'Custom Income Revenue', 'revenue', NULL, 1, '2026-04-03 09:56:30', '2026-04-03 09:56:30', NULL),
(16, 1, '6100', 'Referral Expense', 'expense', NULL, 1, '2026-04-20 18:24:47', '2026-04-20 18:24:47', NULL),
(17, 1, '2100', 'Accounts Payable - Referrals', 'liability', NULL, 1, '2026-04-20 18:24:47', '2026-04-20 18:24:47', NULL),
(18, 1, '6101', 'Pitty Cash', 'expense', NULL, 1, '2026-04-20 19:30:09', '2026-04-20 19:30:09', NULL),
(19, 1, '6102', 'Salaries & Wages', 'expense', NULL, 1, '2026-05-09 05:43:18', '2026-05-09 05:43:18', NULL),
(20, 8, '1001-U', 'CASH-MIRPUR', 'asset', NULL, 1, '2026-05-09 07:23:35', '2026-05-09 07:23:35', 'cash'),
(21, 8, '4000-U', 'Tuition Revenue - Uttara', 'revenue', NULL, 1, '2026-05-09 07:33:29', '2026-05-09 07:33:29', NULL),
(22, 8, '5001-U', 'Salaries & Wages', 'expense', NULL, 1, '2026-05-10 14:43:56', '2026-05-10 14:43:56', NULL),
(23, 8, '5002-U', 'Office Rent', 'expense', NULL, 1, '2026-05-10 15:43:35', '2026-05-10 15:43:35', NULL);

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
  `asset_tag` varchar(255) DEFAULT NULL COMMENT 'Unique human-readable tag like AST-001',
  `name` varchar(255) NOT NULL,
  `type` enum('hardware','furniture','appliance','stationery','electronics','electrical','av_equipment','computers','security','books','other') DEFAULT 'hardware',
  `category` varchar(255) DEFAULT NULL COMMENT 'Display category label e.g. A/V, Electronics, Furniture',
  `serial_no` varchar(255) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL COMMENT 'Physical location e.g. Room 201, Admin Office, Hall A',
  `image_url` varchar(255) DEFAULT NULL COMMENT 'Uploaded asset image URL',
  `purchase_date` date DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT 0.00,
  `book_value` decimal(12,2) DEFAULT NULL COMMENT 'Current book value after depreciation',
  `depreciation_rate` decimal(5,2) DEFAULT 20.00 COMMENT 'Annual depreciation rate in percent',
  `warranty_expiry` date DEFAULT NULL,
  `status` enum('active','good','maintenance','repair','retired','disposed','lost') DEFAULT 'active',
  `condition_notes` text DEFAULT NULL COMMENT 'Current condition description',
  `last_maintained` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `assets`
--

INSERT INTO `assets` (`id`, `branch_id`, `asset_tag`, `name`, `type`, `category`, `serial_no`, `location`, `image_url`, `purchase_date`, `cost`, `book_value`, `depreciation_rate`, `warranty_expiry`, `status`, `condition_notes`, `last_maintained`, `notes`, `created_at`, `updated_at`) VALUES
(2, 1, 'AST-001', 'TEST', 'hardware', 'TEST', '1514FFF', 'R32', '/uploads/assets/asset-1778422215632-4329579.jpg', '2026-01-10', 5000.00, 5000.00, 20.00, '2026-05-01', 'active', NULL, NULL, NULL, '2026-05-09 21:15:14', '2026-05-10 14:10:15');

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
(43, 1, 1, 'create', 'LiquidityMovement', 44, NULL, '{\"id\":44,\"account_id\":10,\"movement_date\":\"2026-04-03\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":23500,\"new_balance\":23500,\"actual_balance\":23500,\"variance_amount\":0,\"reference\":\"CLOSE-2026-04-03\",\"remarks\":\"Closing submitted for Nagad\",\"reason\":\"\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-04-03T10:00:46.331Z\",\"createdAt\":\"2026-04-03T10:00:46.331Z\"}', '::ffff:127.0.0.1', '2026-04-03 10:00:46', '2026-04-03 10:00:46'),
(44, 1, 1, 'create', 'LiquidityMovement', 45, NULL, '{\"id\":45,\"account_id\":1,\"movement_date\":\"2026-04-21\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":50000,\"new_balance\":50000,\"actual_balance\":0,\"variance_amount\":-50000,\"reference\":\"CLOSE-2026-04-21\",\"remarks\":\"Closing submitted for CASH-HQ\",\"reason\":\"nothing today\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-04-20T18:28:21.445Z\",\"createdAt\":\"2026-04-20T18:28:21.445Z\"}', '::ffff:127.0.0.1', '2026-04-20 18:28:21', '2026-04-20 18:28:21'),
(45, 1, 1, 'create', 'LiquidityMovement', 46, NULL, '{\"id\":46,\"account_id\":1,\"movement_date\":\"2026-04-21\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":50000,\"new_balance\":50000,\"actual_balance\":50000,\"variance_amount\":0,\"reference\":\"CLOSE-2026-04-21\",\"remarks\":\"Closing submitted for CASH-HQ\",\"reason\":\"\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-04-20T18:29:10.179Z\",\"createdAt\":\"2026-04-20T18:29:10.179Z\"}', '::ffff:127.0.0.1', '2026-04-20 18:29:10', '2026-04-20 18:29:10'),
(46, 1, 1, 'create', 'LiquidityMovement', 47, NULL, '{\"id\":47,\"account_id\":1,\"movement_date\":\"2026-04-21\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":50000,\"new_balance\":50000,\"actual_balance\":49500,\"variance_amount\":-500,\"reference\":\"CLOSE-2026-04-21\",\"remarks\":\"Closing submitted for CASH-HQ\",\"reason\":\"will adjust tomorrow\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-04-20T18:29:38.330Z\",\"createdAt\":\"2026-04-20T18:29:38.330Z\"}', '::ffff:127.0.0.1', '2026-04-20 18:29:38', '2026-04-20 18:29:38'),
(47, 1, 1, 'create', 'LiquidityMovement', 48, NULL, '{\"id\":48,\"account_id\":1,\"movement_date\":\"2026-04-21\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":52000,\"new_balance\":52000,\"actual_balance\":52000,\"variance_amount\":0,\"reference\":\"CLOSE-2026-04-21\",\"remarks\":\"Closing submitted for CASH-HQ\",\"reason\":\"\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-04-20T19:11:52.396Z\",\"createdAt\":\"2026-04-20T19:11:52.396Z\"}', '::ffff:127.0.0.1', '2026-04-20 19:11:52', '2026-04-20 19:11:52'),
(48, 1, 1, 'create', 'LiquidityMovement', 49, NULL, '{\"id\":49,\"account_id\":1,\"movement_date\":\"2026-05-04\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":107000,\"new_balance\":107000,\"actual_balance\":107000,\"variance_amount\":0,\"reference\":\"CLOSE-2026-05-04\",\"remarks\":\"Closing submitted for CASH-HQ\",\"reason\":\"\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-05-04T11:46:15.337Z\",\"createdAt\":\"2026-05-04T11:46:15.337Z\"}', '127.0.0.1', '2026-05-04 11:46:15', '2026-05-04 11:46:15'),
(49, 1, 1, 'create', 'LiquidityMovement', 50, NULL, '{\"id\":50,\"account_id\":1,\"movement_date\":\"2026-05-05\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":162500,\"new_balance\":162500,\"actual_balance\":162000,\"variance_amount\":-500,\"reference\":\"CLOSE-2026-05-05\",\"remarks\":\"Closing submitted for CASH-HQ\",\"reason\":\"500\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-05-04T21:43:36.112Z\",\"createdAt\":\"2026-05-04T21:43:36.112Z\"}', '127.0.0.1', '2026-05-04 21:43:36', '2026-05-04 21:43:36'),
(50, 1, 1, 'GENERATE', 'Payroll', NULL, NULL, '{\"month\":4,\"year\":2026,\"records\":2}', NULL, '2026-05-09 05:10:38', '2026-05-09 05:10:38'),
(51, 1, 1, 'GENERATE', 'Payroll', NULL, NULL, '{\"month\":4,\"year\":2026,\"records\":2}', NULL, '2026-05-09 05:10:56', '2026-05-09 05:10:56'),
(52, 1, 1, 'UPDATE_STATUS', 'StaffProfile', 3, NULL, '{\"staff_id\":1,\"employment_status\":\"active\",\"exit_date\":\"\",\"exit_reason\":\"\"}', NULL, '2026-05-09 05:24:19', '2026-05-09 05:24:19'),
(53, 1, 1, 'UPDATE_STATUS', 'StaffProfile', 3, NULL, '{\"staff_id\":1,\"employment_status\":\"notice_period\",\"exit_reason\":\"Personal reasons\"}', NULL, '2026-05-09 05:24:19', '2026-05-09 05:24:19'),
(54, 1, 1, 'UPDATE_STATUS', 'StaffProfile', 3, NULL, '{\"staff_id\":1,\"employment_status\":\"active\"}', NULL, '2026-05-09 05:24:19', '2026-05-09 05:24:19'),
(55, 1, 1, 'CREATE_DEDUCTION', 'PayrollDeduction', 1, NULL, '{\"id\":1,\"staff_id\":1,\"branch_id\":1,\"month\":4,\"year\":2026,\"deduction_type\":\"late_fine\",\"source\":\"manual\",\"amount\":500,\"reason\":\"Test deduction — late arrival\",\"status\":\"approved\",\"created_by\":1,\"approved_by\":1,\"updatedAt\":\"2026-05-09T05:24:20.080Z\",\"createdAt\":\"2026-05-09T05:24:20.080Z\"}', NULL, '2026-05-09 05:24:20', '2026-05-09 05:24:20'),
(56, 1, 1, 'GENERATE', 'Payroll', NULL, NULL, '{\"month\":4,\"year\":2026,\"records\":3}', NULL, '2026-05-09 05:24:22', '2026-05-09 05:24:22'),
(57, 1, 1, 'SUBMIT_TO_ACCOUNTING', 'Payroll', 1, NULL, '{\"expense_id\":18,\"amount\":\"20000.00\",\"account_id\":12}', NULL, '2026-05-09 05:24:23', '2026-05-09 05:24:23'),
(58, 1, 1, 'UPDATE_STATUS', 'StaffProfile', 3, NULL, '{\"staff_id\":1,\"employment_status\":\"active\",\"exit_date\":\"\",\"exit_reason\":\"\"}', NULL, '2026-05-09 05:27:18', '2026-05-09 05:27:18'),
(59, 1, 1, 'UPDATE_STATUS', 'StaffProfile', 3, NULL, '{\"staff_id\":1,\"employment_status\":\"notice_period\",\"exit_reason\":\"Personal reasons\"}', NULL, '2026-05-09 05:27:19', '2026-05-09 05:27:19'),
(60, 1, 1, 'UPDATE_STATUS', 'StaffProfile', 3, NULL, '{\"staff_id\":1,\"employment_status\":\"active\"}', NULL, '2026-05-09 05:27:19', '2026-05-09 05:27:19'),
(61, 1, 1, 'CREATE_DEDUCTION', 'PayrollDeduction', 2, NULL, '{\"id\":2,\"staff_id\":1,\"branch_id\":1,\"month\":4,\"year\":2026,\"deduction_type\":\"late_fine\",\"source\":\"manual\",\"amount\":500,\"reason\":\"Test deduction — late arrival\",\"status\":\"approved\",\"created_by\":1,\"approved_by\":1,\"updatedAt\":\"2026-05-09T05:27:19.581Z\",\"createdAt\":\"2026-05-09T05:27:19.581Z\"}', NULL, '2026-05-09 05:27:19', '2026-05-09 05:27:19'),
(62, 1, 1, 'GENERATE', 'Payroll', NULL, NULL, '{\"month\":4,\"year\":2026,\"records\":3}', NULL, '2026-05-09 05:27:21', '2026-05-09 05:27:21'),
(63, 1, 1, 'UPDATE_STATUS', 'StaffProfile', 3, NULL, '{\"staff_id\":1,\"employment_status\":\"active\",\"exit_date\":\"\",\"exit_reason\":\"\"}', NULL, '2026-05-09 05:28:11', '2026-05-09 05:28:11'),
(64, 1, 1, 'UPDATE_STATUS', 'StaffProfile', 3, NULL, '{\"staff_id\":1,\"employment_status\":\"notice_period\",\"exit_reason\":\"Personal reasons\"}', NULL, '2026-05-09 05:28:12', '2026-05-09 05:28:12'),
(65, 1, 1, 'UPDATE_STATUS', 'StaffProfile', 3, NULL, '{\"staff_id\":1,\"employment_status\":\"active\"}', NULL, '2026-05-09 05:28:12', '2026-05-09 05:28:12'),
(66, 1, 1, 'CREATE_DEDUCTION', 'PayrollDeduction', 3, NULL, '{\"id\":3,\"staff_id\":1,\"branch_id\":1,\"month\":4,\"year\":2026,\"deduction_type\":\"late_fine\",\"source\":\"manual\",\"amount\":500,\"reason\":\"Test deduction — late arrival\",\"status\":\"approved\",\"created_by\":1,\"approved_by\":1,\"updatedAt\":\"2026-05-09T05:28:12.831Z\",\"createdAt\":\"2026-05-09T05:28:12.831Z\"}', NULL, '2026-05-09 05:28:12', '2026-05-09 05:28:12'),
(67, 1, 1, 'GENERATE', 'Payroll', NULL, NULL, '{\"month\":4,\"year\":2026,\"records\":3}', NULL, '2026-05-09 05:28:14', '2026-05-09 05:28:14'),
(68, 1, 1, 'SUBMIT_TO_ACCOUNTING', 'Payroll', 2, NULL, '{\"expense_id\":19,\"amount\":\"2322.00\",\"account_id\":12}', NULL, '2026-05-09 05:28:16', '2026-05-09 05:28:16'),
(69, 1, 1, 'CREATE_DEDUCTION', 'PayrollDeduction', 4, NULL, '{\"id\":4,\"staff_id\":\"1\",\"branch_id\":1,\"month\":5,\"year\":2026,\"deduction_type\":\"loan_repayment\",\"source\":\"manual\",\"amount\":2000,\"reason\":\"\",\"status\":\"approved\",\"created_by\":1,\"approved_by\":1,\"updatedAt\":\"2026-05-09T05:29:23.129Z\",\"createdAt\":\"2026-05-09T05:29:23.129Z\"}', NULL, '2026-05-09 05:29:23', '2026-05-09 05:29:23'),
(70, 1, 1, 'UPDATE_STATUS', 'StaffProfile', 3, NULL, '{\"staff_id\":1,\"employment_status\":\"active\",\"exit_date\":\"\",\"exit_reason\":\"\"}', NULL, '2026-05-09 05:34:55', '2026-05-09 05:34:55'),
(71, 1, 1, 'UPDATE_STATUS', 'StaffProfile', 3, NULL, '{\"staff_id\":1,\"employment_status\":\"notice_period\",\"exit_reason\":\"Personal reasons\"}', NULL, '2026-05-09 05:34:56', '2026-05-09 05:34:56'),
(72, 1, 1, 'UPDATE_STATUS', 'StaffProfile', 3, NULL, '{\"staff_id\":1,\"employment_status\":\"active\"}', NULL, '2026-05-09 05:34:56', '2026-05-09 05:34:56'),
(73, 1, 1, 'CREATE_DEDUCTION', 'PayrollDeduction', 5, NULL, '{\"id\":5,\"staff_id\":1,\"branch_id\":1,\"month\":4,\"year\":2026,\"deduction_type\":\"late_fine\",\"source\":\"manual\",\"amount\":500,\"reason\":\"Test deduction — late arrival\",\"status\":\"approved\",\"created_by\":1,\"approved_by\":1,\"updatedAt\":\"2026-05-09T05:34:56.633Z\",\"createdAt\":\"2026-05-09T05:34:56.633Z\"}', NULL, '2026-05-09 05:34:56', '2026-05-09 05:34:56'),
(74, 1, 1, 'GENERATE', 'Payroll', NULL, NULL, '{\"month\":4,\"year\":2026,\"records\":3}', NULL, '2026-05-09 05:34:58', '2026-05-09 05:34:58'),
(75, 1, 1, 'SUBMIT_TO_ACCOUNTING', 'Payroll', 6, NULL, '{\"expense_id\":20,\"amount\":\"24400.00\",\"account_id\":12}', NULL, '2026-05-09 05:34:59', '2026-05-09 05:34:59'),
(76, 1, 1, 'APPROVE_PAYMENT', 'Payroll', 6, NULL, '{\"expense_id\":20,\"journal_entry_id\":60,\"amount\":\"24400.00\"}', NULL, '2026-05-09 05:43:18', '2026-05-09 05:43:18'),
(77, 1, 1, 'APPROVE_PAYMENT', 'Payroll', 2, NULL, '{\"expense_id\":19,\"journal_entry_id\":61,\"amount\":\"2322.00\"}', NULL, '2026-05-09 05:55:01', '2026-05-09 05:55:01'),
(78, 1, 1, 'APPROVE_PAYMENT', 'Payroll', 1, NULL, '{\"expense_id\":18,\"journal_entry_id\":62,\"amount\":\"20000.00\"}', NULL, '2026-05-09 05:55:04', '2026-05-09 05:55:04'),
(79, 1, 1, 'UPDATE_STATUS', 'StaffProfile', 3, NULL, '{\"staff_id\":1,\"employment_status\":\"active\",\"exit_date\":\"\",\"exit_reason\":\"\"}', NULL, '2026-05-09 05:55:59', '2026-05-09 05:55:59'),
(80, 1, 1, 'UPDATE_STATUS', 'StaffProfile', 3, NULL, '{\"staff_id\":1,\"employment_status\":\"notice_period\",\"exit_reason\":\"Personal reasons\"}', NULL, '2026-05-09 05:56:00', '2026-05-09 05:56:00'),
(81, 1, 1, 'UPDATE_STATUS', 'StaffProfile', 3, NULL, '{\"staff_id\":1,\"employment_status\":\"active\"}', NULL, '2026-05-09 05:56:00', '2026-05-09 05:56:00'),
(82, 1, 1, 'CREATE_DEDUCTION', 'PayrollDeduction', 6, NULL, '{\"id\":6,\"staff_id\":1,\"branch_id\":1,\"month\":4,\"year\":2026,\"deduction_type\":\"late_fine\",\"source\":\"manual\",\"amount\":500,\"reason\":\"Test deduction — late arrival\",\"status\":\"approved\",\"created_by\":1,\"approved_by\":1,\"updatedAt\":\"2026-05-09T05:56:00.702Z\",\"createdAt\":\"2026-05-09T05:56:00.702Z\"}', NULL, '2026-05-09 05:56:00', '2026-05-09 05:56:00'),
(83, 1, 1, 'UPDATE_STATUS', 'StaffProfile', 3, NULL, '{\"staff_id\":1,\"employment_status\":\"active\",\"exit_date\":\"\",\"exit_reason\":\"\"}', NULL, '2026-05-09 05:59:42', '2026-05-09 05:59:42'),
(84, 1, 1, 'UPDATE_STATUS', 'StaffProfile', 3, NULL, '{\"staff_id\":1,\"employment_status\":\"notice_period\",\"exit_reason\":\"Personal reasons\"}', NULL, '2026-05-09 05:59:42', '2026-05-09 05:59:42'),
(85, 1, 1, 'UPDATE_STATUS', 'StaffProfile', 3, NULL, '{\"staff_id\":1,\"employment_status\":\"active\"}', NULL, '2026-05-09 05:59:43', '2026-05-09 05:59:43'),
(86, 1, 1, 'CREATE_DEDUCTION', 'PayrollDeduction', 7, NULL, '{\"id\":7,\"staff_id\":1,\"branch_id\":1,\"month\":4,\"year\":2026,\"deduction_type\":\"late_fine\",\"source\":\"manual\",\"amount\":500,\"reason\":\"Test deduction — late arrival\",\"status\":\"approved\",\"created_by\":1,\"approved_by\":1,\"updatedAt\":\"2026-05-09T05:59:43.409Z\",\"createdAt\":\"2026-05-09T05:59:43.409Z\"}', NULL, '2026-05-09 05:59:43', '2026-05-09 05:59:43'),
(87, 85, 8, 'create', 'LiquidityMovement', 51, NULL, '{\"id\":51,\"account_id\":20,\"movement_date\":\"2026-05-09\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":5500,\"new_balance\":5500,\"actual_balance\":5500,\"variance_amount\":0,\"reference\":\"CLOSE-2026-05-09\",\"remarks\":\"Closing submitted for CASH-MIRPUR\",\"reason\":\"\",\"branch_id\":8,\"created_by\":85,\"updated_by\":85,\"updatedAt\":\"2026-05-09T07:33:48.579Z\",\"createdAt\":\"2026-05-09T07:33:48.579Z\"}', '::ffff:127.0.0.1', '2026-05-09 07:33:48', '2026-05-09 07:33:48'),
(88, 85, 8, 'create', 'LiquidityMovement', 52, NULL, '{\"id\":52,\"account_id\":20,\"movement_date\":\"2026-05-09\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":5500,\"new_balance\":5500,\"actual_balance\":5500,\"variance_amount\":0,\"reference\":\"CLOSE-2026-05-09\",\"remarks\":\"Closing submitted for CASH-MIRPUR\",\"reason\":\"\",\"branch_id\":8,\"created_by\":85,\"updated_by\":85,\"updatedAt\":\"2026-05-09T07:33:54.042Z\",\"createdAt\":\"2026-05-09T07:33:54.042Z\"}', '::ffff:127.0.0.1', '2026-05-09 07:33:54', '2026-05-09 07:33:54'),
(89, 85, 8, 'create', 'LiquidityMovement', 53, NULL, '{\"id\":53,\"account_id\":20,\"movement_date\":\"2026-05-09\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":5500,\"new_balance\":5500,\"actual_balance\":5500,\"variance_amount\":0,\"reference\":\"CLOSE-2026-05-09\",\"remarks\":\"Closing submitted for CASH-MIRPUR\",\"reason\":\"Nothing\",\"branch_id\":8,\"created_by\":85,\"updated_by\":85,\"updatedAt\":\"2026-05-09T07:34:01.746Z\",\"createdAt\":\"2026-05-09T07:34:01.746Z\"}', '::ffff:127.0.0.1', '2026-05-09 07:34:01', '2026-05-09 07:34:01'),
(90, 85, 8, 'create', 'LiquidityMovement', 54, NULL, '{\"id\":54,\"account_id\":20,\"movement_date\":\"2026-05-09\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":5500,\"new_balance\":5500,\"actual_balance\":5500,\"variance_amount\":0,\"reference\":\"CLOSE-2026-05-09\",\"remarks\":\"Closing submitted for CASH-MIRPUR\",\"reason\":\"Nothing\",\"branch_id\":8,\"created_by\":85,\"updated_by\":85,\"updatedAt\":\"2026-05-09T07:34:09.094Z\",\"createdAt\":\"2026-05-09T07:34:09.094Z\"}', '::ffff:127.0.0.1', '2026-05-09 07:34:09', '2026-05-09 07:34:09'),
(91, 1, 8, 'create', 'LiquidityMovement', 55, NULL, '{\"id\":55,\"account_id\":20,\"movement_date\":\"2026-05-09\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":5500,\"new_balance\":5500,\"actual_balance\":5500,\"variance_amount\":0,\"reference\":\"CLOSE-2026-05-09\",\"remarks\":\"Closing submitted for CASH-MIRPUR\",\"reason\":\"\",\"branch_id\":8,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-05-09T17:50:12.500Z\",\"createdAt\":\"2026-05-09T17:50:12.500Z\"}', '::ffff:127.0.0.1', '2026-05-09 17:50:12', '2026-05-09 17:50:12'),
(92, 85, 8, 'create', 'LiquidityMovement', 56, NULL, '{\"id\":56,\"account_id\":20,\"movement_date\":\"2026-05-09\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":11000,\"new_balance\":11000,\"actual_balance\":11000,\"variance_amount\":0,\"reference\":\"CLOSE-2026-05-09\",\"remarks\":\"Closing submitted for CASH-MIRPUR\",\"reason\":\"\",\"branch_id\":8,\"created_by\":85,\"updated_by\":85,\"updatedAt\":\"2026-05-09T18:01:51.595Z\",\"createdAt\":\"2026-05-09T18:01:51.595Z\"}', '::ffff:127.0.0.1', '2026-05-09 18:01:51', '2026-05-09 18:01:51'),
(93, 85, 8, 'create', 'LiquidityMovement', 57, NULL, '{\"id\":57,\"account_id\":20,\"movement_date\":\"2026-05-10\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":11000,\"new_balance\":11000,\"actual_balance\":11000,\"variance_amount\":0,\"reference\":\"CLOSE-2026-05-10\",\"remarks\":\"Closing submitted for CASH-MIRPUR\",\"reason\":\"\",\"branch_id\":8,\"created_by\":85,\"updated_by\":85,\"updatedAt\":\"2026-05-09T18:10:00.605Z\",\"createdAt\":\"2026-05-09T18:10:00.605Z\"}', '::ffff:127.0.0.1', '2026-05-09 18:10:00', '2026-05-09 18:10:00'),
(94, 85, 8, 'update', 'LiquidityMovement', 57, '{\"actual_balance\":11500}', '{\"actual_balance\":11500,\"variance\":500}', '::ffff:127.0.0.1', '2026-05-09 18:14:57', '2026-05-09 18:14:57'),
(95, 1, 1, 'create', 'LiquidityMovement', 58, NULL, '{\"id\":58,\"account_id\":1,\"movement_date\":\"2026-05-10\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":115778,\"new_balance\":115778,\"actual_balance\":115778,\"variance_amount\":0,\"reference\":\"CLOSE-2026-05-10\",\"remarks\":\"Closing submitted for CASH-HQ\",\"reason\":\"\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-05-09T18:22:55.170Z\",\"createdAt\":\"2026-05-09T18:22:55.170Z\"}', '::ffff:127.0.0.1', '2026-05-09 18:22:55', '2026-05-09 18:22:55'),
(96, 85, 8, 'update', 'LiquidityMovement', 57, '{\"actual_balance\":16500}', '{\"actual_balance\":16500,\"variance\":0}', '::ffff:127.0.0.1', '2026-05-09 18:24:33', '2026-05-09 18:24:33'),
(97, 1, 1, 'CREATE_BONUS', 'PayrollBonus', 1, NULL, '{\"id\":1,\"staff_id\":\"1\",\"branch_id\":1,\"month\":5,\"year\":2026,\"bonus_type\":\"performance_bonus\",\"source\":\"manual\",\"amount\":5000,\"reason\":\"\",\"status\":\"approved\",\"created_by\":1,\"approved_by\":1,\"updatedAt\":\"2026-05-09T20:31:56.155Z\",\"createdAt\":\"2026-05-09T20:31:56.155Z\"}', NULL, '2026-05-09 20:31:56', '2026-05-09 20:31:56'),
(98, 1, 1, 'CREATE_BONUS', 'PayrollBonus', 2, NULL, '{\"id\":2,\"staff_id\":\"1\",\"branch_id\":1,\"month\":4,\"year\":2026,\"bonus_type\":\"performance_bonus\",\"source\":\"performance\",\"amount\":5000,\"reason\":\"\",\"status\":\"approved\",\"created_by\":1,\"approved_by\":1,\"updatedAt\":\"2026-05-09T20:32:33.385Z\",\"createdAt\":\"2026-05-09T20:32:33.385Z\"}', NULL, '2026-05-09 20:32:33', '2026-05-09 20:32:33'),
(99, 1, 1, 'CREATE_BONUS', 'PayrollBonus', 3, NULL, '{\"id\":3,\"staff_id\":\"1\",\"branch_id\":1,\"month\":4,\"year\":2026,\"bonus_type\":\"performance_bonus\",\"source\":\"performance\",\"amount\":5000,\"reason\":\"\",\"status\":\"approved\",\"created_by\":1,\"approved_by\":1,\"updatedAt\":\"2026-05-09T20:32:33.436Z\",\"createdAt\":\"2026-05-09T20:32:33.436Z\"}', NULL, '2026-05-09 20:32:33', '2026-05-09 20:32:33'),
(100, 1, 1, 'GENERATE', 'Payroll', NULL, NULL, '{\"month\":3,\"year\":2026,\"records\":3}', NULL, '2026-05-09 20:54:43', '2026-05-09 20:54:43'),
(101, 1, 1, 'SUBMIT_REQUEST', 'Payroll', 9, NULL, '{\"expense_id\":21,\"amount\":\"25000.00\"}', NULL, '2026-05-09 20:55:01', '2026-05-09 20:55:01'),
(102, 1, 1, 'SUBMIT_REQUEST', 'Payroll', 8, NULL, '{\"expense_id\":22,\"amount\":\"2322.00\"}', NULL, '2026-05-09 20:55:16', '2026-05-09 20:55:16'),
(103, 1, 1, 'SUBMIT_REQUEST', 'Payroll', 7, NULL, '{\"expense_id\":23,\"amount\":\"20000.00\"}', NULL, '2026-05-09 20:55:24', '2026-05-09 20:55:24'),
(104, 1, 1, 'SELECT_PAYMENT_SOURCE', 'Payroll', 7, NULL, '{\"expense_id\":23,\"account_id\":3,\"payment_method\":\"bank_transfer\"}', NULL, '2026-05-09 20:55:44', '2026-05-09 20:55:44'),
(105, 1, 1, 'APPROVE_PAYMENT', 'Payroll', 7, NULL, '{\"expense_id\":23,\"journal_entry_id\":67,\"amount\":\"20000.00\"}', NULL, '2026-05-09 20:55:51', '2026-05-09 20:55:51'),
(106, 1, 1, 'SELECT_PAYMENT_SOURCE', 'Payroll', 8, NULL, '{\"expense_id\":22,\"account_id\":1,\"payment_method\":\"cash\"}', NULL, '2026-05-09 20:56:18', '2026-05-09 20:56:18'),
(107, 1, 1, 'SELECT_PAYMENT_SOURCE', 'Payroll', 8, NULL, '{\"expense_id\":22,\"account_id\":1,\"payment_method\":\"cash\"}', NULL, '2026-05-09 20:56:19', '2026-05-09 20:56:19'),
(108, 1, 1, 'APPROVE_PAYMENT', 'Payroll', 8, NULL, '{\"expense_id\":22,\"journal_entry_id\":68,\"amount\":\"2322.00\"}', NULL, '2026-05-09 20:56:24', '2026-05-09 20:56:24'),
(109, 1, 1, 'SELECT_PAYMENT_SOURCE', 'Payroll', 9, NULL, '{\"expense_id\":21,\"account_id\":1,\"payment_method\":\"cash\"}', NULL, '2026-05-09 20:56:31', '2026-05-09 20:56:31'),
(110, 1, 1, 'SELECT_PAYMENT_SOURCE', 'Payroll', 9, NULL, '{\"expense_id\":21,\"account_id\":1,\"payment_method\":\"cash\"}', NULL, '2026-05-09 20:56:34', '2026-05-09 20:56:34'),
(111, 1, 1, 'APPROVE_PAYMENT', 'Payroll', 9, NULL, '{\"expense_id\":21,\"journal_entry_id\":69,\"amount\":\"25000.00\"}', NULL, '2026-05-09 20:56:44', '2026-05-09 20:56:44'),
(112, 1, 1, 'update', 'LiquidityMovement', 58, '{\"actual_balance\":135178}', '{\"actual_balance\":135178,\"variance\":0}', '::ffff:127.0.0.1', '2026-05-09 20:58:27', '2026-05-09 20:58:27'),
(113, 1, 1, 'update', 'LiquidityMovement', 58, '{\"actual_balance\":140678}', '{\"actual_balance\":140678,\"variance\":0}', '::ffff:127.0.0.1', '2026-05-09 20:59:57', '2026-05-09 20:59:57'),
(114, 1, 1, 'update', 'LiquidityMovement', 58, '{\"actual_balance\":140678}', '{\"actual_balance\":140678,\"variance\":0}', '127.0.0.1', '2026-05-10 11:55:28', '2026-05-10 11:55:28'),
(115, 1, 1, 'create', 'LiquidityMovement', 59, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":59,\"account_id\":1,\"related_account_id\":3,\"movement_date\":\"2026-05-10\",\"transaction_type\":\"transfer_out\",\"direction\":\"outflow\",\"amount\":10000,\"reference\":\"TRF-1778414164628\",\"remarks\":\"CASH-HQ -> Brack Bank\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1778414164628\",\"branch_id\":1,\"previous_balance\":140678,\"new_balance\":130678,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-05-10T11:56:04.681Z\",\"createdAt\":\"2026-05-10T11:56:04.681Z\"}', '127.0.0.1', '2026-05-10 11:56:04', '2026-05-10 11:56:04'),
(116, 1, 1, 'create', 'LiquidityMovement', 60, NULL, '{\"actual_balance\":0,\"variance_amount\":0,\"id\":60,\"account_id\":3,\"related_account_id\":1,\"movement_date\":\"2026-05-10\",\"transaction_type\":\"transfer_in\",\"direction\":\"inflow\",\"amount\":10000,\"reference\":\"TRF-1778414164628\",\"remarks\":\"CASH-HQ -> Brack Bank\",\"source_model\":\"LiquidityTransfer\",\"source_id\":\"TRF-1778414164628\",\"branch_id\":1,\"previous_balance\":1308700,\"new_balance\":1318700,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-05-10T11:56:04.688Z\",\"createdAt\":\"2026-05-10T11:56:04.688Z\"}', '127.0.0.1', '2026-05-10 11:56:04', '2026-05-10 11:56:04'),
(117, 1, 1, 'update', 'LiquidityMovement', 58, '{\"actual_balance\":130678}', '{\"actual_balance\":130678,\"variance\":0}', '127.0.0.1', '2026-05-10 11:57:20', '2026-05-10 11:57:20');
INSERT INTO `audit_logs` (`id`, `user_id`, `branch_id`, `action`, `entity`, `entity_id`, `old_value`, `new_value`, `ip_address`, `created_at`, `updated_at`) VALUES
(118, 1, 1, 'create', 'LiquidityMovement', 61, NULL, '{\"id\":61,\"account_id\":3,\"movement_date\":\"2026-05-10\",\"transaction_type\":\"closing_submission\",\"direction\":\"neutral\",\"amount\":0,\"previous_balance\":1318700,\"new_balance\":1318700,\"actual_balance\":1318700,\"variance_amount\":0,\"reference\":\"CLOSE-2026-05-10\",\"remarks\":\"Closing submitted for Brack Bank\",\"reason\":\"\",\"branch_id\":1,\"created_by\":1,\"updated_by\":1,\"updatedAt\":\"2026-05-10T11:58:14.049Z\",\"createdAt\":\"2026-05-10T11:58:14.049Z\"}', '127.0.0.1', '2026-05-10 11:58:14', '2026-05-10 11:58:14'),
(119, 1, 8, 'GENERATE', 'Payroll', NULL, NULL, '{\"month\":4,\"year\":2026,\"records\":1}', NULL, '2026-05-10 14:34:39', '2026-05-10 14:34:39'),
(120, 1, 8, 'CREATE_BONUS', 'PayrollBonus', 4, NULL, '{\"id\":4,\"staff_id\":\"92\",\"branch_id\":8,\"month\":4,\"year\":2026,\"bonus_type\":\"performance_bonus\",\"source\":\"manual\",\"amount\":5000,\"reason\":\"\",\"status\":\"approved\",\"created_by\":1,\"approved_by\":1,\"updatedAt\":\"2026-05-10T14:34:57.744Z\",\"createdAt\":\"2026-05-10T14:34:57.744Z\"}', NULL, '2026-05-10 14:34:57', '2026-05-10 14:34:57'),
(121, 1, 8, 'GENERATE', 'Payroll', NULL, NULL, '{\"month\":4,\"year\":2026,\"records\":1}', NULL, '2026-05-10 14:35:03', '2026-05-10 14:35:03'),
(122, 1, 8, 'CREATE_DEDUCTION', 'PayrollDeduction', 8, NULL, '{\"id\":8,\"staff_id\":\"92\",\"branch_id\":8,\"month\":4,\"year\":2026,\"deduction_type\":\"loan_repayment\",\"source\":\"manual\",\"amount\":5000,\"reason\":\"\",\"status\":\"approved\",\"created_by\":1,\"approved_by\":1,\"updatedAt\":\"2026-05-10T14:36:05.316Z\",\"createdAt\":\"2026-05-10T14:36:05.316Z\"}', NULL, '2026-05-10 14:36:05', '2026-05-10 14:36:05'),
(123, 1, 8, 'CREATE_DEDUCTION', 'PayrollDeduction', 9, NULL, '{\"id\":9,\"staff_id\":\"92\",\"branch_id\":8,\"month\":4,\"year\":2026,\"deduction_type\":\"loan_repayment\",\"source\":\"manual\",\"amount\":5000,\"reason\":\"\",\"status\":\"approved\",\"created_by\":1,\"approved_by\":1,\"updatedAt\":\"2026-05-10T14:36:05.351Z\",\"createdAt\":\"2026-05-10T14:36:05.351Z\"}', NULL, '2026-05-10 14:36:05', '2026-05-10 14:36:05'),
(124, 1, 8, 'GENERATE', 'Payroll', NULL, NULL, '{\"month\":4,\"year\":2026,\"records\":1}', NULL, '2026-05-10 14:36:12', '2026-05-10 14:36:12'),
(125, 1, 8, 'SUBMIT_REQUEST', 'Payroll', 10, NULL, '{\"expense_id\":24,\"amount\":\"20000.00\"}', NULL, '2026-05-10 14:43:23', '2026-05-10 14:43:23'),
(126, 1, 8, 'SELECT_PAYMENT_SOURCE', 'Payroll', 10, NULL, '{\"expense_id\":24,\"account_id\":20,\"payment_method\":\"cash\"}', NULL, '2026-05-10 14:43:33', '2026-05-10 14:43:33'),
(127, 1, 8, 'APPROVE_PAYMENT', 'Payroll', 10, NULL, '{\"expense_id\":24,\"journal_entry_id\":72,\"amount\":\"20000.00\"}', NULL, '2026-05-10 14:43:57', '2026-05-10 14:43:57'),
(128, 1, 8, 'update', 'LiquidityMovement', 57, '{\"actual_balance\":-3500}', '{\"actual_balance\":-3500,\"variance\":0}', '::ffff:127.0.0.1', '2026-05-10 14:44:43', '2026-05-10 14:44:43');

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
(2, 1, 'Fee Overdue Alert', 'fee_overdue', 'send_sms', 'Dear {student_name}, your fee of {amount} is overdue since {date}. Please settle it ASAP.', 1, NULL, '2026-03-18 12:04:01', '2026-03-18 12:04:01'),
(3, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-04-20 20:05:59', '2026-04-20 20:05:59'),
(4, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-04-20 20:08:27', '2026-04-20 20:08:27'),
(5, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-04-20 20:18:44', '2026-04-20 20:18:44'),
(6, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-04-20 20:44:53', '2026-04-20 20:44:53'),
(7, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-02 13:36:50', '2026-05-02 13:36:50'),
(8, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-02 14:37:37', '2026-05-02 14:37:37'),
(9, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-02 14:51:27', '2026-05-02 14:51:27'),
(10, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-02 14:52:00', '2026-05-02 14:52:00'),
(11, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-02 15:02:22', '2026-05-02 15:02:22'),
(12, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-02 15:08:32', '2026-05-02 15:08:32'),
(13, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-02 16:26:24', '2026-05-02 16:26:24'),
(14, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-04 17:27:31', '2026-05-04 17:27:31'),
(15, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-04 17:54:06', '2026-05-04 17:54:06'),
(16, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-04 17:56:59', '2026-05-04 17:56:59'),
(17, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-04 18:09:01', '2026-05-04 18:09:01'),
(18, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-04 19:02:32', '2026-05-04 19:02:32'),
(19, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-04 20:10:11', '2026-05-04 20:10:11'),
(20, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-04 20:36:57', '2026-05-04 20:36:57'),
(21, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-04 21:02:11', '2026-05-04 21:02:11'),
(22, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-05 06:57:17', '2026-05-05 06:57:17'),
(23, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-06 08:32:30', '2026-05-06 08:32:30'),
(24, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-09 04:16:25', '2026-05-09 04:16:25'),
(25, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-09 04:41:19', '2026-05-09 04:41:19'),
(26, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-09 05:15:31', '2026-05-09 05:15:31'),
(27, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-09 05:23:51', '2026-05-09 05:23:51'),
(28, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-09 05:26:58', '2026-05-09 05:26:58'),
(29, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-09 05:34:39', '2026-05-09 05:34:39'),
(30, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-09 07:14:26', '2026-05-09 07:14:26'),
(31, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-09 07:51:52', '2026-05-09 07:51:52'),
(32, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-09 08:00:11', '2026-05-09 08:00:11'),
(33, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-09 17:44:44', '2026-05-09 17:44:44'),
(34, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-09 18:02:34', '2026-05-09 18:02:34'),
(35, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-09 18:08:51', '2026-05-09 18:08:51'),
(36, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-09 18:21:54', '2026-05-09 18:21:54'),
(37, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-09 18:30:43', '2026-05-09 18:30:43'),
(38, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-09 18:37:36', '2026-05-09 18:37:36'),
(39, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-09 18:43:08', '2026-05-09 18:43:08'),
(40, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-09 19:51:46', '2026-05-09 19:51:46'),
(41, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-09 20:08:10', '2026-05-09 20:08:10'),
(42, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-09 21:43:51', '2026-05-09 21:43:51'),
(43, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-09 21:47:18', '2026-05-09 21:47:18'),
(44, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-09 22:05:23', '2026-05-09 22:05:23'),
(45, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-10 14:01:03', '2026-05-10 14:01:03'),
(46, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-10 14:02:13', '2026-05-10 14:02:13'),
(47, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-10 14:06:41', '2026-05-10 14:06:41'),
(48, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-10 14:08:27', '2026-05-10 14:08:27'),
(49, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-10 14:08:42', '2026-05-10 14:08:42'),
(50, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-10 14:28:43', '2026-05-10 14:28:43'),
(51, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-10 14:32:41', '2026-05-10 14:32:41'),
(52, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-10 14:54:38', '2026-05-10 14:54:38'),
(53, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-10 14:58:25', '2026-05-10 14:58:25'),
(54, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-10 15:01:36', '2026-05-10 15:01:36'),
(55, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-10 15:16:39', '2026-05-10 15:16:39'),
(56, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-10 15:16:52', '2026-05-10 15:16:52'),
(57, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-10 15:17:15', '2026-05-10 15:17:15'),
(58, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-10 15:39:02', '2026-05-10 15:39:02'),
(59, NULL, 'Birthday Wishes for Leads & Students', '', 'send_sms', 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.', 1, NULL, '2026-05-10 15:57:27', '2026-05-10 15:57:27');

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
(4, 1, 3, 'PTE-55', 1, 'EVENING ONLINE', 'enrolling', 40, '{\"days\":[\"tue\",\"mon\",\"thu\",\"sun\"],\"start_time\":\"18:00\",\"duration_minutes\":90,\"end_time\":\"19:30\"}', '2026-04-12', '2026-06-12', '2026-04-01 22:56:31', '2026-05-05 07:44:26', 5),
(5, 8, 26, 'PTE MIRPUR 001', 85, 'PTE MORNING', 'enrolling', 20, '{\"days\":[\"mon\",\"tue\",\"wed\",\"thu\",\"sun\",\"sat\",\"fri\"],\"start_time\":\"10:12\",\"duration_minutes\":120,\"end_time\":\"12:12\"}', '2026-05-30', '2026-08-30', '2026-05-09 07:31:49', '2026-05-09 18:16:51', 3);

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
  `updated_at` datetime NOT NULL,
  `category` varchar(255) DEFAULT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `course_relation` varchar(255) DEFAULT NULL,
  `reading_time` int(11) DEFAULT NULL,
  `seo_title` varchar(255) DEFAULT NULL,
  `seo_description` varchar(255) DEFAULT NULL,
  `is_featured` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `blog_posts`
--

INSERT INTO `blog_posts` (`id`, `branch_id`, `author_id`, `title`, `slug`, `excerpt`, `content`, `image_url`, `is_published`, `published_at`, `created_at`, `updated_at`, `category`, `tags`, `course_relation`, `reading_time`, `seo_title`, `seo_description`, `is_featured`) VALUES
(1, 1, 1, 'Test', '155845', '', '<h1>Hi </h1><p>Hello</p><p></p><p></p>', '', 1, '2026-05-09 22:07:05', '2026-05-09 22:07:05', '2026-05-09 22:07:05', NULL, NULL, NULL, NULL, NULL, NULL, 0),
(3, 2, 1, 'Mastering IELTS in 30 Days', 'mastering-ielts-30-days-test-2', 'A 30-day guide to mastering the IELTS exam.', '<h2>Day 1-5: Understanding the Format</h2>', NULL, 1, NULL, '2026-05-09 22:12:52', '2026-05-09 22:12:52', 'IELTS', '[\"IELTS\", \"Preparation\"]', NULL, 10, NULL, NULL, 1),
(4, 1, 1, 'PTE Academic Complete Preparation Guide 2026: Score 79+ With Proven Strategies', 'pte-academic-preparation-guide-2026', 'Master the PTE Academic exam with our comprehensive 2026 preparation guide. Learn proven strategies for Speaking, Writing, Reading & Listening to achieve your target score of 79+.', '<h2>Your Complete Roadmap to PTE Academic Success in 2026</h2>\n<p>The <strong>PTE Academic</strong> (Pearson Test of English) is one of the most widely accepted English proficiency tests for study abroad, migration, and professional registration. With its AI-based scoring system, PTE rewards <strong>consistency, clarity, and strategy</strong> over memorized templates.</p>\n\n<h2>Understanding the PTE Academic Format</h2>\n<p>PTE Academic is a <strong>computer-based test</strong> lasting approximately 2 hours. It consists of three main sections:</p>\n<ul>\n<li><strong>Speaking & Writing</strong> (54–67 minutes): Read Aloud, Repeat Sentence, Describe Image, Retell Lecture, Summarize Written Text, Essay</li>\n<li><strong>Reading</strong> (29–30 minutes): Fill in the Blanks, Multiple Choice, Re-order Paragraphs</li>\n<li><strong>Listening</strong> (30–43 minutes): Summarize Spoken Text, Multiple Choice, Fill in Blanks, Write from Dictation</li>\n</ul>\n\n<h2>Top 10 Strategies to Score 79+ in PTE Academic</h2>\n<h3>1. Focus on Integrated Scoring</h3>\n<p>PTE uses <strong>integrated scoring</strong> — your Speaking performance can affect your Reading and Listening scores. Understanding this cross-scoring system is crucial for maximizing your overall result.</p>\n\n<h3>2. Master Read Aloud</h3>\n<p>Read Aloud contributes to both Speaking and Reading scores. Practice reading at a <strong>natural pace with clear pronunciation</strong>. Don\'t rush — the AI scores fluency and oral accuracy.</p>\n\n<h3>3. Practice Repeat Sentence Daily</h3>\n<p>This task tests your short-term memory and oral fluency. Listen carefully, retain the sentence structure, and repeat with <strong>natural intonation</strong>.</p>\n\n<h3>4. Use Templates Wisely for Essays</h3>\n<p>While templates can help structure your essay, the AI now detects over-reliance on memorized content. Focus on <strong>relevant arguments with proper grammar</strong>.</p>\n\n<h3>5. Improve Spelling for Write from Dictation</h3>\n<p>Write from Dictation is one of the <strong>highest-scoring tasks</strong>. Each correct word earns points. Practice spelling commonly dictated academic words.</p>\n\n<h3>6. Build Academic Vocabulary</h3>\n<p>Strong vocabulary improves scores across all four communicative skills. Read academic articles daily and maintain a vocabulary journal.</p>\n\n<h3>7. Take Timed Mock Tests Weekly</h3>\n<p>Simulate real exam conditions with <strong>full-length mock tests</strong>. Analyze your scores and identify weak areas for targeted improvement.</p>\n\n<h3>8. Work on Pronunciation</h3>\n<p>The AI evaluates vowel sounds, consonant clusters, and word stress. Use shadowing techniques with native English audio content.</p>\n\n<h3>9. Manage Your Time Effectively</h3>\n<p>PTE is strictly timed. Practice completing each task within the allocated time. Don\'t spend too long on any single question.</p>\n\n<h3>10. Stay Calm and Consistent</h3>\n<p>The AI scores consistency. Maintain a <strong>steady pace throughout the exam</strong>. Avoid sudden changes in volume or speed.</p>\n\n<h2>Recommended Study Plan</h2>\n<table>\n<tr><th>Week</th><th>Focus Area</th><th>Daily Hours</th></tr>\n<tr><td>1-2</td><td>Understanding format & baseline test</td><td>2 hours</td></tr>\n<tr><td>3-4</td><td>Speaking & Writing intensive</td><td>3 hours</td></tr>\n<tr><td>5-6</td><td>Reading & Listening practice</td><td>3 hours</td></tr>\n<tr><td>7-8</td><td>Full mock tests & review</td><td>3-4 hours</td></tr>\n</table>\n\n<h2>Start Your PTE Journey with Language Academy</h2>\n<p>At <strong>Language Academy</strong>, we offer expert-led PTE preparation courses with unlimited mock tests, personalized feedback, and proven strategies. Our students consistently achieve 79+ scores. <a href=\"/courses\">Explore our PTE courses</a> and start your journey today!</p>', '/uploads/blogs/pte-preparation-guide-2025.png', 1, '2026-05-10 14:21:24', '2026-05-10 14:21:24', '2026-05-10 14:21:24', 'PTE', '[\"PTE Academic\",\"PTE Preparation\",\"PTE Tips\",\"PTE 2026\",\"Score 79+\"]', 'PTE', 12, 'PTE Academic Preparation Guide 2026 | Score 79+ Tips & Strategies', 'Complete PTE Academic preparation guide for 2026. Expert strategies for Speaking, Writing, Reading & Listening modules. Free tips to score 79+ from Language Academy.', 1),
(5, 1, 1, 'PTE Speaking Module: 8 Expert Tips to Maximize Your Score in 2026', 'pte-speaking-module-tips-2026', 'Struggling with PTE Speaking? Learn 8 expert-proven tips for Read Aloud, Repeat Sentence, Describe Image & Retell Lecture to boost your speaking score.', '<h2>Master PTE Speaking: Your Guide to a High Score</h2>\n<p>The PTE Speaking section is <strong>AI-scored</strong>, meaning the computer evaluates your pronunciation, fluency, and oral accuracy. Unlike IELTS, there\'s no human examiner — which means <strong>consistency and clarity</strong> are your best friends.</p>\n\n<h2>PTE Speaking Task Breakdown</h2>\n<ul>\n<li><strong>Read Aloud (6-7 items)</strong> — Read a text passage aloud</li>\n<li><strong>Repeat Sentence (10-12 items)</strong> — Listen and repeat exactly</li>\n<li><strong>Describe Image (3-4 items)</strong> — Describe a graph, chart, or image</li>\n<li><strong>Retell Lecture (1-2 items)</strong> — Summarize a lecture you heard</li>\n<li><strong>Answer Short Question (5-6 items)</strong> — Give brief answers</li>\n</ul>\n\n<h3>Tip 1: Speak at a Natural Pace</h3>\n<p>Don\'t rush. The AI evaluates <strong>fluency</strong>, which means smooth, natural delivery. Speaking too fast causes mumbling and reduces your score.</p>\n\n<h3>Tip 2: Use Chunking in Read Aloud</h3>\n<p>Break sentences into <strong>meaningful chunks</strong> of 3-5 words. Pause briefly between chunks. This improves both fluency and pronunciation scores.</p>\n\n<h3>Tip 3: Shadow Native Speakers</h3>\n<p>Listen to English podcasts or TED talks and <strong>repeat along simultaneously</strong>. This builds natural intonation patterns.</p>\n\n<h3>Tip 4: Memorize Describe Image Templates</h3>\n<p>Use a structured approach: <em>\"This image shows/illustrates... The main trend is... In conclusion...\"</em>. Practice with different chart types daily.</p>\n\n<h3>Tip 5: Focus on Content Words in Repeat Sentence</h3>\n<p>If you can\'t remember every word, prioritize <strong>nouns, verbs, and adjectives</strong>. Content words carry more weight than function words.</p>\n\n<h3>Tip 6: Record and Review Yourself</h3>\n<p>Record your practice sessions and compare with model answers. Identify pronunciation errors and work on them systematically.</p>\n\n<h3>Tip 7: Don\'t Correct Mistakes Mid-Sentence</h3>\n<p>If you make an error, <strong>keep going</strong>. Self-correction breaks fluency and costs more points than the original mistake.</p>\n\n<h3>Tip 8: Practice with a Quality Microphone</h3>\n<p>Audio quality affects AI scoring. Use a good headset and practice in a quiet environment to simulate exam conditions.</p>\n\n<h2>Get Expert Coaching at Language Academy</h2>\n<p>Our PTE Speaking masterclass includes AI-powered practice tools and instructor feedback. <a href=\"/courses\">Join our PTE course</a> today!</p>', '/uploads/blogs/pte-speaking-module-tips.png', 1, '2026-05-10 14:21:24', '2026-05-10 14:21:24', '2026-05-10 14:21:24', 'PTE', '[\"PTE Speaking\",\"PTE Tips\",\"Read Aloud\",\"Repeat Sentence\",\"Describe Image\"]', 'PTE', 8, 'PTE Speaking Tips 2026 | 8 Expert Strategies for High Score', 'Master PTE Speaking with 8 expert tips for Read Aloud, Repeat Sentence, Describe Image & Retell Lecture. Proven strategies from Language Academy.', 0),
(6, 1, 1, 'PTE Writing Module Mastery: Essay Templates & Summarize Written Text Tips', 'pte-writing-module-mastery-guide', 'Complete guide to PTE Writing — master Summarize Written Text and Essay Writing with proven templates, grammar tips, and scoring strategies for 2026.', '<h2>PTE Writing Module: What You Need to Know</h2>\n<p>The PTE Writing section includes two task types: <strong>Summarize Written Text (SWT)</strong> and <strong>Essay Writing</strong>. Both are AI-scored for content, grammar, vocabulary, and structure.</p>\n\n<h2>Summarize Written Text (SWT)</h2>\n<h3>Key Rules</h3>\n<ul>\n<li>Write <strong>one single sentence</strong> between 5-75 words</li>\n<li>Use complex sentence structures with connectors</li>\n<li>Capture the <strong>main idea and key supporting points</strong></li>\n<li>Time limit: 10 minutes per passage</li>\n</ul>\n\n<h3>SWT Template Strategy</h3>\n<p>Use this structure: <em>\"The passage discusses [main idea], highlighting that [key point 1], while also emphasizing [key point 2], and concluding that [key point 3].\"</em></p>\n\n<h2>Essay Writing</h2>\n<h3>Essay Structure (200-300 words)</h3>\n<ol>\n<li><strong>Introduction</strong> (40-50 words): Paraphrase the topic + thesis statement</li>\n<li><strong>Body Paragraph 1</strong> (70-80 words): Main argument + example</li>\n<li><strong>Body Paragraph 2</strong> (70-80 words): Supporting argument + evidence</li>\n<li><strong>Conclusion</strong> (30-40 words): Summarize + final thought</li>\n</ol>\n\n<h3>Common Essay Topics in 2026</h3>\n<ul>\n<li>Technology\'s impact on education and communication</li>\n<li>Environmental sustainability and climate change</li>\n<li>Work-life balance in the modern world</li>\n<li>Globalization and cultural identity</li>\n<li>Government vs. individual responsibility</li>\n</ul>\n\n<h3>Grammar Checklist for High Scores</h3>\n<ul>\n<li>Use a mix of <strong>simple, compound, and complex sentences</strong></li>\n<li>Avoid spelling errors — they directly reduce your score</li>\n<li>Use <strong>academic collocations</strong>: \"significant impact\", \"growing concern\"</li>\n<li>Maintain consistent verb tenses throughout</li>\n</ul>\n\n<h2>Practice with Language Academy</h2>\n<p>Our PTE Writing workshops include AI essay grading and personalized feedback. <a href=\"/courses\">Explore our PTE courses</a> to improve your writing score!</p>', '/uploads/blogs/pte-writing-module-mastery.png', 1, '2026-05-10 14:21:24', '2026-05-10 14:21:24', '2026-05-10 14:21:24', 'PTE', '[\"PTE Writing\",\"PTE Essay\",\"Summarize Written Text\",\"PTE Grammar\",\"PTE Templates\"]', 'PTE', 9, 'PTE Writing Tips 2026 | Essay Templates & SWT Strategies', 'Master PTE Writing with expert essay templates and Summarize Written Text strategies. Grammar tips and scoring guide from Language Academy.', 0),
(7, 1, 1, 'PTE Reading Module Strategies: How to Score 79+ in Fill in the Blanks & Reorder', 'pte-reading-module-strategies-2026', 'Boost your PTE Reading score with expert strategies for Fill in the Blanks, Reorder Paragraphs, and Multiple Choice questions. Proven tips for 79+.', '<h2>PTE Reading: Your Strategy Guide</h2>\n<p>The PTE Reading section lasts <strong>29-30 minutes</strong> and tests your ability to understand academic texts. Key task types include Fill in the Blanks (both Reading and R&W), Reorder Paragraphs, and Multiple Choice.</p>\n\n<h2>Fill in the Blanks (Reading & Writing)</h2>\n<p>This is one of the <strong>most important tasks</strong> as it contributes to both Reading and Writing scores.</p>\n<h3>Strategy</h3>\n<ul>\n<li>Read the <strong>entire sentence</strong> before choosing an answer</li>\n<li>Look for <strong>collocations</strong> — words that naturally go together</li>\n<li>Check <strong>grammatical fit</strong>: does the word match the sentence structure?</li>\n<li>Use <strong>context clues</strong> from surrounding sentences</li>\n</ul>\n\n<h2>Reorder Paragraphs</h2>\n<h3>Step-by-Step Approach</h3>\n<ol>\n<li><strong>Find the topic sentence</strong> — it introduces a new idea without referring back</li>\n<li>Look for <strong>pronoun references</strong> (this, that, these, such)</li>\n<li>Identify <strong>transition words</strong> (however, moreover, consequently)</li>\n<li>Check for <strong>logical flow</strong> — cause before effect, general before specific</li>\n</ol>\n\n<h2>Multiple Choice Questions</h2>\n<ul>\n<li>Read the question <strong>before</strong> reading the passage</li>\n<li>Eliminate obviously wrong answers first</li>\n<li>For \"select multiple\" questions, look for answers supported by <strong>direct evidence</strong> in the text</li>\n</ul>\n\n<h2>Vocabulary Building Tips</h2>\n<p>Reading scores improve dramatically with <strong>strong vocabulary</strong>. Read academic journals, news editorials, and scientific articles daily. Focus on learning words in context rather than isolated definitions.</p>\n\n<h2>Improve Your PTE Reading at Language Academy</h2>\n<p>Our structured PTE courses include targeted Reading practice with expert guidance. <a href=\"/courses\">Start your preparation</a> today!</p>', '/uploads/blogs/pte-reading-module-strategies.png', 1, '2026-05-10 14:21:24', '2026-05-10 14:21:24', '2026-05-10 14:21:24', 'PTE', '[\"PTE Reading\",\"Fill in Blanks\",\"Reorder Paragraphs\",\"PTE Strategies\",\"PTE Score\"]', 'PTE', 7, 'PTE Reading Tips 2026 | Fill in Blanks & Reorder Strategies for 79+', 'Expert PTE Reading strategies for Fill in the Blanks, Reorder Paragraphs & Multiple Choice. Score 79+ with proven tips from Language Academy.', 0),
(8, 1, 1, 'PTE Listening Module Guide: Ace Write from Dictation & Summarize Spoken Text', 'pte-listening-module-guide-2026', 'Master the PTE Listening module with expert tips for Write from Dictation, Summarize Spoken Text, and other high-scoring tasks. Complete 2026 guide.', '<h2>PTE Listening Module: Complete Guide</h2>\n<p>The Listening section is the <strong>final part of PTE Academic</strong>, lasting 30-43 minutes. It\'s crucial because it contains <strong>Write from Dictation</strong>, one of the highest-scoring tasks in the entire exam.</p>\n\n<h2>Write from Dictation (WFD)</h2>\n<p>This task alone can contribute <strong>up to 29 points</strong> to your Listening and Writing scores.</p>\n<h3>Key Tips</h3>\n<ul>\n<li>Listen for <strong>content words first</strong> (nouns, verbs, adjectives)</li>\n<li>Write the sentence <strong>immediately</strong> after hearing it</li>\n<li>Focus on correct <strong>spelling</strong> — each word counts</li>\n<li>Practice with commonly repeated WFD sentences</li>\n</ul>\n\n<h2>Summarize Spoken Text (SST)</h2>\n<h3>Structure</h3>\n<p>Write 50-70 words summarizing the lecture. Use this template:</p>\n<ul>\n<li><strong>Opening</strong>: \"The speaker discussed/explained...\"</li>\n<li><strong>Key Points</strong>: \"The main points included... Additionally...\"</li>\n<li><strong>Conclusion</strong>: \"In conclusion, the speaker emphasized...\"</li>\n</ul>\n\n<h2>Other Listening Tasks</h2>\n<h3>Highlight Correct Summary</h3>\n<p>Listen for the <strong>overall message</strong>, not just individual details. Eliminate options that contradict the main idea.</p>\n\n<h3>Fill in the Blanks</h3>\n<p>Follow along with the transcript and fill missing words. Focus on <strong>spelling accuracy</strong> and word form (singular vs. plural).</p>\n\n<h2>Daily Listening Practice Routine</h2>\n<ul>\n<li>Listen to <strong>BBC, CNN, or TED Talks</strong> for 30 minutes daily</li>\n<li>Practice <strong>note-taking</strong> while listening</li>\n<li>Do 5-10 WFD practice sentences every day</li>\n<li>Take a full listening mock test weekly</li>\n</ul>\n\n<h2>Excel in PTE Listening with Language Academy</h2>\n<p>Our PTE courses include extensive listening practice with AI-scored mock tests. <a href=\"/courses\">Join Language Academy</a> for expert preparation!</p>', '/uploads/blogs/pte-listening-module-guide.png', 1, '2026-05-10 14:21:24', '2026-05-10 14:21:24', '2026-05-10 14:21:24', 'PTE', '[\"PTE Listening\",\"Write from Dictation\",\"Summarize Spoken Text\",\"PTE Tips\",\"Listening Practice\"]', 'PTE', 8, 'PTE Listening Tips 2026 | Write from Dictation & SST Guide', 'Complete PTE Listening guide with expert tips for Write from Dictation, Summarize Spoken Text & more. Score high with Language Academy strategies.', 0),
(9, 1, 1, 'IELTS Preparation Guide 2026: Everything You Need to Score Band 7+', 'ielts-preparation-guide-2026', 'Complete IELTS preparation guide for 2026. Learn strategies for Listening, Reading, Writing & Speaking to achieve Band 7+ with expert tips from Language Academy.', '<h2>Your Ultimate IELTS Preparation Guide for 2026</h2>\n<p>The <strong>International English Language Testing System (IELTS)</strong> remains the world\'s most popular English proficiency test, accepted by over 11,000 organizations in 140+ countries. Whether you\'re applying for study abroad, migration, or professional registration, a strong IELTS score opens doors globally.</p>\n\n<h2>IELTS Format Overview</h2>\n<p>IELTS has two versions: <strong>Academic</strong> (for university admission) and <strong>General Training</strong> (for migration/work). Both share the same Speaking and Listening modules.</p>\n<table>\n<tr><th>Module</th><th>Duration</th><th>Questions</th></tr>\n<tr><td>Listening</td><td>30 minutes + 10 min transfer</td><td>40 questions</td></tr>\n<tr><td>Reading</td><td>60 minutes</td><td>40 questions</td></tr>\n<tr><td>Writing</td><td>60 minutes</td><td>2 tasks</td></tr>\n<tr><td>Speaking</td><td>11-14 minutes</td><td>3 parts</td></tr>\n</table>\n\n<h2>Module-by-Module Strategy</h2>\n<h3>Listening</h3>\n<ul>\n<li>Read questions <strong>before</strong> the audio plays</li>\n<li>Listen for <strong>synonyms and paraphrases</strong></li>\n<li>Pay attention to <strong>signpost words</strong>: however, on the other hand, actually</li>\n<li>Practice with different English accents (British, Australian, American)</li>\n</ul>\n\n<h3>Reading</h3>\n<ul>\n<li>Use <strong>skimming and scanning</strong> techniques</li>\n<li>Don\'t read every word — focus on key information</li>\n<li>Manage time: spend <strong>20 minutes per passage</strong></li>\n<li>Practice True/False/Not Given with careful attention to \"Not Given\"</li>\n</ul>\n\n<h3>Writing</h3>\n<ul>\n<li><strong>Task 1</strong>: Describe data trends objectively (150+ words)</li>\n<li><strong>Task 2</strong>: Write a structured essay (250+ words)</li>\n<li>Use <strong>topic sentences</strong> to begin each paragraph</li>\n<li>Include a range of vocabulary and grammatical structures</li>\n</ul>\n\n<h3>Speaking</h3>\n<ul>\n<li>Part 1: Answer naturally, expand answers with reasons</li>\n<li>Part 2: Use the 1-minute preparation time wisely — make notes</li>\n<li>Part 3: Give detailed opinions with examples</li>\n</ul>\n\n<h2>8-Week IELTS Study Plan</h2>\n<table>\n<tr><th>Week</th><th>Focus</th></tr>\n<tr><td>1-2</td><td>Take diagnostic test, understand format</td></tr>\n<tr><td>3-4</td><td>Listening & Reading intensive practice</td></tr>\n<tr><td>5-6</td><td>Writing & Speaking skills development</td></tr>\n<tr><td>7-8</td><td>Full practice tests & final revision</td></tr>\n</table>\n\n<h2>Start Your IELTS Journey with Language Academy</h2>\n<p>Language Academy offers comprehensive IELTS preparation with experienced instructors and regular mock tests. <a href=\"/courses\">Explore our IELTS courses</a> today!</p>', '/uploads/blogs/ielts-preparation-guide-2025.png', 1, '2026-05-10 14:21:29', '2026-05-10 14:21:29', '2026-05-10 14:21:29', 'IELTS', '[\"IELTS\",\"IELTS Preparation\",\"IELTS Band 7\",\"IELTS 2026\",\"IELTS Tips\"]', 'IELTS', 11, 'IELTS Preparation Guide 2026 | How to Score Band 7+ Tips', 'Complete IELTS preparation guide 2026. Expert strategies for all 4 modules. Score Band 7+ with proven tips from Language Academy Bangladesh.', 1),
(10, 1, 1, 'IELTS vs PTE Academic 2026: Which English Test Should You Choose?', 'ielts-vs-pte-comparison-2026', 'Confused between IELTS and PTE? Compare test format, scoring, difficulty, acceptance, and find out which exam is right for your goals in 2026.', '<h2>IELTS vs PTE: The Complete 2026 Comparison</h2>\n<p>Choosing between <strong>IELTS and PTE Academic</strong> is one of the first decisions you\'ll make on your study abroad or migration journey. Both are globally accepted, but they have key differences that may make one a better fit for you.</p>\n\n<h2>Quick Comparison Table</h2>\n<table>\n<tr><th>Feature</th><th>IELTS</th><th>PTE Academic</th></tr>\n<tr><td>Test Format</td><td>Paper + Computer</td><td>Computer only</td></tr>\n<tr><td>Duration</td><td>2 hrs 45 min</td><td>2 hours</td></tr>\n<tr><td>Speaking</td><td>Face-to-face examiner</td><td>AI-scored (computer)</td></tr>\n<tr><td>Scoring</td><td>Band 1-9</td><td>Score 10-90</td></tr>\n<tr><td>Results</td><td>13 days</td><td>1-2 days</td></tr>\n<tr><td>Test Fee</td><td>~BDT 25,500</td><td>~BDT 16,000</td></tr>\n<tr><td>Validity</td><td>2 years</td><td>2 years</td></tr>\n</table>\n\n<h2>Choose IELTS If:</h2>\n<ul>\n<li>You prefer <strong>speaking to a human examiner</strong></li>\n<li>You\'re applying to <strong>UK universities</strong> (IELTS has strongest UK acceptance)</li>\n<li>You\'re comfortable with <strong>handwritten essays</strong></li>\n<li>You want a <strong>widely recognized test</strong> for migration</li>\n</ul>\n\n<h2>Choose PTE If:</h2>\n<ul>\n<li>You prefer <strong>computer-based testing</strong></li>\n<li>You want <strong>faster results</strong> (1-2 days)</li>\n<li>You\'re applying to <strong>Australian universities</strong></li>\n<li>You\'re <strong>shy in face-to-face conversations</strong></li>\n<li>You want <strong>flexible test dates</strong></li>\n</ul>\n\n<h2>Score Equivalence</h2>\n<table>\n<tr><th>IELTS Band</th><th>PTE Score</th></tr>\n<tr><td>9.0</td><td>86-90</td></tr>\n<tr><td>8.0</td><td>79-83</td></tr>\n<tr><td>7.0</td><td>65-72</td></tr>\n<tr><td>6.5</td><td>58-64</td></tr>\n<tr><td>6.0</td><td>50-57</td></tr>\n</table>\n\n<h2>The Verdict</h2>\n<p>Neither test is inherently easier or harder — it depends on <strong>your strengths</strong>. If you\'re good at typing and prefer machines, choose PTE. If you\'re a strong communicator, IELTS might suit you better.</p>\n\n<h2>Prepare for Both at Language Academy</h2>\n<p>Language Academy offers expert preparation for both IELTS and PTE. <a href=\"/courses\">View our courses</a> to find the right fit!</p>', '/uploads/blogs/ielts-vs-pte-comparison.png', 1, '2026-05-10 14:21:29', '2026-05-10 14:21:29', '2026-05-10 14:21:29', 'IELTS', '[\"IELTS vs PTE\",\"PTE vs IELTS\",\"English Test Comparison\",\"Which Test\",\"IELTS or PTE\"]', 'IELTS', 9, 'IELTS vs PTE 2026: Which English Test is Better? Complete Comparison', 'IELTS vs PTE Academic 2026 comparison. Format, scoring, difficulty, cost & acceptance compared. Find the right test for study abroad or migration.', 0),
(11, 1, 1, 'How to Achieve IELTS Band 7+: Proven Tips for Each Module', 'how-to-achieve-ielts-band-7-score', 'Want to score IELTS Band 7 or higher? Discover module-specific strategies, common mistakes to avoid, and a proven study plan for achieving your target score.', '<h2>Reaching IELTS Band 7: What It Takes</h2>\n<p>An <strong>IELTS Band 7</strong> is the minimum requirement for most competitive universities and immigration programs. It requires you to demonstrate <strong>\"good user\" level English</strong> — handling complex language with occasional inaccuracies.</p>\n\n<h2>Band 7 Requirements by Module</h2>\n<table>\n<tr><th>Module</th><th>What Band 7 Means</th></tr>\n<tr><td>Listening</td><td>30-32 correct out of 40</td></tr>\n<tr><td>Reading</td><td>30-32 correct (Academic)</td></tr>\n<tr><td>Writing</td><td>Strong structure, varied vocabulary, few errors</td></tr>\n<tr><td>Speaking</td><td>Fluent with good vocabulary range</td></tr>\n</table>\n\n<h2>Listening: Score 30+/40</h2>\n<ul>\n<li>Practice <strong>prediction</strong> — read questions before audio plays</li>\n<li>Focus on <strong>plural vs singular</strong> answers</li>\n<li>Watch for <strong>answer changes</strong> — speakers sometimes correct themselves</li>\n<li>Use the 10-minute transfer time wisely — double-check spellings</li>\n</ul>\n\n<h2>Reading: Score 30+/40</h2>\n<ul>\n<li>Read the <strong>first and last sentences</strong> of each paragraph first</li>\n<li>For matching headings, eliminate the easiest matches first</li>\n<li>Remember: \"Not Given\" means the information simply <strong>isn\'t in the text</strong></li>\n<li>Practice speed reading with academic articles</li>\n</ul>\n\n<h2>Writing: Band 7 Essentials</h2>\n<ul>\n<li>Task 2 is worth <strong>twice as much</strong> as Task 1 — prioritize it</li>\n<li>Use <strong>less common vocabulary</strong>: \"detrimental\" instead of \"bad\"</li>\n<li>Show <strong>grammatical range</strong>: conditionals, passive voice, relative clauses</li>\n<li>Always proofread for basic errors in the last 3 minutes</li>\n</ul>\n\n<h2>Speaking: Band 7 Essentials</h2>\n<ul>\n<li>Speak <strong>naturally</strong> — don\'t use memorized speeches</li>\n<li>Use <strong>discourse markers</strong>: \"Having said that\", \"On the flip side\"</li>\n<li>Develop answers with <strong>reasons and examples</strong></li>\n<li>Show willingness to <strong>self-correct</strong> when you notice a mistake</li>\n</ul>\n\n<h2>Common Band 6.5 Mistakes to Avoid</h2>\n<ul>\n<li>Writing essays that are <strong>too short</strong></li>\n<li>Using <strong>memorized phrases</strong> that don\'t fit the question</li>\n<li>Giving <strong>one-word answers</strong> in Speaking Part 1</li>\n<li>Not managing time in Reading — getting stuck on hard questions</li>\n</ul>\n\n<h2>Get Band 7+ with Language Academy</h2>\n<p>Our IELTS intensive courses are designed for Band 7+ aspirants. <a href=\"/courses\">Enroll now</a> and achieve your target score!</p>', '/uploads/blogs/ielts-band-7-score-tips.png', 1, '2026-05-10 14:21:29', '2026-05-10 14:21:29', '2026-05-10 14:21:29', 'IELTS', '[\"IELTS Band 7\",\"IELTS High Score\",\"IELTS Tips\",\"IELTS Strategy\",\"Band 7 Tips\"]', 'IELTS', 10, 'How to Score IELTS Band 7+ | Module-wise Tips & Strategy 2026', 'Proven strategies to achieve IELTS Band 7+ in all four modules. Common mistakes, study plan, and expert tips from Language Academy.', 0),
(12, 1, 1, 'IELTS Writing Task 2 Essay Guide: Templates, Topics & Band 8 Samples', 'ielts-writing-task-2-essay-guide', 'Master IELTS Writing Task 2 with our complete guide. Get essay templates for Opinion, Discussion, Problem-Solution essays plus Band 8 sample answers.', '<h2>IELTS Writing Task 2: The Complete Guide</h2>\n<p>Writing Task 2 requires you to write a <strong>250+ word essay</strong> in 40 minutes on a given topic. It counts for <strong>two-thirds of your Writing score</strong>, making it the most important writing task.</p>\n\n<h2>Essay Types & Templates</h2>\n\n<h3>1. Opinion Essay (Agree/Disagree)</h3>\n<p><em>\"To what extent do you agree or disagree?\"</em></p>\n<ul>\n<li><strong>Introduction</strong>: Paraphrase topic + clear opinion</li>\n<li><strong>Body 1</strong>: First reason for your opinion + example</li>\n<li><strong>Body 2</strong>: Second reason + example</li>\n<li><strong>Conclusion</strong>: Restate opinion</li>\n</ul>\n\n<h3>2. Discussion Essay (Both Views)</h3>\n<p><em>\"Discuss both views and give your opinion.\"</em></p>\n<ul>\n<li><strong>Introduction</strong>: Paraphrase + state you\'ll discuss both sides</li>\n<li><strong>Body 1</strong>: View A + reasons</li>\n<li><strong>Body 2</strong>: View B + reasons</li>\n<li><strong>Conclusion</strong>: Your opinion + summary</li>\n</ul>\n\n<h3>3. Problem-Solution Essay</h3>\n<p><em>\"What are the problems and what solutions can you suggest?\"</em></p>\n<ul>\n<li><strong>Introduction</strong>: Paraphrase the problem</li>\n<li><strong>Body 1</strong>: Problems explained with examples</li>\n<li><strong>Body 2</strong>: Solutions with expected outcomes</li>\n<li><strong>Conclusion</strong>: Summarize and recommend</li>\n</ul>\n\n<h2>Band 8 Writing Checklist</h2>\n<ul>\n<li>✅ Clear position throughout the essay</li>\n<li>✅ Well-developed ideas with relevant examples</li>\n<li>✅ Logical paragraph structure with linking words</li>\n<li>✅ Range of vocabulary with few errors</li>\n<li>✅ Mix of complex and simple sentence structures</li>\n<li>✅ Minimum 250 words (aim for 270-290)</li>\n</ul>\n\n<h2>Common 2026 Essay Topics</h2>\n<ul>\n<li>Should governments invest more in public transport or roads?</li>\n<li>Is social media beneficial or harmful for society?</li>\n<li>Should university education be free for all students?</li>\n<li>Do the advantages of remote work outweigh the disadvantages?</li>\n<li>Is technology making people less creative?</li>\n</ul>\n\n<h2>Master IELTS Writing at Language Academy</h2>\n<p>Our IELTS writing workshops include essay correction by experienced examiners. <a href=\"/courses\">Join our IELTS course</a> today!</p>', '/uploads/blogs/ielts-writing-task-2-guide.png', 1, '2026-05-10 14:21:29', '2026-05-10 14:21:29', '2026-05-10 14:21:29', 'IELTS', '[\"IELTS Writing\",\"Task 2\",\"IELTS Essay\",\"Essay Templates\",\"Band 8 Writing\"]', 'IELTS', 10, 'IELTS Writing Task 2 Guide 2026 | Templates & Band 8 Samples', 'Complete IELTS Writing Task 2 guide with essay templates, common topics, and Band 8 sample answers. Expert tips from Language Academy.', 0),
(13, 1, 1, 'Complete Study Abroad Guide 2026: How to Plan Your International Education Journey', 'complete-study-abroad-guide-2026', 'Planning to study abroad in 2026? Our comprehensive guide covers destination selection, application process, visa requirements, scholarships, and living costs.', '<h2>Your Complete Study Abroad Guide for 2026</h2>\n<p>Studying abroad is a <strong>life-changing experience</strong> that opens doors to world-class education, global career opportunities, and personal growth. In 2026, international student numbers continue to rise with new scholarship programs and simplified visa processes in many countries.</p>\n\n<h2>Step 1: Choose Your Destination</h2>\n<p>Consider these factors when selecting a country:</p>\n<ul>\n<li><strong>Academic reputation</strong> — university rankings in your field</li>\n<li><strong>Post-study work rights</strong> — can you work after graduation?</li>\n<li><strong>Living costs</strong> — tuition + accommodation + daily expenses</li>\n<li><strong>Safety and culture</strong> — quality of life for international students</li>\n<li><strong>Language requirements</strong> — PTE, IELTS, or TOEFL scores needed</li>\n</ul>\n\n<h2>Step 2: Meet English Language Requirements</h2>\n<table>\n<tr><th>Country</th><th>Typical IELTS Requirement</th><th>Typical PTE Requirement</th></tr>\n<tr><td>Australia</td><td>6.5-7.0</td><td>58-65</td></tr>\n<tr><td>Canada</td><td>6.0-6.5</td><td>50-60</td></tr>\n<tr><td>UK</td><td>6.0-7.0</td><td>55-65</td></tr>\n<tr><td>USA</td><td>6.5-7.0</td><td>58-68</td></tr>\n<tr><td>New Zealand</td><td>6.0-6.5</td><td>50-58</td></tr>\n</table>\n\n<h2>Step 3: Application Timeline</h2>\n<ol>\n<li><strong>12 months before</strong>: Research universities, take English test</li>\n<li><strong>9 months before</strong>: Prepare documents, write SOP</li>\n<li><strong>6 months before</strong>: Submit applications, apply for scholarships</li>\n<li><strong>3 months before</strong>: Accept offer, apply for visa</li>\n<li><strong>1 month before</strong>: Book flights, arrange accommodation</li>\n</ol>\n\n<h2>Step 4: Financial Planning</h2>\n<ul>\n<li>Research <strong>tuition fee waivers</strong> and merit scholarships</li>\n<li>Calculate total costs including <strong>health insurance and travel</strong></li>\n<li>Explore <strong>part-time work</strong> opportunities for students</li>\n<li>Check if your country offers <strong>education loans</strong> for study abroad</li>\n</ul>\n\n<h2>Step 5: Visa Application</h2>\n<ul>\n<li>Gather all required documents: offer letter, financial proof, English test scores</li>\n<li>Prepare for <strong>visa interview</strong> (if applicable)</li>\n<li>Apply early to avoid delays</li>\n</ul>\n\n<h2>Start Your Study Abroad Journey with Language Academy</h2>\n<p>Language Academy provides complete study abroad guidance including PTE/IELTS preparation, university selection, and visa assistance. <a href=\"/courses\">Get started today</a>!</p>', '/uploads/blogs/complete-study-abroad-guide.png', 1, '2026-05-10 14:21:35', '2026-05-10 14:21:35', '2026-05-10 14:21:35', 'Study Abroad', '[\"Study Abroad\",\"International Education\",\"Study Abroad 2026\",\"Visa Guide\",\"Application Process\"]', 'PTE', 12, 'Study Abroad Guide 2026 | Complete Planning Guide for Students', 'Complete 2026 study abroad guide. Destination selection, application process, visa, scholarships & costs. Expert guidance from Language Academy.', 1),
(14, 1, 1, 'Study in Australia 2026: Universities, Costs, Visa & Post-Study Work Rights', 'study-in-australia-guide-2026', 'Complete guide to studying in Australia. Top universities, tuition costs, student visa (subclass 500), post-study work rights, and scholarship opportunities.', '<h2>Why Study in Australia?</h2>\n<p>Australia is the <strong>third most popular study destination</strong> globally, hosting over 750,000 international students. With world-class universities, generous post-study work rights, and a multicultural society, Australia offers an exceptional education experience.</p>\n\n<h2>Top Australian Universities (2026 Rankings)</h2>\n<ul>\n<li><strong>University of Melbourne</strong> — #14 globally (QS 2026)</li>\n<li><strong>University of Sydney</strong> — #18 globally</li>\n<li><strong>UNSW Sydney</strong> — #19 globally</li>\n<li><strong>Australian National University</strong> — #30 globally</li>\n<li><strong>Monash University</strong> — #37 globally</li>\n</ul>\n\n<h2>Cost of Studying in Australia</h2>\n<table>\n<tr><th>Expense</th><th>Annual Cost (AUD)</th></tr>\n<tr><td>Undergraduate Tuition</td><td>$20,000 - $45,000</td></tr>\n<tr><td>Postgraduate Tuition</td><td>$22,000 - $50,000</td></tr>\n<tr><td>Living Costs</td><td>$21,041 (minimum required)</td></tr>\n<tr><td>Health Insurance (OSHC)</td><td>$500 - $700</td></tr>\n</table>\n\n<h2>Student Visa (Subclass 500)</h2>\n<h3>Requirements</h3>\n<ul>\n<li>Confirmation of Enrolment (CoE) from a registered institution</li>\n<li><strong>English proficiency</strong>: IELTS 5.5-6.5 or PTE 42-58 (varies by course)</li>\n<li>Genuine Temporary Entrant (GTE) statement</li>\n<li>Financial capacity proof: AUD $21,041/year for living</li>\n<li>Overseas Student Health Cover (OSHC)</li>\n</ul>\n\n<h2>Post-Study Work Rights</h2>\n<ul>\n<li><strong>Bachelor\'s degree</strong>: 2-year post-study work visa</li>\n<li><strong>Master\'s degree</strong>: 3-year post-study work visa</li>\n<li><strong>PhD</strong>: 4-year post-study work visa</li>\n<li>Students can work <strong>48 hours per fortnight</strong> during study</li>\n</ul>\n\n<h2>Scholarships for International Students</h2>\n<ul>\n<li><strong>Australia Awards Scholarships</strong> — fully funded by Australian government</li>\n<li><strong>Destination Australia</strong> — for regional area study</li>\n<li>University-specific merit and needs-based scholarships</li>\n</ul>\n\n<h2>Prepare for Australia with Language Academy</h2>\n<p>Get your PTE or IELTS score ready for Australian universities. <a href=\"/courses\">Start your preparation</a> at Language Academy!</p>', '/uploads/blogs/study-in-australia-guide.png', 1, '2026-05-10 14:21:35', '2026-05-10 14:21:35', '2026-05-10 14:21:35', 'Study Abroad', '[\"Study in Australia\",\"Australian Universities\",\"Student Visa\",\"Post-Study Work\",\"Australia Education\"]', 'PTE', 10, 'Study in Australia 2026 | Universities, Visa & Scholarships Guide', 'Complete guide to study in Australia 2026. Top universities, costs, student visa 500, scholarships & post-study work rights. Language Academy.', 0),
(15, 1, 1, 'Study in Canada 2026: Top Universities, Study Permits & Immigration Pathways', 'study-in-canada-guide-2026', 'Everything you need to know about studying in Canada in 2026. Universities, study permits, costs, part-time work, and PR pathways for international students.', '<h2>Why Study in Canada?</h2>\n<p>Canada is one of the <strong>most welcoming countries</strong> for international students, offering high-quality education, affordable tuition compared to the US and UK, and clear <strong>pathways to permanent residency</strong>.</p>\n\n<h2>Top Canadian Universities</h2>\n<ul>\n<li><strong>University of Toronto</strong> — #21 globally (QS 2026)</li>\n<li><strong>McGill University</strong> — #29 globally</li>\n<li><strong>University of British Columbia</strong> — #34 globally</li>\n<li><strong>University of Alberta</strong> — Top 100 globally</li>\n<li><strong>University of Waterloo</strong> — Top 100 for Engineering</li>\n</ul>\n\n<h2>Cost of Studying in Canada</h2>\n<table>\n<tr><th>Expense</th><th>Annual Cost (CAD)</th></tr>\n<tr><td>Undergraduate Tuition</td><td>$15,000 - $35,000</td></tr>\n<tr><td>Graduate Tuition</td><td>$10,000 - $30,000</td></tr>\n<tr><td>Living Costs</td><td>$10,000 - $15,000</td></tr>\n<tr><td>Health Insurance</td><td>$600 - $900</td></tr>\n</table>\n\n<h2>Study Permit Requirements</h2>\n<ul>\n<li>Acceptance letter from a <strong>Designated Learning Institution (DLI)</strong></li>\n<li><strong>English proficiency</strong>: IELTS 6.0-6.5 or PTE 50-60</li>\n<li>Proof of financial support: CAD $10,000/year + tuition</li>\n<li>Clean criminal record and medical exam</li>\n</ul>\n\n<h2>Work Rights & PR Pathways</h2>\n<ul>\n<li>Work <strong>20 hours/week off-campus</strong> during studies</li>\n<li><strong>Post-Graduation Work Permit (PGWP)</strong>: up to 3 years</li>\n<li><strong>Express Entry</strong>: Canadian education gives extra CRS points</li>\n<li><strong>Provincial Nominee Programs</strong>: additional PR pathways</li>\n</ul>\n\n<h2>Popular Programs for International Students</h2>\n<ul>\n<li>Computer Science & IT</li>\n<li>Business Administration & MBA</li>\n<li>Engineering</li>\n<li>Healthcare & Nursing</li>\n<li>Data Science & AI</li>\n</ul>\n\n<h2>Prepare for Canada with Language Academy</h2>\n<p>Achieve your IELTS or PTE target score for Canadian universities. <a href=\"/courses\">Explore our courses</a> today!</p>', '/uploads/blogs/study-in-canada-guide.png', 1, '2026-05-10 14:21:35', '2026-05-10 14:21:35', '2026-05-10 14:21:35', 'Study Abroad', '[\"Study in Canada\",\"Canadian Universities\",\"Study Permit\",\"Canada PR\",\"Canada Education\"]', 'IELTS', 10, 'Study in Canada 2026 | Universities, Visa & PR Pathways Guide', 'Complete guide to study in Canada 2026. Top universities, study permit, costs, work rights & PR pathways for international students.', 0),
(16, 1, 1, 'Study in the UK 2026: Russell Group Universities, Student Visa & Funding Options', 'study-in-uk-guide-2026', 'Complete guide to studying in the UK in 2026. Russell Group universities, student visa requirements, tuition fees, scholarships, and the Graduate Route visa.', '<h2>Why Study in the UK?</h2>\n<p>The UK is home to some of the <strong>world\'s oldest and most prestigious universities</strong>. With shorter degree programs (3-year Bachelor\'s, 1-year Master\'s), students save both time and money compared to other destinations.</p>\n\n<h2>Top UK Universities</h2>\n<ul>\n<li><strong>University of Oxford</strong> — #3 globally (QS 2026)</li>\n<li><strong>University of Cambridge</strong> — #5 globally</li>\n<li><strong>Imperial College London</strong> — #6 globally</li>\n<li><strong>UCL (University College London)</strong> — #9 globally</li>\n<li><strong>University of Edinburgh</strong> — #22 globally</li>\n</ul>\n\n<h2>Cost of Studying in the UK</h2>\n<table>\n<tr><th>Expense</th><th>Annual Cost (GBP)</th></tr>\n<tr><td>Undergraduate Tuition</td><td>£10,000 - £38,000</td></tr>\n<tr><td>Postgraduate Tuition</td><td>£11,000 - £40,000</td></tr>\n<tr><td>Living Costs (London)</td><td>£12,006 - £15,000</td></tr>\n<tr><td>Living Costs (Outside London)</td><td>£9,207 - £12,000</td></tr>\n</table>\n\n<h2>Student Visa Requirements</h2>\n<ul>\n<li><strong>CAS (Confirmation of Acceptance for Studies)</strong> from your university</li>\n<li><strong>English proficiency</strong>: IELTS 5.5-7.0 or PTE equivalent</li>\n<li>Financial proof: enough for tuition + living costs for 9 months</li>\n<li>TB test certificate (for certain countries)</li>\n</ul>\n\n<h2>Graduate Route Visa</h2>\n<p>After completing your degree, you can stay in the UK to <strong>work for 2 years</strong> (3 years for PhD graduates) without a sponsor through the Graduate Route visa.</p>\n\n<h2>Scholarships</h2>\n<ul>\n<li><strong>Chevening Scholarships</strong> — fully funded by UK government</li>\n<li><strong>Commonwealth Scholarships</strong> — for developing country students</li>\n<li><strong>GREAT Scholarships</strong> — partial funding for specific countries</li>\n<li>University-specific scholarships and fee waivers</li>\n</ul>\n\n<h2>Prepare for UK with Language Academy</h2>\n<p>Get your IELTS score ready for UK universities. <a href=\"/courses\">Start your preparation</a> at Language Academy!</p>', '/uploads/blogs/study-in-uk-guide.png', 1, '2026-05-10 14:21:35', '2026-05-10 14:21:35', '2026-05-10 14:21:35', 'Study Abroad', '[\"Study in UK\",\"UK Universities\",\"Student Visa UK\",\"Russell Group\",\"UK Education\"]', 'IELTS', 9, 'Study in UK 2026 | Top Universities, Visa & Scholarships Guide', 'Complete guide to study in UK 2026. Russell Group universities, student visa, fees, Chevening scholarships & Graduate Route. Language Academy.', 0),
(17, 1, 1, 'Top Scholarships for International Students 2026: Fully Funded Opportunities Worldwide', 'top-scholarships-international-students-2026', 'Discover the best fully funded scholarships for international students in 2026. Government scholarships, university grants, and financial aid across top destinations.', '<h2>Best Scholarships for International Students in 2026</h2>\n<p>Funding is often the biggest barrier to studying abroad. Fortunately, many governments and universities offer <strong>generous scholarships</strong> that cover tuition, living expenses, and even travel costs.</p>\n\n<h2>Government-Funded Scholarships</h2>\n\n<h3>🇦🇺 Australia Awards Scholarships</h3>\n<ul>\n<li><strong>Coverage</strong>: Full tuition, living allowance, airfare, health insurance</li>\n<li><strong>Eligibility</strong>: Students from participating countries</li>\n<li><strong>Deadline</strong>: Usually April-May each year</li>\n</ul>\n\n<h3>🇬🇧 Chevening Scholarships (UK)</h3>\n<ul>\n<li><strong>Coverage</strong>: Full tuition, living expenses, travel, visa</li>\n<li><strong>Eligibility</strong>: 2+ years work experience, return to home country</li>\n<li><strong>Deadline</strong>: November each year</li>\n</ul>\n\n<h3>🇨🇦 Vanier Canada Graduate Scholarships</h3>\n<ul>\n<li><strong>Coverage</strong>: CAD $50,000/year for 3 years</li>\n<li><strong>Eligibility</strong>: PhD students with leadership and academic excellence</li>\n</ul>\n\n<h3>🇺🇸 Fulbright Foreign Student Program</h3>\n<ul>\n<li><strong>Coverage</strong>: Tuition, living expenses, airfare, health insurance</li>\n<li><strong>Eligibility</strong>: Graduate students from 160+ countries</li>\n</ul>\n\n<h2>University-Specific Scholarships</h2>\n<table>\n<tr><th>University</th><th>Scholarship</th><th>Value</th></tr>\n<tr><td>University of Melbourne</td><td>Graduate Research Scholarships</td><td>Full tuition + AUD $35,000/yr</td></tr>\n<tr><td>University of Toronto</td><td>Lester B. Pearson Scholarships</td><td>Full tuition + living costs</td></tr>\n<tr><td>University of Oxford</td><td>Clarendon Scholarships</td><td>Full tuition + living costs</td></tr>\n<tr><td>MIT</td><td>MIT Scholarships</td><td>Need-based full funding</td></tr>\n</table>\n\n<h2>How to Improve Your Scholarship Chances</h2>\n<ul>\n<li>Achieve a <strong>high English test score</strong> (IELTS 7+ or PTE 65+)</li>\n<li>Write a <strong>compelling personal statement</strong></li>\n<li>Demonstrate <strong>leadership and community involvement</strong></li>\n<li>Apply to <strong>multiple scholarships</strong> simultaneously</li>\n<li>Meet all deadlines — late applications are never considered</li>\n</ul>\n\n<h2>Language Academy: Your Scholarship-Ready Partner</h2>\n<p>A strong PTE or IELTS score is essential for scholarship applications. <a href=\"/courses\">Prepare with Language Academy</a> and maximize your scholarship chances!</p>', '/uploads/blogs/scholarships-international-students.png', 1, '2026-05-10 14:21:35', '2026-05-10 14:21:35', '2026-05-10 14:21:35', 'Study Abroad', '[\"Scholarships\",\"Fully Funded\",\"International Students\",\"Study Abroad Scholarships\",\"Financial Aid\"]', 'PTE', 10, 'Top Scholarships for International Students 2026 | Fully Funded', 'Best fully funded scholarships for international students 2026. Government scholarships, university grants for Australia, Canada, UK, USA & more.', 1),
(18, 1, 1, 'IELTS Speaking Test 2026: Common Topics, Cue Cards & Expert Tips for Band 7+', 'ielts-speaking-test-tips-2026', 'Ace the IELTS Speaking test with expert tips for all 3 parts. Common 2026 cue card topics, vocabulary tips, and strategies to score Band 7+ confidently.', '<h2>IELTS Speaking Test: Complete Guide</h2>\n<p>The IELTS Speaking test is a <strong>face-to-face interview</strong> with a certified examiner lasting 11-14 minutes. It\'s the only section where you interact with a real person, making it both the most personal and the most nerve-wracking part of the exam.</p>\n\n<h2>Test Structure</h2>\n<h3>Part 1: Introduction & Interview (4-5 minutes)</h3>\n<p>The examiner asks <strong>familiar topics</strong>: work, studies, hobbies, hometown, family.</p>\n<ul>\n<li>Give answers of <strong>2-3 sentences</strong> — not too short, not too long</li>\n<li>Use the format: <strong>Answer + Reason + Example</strong></li>\n<li>Example: \"I enjoy reading. It helps me relax after a long day. I usually read fiction novels before bed.\"</li>\n</ul>\n\n<h3>Part 2: Individual Long Turn (3-4 minutes)</h3>\n<p>You receive a <strong>cue card</strong> with a topic and 1 minute to prepare. Speak for 1-2 minutes.</p>\n<h4>2026 Common Cue Card Topics</h4>\n<ul>\n<li>Describe a person who inspires you</li>\n<li>Talk about a time you helped someone</li>\n<li>Describe a place you\'d like to visit</li>\n<li>Talk about a skill you want to learn</li>\n<li>Describe an important decision you made</li>\n</ul>\n\n<h3>Part 3: Discussion (4-5 minutes)</h3>\n<p>The examiner asks <strong>abstract, opinion-based questions</strong> related to the Part 2 topic.</p>\n<ul>\n<li>Give <strong>developed answers</strong> with reasons, examples, and comparisons</li>\n<li>Use phrases like: \"From my perspective...\", \"I\'d argue that...\"</li>\n<li>It\'s OK to pause briefly to think — use fillers like \"That\'s an interesting question...\"</li>\n</ul>\n\n<h2>Band 7+ Speaking Strategies</h2>\n<ul>\n<li>Use <strong>idiomatic expressions</strong> naturally: \"It\'s a piece of cake\", \"Once in a blue moon\"</li>\n<li>Show <strong>self-correction</strong>: \"I went... I mean, I had gone there before\"</li>\n<li>Vary your <strong>intonation</strong> — don\'t speak in a monotone</li>\n<li>Use <strong>discourse markers</strong>: \"Having said that\", \"On the other hand\"</li>\n<li>Maintain <strong>eye contact</strong> with the examiner</li>\n</ul>\n\n<h2>Common Mistakes to Avoid</h2>\n<ul>\n<li>❌ Memorizing scripted answers (examiners can tell)</li>\n<li>❌ Speaking too fast or too slowly</li>\n<li>❌ Giving yes/no answers without elaboration</li>\n<li>❌ Using vocabulary you\'re not comfortable with</li>\n<li>❌ Going off-topic during Part 2</li>\n</ul>\n\n<h2>Practice Speaking at Language Academy</h2>\n<p>Our IELTS courses include mock speaking tests with experienced instructors. <a href=\"/courses\">Join Language Academy</a> and practice with confidence!</p>', '/uploads/blogs/ielts-speaking-test-tips.png', 1, '2026-05-10 14:21:40', '2026-05-10 14:21:40', '2026-05-10 14:21:40', 'IELTS', '[\"IELTS Speaking\",\"Speaking Tips\",\"Cue Cards\",\"IELTS Band 7\",\"Speaking Test\"]', 'IELTS', 8, 'IELTS Speaking Tips 2026 | Cue Cards & Band 7+ Strategies', 'Master IELTS Speaking with expert tips for Part 1, 2 & 3. Common 2026 cue card topics and vocabulary strategies for Band 7+. Language Academy.', 0);
INSERT INTO `blog_posts` (`id`, `branch_id`, `author_id`, `title`, `slug`, `excerpt`, `content`, `image_url`, `is_published`, `published_at`, `created_at`, `updated_at`, `category`, `tags`, `course_relation`, `reading_time`, `seo_title`, `seo_description`, `is_featured`) VALUES
(19, 1, 1, 'Study in USA 2026: Top Universities, F-1 Visa Guide & Financial Aid for International Students', 'study-in-usa-guide-2026', 'Comprehensive guide to studying in USA in 2026. Ivy League and top universities, F-1 student visa process, costs, OPT work rights, and scholarship opportunities.', '<h2>Why Study in the USA?</h2>\n<p>The United States hosts over <strong>1 million international students</strong> and is home to the world\'s most prestigious universities. With unmatched research opportunities, diverse campus cultures, and strong alumni networks, a US degree opens global doors.</p>\n\n<h2>Top US Universities</h2>\n<ul>\n<li><strong>MIT</strong> — #1 globally (QS 2026)</li>\n<li><strong>Harvard University</strong> — #4 globally</li>\n<li><strong>Stanford University</strong> — #7 globally</li>\n<li><strong>University of California, Berkeley</strong> — #12 globally</li>\n<li><strong>University of Chicago</strong> — #21 globally</li>\n</ul>\n\n<h2>Cost of Studying in the USA</h2>\n<table>\n<tr><th>Expense</th><th>Annual Cost (USD)</th></tr>\n<tr><td>Public University Tuition</td><td>$20,000 - $40,000</td></tr>\n<tr><td>Private University Tuition</td><td>$40,000 - $60,000+</td></tr>\n<tr><td>Living Costs</td><td>$10,000 - $18,000</td></tr>\n<tr><td>Health Insurance</td><td>$1,500 - $2,500</td></tr>\n</table>\n\n<h2>F-1 Student Visa</h2>\n<h3>Requirements</h3>\n<ul>\n<li><strong>I-20 form</strong> from a SEVP-certified institution</li>\n<li><strong>English proficiency</strong>: TOEFL 80+, IELTS 6.5+, or PTE 58+</li>\n<li>Proof of financial ability to cover first year</li>\n<li><strong>DS-160 application</strong> + visa interview at US Embassy</li>\n<li>SEVIS fee payment ($350)</li>\n</ul>\n\n<h2>Work Rights & OPT</h2>\n<ul>\n<li>On-campus work: <strong>20 hours/week</strong> during term</li>\n<li><strong>CPT</strong> (Curricular Practical Training): internship during study</li>\n<li><strong>OPT</strong> (Optional Practical Training): 12 months post-graduation</li>\n<li><strong>STEM OPT Extension</strong>: additional 24 months for STEM graduates</li>\n</ul>\n\n<h2>Financial Aid & Scholarships</h2>\n<ul>\n<li><strong>Fulbright Program</strong> — fully funded for graduate study</li>\n<li><strong>University merit scholarships</strong> — varies by institution</li>\n<li><strong>Graduate assistantships</strong> — tuition waiver + stipend</li>\n<li><strong>Need-blind admissions</strong> at some Ivy League schools</li>\n</ul>\n\n<h2>Prepare for USA with Language Academy</h2>\n<p>Get your English test score ready for US universities. <a href=\"/courses\">Start preparation</a> at Language Academy!</p>', '/uploads/blogs/study-in-usa-guide.png', 1, '2026-05-10 14:21:40', '2026-05-10 14:21:40', '2026-05-10 14:21:40', 'Study Abroad', '[\"Study in USA\",\"American Universities\",\"F-1 Visa\",\"OPT\",\"USA Education\"]', 'PTE', 10, 'Study in USA 2026 | Top Universities, F-1 Visa & Scholarships', 'Complete guide to study in USA 2026. Top universities, F-1 visa, costs, OPT work rights & scholarships for international students.', 0);

-- --------------------------------------------------------

--
-- Table structure for table `blog_resources`
--

CREATE TABLE `blog_resources` (
  `id` int(11) NOT NULL,
  `blog_post_id` int(11) NOT NULL,
  `resource_id` int(11) NOT NULL
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
  `updated_at` datetime NOT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `public_title` varchar(255) DEFAULT NULL,
  `public_description` text DEFAULT NULL,
  `seo_title` varchar(255) DEFAULT NULL,
  `seo_description` varchar(500) DEFAULT NULL,
  `hero_image_url` varchar(255) DEFAULT NULL,
  `opening_hours` varchar(255) DEFAULT NULL,
  `map_url` text DEFAULT NULL,
  `coming_soon_message` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `branches`
--

INSERT INTO `branches` (`id`, `name`, `code`, `type`, `address`, `phone`, `email`, `is_active`, `manager_id`, `created_at`, `updated_at`, `slug`, `public_title`, `public_description`, `seo_title`, `seo_description`, `hero_image_url`, `opening_hours`, `map_url`, `coming_soon_message`) VALUES
(1, 'Dhanmondi Branch (HQ)', 'DHN-HQ', 'head', 'SEL SUFI SQUARE, Unit: 1104, Level: 11, Plot: 58, Road: 16 (New) / 27 (Old), Dhanmondi R/A, Dhaka 1209', '+8801700000001', 'info@languageacademy.com.bd', 1, NULL, '2026-03-17 12:02:10', '2026-05-09 07:38:25', 'dhanmondi-branch-hq', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(2, 'Uttara Branch (Removed)', 'DHK-02', 'branch', 'Sector 7, Uttara', '+8801700000002', NULL, 0, NULL, '2026-03-17 12:02:10', '2026-05-09 07:38:25', 'uttara-branch-removed', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(5, 'Test-1', 'TEST-01', 'branch', 'Dhaka', '01871186562', 'aarsayem@gmail.com', 0, 55, '2026-04-05 17:56:46', '2026-05-09 07:38:25', 'test-1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(8, 'Mirpur', 'Mirpur', 'branch', 'Mirpur 1 Sony Square', '01871186562', 'mirpur@languageacademy.com', 1, 85, '2026-05-09 07:19:59', '2026-05-09 07:38:25', 'mirpur', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

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

--
-- Dumping data for table `campaign_templates`
--

INSERT INTO `campaign_templates` (`id`, `branch_id`, `name`, `channel`, `subject`, `body`, `status`, `target_audience`, `sent_at`, `sent_count`, `created_by`, `created_at`, `updated_at`, `attachment_url`) VALUES
(1, 1, 'TEST', 'sms', '', 'Hi', 'sent', 'interested', '2026-05-04 19:12:39', 3, 1, '2026-05-04 19:12:33', '2026-05-04 19:12:39', '');

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
(10, 1, 'Jane Doe', '170000000', 'jane@example.com', NULL, NULL, NULL, 'Facebook', '[]', 'Interested in PTE', 1, '2026-04-05 16:06:18', '2026-04-05 16:06:18'),
(11, 1, 'TEST', '015654694', 'aad43@l.com', NULL, NULL, NULL, 'Facebook', '[]', NULL, 1, '2026-04-12 19:32:16', '2026-04-12 19:32:16'),
(12, 1, 'TEST REF', '018711865652', 'aarsayem49032@gmail.com', NULL, NULL, NULL, 'Walk-in', '[]', NULL, 1, '2026-04-12 19:33:34', '2026-04-12 19:33:34'),
(13, 1, 'Sat TEST', '322', 'aarsayem90@gmail.com', NULL, NULL, NULL, 'Walk-in', '[]', NULL, 1, '2026-04-20 18:23:51', '2026-04-20 18:23:51'),
(14, 1, 'TEST 9965', '32423', 'redowansayem73@gmail.com', NULL, '', NULL, 'Walk-in', '[]', '', 1, '2026-04-20 19:08:25', '2026-04-20 19:08:25'),
(15, 1, 'TEST 43', '433', 'df@4r.com', NULL, NULL, NULL, 'Walk-in', '[]', NULL, 1, '2026-04-20 19:13:47', '2026-04-20 19:13:47'),
(16, 1, 'Redowan', '01820444793', '4d4drrrrr@gmail.com', NULL, '', NULL, 'Website Purchase', '[]', '', 1, '2026-04-20 20:19:22', '2026-04-20 20:20:58'),
(17, 1, 'All Exclusive Collections', '4434', 'aarsayem323@gmail.com', NULL, NULL, NULL, 'website', '[]', NULL, 1, '2026-04-20 20:52:56', '2026-04-20 20:52:56'),
(18, 1, 'test hasib', '011355', '', NULL, NULL, NULL, 'Referral', '[]', NULL, 1, '2026-05-04 11:08:07', '2026-05-04 11:08:07'),
(19, 1, 'test hasib', '011355', '', NULL, NULL, NULL, 'Referral', '[]', NULL, 1, '2026-05-04 11:37:20', '2026-05-04 11:37:20'),
(20, 8, 'Redowan Sayem Mirpur Branch', '0187118556', 'Dhaka', NULL, NULL, NULL, 'Walk-in', '[]', NULL, 1, '2026-05-09 07:32:44', '2026-05-09 07:32:44'),
(21, 8, 'Redowan Sayem', '01871186562', 'aarsayem21002@gmail.com', NULL, NULL, NULL, 'walk_in', '[]', 'Student booking submitted from kiosk link\nReason: Study abroad\nPreferred country: AU\nPreferred batch: PTE MORNING', 1, '2026-05-09 17:54:43', '2026-05-09 17:54:43'),
(22, 8, 'ABDULLAH AL GALIB', '01871186562', 'test@dfdsesxample.com', NULL, NULL, NULL, 'walk_in', '[]', 'Student booking submitted from kiosk link\nReason: Others\nOther reason: f\nPreferred batch: PTE MORNING', 1, '2026-05-09 18:16:51', '2026-05-09 18:16:51'),
(23, 1, 'ABDULLAH AL REDOWAN', '0410 807 546', 'aarsayem33@gmail.com', NULL, NULL, NULL, 'website', '[]', NULL, 1, '2026-05-09 21:59:18', '2026-05-09 21:59:18');

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
(3, 1, 'PTE Basic', 'Perfect for students who need a quick refresher. Covers the PTE format over 4 specialized classes, and includes access to our unlimited mock test platform.', 'PTE', 5500.00, 2, '2026-04-01 22:23:17', '2026-05-09 21:07:41', 'pte-basic', '2 Weeks, 4 classes. (Unlimited Mock test Included).', 'beginner', '/uploads/courses/course-1778360859565-75623989.jpg', NULL, NULL, NULL, '[\"Understanding the PTE Exam Format\",\"Quick refresh of core modules: Speaking, Writing, Reading, Listening\",\"Time management strategies\",\"Unlimited Mock tests for confidence building\"]', '[{\"title\":\"Week 1: Foundations\",\"lessons\":[{\"title\":\"Class 1: Speaking & Writing\",\"duration\":\"120\"},{\"title\":\"Class 2: Reading & Listening\",\"duration\":\"120\"}]},{\"title\":\"Week 2: Mock Tests & Reviews\",\"lessons\":[{\"title\":\"Class 3: Assessment\",\"duration\":\"120\"},{\"title\":\"Class 4: Final Tips\",\"duration\":\"120\"}]}]', NULL, 1, 'active'),
(4, 1, 'PTE Core', 'Our most popular standard tier. Gain solid insights over 4 weeks with 8 focused classes, plus unlimited access to live classes and our mock examination platform.', 'PTE', 10500.00, 4, '2026-04-01 22:23:17', '2026-05-09 21:07:50', 'pte-core', '4 Weeks, 8 Classes. (Unlimited Mock test and class access).', 'intermediate', '/uploads/courses/course-1778360867811-526444506.jpg', NULL, NULL, NULL, '[\"Detailed strategies for high-weightage questions\",\"Template utilization for essays and spoken responses\",\"Pronunciation and fluency improvement techniques\",\"Unlimited mock test access with AI scoring\"]', '[{\"title\":\"Week 1-2: Intensive Speaking & Writing\",\"lessons\":[{\"title\":\"Session 1-4\",\"duration\":\"120\"}]},{\"title\":\"Week 3-4: Intensive Reading & Listening\",\"lessons\":[{\"title\":\"Session 5-8\",\"duration\":\"120\"}]}]', NULL, 1, 'active'),
(5, 1, 'PTE Advanced', 'For students aiming for a 79+ superior score. Spend 8 weeks practicing advanced grammar, complex reading passages, and native-level fluency with 16 dedicated classes.', 'PTE', 18000.00, 8, '2026-04-01 22:23:17', '2026-05-09 21:07:59', 'pte-advanced', '8 Weeks, 16 Classes. (Unlimited Mock test and class access).', 'advanced', '/uploads/courses/course-1778360876787-840464385.jpg', NULL, NULL, NULL, '[\"Advanced grammatical structures for maximum points\",\"Handling complex audio cues in listening\",\"Reading fill-in-the-blanks mastery\",\"Weekly one-on-one evaluations\"]', '[{\"title\":\"Month 1: Core Fundamentals & Intermediate Concepts\",\"lessons\":[{\"title\":\"8 Classes on all 4 modules\",\"duration\":\"120\"}]},{\"title\":\"Month 2: Advanced Perfection\",\"lessons\":[{\"title\":\"8 Classes focusing on high-difficulty questions\",\"duration\":\"120\"}]}]', NULL, 1, 'active'),
(6, 1, 'PTE Premium', 'Our flagship 3-month comprehensive package. Enjoy 24 extensive classes that build your English skills from the ground up to advanced PTE superiority.', 'PTE', 25000.00, 12, '2026-04-01 22:23:17', '2026-05-09 21:08:14', 'pte-premium', '12 Weeks, 24 Classes. (Unlimited Mock test and class access).', 'advanced', '/uploads/courses/course-1778360892216-670855281.jpg', NULL, NULL, NULL, '[\"Absolute ground-up fundamentals for struggling speakers\",\"Comprehensive grammar and vocabulary building\",\"AI-driven error correction over 3 months\",\"Complete unlimited access to all platform tools\"]', '[{\"title\":\"Month 1: General English Enhancement\",\"lessons\":[{\"title\":\"8 Classes\",\"duration\":\"120\"}]},{\"title\":\"Month 2: PTE Core Strategy\",\"lessons\":[{\"title\":\"8 Classes\",\"duration\":\"120\"}]},{\"title\":\"Month 3: Advanced Scoring & Mock Trials\",\"lessons\":[{\"title\":\"8 Classes\",\"duration\":\"120\"}]}]', NULL, 1, 'active'),
(7, 1, 'TEST', '', 'IELTS', 15000.00, 12, '2026-04-05 18:00:21', '2026-05-09 21:08:23', 'test', '', 'beginner', '', '', NULL, '', '[]', '[]', NULL, 0, 'active'),
(26, 8, 'PTE BASIC 01', '', 'PTE', 5500.00, 13, '2026-05-09 07:28:36', '2026-05-09 07:28:36', 'pte-basic-01', '', 'beginner', '', '', NULL, '', '[]', '[]', NULL, 0, 'active');

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
(4, 1, 'email', 'sdssds', 'sdsd', NULL, NULL, NULL, 0, 4, NULL, NULL, 1, '2026-04-05 15:33:56', '2026-04-05 15:33:56', NULL),
(5, 1, 'call', 'Campaign: TEST', 'Sent via sms: Hi...', NULL, '2026-05-04 19:12:39', '2026-05-04 19:12:39', 1, 22, NULL, NULL, 1, '2026-05-04 19:12:39', '2026-05-04 19:12:39', NULL),
(6, 1, 'call', 'Campaign: TEST', 'Sent via sms: Hi...', NULL, '2026-05-04 19:12:39', '2026-05-04 19:12:39', 1, 24, NULL, NULL, 1, '2026-05-04 19:12:39', '2026-05-04 19:12:39', NULL),
(7, 1, 'call', 'Campaign: TEST', 'Sent via sms: Hi...', NULL, '2026-05-04 19:12:40', '2026-05-04 19:12:40', 1, 25, NULL, NULL, 1, '2026-05-04 19:12:40', '2026-05-04 19:12:40', NULL),
(8, 1, 'email', 'TEXT', '', NULL, NULL, NULL, 0, 40, NULL, NULL, 1, '2026-05-05 07:45:32', '2026-05-05 07:45:32', NULL);

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
(4, 1, 'E2E Customer', '01205060919', NULL, NULL, NULL, 1, '2026-04-03 08:31:00', '2026-04-03 08:31:00'),
(5, 1, 'TEST 5', '', '', '', '', 1, '2026-04-20 18:45:33', '2026-04-20 18:45:33');

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
(20, 1, 28, 4, 15000.00, 0.00, 15000.00, 'paid', '2026-04-03 06:35:15', '2026-04-03 06:51:31'),
(21, 1, 29, 3, 15000.00, 0.00, 15000.00, 'paid', '2026-04-12 18:48:04', '2026-04-12 18:48:25'),
(22, 1, 30, NULL, 10500.00, 0.00, 10500.00, 'paid', '2026-04-12 19:33:42', '2026-04-12 19:34:01'),
(23, 1, 31, 1, 15000.00, 0.00, 15000.00, 'paid', '2026-04-12 19:38:49', '2026-04-12 19:39:04'),
(24, 1, 33, 4, 5500.00, 0.00, 5500.00, 'paid', '2026-04-20 18:24:32', '2026-04-20 18:24:46'),
(25, 1, 34, 4, 5500.00, 0.00, 5500.00, 'paid', '2026-04-20 19:09:58', '2026-04-20 19:10:53'),
(26, 1, 35, 4, 5500.00, 0.00, 5500.00, 'paid', '2026-04-20 19:13:56', '2026-04-20 19:14:12'),
(27, 1, 36, 3, 5500.00, 0.00, 5500.00, 'paid', '2026-04-20 19:33:37', '2026-04-20 19:34:03'),
(28, 1, 37, 2, 5500.00, 0.00, 0.00, 'cancelled', '2026-04-20 19:40:37', '2026-04-20 19:42:09'),
(29, 1, 38, 3, 5500.00, 0.00, 5500.00, 'paid', '2026-04-20 19:43:00', '2026-04-20 19:43:08'),
(30, 1, 39, 4, 15000.00, 0.00, 15000.00, 'paid', '2026-04-20 19:44:40', '2026-04-20 19:44:50'),
(31, 1, 40, 3, 15000.00, 0.00, 15000.00, 'paid', '2026-04-20 20:15:41', '2026-04-20 20:16:01'),
(32, 1, 41, 4, 5500.00, 0.00, 5500.00, 'paid', '2026-04-20 20:19:22', '2026-04-20 20:19:22'),
(33, 1, 34, 4, 5500.00, 0.00, 5500.00, 'paid', '2026-04-20 20:47:04', '2026-04-20 20:47:04'),
(34, 1, 34, 4, 5500.00, 0.00, 5500.00, 'paid', '2026-04-20 20:47:04', '2026-04-20 20:47:04'),
(35, 1, 42, 4, 5500.00, 0.00, 5500.00, 'paid', '2026-04-20 20:52:57', '2026-04-20 20:54:44'),
(36, 1, 43, 4, 5500.00, 0.00, 5500.00, 'paid', '2026-05-04 11:37:20', '2026-05-04 11:38:01'),
(37, 1, 2, 4, 5500.00, 0.00, 5500.00, 'paid', '2026-05-05 07:44:26', '2026-05-05 07:44:39'),
(38, 8, 47, 5, 5500.00, 0.00, 5500.00, 'paid', '2026-05-09 07:33:09', '2026-05-09 07:33:29'),
(39, 8, 48, 5, 5500.00, 0.00, 5500.00, 'paid', '2026-05-09 17:55:03', '2026-05-09 17:55:37'),
(40, 8, 49, 5, 5500.00, 0.00, 5500.00, 'paid', '2026-05-09 18:16:50', '2026-05-09 18:17:43'),
(41, 1, 2, 4, 5500.00, 0.00, 5500.00, 'paid', '2026-05-09 20:14:07', '2026-05-09 20:59:10'),
(42, 1, 29, 4, 5500.00, 0.00, 5500.00, 'paid', '2026-05-09 21:59:18', '2026-05-09 22:00:50');

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `account_id` int(11) DEFAULT NULL,
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
  `deleted_at` datetime DEFAULT NULL,
  `expense_origin` varchar(50) DEFAULT 'manual',
  `payroll_id` int(11) DEFAULT NULL,
  `payment_source_selected` tinyint(1) DEFAULT 1,
  `payment_source_selected_by` int(11) DEFAULT NULL,
  `payment_source_selected_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `expenses`
--

INSERT INTO `expenses` (`id`, `branch_id`, `account_id`, `amount`, `description`, `category`, `payment_method`, `receipt_url`, `date`, `approved_by`, `status`, `created_at`, `updated_at`, `verified_by`, `verification_date`, `rejection_reason`, `deletion_reason`, `deleted_by`, `deleted_at`, `expense_origin`, `payroll_id`, `payment_source_selected`, `payment_source_selected_by`, `payment_source_selected_at`) VALUES
(5, 1, 1, 1000.00, 'Test', 'Office Expense', 'cash', NULL, '2026-04-03', 1, 'deleted', '2026-04-02 19:44:39', '2026-04-02 21:50:21', 1, '2026-04-02 19:44:44', NULL, 'Wrong entry', 1, '2026-04-02 21:50:21', 'manual', NULL, 1, NULL, NULL),
(6, 1, 1, 2000.00, '', 'Office Expense', 'cash', NULL, '2026-04-03', 1, 'approved', '2026-04-02 21:56:22', '2026-04-02 21:56:22', NULL, NULL, NULL, NULL, NULL, NULL, 'manual', NULL, 1, NULL, NULL),
(7, 1, 1, 1500.00, 'Referral Fee payout to: Unknown (for Sat TEST)', 'Referral Expense', 'cash', NULL, '2026-04-21', 1, 'approved', '2026-04-20 18:24:47', '2026-04-20 19:03:23', 1, '2026-04-20 18:25:04', NULL, NULL, NULL, NULL, 'manual', NULL, 1, NULL, NULL),
(8, 1, 1, 2500.00, 'Referral Fee pending payout to: Referrer (Student ID: 34)', 'Referral Expense', 'cash', NULL, '2026-04-21', 1, 'approved', '2026-04-20 19:10:54', '2026-04-20 19:10:54', NULL, NULL, NULL, NULL, NULL, NULL, 'manual', NULL, 1, NULL, NULL),
(9, 1, 1, 500.00, 'Referral Fee pending payout to: Referrer (Student ID: 35)', 'Referral Expense', 'cash', NULL, '2026-04-21', 1, 'approved', '2026-04-20 19:14:12', '2026-04-20 19:14:12', NULL, NULL, NULL, NULL, NULL, NULL, 'manual', NULL, 1, NULL, NULL),
(10, 1, 1, 500.00, 'For Tea', 'Pitty Cash', 'cash', NULL, '2026-04-21', 1, 'approved', '2026-04-20 19:30:08', '2026-04-20 19:30:08', NULL, NULL, NULL, NULL, NULL, NULL, 'manual', NULL, 1, NULL, NULL),
(11, 1, 1, 5600.00, 'rd', 'Pitty Cash', 'cash', '/uploads/expenses/receipt-1776713465401-500419979.png', '2026-04-21', 1, 'deleted', '2026-04-20 19:31:05', '2026-04-20 19:39:29', 1, '2026-04-20 19:31:15', NULL, 'TYesty', 1, '2026-04-20 19:39:29', 'manual', NULL, 1, NULL, NULL),
(12, 1, 1, 500.00, 'Referral Fee pending payout to: Referrer (Student ID: 36)', 'Referral Expense', 'cash', NULL, '2026-04-21', 1, 'approved', '2026-04-20 19:34:03', '2026-04-20 19:34:03', NULL, NULL, NULL, NULL, NULL, NULL, 'manual', NULL, 1, NULL, NULL),
(13, 1, 1, 560.00, 'Referral Fee pending payout to: Referrer (Student ID: 38)', 'Referral Expense', 'cash', NULL, '2026-04-21', 1, 'approved', '2026-04-20 19:43:08', '2026-04-20 19:43:08', NULL, NULL, NULL, NULL, NULL, NULL, 'manual', NULL, 1, NULL, NULL),
(14, 1, 1, 566.00, 'Referral Fee pending payout to: Referrer (Student ID: 39)', 'Referral Expense', 'cash', NULL, '2026-04-21', 1, 'approved', '2026-04-20 19:44:50', '2026-04-20 19:44:50', NULL, NULL, NULL, NULL, NULL, NULL, 'manual', NULL, 1, NULL, NULL),
(15, 1, 1, 321.00, 'Referral Fee payout to: St (for Redowan Sayem) [REF:31:37]', 'Referral Expense', 'cash', NULL, '2026-04-21', 1, 'approved', '2026-04-20 20:16:02', '2026-04-20 20:16:30', 1, '2026-04-20 20:16:13', NULL, NULL, NULL, NULL, 'manual', NULL, 1, NULL, NULL),
(16, 1, 1, 2000.00, 'Referral Fee payout to: xyz (for test hasib) [REF:36:45]', 'Referral Expense', 'cash', NULL, '2026-05-04', 1, 'approved', '2026-05-04 11:38:01', '2026-05-05 07:12:00', 1, '2026-05-05 07:11:57', NULL, NULL, NULL, NULL, 'manual', NULL, 1, NULL, NULL),
(17, 1, 1, 500.00, '', 'Office Expense', 'cash', NULL, '2026-05-04', 1, 'approved', '2026-05-04 11:43:27', '2026-05-04 11:43:27', NULL, NULL, NULL, NULL, NULL, NULL, 'manual', NULL, 1, NULL, NULL),
(18, 1, 1, 20000.00, 'Staff Salary: Sam (4/2026)', 'Salaries & Wages', 'cash', NULL, '2026-05-09', 1, 'approved', '2026-05-09 05:24:23', '2026-05-09 05:55:04', 1, '2026-05-09 05:43:25', NULL, NULL, NULL, NULL, 'payroll', 1, 1, NULL, NULL),
(19, 1, 1, 2322.00, 'Staff Salary: TEST (4/2026)', 'Salaries & Wages', 'cash', NULL, '2026-05-09', 1, 'approved', '2026-05-09 05:28:15', '2026-05-09 05:55:00', 1, '2026-05-09 05:43:22', NULL, NULL, NULL, NULL, 'payroll', 2, 1, NULL, NULL),
(20, 1, 1, 24400.00, 'Staff Salary: Super Admin (4/2026)', 'Salaries & Wages', 'cash', NULL, '2026-05-09', 1, 'approved', '2026-05-09 05:34:59', '2026-05-09 05:43:18', 1, '2026-05-09 05:43:15', NULL, NULL, NULL, NULL, 'payroll', 6, 1, NULL, NULL),
(21, 1, 1, 25000.00, 'Staff Salary: Super Admin (3/2026)', 'Salaries & Wages', 'cash', NULL, '2026-05-10', 1, 'approved', '2026-05-09 20:55:01', '2026-05-09 20:56:43', 1, '2026-05-09 20:56:39', NULL, NULL, NULL, NULL, 'payroll', 9, 1, 1, '2026-05-09 20:56:33'),
(22, 1, 1, 2322.00, 'Staff Salary: TEST (3/2026)', 'Salaries & Wages', 'cash', NULL, '2026-05-10', 1, 'approved', '2026-05-09 20:55:16', '2026-05-09 20:56:24', 1, '2026-05-09 20:56:22', NULL, NULL, NULL, NULL, 'payroll', 8, 1, 1, '2026-05-09 20:56:18'),
(23, 1, 3, 20000.00, 'Staff Salary: Sam (3/2026)', 'Salaries & Wages', 'bank_transfer', NULL, '2026-05-10', 1, 'approved', '2026-05-09 20:55:24', '2026-05-09 20:55:51', 1, '2026-05-09 20:55:47', NULL, NULL, NULL, NULL, 'payroll', 7, 1, 1, '2026-05-09 20:55:44'),
(24, 8, 20, 20000.00, 'Staff Salary: TEST MIRPUR (4/2026)', 'Salaries & Wages', 'cash', NULL, '2026-05-10', 1, 'approved', '2026-05-10 14:43:23', '2026-05-10 14:43:57', 1, '2026-05-10 14:43:55', NULL, NULL, NULL, NULL, 'payroll', 10, 1, 1, '2026-05-10 14:43:33'),
(25, 8, 20, 25000.00, '', 'Office Rent', 'cash', '/uploads/expenses/receipt-1778427801626-570359038.png', '2026-01-25', 92, 'approved', '2026-05-10 15:43:21', '2026-05-10 15:43:35', 92, '2026-05-10 15:43:25', NULL, NULL, NULL, NULL, 'manual', NULL, 1, NULL, NULL),
(26, 8, 20, 25600.00, '', 'Office Rent', 'cash', '/uploads/expenses/receipt-1778428701691-199877117.png', '2026-05-10', 85, 'approved', '2026-05-10 15:58:21', '2026-05-10 16:00:07', 92, '2026-05-10 15:58:26', NULL, NULL, NULL, NULL, 'manual', NULL, 1, NULL, NULL);

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
(15, 1, 'Pitty Cash', 10, 'sub', '', 1, '2026-04-02 21:57:44', '2026-04-02 21:57:44'),
(16, 8, 'Office Rent', NULL, 'head', '', 1, '2026-05-10 15:42:53', '2026-05-10 15:42:53');

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
(25, 1, 'INV-2026-0025', NULL, NULL, 3600.00, 3600.00, 'paid', '2026-04-03', '2026-04-03 09:56:11', '', '2026-04-03 09:56:11', '2026-04-03 09:56:30', 'custom', 5, 4, 'E2E Customer', '01205060919', '', '', ''),
(26, 1, 'INV-1776019684117-29', 21, 29, 15000.00, 15000.00, 'paid', '2026-04-20', '2026-04-12 18:48:04', 'Direct student entry for PTE Academic Standard. Pending fee collection via POS.', '2026-04-12 18:48:04', '2026-04-12 18:48:26', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(27, 1, 'CRM-INV-1-0027', 22, 30, 10500.00, 10500.00, 'paid', '2026-04-27', '2026-04-12 19:33:42', 'CRM Lead ID: 31 | CRM Lead: TEST REF — PTE Core. Pending fee collection via POS. | Opportunity ID: 13', '2026-04-12 19:33:42', '2026-04-12 19:34:01', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(28, 1, 'INV-1776022730055-31', 23, 31, 15000.00, 15000.00, 'paid', '2026-04-20', '2026-04-12 19:38:50', 'Direct student entry for PTE Academic Standard. Pending fee collection via POS.', '2026-04-12 19:38:50', '2026-04-12 19:39:04', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(29, 1, 'CRM-INV-1-0029', 24, 33, 5500.00, 5500.00, 'paid', '2026-05-05', '2026-04-20 18:24:32', 'CRM Lead ID: 32 | CRM Lead: Sat TEST — PTE Basic. Pending fee collection via POS. | Opportunity ID: 15', '2026-04-20 18:24:32', '2026-04-20 18:24:46', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(30, 1, 'INV-2026-0030', NULL, NULL, 500.00, 500.00, 'paid', '2026-04-21', '2026-04-20 18:45:46', '', '2026-04-20 18:45:46', '2026-04-20 18:46:07', 'custom', 5, 5, 'TEST 5', '', '', '', ''),
(31, 1, 'CRM-INV-1-0031', 25, 34, 5500.00, 5500.00, 'paid', '2026-05-05', '2026-04-20 19:09:58', 'CRM Lead ID: 33 | CRM Lead: TEST 9699 REF — PTE Basic. Pending fee collection via POS. | Opportunity ID: 17', '2026-04-20 19:09:58', '2026-04-20 19:10:53', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(32, 1, 'CRM-INV-1-0032', 26, 35, 5500.00, 5500.00, 'paid', '2026-05-05', '2026-04-20 19:13:56', 'CRM Lead ID: 34 | CRM Lead: TEST 43 — PTE Basic. Pending fee collection via POS. | Opportunity ID: 19', '2026-04-20 19:13:56', '2026-04-20 19:14:12', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(33, 1, 'INV-1776713617557-36', 27, 36, 5500.00, 5500.00, 'paid', '2026-04-28', '2026-04-20 19:33:37', 'Direct student entry for PTE Basic. Pending fee collection via POS.', '2026-04-20 19:33:37', '2026-04-20 19:34:03', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(34, 1, 'INV-1776714037189-37', 28, 37, 5500.00, 0.00, 'rejected', '2026-04-28', '2026-04-20 19:40:37', 'Direct student entry for PTE Basic. Pending fee collection via POS.\n[Fee Rejected 2026-04-20T19:42:09.400Z by Super Admin] Not received | Student: ABDULLAH AL REDOWAN', '2026-04-20 19:40:37', '2026-04-20 19:42:09', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(35, 1, 'INV-1776714181067-38', 29, 38, 5500.00, 5500.00, 'paid', '2026-04-28', '2026-04-20 19:43:01', 'Direct student entry for PTE Basic. Pending fee collection via POS.', '2026-04-20 19:43:01', '2026-04-20 19:43:08', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(36, 1, 'INV-1776714280945-39', 30, 39, 15000.00, 15000.00, 'paid', '2026-04-28', '2026-04-20 19:44:40', 'Direct student entry for PTE Academic Standard. Pending fee collection via POS.', '2026-04-20 19:44:40', '2026-04-20 19:44:50', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(37, 1, 'INV-1776716141191-40', 31, 40, 15000.00, 15000.00, 'paid', '2026-04-28', '2026-04-20 20:15:41', 'Direct student entry for PTE Academic Standard. Pending fee collection via POS.', '2026-04-20 20:15:41', '2026-04-20 20:16:02', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(38, 1, 'INV-1776716362276', 32, 41, 5500.00, 5500.00, 'paid', '2026-04-21', '2026-04-20 20:19:22', NULL, '2026-04-20 20:19:22', '2026-04-20 20:19:22', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(39, 1, 'INV-1776718024302', 33, 34, 5500.00, 5500.00, 'paid', '2026-04-21', '2026-04-20 20:47:04', NULL, '2026-04-20 20:47:04', '2026-04-20 20:47:04', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(40, 1, 'INV-1776718024357', 34, 34, 5500.00, 5500.00, 'paid', '2026-04-21', '2026-04-20 20:47:04', NULL, '2026-04-20 20:47:04', '2026-04-20 20:47:04', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(41, 1, 'INV-1776718377124', 35, 42, 5500.00, 5500.00, 'paid', '2026-04-21', '2026-04-20 20:52:57', NULL, '2026-04-20 20:52:57', '2026-04-20 20:54:45', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(42, 1, 'INV-2026-0042', NULL, NULL, 500.00, 500.00, 'paid', '2026-04-21', '2026-04-20 20:59:55', '', '2026-04-20 20:59:55', '2026-04-20 21:00:21', 'custom', 5, 3, 'TEST', '', '', '', ''),
(43, 1, 'INV-2026-0043', NULL, NULL, 500.00, 500.00, 'paid', '2026-04-21', '2026-04-20 21:08:30', '', '2026-04-20 21:08:30', '2026-04-20 21:08:35', 'custom', 5, 3, 'TEST', '', '', '', ''),
(44, 1, 'INV-2026-0044', NULL, NULL, 500.00, 500.00, 'paid', '2026-04-21', '2026-04-20 21:09:35', '', '2026-04-20 21:09:35', '2026-04-20 21:09:41', 'custom', 5, 3, 'TEST', '', '', '', ''),
(45, 1, 'CRM-INV-1-0045', 36, 43, 5500.00, 5500.00, 'paid', '2026-05-18', '2026-05-04 11:37:20', 'CRM Lead ID: 38 | CRM Lead: test hasib — PTE Basic. Pending fee collection via POS. | Opportunity ID: 21', '2026-05-04 11:37:20', '2026-05-04 11:38:01', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(46, 1, 'INV-2026-0046', NULL, NULL, 50000.00, 50000.00, 'paid', '2026-05-07', '2026-05-04 11:41:46', '', '2026-05-04 11:41:46', '2026-05-04 11:42:24', 'custom', 5, 4, 'E2E Customer', '01205060919', '', '', ''),
(47, 1, 'CRM-INV-1-0047', NULL, NULL, 5500.00, 5500.00, 'paid', '2026-05-12', '2026-05-04 18:30:33', 'CRM Deal: test hasib – PTE Basic', '2026-05-04 18:30:33', '2026-05-05 07:00:06', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(48, 1, 'CRM-INV-1-0048', NULL, NULL, 5500.00, 5500.00, 'paid', '2026-05-12', '2026-05-04 18:30:35', 'CRM Deal: TEST 43 – PTE Basic', '2026-05-04 18:30:35', '2026-05-05 07:00:12', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(49, 1, 'CRM-INV-1-0049', 37, 2, 5500.00, 5500.00, 'paid', '2026-05-19', '2026-05-05 07:44:26', 'CRM Lead ID: 39 | CRM Lead: ABDULLAH AL REDOWAN — PTE Basic. Pending fee collection via POS. | Opportunity ID: 23', '2026-05-05 07:44:26', '2026-05-05 07:44:39', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(50, 8, 'CRM-INV-8-0001', 38, 47, 5500.00, 5500.00, 'paid', '2026-05-23', '2026-05-09 07:33:10', 'CRM Lead ID: 42 | CRM Lead: Redowan Sayem Mirpur Branch — PTE BASIC 01. Pending fee collection via POS. | Opportunity ID: 27', '2026-05-09 07:33:10', '2026-05-09 07:33:29', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(51, 8, 'CRM-INV-8-0002', 39, 48, 5500.00, 5500.00, 'paid', '2026-05-23', '2026-05-09 17:55:03', 'CRM Lead ID: 43 | CRM Lead: Redowan Sayem — PTE BASIC 01. Pending fee collection via POS. | Opportunity ID: 29', '2026-05-09 17:55:03', '2026-05-09 17:55:37', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(52, 8, 'CRM-INV-8-0003', 40, 49, 5500.00, 5500.00, 'paid', '2026-05-24', '2026-05-09 18:16:51', 'CRM Lead ID: 44 | CRM Lead: ABDULLAH AL GALIB — PTE BASIC 01. Pending fee collection via POS. | Opportunity ID: 31', '2026-05-09 18:16:51', '2026-05-09 18:17:43', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(53, 1, 'INV-2026-0050', NULL, NULL, 500.00, 500.00, 'paid', '2026-05-10', '2026-05-09 18:21:34', '', '2026-05-09 18:21:34', '2026-05-09 18:22:23', 'custom', 5, 4, 'E2E Customer', '01205060919', '', '', ''),
(57, 8, 'CRM-INV-8-0004', NULL, NULL, 5500.00, 0.00, 'rejected', '2026-05-17', '2026-05-09 18:27:36', 'CRM Deal: ABDULLAH AL GALIB – Student Booking\n[Fee Rejected 2026-05-09T18:47:15.380Z by Super Admin] Unknown | Student: Unknown Student', '2026-05-09 18:27:36', '2026-05-09 18:47:15', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(59, 8, 'CRM-INV-8-0005', NULL, NULL, 5500.00, 0.00, 'rejected', '2026-05-17', '2026-05-09 18:28:19', 'CRM Deal: Redowan Sayem Mirpur Branch – PTE BASIC 01\n[Fee Rejected 2026-05-09T18:48:20.187Z by Sayem] unknown | Student: Unknown Student', '2026-05-09 18:28:19', '2026-05-09 18:48:20', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(60, 1, 'INV-1-2026-MOYS86WL-A43CE4', 41, 2, 5500.00, 5500.00, 'paid', '2026-05-10', '2026-05-09 20:14:07', NULL, '2026-05-09 20:14:07', '2026-05-09 20:59:10', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(61, 1, 'INV-1-2026-MOYVZG74-7083F1', 42, 29, 5500.00, 5500.00, 'paid', '2026-05-10', '2026-05-09 21:59:18', 'Payment Method Initiated: bkash_manual\nbKash Merchant No: 01913-373581\nStudent bKash Number: 333\nbKash Transaction ID: 3DDD', '2026-05-09 21:59:18', '2026-05-09 22:00:50', 'tuition', NULL, NULL, NULL, NULL, NULL, NULL, NULL);

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
(30, 1, 'MR-CUST-1775210190760', 'Custom Income: Consultation Fee - E2E Customer', '2026-04-03', 1, '2026-04-03 09:56:30', '2026-04-03 09:56:30'),
(31, 1, 'PAY-42', 'Fee Collection - Enrollment: 21 | Ref: N/A', '2026-04-13', 1, '2026-04-12 18:48:26', '2026-04-12 18:48:26'),
(32, 1, 'PAY-43', 'Fee Collection - Enrollment: 22 | Ref: N/A', '2026-04-13', 1, '2026-04-12 19:34:01', '2026-04-12 19:34:01'),
(33, 1, 'PAY-44', 'Fee Collection - Enrollment: 23 | Ref: N/A', '2026-04-13', 1, '2026-04-12 19:39:04', '2026-04-12 19:39:04'),
(34, 1, 'PAY-45', 'Fee Collection - Enrollment: 24 | Ref: N/A', '2026-04-21', 1, '2026-04-20 18:24:47', '2026-04-20 18:24:47'),
(35, 1, 'EXP-APP-7-1776709515267', 'Referral Fee pending payout to: Referrer (Student ID: 33)', '2026-04-21', 1, '2026-04-20 18:25:15', '2026-04-20 18:25:15'),
(36, 1, 'MR-CUST-1776710767205', 'Custom Income: Consultation Fee - TEST 5', '2026-04-21', 1, '2026-04-20 18:46:07', '2026-04-20 18:46:07'),
(37, 1, 'PAY-47', 'Fee Collection - Enrollment: 25 | Ref: N/A', '2026-04-21', 1, '2026-04-20 19:10:54', '2026-04-20 19:10:54'),
(38, 1, 'PAY-48', 'Fee Collection - Enrollment: 26 | Ref: N/A', '2026-04-21', 1, '2026-04-20 19:14:12', '2026-04-20 19:14:12'),
(39, 1, 'EXP-APP-10-1776713409313', 'For Tea', '2026-04-21', 1, '2026-04-20 19:30:09', '2026-04-20 19:30:09'),
(40, 1, 'EXP-APP-11-1776713485679', 'rd', '2026-04-21', 1, '2026-04-20 19:31:25', '2026-04-20 19:31:25'),
(41, 1, 'PAY-49', 'Fee Collection - Enrollment: 27 | Ref: N/A', '2026-04-21', 1, '2026-04-20 19:34:03', '2026-04-20 19:34:03'),
(42, 1, 'EXP-REV-11-1776713969059', 'Reversal: rd (Deleted)', '2026-04-21', 1, '2026-04-20 19:39:29', '2026-04-20 19:39:29'),
(43, 1, 'PAY-50', 'Fee Collection - Enrollment: 29 | Ref: N/A', '2026-04-21', 1, '2026-04-20 19:43:08', '2026-04-20 19:43:08'),
(44, 1, 'PAY-51', 'Fee Collection - Enrollment: 30 | Ref: N/A', '2026-04-21', 1, '2026-04-20 19:44:50', '2026-04-20 19:44:50'),
(45, 1, 'PAY-52', 'Fee Collection - Enrollment: 31 | Ref: N/A', '2026-04-21', 1, '2026-04-20 20:16:02', '2026-04-20 20:16:02'),
(46, 1, 'EXP-APP-15-1776716190209', 'Referral Fee payout to: St (for Redowan Sayem) [REF:31:37]', '2026-04-21', 1, '2026-04-20 20:16:30', '2026-04-20 20:16:30'),
(47, 1, 'JNL-WEB-1776718024610', 'Website Checkout - INV-1776718024302', '2026-04-21', 62, '2026-04-20 20:47:04', '2026-04-20 20:47:04'),
(48, 1, 'JNL-WEB-1776718024657', 'Website Checkout - INV-1776718024357', '2026-04-21', 62, '2026-04-20 20:47:04', '2026-04-20 20:47:04'),
(49, 1, 'PAY-56', 'Fee Collection - Enrollment: 35 | Ref: N/A', '2026-04-21', 1, '2026-04-20 20:54:45', '2026-04-20 20:54:45'),
(50, 1, 'MR-CUST-1776718821280', 'Custom Income: Consultation Fee - TEST', '2026-04-21', 1, '2026-04-20 21:00:21', '2026-04-20 21:00:21'),
(51, 1, 'MR-CUST-1776719315834', 'Custom Income: Consultation Fee - TEST', '2026-04-21', 1, '2026-04-20 21:08:36', '2026-04-20 21:08:36'),
(52, 1, 'MR-CUST-1776719381564', 'Custom Income: Consultation Fee - TEST', '2026-04-21', 1, '2026-04-20 21:09:41', '2026-04-20 21:09:41'),
(53, 1, 'PAY-60', 'Fee Collection - Enrollment: 36 | Ref: N/A', '2026-05-04', 1, '2026-05-04 11:38:01', '2026-05-04 11:38:01'),
(54, 1, 'MR-CUST-1777894944379', 'Custom Income: Consultation Fee - E2E Customer', '2026-05-04', 1, '2026-05-04 11:42:24', '2026-05-04 11:42:24'),
(55, 1, 'EXP-APP-17-1777895007657', 'Approved Expense: Office Expense', '2026-05-04', 1, '2026-05-04 11:43:27', '2026-05-04 11:43:27'),
(56, 1, 'MR-CUST-1777964405979', 'Custom Income: Custom Income - Customer', '2026-05-05', 1, '2026-05-05 07:00:06', '2026-05-05 07:00:06'),
(57, 1, 'MR-CUST-1777964412321', 'Custom Income: Custom Income - Customer', '2026-05-05', 1, '2026-05-05 07:00:12', '2026-05-05 07:00:12'),
(58, 1, 'EXP-APP-16-1777965119997', 'Referral Fee payout to: xyz (for test hasib) [REF:36:45]', '2026-05-05', 1, '2026-05-05 07:11:59', '2026-05-05 07:11:59'),
(59, 1, 'PAY-64', 'Fee Collection - Enrollment: 37 | Ref: N/A', '2026-05-05', 1, '2026-05-05 07:44:39', '2026-05-05 07:44:39'),
(60, 1, 'EXP-APP-20-1778305398118', 'Staff Salary: Super Admin (4/2026)', '2026-05-09', 1, '2026-05-09 05:43:18', '2026-05-09 05:43:18'),
(61, 1, 'EXP-APP-19-1778306100745', 'Staff Salary: TEST (4/2026)', '2026-05-09', 1, '2026-05-09 05:55:00', '2026-05-09 05:55:00'),
(62, 1, 'EXP-APP-18-1778306103957', 'Staff Salary: Sam (4/2026)', '2026-05-09', 1, '2026-05-09 05:55:03', '2026-05-09 05:55:03'),
(63, 8, 'PAY-65', 'Fee Collection - Enrollment: 38 | Ref: N/A', '2026-05-09', 85, '2026-05-09 07:33:30', '2026-05-09 07:33:30'),
(64, 8, 'PAY-66', 'Fee Collection - Enrollment: 39 | Ref: N/A', '2026-05-09', 85, '2026-05-09 17:55:38', '2026-05-09 17:55:38'),
(65, 8, 'PAY-67', 'Fee Collection - Enrollment: 40 | Ref: N/A', '2026-05-10', 85, '2026-05-09 18:17:43', '2026-05-09 18:17:43'),
(66, 1, 'MR-CUST-1778350943656', 'Custom Income: Consultation Fee - E2E Customer', '2026-05-10', 1, '2026-05-09 18:22:23', '2026-05-09 18:22:23'),
(67, 1, 'EXP-APP-23-1778360150967', 'Staff Salary: Sam (3/2026)', '2026-05-10', 1, '2026-05-09 20:55:50', '2026-05-09 20:55:50'),
(68, 1, 'EXP-APP-22-1778360184315', 'Staff Salary: TEST (3/2026)', '2026-05-10', 1, '2026-05-09 20:56:24', '2026-05-09 20:56:24'),
(69, 1, 'EXP-APP-21-1778360203628', 'Staff Salary: Super Admin (3/2026)', '2026-05-10', 1, '2026-05-09 20:56:43', '2026-05-09 20:56:43'),
(70, 1, 'PAY-69', 'Fee Collection - Enrollment: 41 | Ref: N/A', '2026-05-10', 1, '2026-05-09 20:59:10', '2026-05-09 20:59:10'),
(71, 1, 'PAY-70', 'Fee Collection - Enrollment: 42 | Ref: 3DDD', '2026-05-10', 1, '2026-05-09 22:00:50', '2026-05-09 22:00:50'),
(72, 8, 'EXP-APP-24-1778424236873', 'Staff Salary: TEST MIRPUR (4/2026)', '2026-05-10', 1, '2026-05-10 14:43:56', '2026-05-10 14:43:56'),
(73, 8, 'EXP-APP-25-1778427815817', 'Approved Expense: Office Rent', '2026-05-10', 92, '2026-05-10 15:43:35', '2026-05-10 15:43:35'),
(74, 8, 'EXP-APP-26-1778428807133', 'Approved Expense: Office Rent', '2026-05-10', 85, '2026-05-10 16:00:07', '2026-05-10 16:00:07');

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
(60, 30, 15, 0.0000, 3600.0000, 'Revenue: Consultation Fee', '2026-04-03 09:56:31', '2026-04-03 09:56:31'),
(61, 31, 1, 15000.0000, 0.0000, 'POS Payment', '2026-04-12 18:48:26', '2026-04-12 18:48:26'),
(62, 31, 2, 0.0000, 15000.0000, 'Tuition Revenue', '2026-04-12 18:48:26', '2026-04-12 18:48:26'),
(63, 32, 1, 10500.0000, 0.0000, 'POS Payment', '2026-04-12 19:34:01', '2026-04-12 19:34:01'),
(64, 32, 2, 0.0000, 10500.0000, 'Tuition Revenue', '2026-04-12 19:34:01', '2026-04-12 19:34:01'),
(65, 33, 1, 15000.0000, 0.0000, 'POS Payment', '2026-04-12 19:39:04', '2026-04-12 19:39:04'),
(66, 33, 2, 0.0000, 15000.0000, 'Tuition Revenue', '2026-04-12 19:39:04', '2026-04-12 19:39:04'),
(67, 34, 1, 5500.0000, 0.0000, 'POS Payment', '2026-04-20 18:24:47', '2026-04-20 18:24:47'),
(68, 34, 2, 0.0000, 5500.0000, 'Tuition Revenue', '2026-04-20 18:24:47', '2026-04-20 18:24:47'),
(69, 34, 16, 1500.0000, 0.0000, 'Referral Fee: Unknown for Sat TEST', '2026-04-20 18:24:47', '2026-04-20 19:03:23'),
(70, 34, 17, 0.0000, 1500.0000, 'Accounts Payable for Referral — Unknown', '2026-04-20 18:24:47', '2026-04-20 19:03:23'),
(71, 35, 16, 1500.0000, 0.0000, 'Referral Fee pending payout to: Referrer (Student ID: 33)', '2026-04-20 18:25:15', '2026-04-20 18:25:15'),
(72, 35, 16, 0.0000, 1500.0000, 'Paid via cash', '2026-04-20 18:25:15', '2026-04-20 18:25:15'),
(73, 36, 1, 500.0000, 0.0000, 'Custom Income - Consultation Fee', '2026-04-20 18:46:07', '2026-04-20 18:46:07'),
(74, 36, 15, 0.0000, 500.0000, 'Revenue: Consultation Fee', '2026-04-20 18:46:07', '2026-04-20 18:46:07'),
(75, 37, 1, 5500.0000, 0.0000, 'POS Payment', '2026-04-20 19:10:54', '2026-04-20 19:10:54'),
(76, 37, 2, 0.0000, 5500.0000, 'Tuition Revenue', '2026-04-20 19:10:54', '2026-04-20 19:10:54'),
(77, 37, 16, 2500.0000, 0.0000, 'Referral Fee: Referrer for Student ID 34', '2026-04-20 19:10:54', '2026-04-20 19:10:54'),
(78, 37, 17, 0.0000, 2500.0000, 'Accounts Payable for Referral', '2026-04-20 19:10:54', '2026-04-20 19:10:54'),
(79, 38, 1, 5500.0000, 0.0000, 'POS Payment', '2026-04-20 19:14:12', '2026-04-20 19:14:12'),
(80, 38, 2, 0.0000, 5500.0000, 'Tuition Revenue', '2026-04-20 19:14:12', '2026-04-20 19:14:12'),
(81, 38, 16, 500.0000, 0.0000, 'Referral Fee: Referrer for Student ID 35', '2026-04-20 19:14:12', '2026-04-20 19:14:12'),
(82, 38, 17, 0.0000, 500.0000, 'Accounts Payable for Referral', '2026-04-20 19:14:12', '2026-04-20 19:14:12'),
(83, 39, 18, 500.0000, 0.0000, 'For Tea', '2026-04-20 19:30:09', '2026-04-20 19:30:09'),
(84, 39, 1, 0.0000, 500.0000, 'Paid via cash', '2026-04-20 19:30:09', '2026-04-20 19:30:09'),
(85, 40, 18, 5600.0000, 0.0000, 'rd', '2026-04-20 19:31:25', '2026-04-20 19:31:25'),
(86, 40, 1, 0.0000, 5600.0000, 'Paid via cash', '2026-04-20 19:31:25', '2026-04-20 19:31:25'),
(87, 41, 1, 5500.0000, 0.0000, 'POS Payment', '2026-04-20 19:34:03', '2026-04-20 19:34:03'),
(88, 41, 2, 0.0000, 5500.0000, 'Tuition Revenue', '2026-04-20 19:34:03', '2026-04-20 19:34:03'),
(89, 41, 16, 500.0000, 0.0000, 'Referral Fee: Referrer for Student ID 36', '2026-04-20 19:34:03', '2026-04-20 19:34:03'),
(90, 41, 17, 0.0000, 500.0000, 'Accounts Payable for Referral', '2026-04-20 19:34:03', '2026-04-20 19:34:03'),
(91, 42, 18, 0.0000, 5600.0000, 'Reversal - rd', '2026-04-20 19:39:29', '2026-04-20 19:39:29'),
(92, 42, 1, 5600.0000, 0.0000, 'Reversal - refund via cash', '2026-04-20 19:39:29', '2026-04-20 19:39:29'),
(93, 43, 1, 5500.0000, 0.0000, 'POS Payment', '2026-04-20 19:43:09', '2026-04-20 19:43:09'),
(94, 43, 2, 0.0000, 5500.0000, 'Tuition Revenue', '2026-04-20 19:43:09', '2026-04-20 19:43:09'),
(95, 43, 16, 560.0000, 0.0000, 'Referral Fee: Referrer for Student ID 38', '2026-04-20 19:43:09', '2026-04-20 19:43:09'),
(96, 43, 17, 0.0000, 560.0000, 'Accounts Payable for Referral', '2026-04-20 19:43:09', '2026-04-20 19:43:09'),
(97, 44, 1, 15000.0000, 0.0000, 'POS Payment', '2026-04-20 19:44:51', '2026-04-20 19:44:51'),
(98, 44, 2, 0.0000, 15000.0000, 'Tuition Revenue', '2026-04-20 19:44:51', '2026-04-20 19:44:51'),
(99, 44, 16, 566.0000, 0.0000, 'Referral Fee: Referrer for Student ID 39', '2026-04-20 19:44:51', '2026-04-20 19:44:51'),
(100, 44, 17, 0.0000, 566.0000, 'Accounts Payable for Referral', '2026-04-20 19:44:51', '2026-04-20 19:44:51'),
(101, 45, 1, 15000.0000, 0.0000, 'POS Payment', '2026-04-20 20:16:02', '2026-04-20 20:16:02'),
(102, 45, 2, 0.0000, 15000.0000, 'Tuition Revenue', '2026-04-20 20:16:02', '2026-04-20 20:16:02'),
(103, 46, 16, 321.0000, 0.0000, 'Referral Fee payout to: St (for Redowan Sayem) [REF:31:37]', '2026-04-20 20:16:30', '2026-04-20 20:16:30'),
(104, 46, 1, 0.0000, 321.0000, 'Paid via cash', '2026-04-20 20:16:30', '2026-04-20 20:16:30'),
(105, 47, 9, 5500.0000, 0.0000, 'Received via bKash', '2026-04-20 20:47:04', '2026-04-20 20:47:04'),
(106, 47, 2, 0.0000, 5500.0000, 'Course Fee (Online)', '2026-04-20 20:47:04', '2026-04-20 20:47:04'),
(107, 48, 9, 5500.0000, 0.0000, 'Received via bKash', '2026-04-20 20:47:04', '2026-04-20 20:47:04'),
(108, 48, 2, 0.0000, 5500.0000, 'Course Fee (Online)', '2026-04-20 20:47:04', '2026-04-20 20:47:04'),
(109, 49, 1, 5500.0000, 0.0000, 'POS Payment', '2026-04-20 20:54:45', '2026-04-20 20:54:45'),
(110, 49, 2, 0.0000, 5500.0000, 'Tuition Revenue', '2026-04-20 20:54:45', '2026-04-20 20:54:45'),
(111, 50, 1, 500.0000, 0.0000, 'Custom Income - Consultation Fee', '2026-04-20 21:00:21', '2026-04-20 21:00:21'),
(112, 50, 15, 0.0000, 500.0000, 'Revenue: Consultation Fee', '2026-04-20 21:00:21', '2026-04-20 21:00:21'),
(113, 51, 1, 500.0000, 0.0000, 'Custom Income - Consultation Fee', '2026-04-20 21:08:36', '2026-04-20 21:08:36'),
(114, 51, 15, 0.0000, 500.0000, 'Revenue: Consultation Fee', '2026-04-20 21:08:36', '2026-04-20 21:08:36'),
(115, 52, 1, 500.0000, 0.0000, 'Custom Income - Consultation Fee', '2026-04-20 21:09:41', '2026-04-20 21:09:41'),
(116, 52, 15, 0.0000, 500.0000, 'Revenue: Consultation Fee', '2026-04-20 21:09:41', '2026-04-20 21:09:41'),
(117, 53, 1, 5500.0000, 0.0000, 'POS Payment', '2026-05-04 11:38:01', '2026-05-04 11:38:01'),
(118, 53, 2, 0.0000, 5500.0000, 'Tuition Revenue', '2026-05-04 11:38:01', '2026-05-04 11:38:01'),
(119, 54, 1, 50000.0000, 0.0000, 'Custom Income - Consultation Fee', '2026-05-04 11:42:24', '2026-05-04 11:42:24'),
(120, 54, 15, 0.0000, 50000.0000, 'Revenue: Consultation Fee', '2026-05-04 11:42:24', '2026-05-04 11:42:24'),
(121, 55, 5, 500.0000, 0.0000, '', '2026-05-04 11:43:27', '2026-05-04 11:43:27'),
(122, 55, 1, 0.0000, 500.0000, 'Paid via cash', '2026-05-04 11:43:27', '2026-05-04 11:43:27'),
(123, 56, 1, 5500.0000, 0.0000, 'Custom Income - Custom Income', '2026-05-05 07:00:06', '2026-05-05 07:00:06'),
(124, 56, 15, 0.0000, 5500.0000, 'Revenue: Custom Income', '2026-05-05 07:00:06', '2026-05-05 07:00:06'),
(125, 57, 1, 5500.0000, 0.0000, 'Custom Income - Custom Income', '2026-05-05 07:00:12', '2026-05-05 07:00:12'),
(126, 57, 15, 0.0000, 5500.0000, 'Revenue: Custom Income', '2026-05-05 07:00:12', '2026-05-05 07:00:12'),
(127, 58, 16, 2000.0000, 0.0000, 'Referral Fee payout to: xyz (for test hasib) [REF:36:45]', '2026-05-05 07:12:00', '2026-05-05 07:12:00'),
(128, 58, 1, 0.0000, 2000.0000, 'Paid via cash', '2026-05-05 07:12:00', '2026-05-05 07:12:00'),
(129, 59, 1, 5500.0000, 0.0000, 'POS Payment', '2026-05-05 07:44:39', '2026-05-05 07:44:39'),
(130, 59, 2, 0.0000, 5500.0000, 'Tuition Revenue', '2026-05-05 07:44:39', '2026-05-05 07:44:39'),
(131, 60, 19, 24400.0000, 0.0000, 'Staff Salary: Super Admin (4/2026)', '2026-05-09 05:43:18', '2026-05-09 05:43:18'),
(132, 60, 12, 0.0000, 24400.0000, 'Paid via cash', '2026-05-09 05:43:18', '2026-05-09 05:43:18'),
(133, 61, 19, 2322.0000, 0.0000, 'Staff Salary: TEST (4/2026)', '2026-05-09 05:55:00', '2026-05-09 05:55:00'),
(134, 61, 12, 0.0000, 2322.0000, 'Paid via cash', '2026-05-09 05:55:00', '2026-05-09 05:55:00'),
(135, 62, 19, 20000.0000, 0.0000, 'Staff Salary: Sam (4/2026)', '2026-05-09 05:55:04', '2026-05-09 05:55:04'),
(136, 62, 12, 0.0000, 20000.0000, 'Paid via cash', '2026-05-09 05:55:04', '2026-05-09 05:55:04'),
(137, 63, 20, 5500.0000, 0.0000, 'POS Payment', '2026-05-09 07:33:30', '2026-05-09 07:33:30'),
(138, 63, 21, 0.0000, 5500.0000, 'Tuition Revenue', '2026-05-09 07:33:30', '2026-05-09 07:33:30'),
(139, 64, 20, 5500.0000, 0.0000, 'POS Payment', '2026-05-09 17:55:38', '2026-05-09 17:55:38'),
(140, 64, 21, 0.0000, 5500.0000, 'Tuition Revenue', '2026-05-09 17:55:38', '2026-05-09 17:55:38'),
(141, 65, 20, 5500.0000, 0.0000, 'POS Payment', '2026-05-09 18:17:43', '2026-05-09 18:17:43'),
(142, 65, 21, 0.0000, 5500.0000, 'Tuition Revenue', '2026-05-09 18:17:43', '2026-05-09 18:17:43'),
(143, 66, 1, 500.0000, 0.0000, 'Custom Income - Consultation Fee', '2026-05-09 18:22:23', '2026-05-09 18:22:23'),
(144, 66, 15, 0.0000, 500.0000, 'Revenue: Consultation Fee', '2026-05-09 18:22:23', '2026-05-09 18:22:23'),
(145, 67, 19, 20000.0000, 0.0000, 'Staff Salary: Sam (3/2026)', '2026-05-09 20:55:51', '2026-05-09 20:55:51'),
(146, 67, 3, 0.0000, 20000.0000, 'Paid via bank_transfer', '2026-05-09 20:55:51', '2026-05-09 20:55:51'),
(147, 68, 19, 2322.0000, 0.0000, 'Staff Salary: TEST (3/2026)', '2026-05-09 20:56:24', '2026-05-09 20:56:24'),
(148, 68, 1, 0.0000, 2322.0000, 'Paid via cash', '2026-05-09 20:56:24', '2026-05-09 20:56:24'),
(149, 69, 19, 25000.0000, 0.0000, 'Staff Salary: Super Admin (3/2026)', '2026-05-09 20:56:43', '2026-05-09 20:56:43'),
(150, 69, 1, 0.0000, 25000.0000, 'Paid via cash', '2026-05-09 20:56:43', '2026-05-09 20:56:43'),
(151, 70, 1, 5500.0000, 0.0000, 'POS Payment', '2026-05-09 20:59:10', '2026-05-09 20:59:10'),
(152, 70, 2, 0.0000, 5500.0000, 'Tuition Revenue', '2026-05-09 20:59:10', '2026-05-09 20:59:10'),
(153, 71, 9, 5500.0000, 0.0000, 'POS Payment', '2026-05-09 22:00:50', '2026-05-09 22:00:50'),
(154, 71, 2, 0.0000, 5500.0000, 'Tuition Revenue', '2026-05-09 22:00:50', '2026-05-09 22:00:50'),
(155, 72, 22, 20000.0000, 0.0000, 'Staff Salary: TEST MIRPUR (4/2026)', '2026-05-10 14:43:57', '2026-05-10 14:43:57'),
(156, 72, 20, 0.0000, 20000.0000, 'Paid via cash', '2026-05-10 14:43:57', '2026-05-10 14:43:57'),
(157, 73, 23, 25000.0000, 0.0000, '', '2026-05-10 15:43:35', '2026-05-10 15:43:35'),
(158, 73, 20, 0.0000, 25000.0000, 'Paid via cash', '2026-05-10 15:43:35', '2026-05-10 15:43:35'),
(159, 74, 23, 25600.0000, 0.0000, '', '2026-05-10 16:00:07', '2026-05-10 16:00:07'),
(160, 74, 20, 0.0000, 25600.0000, 'Paid via cash', '2026-05-10 16:00:07', '2026-05-10 16:00:07');

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
  `destination_country` varchar(255) DEFAULT NULL,
  `referred_by` varchar(255) DEFAULT NULL,
  `referral_amount` decimal(12,2) DEFAULT 0.00,
  `date_of_birth` date DEFAULT NULL,
  `birthday_wish_last_sent_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `leads`
--

INSERT INTO `leads` (`id`, `branch_id`, `name`, `phone`, `email`, `source`, `status`, `counselor_id`, `batch_interest`, `tags`, `notes`, `trial_date`, `created_at`, `updated_at`, `score`, `deal_value`, `priority`, `expected_close`, `last_activity_at`, `lost_reason`, `course_id`, `batch_id`, `payment_ref`, `destination_country`, `referred_by`, `referral_amount`, `date_of_birth`, `birthday_wish_last_sent_at`) VALUES
(1, 1, 'Zahirul Islam', '01911111111', 'zahir@gmail.com', 'Facebook', 'lost', 1, 'PTE Academic', NULL, NULL, NULL, '2026-03-17 12:02:12', '2026-03-25 11:24:58', 0, 0.00, 'medium', NULL, '2026-03-25 11:24:58', NULL, NULL, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(2, 1, 'Nusrat Jahan', '01922222222', 'nusrat@gmail.com', 'Referral', 'lost', 1, 'IELTS Academic', NULL, NULL, NULL, '2026-03-17 12:02:12', '2026-03-25 11:24:57', 0, 0.00, 'medium', NULL, '2026-03-25 11:24:57', NULL, NULL, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(3, 2, 'Ariful Haque', '01933333333', 'arif@gmail.com', 'Google Search', 'interested', 2, 'PTE Core', NULL, NULL, NULL, '2026-03-17 12:02:12', '2026-03-17 12:02:12', 0, 0.00, 'medium', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(4, 1, 'Sayem', '0182355', '', 'Walk-in', 'lost', NULL, '', NULL, NULL, NULL, '2026-03-25 10:53:27', '2026-04-05 15:36:01', 70, 13000.00, 'medium', NULL, '2026-04-05 15:36:01', NULL, NULL, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(5, 1, 'Sayem', '0187118784', 'aarsayem33@gmail.com', 'Walk-in', 'lost', NULL, NULL, NULL, NULL, NULL, '2026-03-25 11:17:22', '2026-03-25 11:25:05', 85, 0.00, 'low', NULL, '2026-03-25 11:25:05', NULL, NULL, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(6, 1, 'Sudha', '01837239670', 'shajnen002@gmail.com', 'Walk-in', 'fees_pending', NULL, 'PTE Academic Standard', NULL, NULL, NULL, '2026-03-25 11:28:32', '2026-03-27 09:01:43', 85, 15000.00, 'medium', NULL, '2026-03-27 09:01:43', NULL, 1, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(7, 1, 'Tahsin', '019893', 'test@gmail.com', 'Walk-in', 'successful', NULL, 'PTE Academic Standard', NULL, NULL, NULL, '2026-03-27 09:02:06', '2026-03-27 09:03:17', 100, 15000.00, 'medium', NULL, '2026-03-27 09:03:17', NULL, 1, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(8, 1, 'Sayemto', '932', '', 'Walk-in', 'fees_pending', NULL, 'PTE Academic Standard', NULL, NULL, NULL, '2026-03-27 11:29:16', '2026-03-30 20:22:44', 85, 15000.00, 'medium', NULL, '2026-03-30 20:22:44', NULL, 1, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(9, 1, 'TEST ', '03', 's@g.com', 'Walk-in', 'successful', NULL, 'PTE Academic Standard', NULL, NULL, NULL, '2026-03-27 14:27:03', '2026-03-27 14:43:12', 100, 15000.00, 'medium', NULL, '2026-03-27 14:43:12', NULL, 1, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(10, 1, 'Abdullah Al Sahaj', '034', 'jk@w.com', 'Referral', 'successful', NULL, 'PTE Academic Standard', NULL, NULL, NULL, '2026-03-27 17:03:08', '2026-03-27 17:03:48', 100, 15000.00, 'medium', NULL, '2026-03-27 17:03:48', NULL, 1, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(11, 1, 'Tahsin', '0343', 'ad', 'Walk-in', 'lost', NULL, 'PTE Academic Standard', NULL, NULL, NULL, '2026-03-27 17:27:41', '2026-04-01 22:54:41', 100, 15000.00, 'medium', NULL, '2026-04-01 22:54:41', NULL, 1, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(12, 1, 'RED', '01558', 'ddd@gmail.com', 'website', 'lost', NULL, 'IELTS Academic Masterclass', NULL, '', NULL, '2026-03-30 20:14:50', '2026-04-05 15:35:58', 65, 12000.00, 'high', NULL, '2026-04-05 15:35:58', NULL, 2, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(13, 1, 'Sayem', '01871186562', 'aarsayem002@gmail.com', 'Website Enquiry', 'successful', NULL, 'PTE Academic Standard', NULL, 'Subject: General Booking/Consultation\nMessage: ', NULL, '2026-03-31 02:19:13', '2026-03-31 02:20:20', 70, 15000.00, 'medium', NULL, '2026-03-31 02:20:20', NULL, 1, NULL, NULL, 'Australia', NULL, 0.00, NULL, NULL),
(14, 1, 'Sayem', '0156955545', 'business.intech@gmail.com', 'website', 'successful', NULL, 'PTE Academic Standard', NULL, '', NULL, '2026-04-02 18:40:43', '2026-04-02 18:43:45', 65, 15000.00, 'high', NULL, '2026-04-02 18:43:45', NULL, 1, NULL, NULL, 'Australia', NULL, 0.00, NULL, NULL),
(15, 1, 'Three Piece', '0410 807 546', 'aarsayem002@gmail.com', 'website', 'successful', NULL, NULL, NULL, 'Payment Method Initiated: demo_bkash', NULL, '2026-04-02 21:39:58', '2026-04-02 21:40:02', 0, 5500.00, 'high', NULL, NULL, NULL, 3, 4, 'PAY-256DFCD9', NULL, NULL, 0.00, NULL, NULL),
(16, 1, 'TEST', '', '', 'Walk-in', 'new', NULL, 'PTE Basic', NULL, NULL, NULL, '2026-04-05 15:36:50', '2026-04-05 15:36:50', 65, 5500.00, 'medium', NULL, NULL, NULL, 3, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(17, 1, 'TEST 05', '', '', 'Walk-in', 'new', NULL, NULL, NULL, NULL, NULL, '2026-04-05 15:37:08', '2026-04-05 15:37:08', 50, 0.00, 'medium', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(18, 1, 'TEST', '', '', 'Walk-in', 'new', NULL, NULL, NULL, NULL, NULL, '2026-04-05 15:39:41', '2026-04-05 15:39:41', 50, 0.00, 'medium', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(19, 1, 'u0988', '', '', 'Walk-in', 'new', NULL, NULL, NULL, NULL, NULL, '2026-04-05 15:39:49', '2026-04-05 15:39:49', 50, 0.00, 'medium', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(20, 1, 'TEST 51025', '0215', '3@b.com', 'Walk-in', 'new', NULL, NULL, NULL, NULL, NULL, '2026-04-05 15:46:49', '2026-04-05 15:46:49', 85, 0.00, 'medium', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(21, 1, 'TEST2369', '0112', 'affdfsd@r.com', 'Website Enquiry', 'new', NULL, 'Batch Schedule', NULL, 'Subject: Batch Schedule\nMessage: Hi\n', NULL, '2026-04-05 15:48:31', '2026-04-05 15:48:31', 70, 0.00, 'medium', NULL, '2026-04-05 15:48:31', NULL, NULL, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(22, 1, 'TEST9999', '000', 'p@b.com', 'website', 'interested', NULL, '', NULL, '', NULL, '2026-04-05 15:53:26', '2026-04-05 15:53:26', 65, 0.00, 'high', NULL, '2026-04-05 15:53:26', NULL, 0, NULL, NULL, 'Australia', NULL, 0.00, NULL, NULL),
(23, 1, 'TEST6754', '000', 'p@b.com', 'Website Enquiry', 'new', NULL, 'General Booking/Consultation', NULL, 'Subject: General Booking/Consultation\nMessage: ', NULL, '2026-04-05 16:02:59', '2026-04-05 16:02:59', 70, 0.00, 'medium', NULL, '2026-04-05 16:02:59', NULL, NULL, NULL, NULL, 'Australia', NULL, 0.00, NULL, NULL),
(24, 1, 'TEST6754', '0004EER', 'p@b.com', 'website', 'interested', NULL, '', NULL, '', NULL, '2026-04-05 16:04:41', '2026-04-05 16:04:41', 65, 0.00, 'high', NULL, '2026-04-05 16:04:41', NULL, 0, NULL, NULL, 'Australia', NULL, 0.00, NULL, NULL),
(25, 1, 'ZOHAIB', '47932', 'POPER@P.COM', 'website', 'interested', NULL, '', NULL, '', NULL, '2026-04-05 16:05:38', '2026-04-05 16:05:38', 65, 0.00, 'high', NULL, '2026-04-05 16:05:38', NULL, 0, NULL, NULL, 'UK', NULL, 0.00, NULL, NULL),
(26, 1, 'Jane Doe', '170000000', 'jane@example.com', 'Facebook', 'new', NULL, NULL, NULL, 'Interested in PTE', NULL, '2026-04-05 16:06:18', '2026-04-05 16:06:18', 65, 0.00, 'medium', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(27, 1, 'Sayem', '01871186562', NULL, 'Website Enquiry', 'contacted', NULL, 'PTE Academic Standard', NULL, 'Subject: Website Live Chat Enquiry\nMessage: Test from website', NULL, '2026-04-05 16:30:28', '2026-04-20 19:14:50', 55, 15000.00, 'medium', NULL, '2026-04-20 19:14:50', NULL, 1, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(28, 1, 'TEST 9688', '3223', '232@p.com', 'website', 'enrolled', NULL, 'PTE Academic Standard', NULL, '', NULL, '2026-04-05 17:06:14', '2026-04-20 19:13:23', 65, 15000.00, 'high', NULL, '2026-04-20 19:13:23', NULL, 1, NULL, NULL, 'Australia', NULL, 0.00, NULL, NULL),
(29, 1, 'gyhug', '01871186562', 'aarsayem002@gmail.com', 'website', 'new', NULL, '', NULL, '', NULL, '2026-04-05 21:59:51', '2026-05-04 19:08:29', 65, 0.00, 'high', NULL, '2026-05-04 19:08:29', NULL, 0, NULL, NULL, 'UK', NULL, 0.00, NULL, NULL),
(30, 1, 'TEST', '015654694', 'aad43@l.com', 'Facebook', 'new', NULL, 'PTE Premium', NULL, NULL, NULL, '2026-04-12 19:32:16', '2026-04-20 19:14:08', 80, 25000.00, 'high', NULL, '2026-04-20 19:14:08', NULL, 6, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(31, 1, 'TEST REF', '018711865652', 'aarsayem49032@gmail.com', 'Walk-in', 'successful', NULL, 'PTE Core', NULL, NULL, NULL, '2026-04-12 19:33:34', '2026-04-12 19:34:01', 100, 10500.00, 'medium', NULL, '2026-04-12 19:34:01', NULL, 4, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(32, 1, 'Sat TEST', '322', 'aarsayem90@gmail.com', 'Walk-in', 'successful', NULL, 'PTE Basic', NULL, NULL, NULL, '2026-04-20 18:23:51', '2026-04-20 18:24:46', 100, 5500.00, 'medium', NULL, '2026-04-20 18:24:46', NULL, 3, NULL, NULL, NULL, '', 0.00, NULL, NULL),
(33, 1, 'TEST 9699 REF', '5555', 'redowansayem73@gmail.com', 'Walk-in', 'successful', NULL, 'PTE Basic', NULL, NULL, NULL, '2026-04-20 19:09:26', '2026-04-20 19:10:53', 100, 5500.00, 'medium', NULL, '2026-04-20 19:10:53', NULL, 3, NULL, NULL, NULL, '', 0.00, NULL, NULL),
(34, 1, 'TEST 43', '433', 'df@4r.com', 'Walk-in', 'successful', NULL, 'PTE Basic', NULL, NULL, NULL, '2026-04-20 19:13:47', '2026-04-20 19:14:12', 100, 5500.00, 'medium', NULL, '2026-04-20 19:14:12', NULL, 3, NULL, NULL, NULL, '', 0.00, NULL, NULL),
(35, 1, 'Redowan', '01820444793', '4d4drrrrr@gmail.com', 'website', 'successful', NULL, NULL, NULL, 'Payment Method Initiated: demo_bkash', NULL, '2026-04-20 20:19:18', '2026-04-20 20:19:21', 0, 5500.00, 'high', NULL, NULL, NULL, 3, 4, 'PAY-DB15F5D7', NULL, NULL, 0.00, NULL, NULL),
(36, 1, 'fddas', '01820444793', 'redowansayem73@gmail.com', 'website', 'successful', NULL, NULL, NULL, 'Payment Method Initiated: bkash', NULL, '2026-04-20 20:47:00', '2026-04-20 20:47:04', 0, 5500.00, 'high', NULL, NULL, NULL, 3, 4, 'PAY-853C3A56', NULL, NULL, 0.00, NULL, NULL),
(37, 1, 'All Exclusive Collections', '4434', 'aarsayem323@gmail.com', 'website', 'fees_pending', NULL, NULL, NULL, 'Payment Method Initiated: pay_at_branch', NULL, '2026-04-20 20:52:53', '2026-04-20 20:52:56', 0, 5500.00, 'high', NULL, NULL, NULL, 3, 4, 'PAY-A4FB4397', NULL, NULL, 0.00, NULL, NULL),
(38, 1, 'test hasib', '011355', '', 'Referral', 'successful', NULL, 'PTE Basic', NULL, NULL, NULL, '2026-05-04 11:08:07', '2026-05-04 11:38:01', 85, 5500.00, 'medium', NULL, '2026-05-04 11:38:01', NULL, 3, 4, NULL, NULL, 'xyz', 2000.00, NULL, NULL),
(39, 1, 'ABDULLAH AL REDOWAN', '01871186562', 'aarsayem002@gmail.com', 'Walk-in', 'successful', NULL, 'PTE Basic', '{\"student_details\":{\"first_name\":\"ABDULLAH\",\"middle_name\":\"\",\"last_name\":\"AL REDOWAN\",\"mobile_no\":\"01871186562\",\"email\":\"aarsayem002@gmail.com\",\"date_of_birth\":\"2026-05-06\",\"course_reason\":\"study_abroad\",\"course_reason_label\":\"Study abroad\",\"preferred_country\":\"Bangladesh\",\"other_reason\":\"\",\"post_course_goal_type\":\"specific_country\",\"target_country\":\"Bangladesh\",\"english_level\":\"\"}}', NULL, NULL, '2026-05-05 07:14:05', '2026-05-05 07:44:39', 100, 5500.00, 'medium', NULL, '2026-05-05 07:44:39', NULL, 3, 4, NULL, 'Bangladesh', '', 0.00, '2026-05-06', NULL),
(40, 1, 'ABDULLAH AL REDOWAN', '01871186562', 'aarsayem002@gmail.com', 'Website Enquiry', 'new', NULL, 'IELTS Academic Masterclass', NULL, 'Subject: Campus Visit\nMessage: Like to visit campus', NULL, '2026-05-05 07:45:04', '2026-05-06 08:59:22', 70, 12000.00, 'medium', NULL, '2026-05-06 08:59:22', NULL, NULL, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(41, 1, 'ABDULLAH AL REDOWAN', '01871186562', 'aarsayem002@gmail.com', 'Website Enquiry', 'new', NULL, 'IELTS Course Enquiry', NULL, 'Subject: IELTS Course Enquiry\nMessage: dd', NULL, '2026-05-06 13:20:23', '2026-05-06 13:20:23', 70, 0.00, 'medium', NULL, '2026-05-06 13:20:23', NULL, NULL, NULL, NULL, NULL, NULL, 0.00, NULL, NULL),
(42, 8, 'Redowan Sayem Mirpur Branch', '0187118556', '2aarsayem002@gmail.com', 'Walk-in', 'successful', NULL, 'PTE BASIC 01', '{\"student_details\":{\"first_name\":\"Redowan\",\"middle_name\":\"\",\"last_name\":\"Sayem Mirpur Branch\",\"mobile_no\":\"0187118556\",\"email\":\"2aarsayem002@gmail.com\",\"date_of_birth\":\"2026-05-10\",\"course_reason\":\"\",\"course_reason_label\":\"\",\"preferred_country\":\"\",\"other_reason\":\"\",\"post_course_goal_type\":\"\",\"target_country\":\"\",\"english_level\":\"\"}}', NULL, NULL, '2026-05-09 07:32:44', '2026-05-09 07:33:29', 100, 5500.00, 'medium', NULL, '2026-05-09 07:33:29', NULL, 26, 5, NULL, NULL, '', 0.00, '2026-05-10', NULL),
(43, 8, 'Redowan Sayem', '01871186562', 'aarsayem21002@gmail.com', 'walk_in', 'successful', NULL, 'PTE BASIC 01', '{\"booking_type\":\"student_booking\",\"booking_channel\":\"kiosk\",\"branch_id\":8,\"student_details\":{\"first_name\":\"Redowan\",\"middle_name\":\"\",\"last_name\":\"Sayem\",\"mobile_no\":\"01871186562\",\"email\":\"aarsayem21002@gmail.com\",\"date_of_birth\":\"\",\"father_name\":\"\",\"mother_name\":\"\",\"nid_birth_cert\":\"\",\"current_address\":\"H9, R9, Bc\",\"permanent_address\":\"38\",\"course_reason\":\"study_abroad\",\"course_reason_label\":\"Study abroad\",\"preferred_country\":\"AU\",\"other_reason\":\"\",\"post_course_goal_type\":\"specific_country\",\"target_country\":\"AU\",\"english_level\":\"beginner\",\"educational_details\":[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}],\"employment_details\":null,\"profession\":\"\"}}', 'Student booking submitted from kiosk link\nReason: Study abroad\nPreferred country: AU\nPreferred batch: PTE MORNING', NULL, '2026-05-09 17:54:42', '2026-05-09 17:55:37', 80, 5500.00, 'high', NULL, '2026-05-09 17:55:37', NULL, 26, 5, NULL, 'AU', '', 0.00, NULL, NULL),
(44, 8, 'ABDULLAH AL GALIB', '01871186562', 'test@dfdsesxample.com', 'walk_in', 'successful', NULL, 'PTE BASIC 01', '{\"booking_type\":\"student_booking\",\"booking_channel\":\"kiosk\",\"branch_id\":8,\"student_details\":{\"first_name\":\"ABDULLAH\",\"middle_name\":\"\",\"last_name\":\"AL GALIB\",\"mobile_no\":\"01871186562\",\"email\":\"test@dfdsesxample.com\",\"date_of_birth\":\"\",\"father_name\":\"\",\"mother_name\":\"\",\"nid_birth_cert\":\"\",\"current_address\":\"H9, R9, Bc\",\"permanent_address\":\"38\",\"course_reason\":\"others\",\"course_reason_label\":\"Others\",\"preferred_country\":\"\",\"other_reason\":\"f\",\"post_course_goal_type\":\"another_purpose\",\"target_country\":\"\",\"english_level\":\"beginner\",\"educational_details\":[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}],\"employment_details\":null,\"profession\":\"\"}}', 'Student booking submitted from kiosk link\nReason: Others\nOther reason: f\nPreferred batch: PTE MORNING', NULL, '2026-05-09 18:16:21', '2026-05-09 18:17:43', 80, 5500.00, 'high', NULL, '2026-05-09 18:17:43', NULL, 26, 5, NULL, NULL, '', 0.00, NULL, NULL),
(45, 1, 'Redowan Sayem', '01871186562', 'aarsayem002@gmail.com', 'website', 'fees_pending', NULL, NULL, NULL, 'Payment Method Initiated: pay_at_branch', NULL, '2026-05-09 20:14:04', '2026-05-09 20:14:07', 0, 5500.00, 'high', NULL, NULL, NULL, 3, 4, 'PAY-F08A828A', NULL, NULL, 0.00, NULL, NULL),
(46, 1, 'ABDULLAH AL REDOWAN', '0410 807 546', 'aarsayem32S3@gmail.com', 'website', 'interested', NULL, NULL, NULL, 'Payment Method Initiated: bkash_manual\nbKash Merchant No: 01913-373581\nStudent bKash Number: 02102\nbKash Transaction ID: 55DDD', NULL, '2026-05-09 21:55:19', '2026-05-09 21:55:19', 0, 5500.00, 'high', NULL, NULL, NULL, 3, 4, 'PAY-66F47CC0', NULL, NULL, 0.00, NULL, NULL),
(47, 1, 'ABDULLAH AL REDOWAN', '0410 807 546', 'aarsayem33@gmail.com', 'website', 'fees_pending', NULL, NULL, NULL, 'Payment Method Initiated: bkash_manual\nbKash Merchant No: 01913-373581\nStudent bKash Number: 333\nbKash Transaction ID: 3DDD', NULL, '2026-05-09 21:59:15', '2026-05-09 21:59:18', 0, 5500.00, 'high', NULL, NULL, NULL, 3, 4, 'PAY-54742E75', NULL, NULL, 0.00, NULL, NULL);

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
(44, 1, 10, NULL, '2026-04-03', 'closing_submission', 'neutral', 0.00, 23500.00, 23500.00, 23500.00, 0.00, 'CLOSE-2026-04-03', NULL, NULL, 'Closing submitted for Nagad', '', 1, 1, '2026-04-03 10:00:46', '2026-04-03 10:00:46'),
(48, 1, 1, NULL, '2026-04-21', 'closing_submission', 'neutral', 0.00, 52000.00, 52000.00, 52000.00, 0.00, 'CLOSE-2026-04-21', NULL, NULL, 'Closing submitted for CASH-HQ', '', 1, 1, '2026-04-20 19:11:52', '2026-04-20 19:11:52'),
(49, 1, 1, NULL, '2026-05-04', 'closing_submission', 'neutral', 0.00, 107000.00, 107000.00, 107000.00, 0.00, 'CLOSE-2026-05-04', NULL, NULL, 'Closing submitted for CASH-HQ', '', 1, 1, '2026-05-04 11:46:15', '2026-05-04 11:46:15'),
(50, 1, 1, NULL, '2026-05-05', 'closing_submission', 'neutral', 0.00, 162500.00, 162500.00, 162000.00, -500.00, 'CLOSE-2026-05-05', NULL, NULL, 'Closing submitted for CASH-HQ', '500', 1, 1, '2026-05-04 21:43:36', '2026-05-04 21:43:36'),
(56, 8, 20, NULL, '2026-05-09', 'closing_submission', 'neutral', 0.00, 11000.00, 11000.00, 11000.00, 0.00, 'CLOSE-2026-05-09', NULL, NULL, 'Closing submitted for CASH-MIRPUR', '', 85, 85, '2026-05-09 18:01:51', '2026-05-09 18:01:51'),
(57, 8, 20, NULL, '2026-05-10', 'closing_submission', 'neutral', 0.00, -3500.00, -3500.00, -3500.00, 0.00, 'CLOSE-2026-05-10', NULL, NULL, 'Closing submitted for CASH-MIRPUR', 'extra income', 85, 1, '2026-05-09 18:10:00', '2026-05-10 14:44:43'),
(58, 1, 1, NULL, '2026-05-10', 'closing_submission', 'neutral', 0.00, 130678.00, 130678.00, 130678.00, 0.00, 'CLOSE-2026-05-10', NULL, NULL, 'Closing submitted for CASH-HQ', '', 1, 1, '2026-05-09 18:22:55', '2026-05-10 11:57:20'),
(59, 1, 1, 3, '2026-05-10', 'transfer_out', 'outflow', 10000.00, 140678.00, 130678.00, 0.00, 0.00, 'TRF-1778414164628', 'LiquidityTransfer', 'TRF-1778414164628', 'CASH-HQ -> Brack Bank', NULL, 1, 1, '2026-05-10 11:56:04', '2026-05-10 11:56:04'),
(60, 1, 3, 1, '2026-05-10', 'transfer_in', 'inflow', 10000.00, 1308700.00, 1318700.00, 0.00, 0.00, 'TRF-1778414164628', 'LiquidityTransfer', 'TRF-1778414164628', 'CASH-HQ -> Brack Bank', NULL, 1, 1, '2026-05-10 11:56:04', '2026-05-10 11:56:04'),
(61, 1, 3, NULL, '2026-05-10', 'closing_submission', 'neutral', 0.00, 1318700.00, 1318700.00, 1318700.00, 0.00, 'CLOSE-2026-05-10', NULL, NULL, 'Closing submitted for Brack Bank', '', 1, 1, '2026-05-10 11:58:14', '2026-05-10 11:58:14');

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
(9, 1, 'Jane Doe – Imported', 10, 26, 'qualification', 0.00, 20, NULL, NULL, 1, NULL, NULL, NULL, NULL, '2026-04-05 16:06:19', '2026-04-05 16:06:19'),
(10, 1, 'gyhug – Course Enquiry', 1, 29, 'qualification', 0.00, 20, NULL, NULL, NULL, NULL, NULL, NULL, '', '2026-04-05 21:59:51', '2026-04-05 21:59:51'),
(11, 1, 'TEST – PTE Core', 11, 30, 'qualification', 10500.00, 20, NULL, NULL, 1, NULL, NULL, NULL, 'PTE Core', '2026-04-12 19:32:16', '2026-04-12 19:32:16'),
(12, 1, 'TEST REF – PTE Core', 12, 31, 'qualification', 10500.00, 20, NULL, NULL, 1, NULL, NULL, NULL, 'PTE Core', '2026-04-12 19:33:34', '2026-04-12 19:33:34'),
(13, 1, 'TEST REF – PTE Core', 12, 31, 'won', 10500.00, 100, NULL, '2026-04-12 19:34:01', 1, 'Enrollment ID: 22', NULL, 27, 'PTE Core', '2026-04-12 19:33:42', '2026-04-12 19:34:01'),
(14, 1, 'Sat TEST – IELTS Academic Masterclass', 13, 32, 'qualification', 12000.00, 20, NULL, NULL, 1, NULL, NULL, NULL, 'IELTS Academic Masterclass', '2026-04-20 18:23:51', '2026-04-20 18:23:51'),
(15, 1, 'Sat TEST – PTE Basic', 13, 32, 'won', 5500.00, 100, NULL, '2026-04-20 18:24:46', 1, 'Enrollment ID: 24', NULL, 29, 'PTE Basic', '2026-04-20 18:24:32', '2026-04-20 18:24:46'),
(16, 1, 'TEST 9699 REF – PTE Core', 14, 33, 'qualification', 10500.00, 20, NULL, NULL, 1, NULL, NULL, NULL, 'PTE Core', '2026-04-20 19:09:26', '2026-04-20 19:09:26'),
(17, 1, 'TEST 9699 REF – PTE Basic', 14, 33, 'won', 5500.00, 100, NULL, '2026-04-20 19:10:53', 1, 'Enrollment ID: 25', NULL, 31, 'PTE Basic', '2026-04-20 19:09:58', '2026-04-20 19:10:53'),
(18, 1, 'TEST 43 – PTE Basic', 15, 34, 'won', 5500.00, 100, NULL, '2026-05-04 18:30:35', 1, NULL, NULL, 48, 'PTE Basic', '2026-04-20 19:13:47', '2026-05-04 18:30:35'),
(19, 1, 'TEST 43 – PTE Basic', 15, 34, 'won', 5500.00, 100, NULL, '2026-04-20 19:14:12', 1, 'Enrollment ID: 26', NULL, 32, 'PTE Basic', '2026-04-20 19:13:56', '2026-04-20 19:14:12'),
(20, 1, 'test hasib – PTE Basic', 18, 38, 'won', 5500.00, 100, NULL, '2026-05-04 18:30:34', 1, NULL, NULL, 47, 'PTE Basic', '2026-05-04 11:08:07', '2026-05-04 18:30:34'),
(21, 1, 'test hasib – PTE Basic', 19, 38, 'won', 5500.00, 100, NULL, '2026-05-04 11:38:01', 1, 'Enrollment ID: 36', NULL, 45, 'PTE Basic', '2026-05-04 11:37:20', '2026-05-04 11:38:01'),
(22, 1, 'ABDULLAH AL REDOWAN – PTE Basic', 1, 39, 'qualification', 5500.00, 20, NULL, NULL, 1, NULL, NULL, NULL, 'PTE Basic', '2026-05-05 07:14:05', '2026-05-05 07:14:05'),
(23, 1, 'ABDULLAH AL REDOWAN – PTE Basic', 1, 39, 'won', 5500.00, 100, NULL, '2026-05-05 07:44:39', 1, 'Enrollment ID: 37', NULL, 49, 'PTE Basic', '2026-05-05 07:44:26', '2026-05-05 07:44:39'),
(24, 1, 'ABDULLAH AL REDOWAN – Website Enquiry', 1, 40, 'qualification', 0.00, 20, NULL, NULL, NULL, NULL, NULL, NULL, 'Campus Visit', '2026-05-05 07:45:04', '2026-05-05 07:45:04'),
(25, 1, 'ABDULLAH AL REDOWAN – Website Enquiry', 1, 41, 'qualification', 0.00, 20, NULL, NULL, NULL, NULL, NULL, NULL, 'IELTS Course Enquiry', '2026-05-06 13:20:23', '2026-05-06 13:20:23'),
(26, 8, 'Redowan Sayem Mirpur Branch – PTE BASIC 01', 20, 42, 'won', 5500.00, 100, NULL, '2026-05-09 18:28:20', 85, NULL, NULL, 59, 'PTE BASIC 01', '2026-05-09 07:32:44', '2026-05-09 18:28:20'),
(27, 8, 'Redowan Sayem Mirpur Branch – PTE BASIC 01', 20, 42, 'won', 5500.00, 100, NULL, '2026-05-09 07:33:30', 85, 'Enrollment ID: 38', NULL, 50, 'PTE BASIC 01', '2026-05-09 07:33:10', '2026-05-09 07:33:30'),
(28, 8, 'Redowan Sayem – Student Booking', 21, 43, 'qualification', 5500.00, 20, NULL, NULL, NULL, 'Public student booking via kiosk link', NULL, NULL, 'PTE BASIC 01', '2026-05-09 17:54:43', '2026-05-09 17:54:43'),
(29, 8, 'Redowan Sayem – PTE BASIC 01', 21, 43, 'won', 5500.00, 100, NULL, '2026-05-09 17:55:38', 85, 'Enrollment ID: 39', NULL, 51, 'PTE BASIC 01', '2026-05-09 17:55:03', '2026-05-09 17:55:38'),
(30, 8, 'ABDULLAH AL GALIB – Student Booking', 21, 44, 'won', 5500.00, 100, NULL, '2026-05-09 18:27:36', NULL, 'Public student booking via kiosk link', NULL, 57, 'PTE BASIC 01', '2026-05-09 18:16:21', '2026-05-09 18:27:36'),
(31, 8, 'ABDULLAH AL GALIB – PTE BASIC 01', 22, 44, 'won', 5500.00, 100, NULL, '2026-05-09 18:17:43', 85, 'Enrollment ID: 40', NULL, 52, 'PTE BASIC 01', '2026-05-09 18:16:51', '2026-05-09 18:17:43');

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
  `status` enum('draft','pending_admin','pending_accounting','paid','rejected') DEFAULT 'draft',
  `journal_entry_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `expense_id` int(11) DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payrolls`
--

INSERT INTO `payrolls` (`id`, `staff_id`, `branch_id`, `month`, `year`, `base_salary`, `allowances`, `deductions`, `net_salary`, `status`, `journal_entry_id`, `created_at`, `updated_at`, `expense_id`, `rejection_reason`) VALUES
(1, 42, 1, 4, 2026, 20000.00, 0.00, 0.00, 20000.00, 'paid', 62, '2026-04-02 17:18:11', '2026-05-09 05:55:04', 18, NULL),
(2, 49, 1, 4, 2026, 2322.00, 0.00, 0.00, 2322.00, 'paid', 61, '2026-05-09 05:10:38', '2026-05-09 05:55:00', 19, NULL),
(3, 42, 1, 12, 2026, 20000.00, 0.00, 0.00, 20000.00, 'draft', NULL, '2026-05-09 05:22:16', '2026-05-09 05:22:16', NULL, NULL),
(4, 49, 1, 12, 2026, 2322.00, 0.00, 0.00, 2322.00, 'draft', NULL, '2026-05-09 05:22:16', '2026-05-09 05:22:16', NULL, NULL),
(5, 1, 1, 12, 2026, 25000.00, 0.00, 0.00, 25000.00, 'draft', NULL, '2026-05-09 05:22:16', '2026-05-09 05:22:16', NULL, NULL),
(6, 1, 1, 4, 2026, 25000.00, 0.00, 600.00, 24400.00, 'paid', 60, '2026-05-09 05:24:22', '2026-05-09 05:43:18', 20, NULL),
(7, 42, 1, 3, 2026, 20000.00, 0.00, 0.00, 20000.00, 'paid', 67, '2026-05-09 20:54:43', '2026-05-09 20:55:51', 23, NULL),
(8, 49, 1, 3, 2026, 2322.00, 0.00, 0.00, 2322.00, 'paid', 68, '2026-05-09 20:54:43', '2026-05-09 20:56:24', 22, NULL),
(9, 1, 1, 3, 2026, 25000.00, 0.00, 0.00, 25000.00, 'paid', 69, '2026-05-09 20:54:43', '2026-05-09 20:56:43', 21, NULL),
(10, 92, 8, 4, 2026, 25000.00, 5000.00, 10000.00, 20000.00, 'paid', 72, '2026-05-10 14:34:39', '2026-05-10 14:43:57', 24, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `payroll_bonuses`
--

CREATE TABLE `payroll_bonuses` (
  `id` int(11) NOT NULL,
  `staff_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `payroll_id` int(11) DEFAULT NULL,
  `month` int(11) NOT NULL,
  `year` int(11) NOT NULL,
  `bonus_type` enum('performance_bonus','festival_bonus','attendance_bonus','sales_bonus','manual_adjustment','other') DEFAULT 'performance_bonus',
  `source` enum('manual','performance','festival','attendance','sales') DEFAULT 'manual',
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `reason` text DEFAULT NULL,
  `status` enum('pending','approved','applied','rejected') DEFAULT 'approved',
  `created_by` int(11) DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `applied_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payroll_bonuses`
--

INSERT INTO `payroll_bonuses` (`id`, `staff_id`, `branch_id`, `payroll_id`, `month`, `year`, `bonus_type`, `source`, `amount`, `reason`, `status`, `created_by`, `approved_by`, `applied_at`, `created_at`, `updated_at`) VALUES
(1, 1, 1, NULL, 5, 2026, 'performance_bonus', 'manual', 5000.00, '', 'approved', 1, 1, NULL, '2026-05-09 20:31:56', '2026-05-09 20:31:56'),
(2, 1, 1, NULL, 4, 2026, 'performance_bonus', 'performance', 5000.00, '', 'approved', 1, 1, NULL, '2026-05-09 20:32:33', '2026-05-09 20:32:33'),
(3, 1, 1, NULL, 4, 2026, 'performance_bonus', 'performance', 5000.00, '', 'approved', 1, 1, NULL, '2026-05-09 20:32:33', '2026-05-09 20:32:33'),
(4, 92, 8, 10, 4, 2026, 'performance_bonus', 'manual', 5000.00, '', 'applied', 1, 1, '2026-05-10 14:43:57', '2026-05-10 14:34:57', '2026-05-10 14:43:57');

-- --------------------------------------------------------

--
-- Table structure for table `payroll_deductions`
--

CREATE TABLE `payroll_deductions` (
  `id` int(11) NOT NULL,
  `staff_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `payroll_id` int(11) DEFAULT NULL,
  `month` int(11) NOT NULL,
  `year` int(11) NOT NULL,
  `deduction_type` enum('loan_repayment','advance_recovery','unpaid_leave','absence','late_fine','disciplinary_fine','manual_adjustment','tax','other') DEFAULT 'other',
  `source` enum('manual','loan','attendance','fine','advance') DEFAULT 'manual',
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `reason` text DEFAULT NULL,
  `status` enum('pending','approved','applied','rejected') DEFAULT 'approved',
  `created_by` int(11) DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `applied_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payroll_deductions`
--

INSERT INTO `payroll_deductions` (`id`, `staff_id`, `branch_id`, `payroll_id`, `month`, `year`, `deduction_type`, `source`, `amount`, `reason`, `status`, `created_by`, `approved_by`, `applied_at`, `created_at`, `updated_at`) VALUES
(4, 1, 1, NULL, 5, 2026, 'loan_repayment', 'manual', 2000.00, '', 'approved', 1, 1, NULL, '2026-05-09 05:29:23', '2026-05-09 05:29:23'),
(8, 92, 8, 10, 4, 2026, 'loan_repayment', 'manual', 5000.00, '', 'applied', 1, 1, '2026-05-10 14:43:57', '2026-05-10 14:36:05', '2026-05-10 14:43:57'),
(9, 92, 8, 10, 4, 2026, 'loan_repayment', 'manual', 5000.00, '', 'applied', 1, 1, '2026-05-10 14:43:57', '2026-05-10 14:36:05', '2026-05-10 14:43:57');

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

--
-- Dumping data for table `performance_reviews`
--

INSERT INTO `performance_reviews` (`id`, `user_id`, `reviewer_id`, `branch_id`, `review_period`, `ratings`, `overall_score`, `strengths`, `improvements`, `goals`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 1, 'Q1-26', '{\"punctuality\":5,\"teamwork\":5,\"technical_skills\":3,\"communication\":3,\"initiative\":3,\"reliability\":3}', 3.7, '', '', '', 'submitted', '2026-04-08 10:08:29', '2026-04-08 10:08:29');

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
(24, 8, 1, 1, 'closing_submission', 'Closing submitted', '{\"expected\":23500}', '{\"actual\":23500,\"variance\":0,\"movement_id\":44}', '2026-04-03 10:00:47', '2026-04-03 10:00:47'),
(25, 9, 1, 1, 'closing_submission', 'nothing today', '{\"expected\":50000}', '{\"actual\":0,\"variance\":-50000,\"movement_id\":45}', '2026-04-20 18:28:21', '2026-04-20 18:28:21'),
(26, 9, 1, 1, 'closing_submission', 'Closing submitted', '{\"expected\":50000}', '{\"actual\":50000,\"variance\":0,\"movement_id\":46}', '2026-04-20 18:29:10', '2026-04-20 18:29:10'),
(27, 9, 1, 1, 'closing_submission', 'will adjust tomorrow', '{\"expected\":50000}', '{\"actual\":49500,\"variance\":-500,\"movement_id\":47}', '2026-04-20 18:29:38', '2026-04-20 18:29:38'),
(28, 9, 1, 1, 'closing_submission', 'Closing submitted', '{\"expected\":52000}', '{\"actual\":52000,\"variance\":0,\"movement_id\":48}', '2026-04-20 19:11:52', '2026-04-20 19:11:52'),
(29, 10, 1, 1, 'closing_submission', 'Closing submitted', '{\"expected\":107000}', '{\"actual\":107000,\"variance\":0,\"movement_id\":49}', '2026-05-04 11:46:15', '2026-05-04 11:46:15'),
(30, 11, 1, 1, 'closing_submission', '500', '{\"expected\":162500}', '{\"actual\":162000,\"variance\":-500,\"movement_id\":50}', '2026-05-04 21:43:36', '2026-05-04 21:43:36'),
(31, 12, 8, 85, 'closing_submission', 'Closing submitted', '{\"expected\":5500}', '{\"actual\":5500,\"variance\":0,\"movement_id\":51}', '2026-05-09 07:33:48', '2026-05-09 07:33:48'),
(32, 12, 8, 85, 'closing_submission', 'Closing submitted', '{\"expected\":5500}', '{\"actual\":5500,\"variance\":0,\"movement_id\":52}', '2026-05-09 07:33:54', '2026-05-09 07:33:54'),
(33, 12, 8, 85, 'closing_submission', 'Nothing', '{\"expected\":5500}', '{\"actual\":5500,\"variance\":0,\"movement_id\":53}', '2026-05-09 07:34:01', '2026-05-09 07:34:01'),
(34, 12, 8, 85, 'closing_submission', 'Nothing', '{\"expected\":5500}', '{\"actual\":5500,\"variance\":0,\"movement_id\":54}', '2026-05-09 07:34:09', '2026-05-09 07:34:09'),
(35, 12, 8, 1, 'closing_submission', 'Closing submitted', '{\"expected\":5500}', '{\"actual\":5500,\"variance\":0,\"movement_id\":55}', '2026-05-09 17:50:12', '2026-05-09 17:50:12'),
(36, 12, 8, 85, 'closing_submission', 'Closing submitted', '{\"expected\":11000}', '{\"actual\":11000,\"variance\":0,\"movement_id\":56}', '2026-05-09 18:01:51', '2026-05-09 18:01:51'),
(37, 13, 8, 85, 'closing_submission', 'Closing submitted', '{\"expected\":11000}', '{\"actual\":11000,\"variance\":0,\"movement_id\":57}', '2026-05-09 18:10:00', '2026-05-09 18:10:00'),
(38, 13, 8, 85, 'closing_submission', 'extra income', '{\"expected\":11000}', '{\"actual\":11500,\"variance\":500,\"movement_id\":57}', '2026-05-09 18:14:57', '2026-05-09 18:14:57'),
(39, 14, 1, 1, 'closing_submission', 'Closing submitted', '{\"expected\":115778}', '{\"actual\":115778,\"variance\":0,\"movement_id\":58}', '2026-05-09 18:22:55', '2026-05-09 18:22:55'),
(40, 13, 8, 85, 'closing_submission', 'Closing submitted', '{\"expected\":16500}', '{\"actual\":16500,\"variance\":0,\"movement_id\":57}', '2026-05-09 18:24:34', '2026-05-09 18:24:34'),
(41, 14, 1, 1, 'closing_submission', 'Closing submitted', '{\"expected\":135178}', '{\"actual\":135178,\"variance\":0,\"movement_id\":58}', '2026-05-09 20:58:28', '2026-05-09 20:58:28'),
(42, 14, 1, 1, 'closing_submission', 'Closing submitted', '{\"expected\":140678}', '{\"actual\":140678,\"variance\":0,\"movement_id\":58}', '2026-05-09 20:59:57', '2026-05-09 20:59:57'),
(43, 14, 1, 1, 'closing_submission', 'Closing submitted', '{\"expected\":140678}', '{\"actual\":140678,\"variance\":0,\"movement_id\":58}', '2026-05-10 11:55:28', '2026-05-10 11:55:28'),
(44, 14, 1, 1, 'closing_submission', 'Closing submitted', '{\"expected\":130678}', '{\"actual\":130678,\"variance\":0,\"movement_id\":58}', '2026-05-10 11:57:20', '2026-05-10 11:57:20'),
(45, 14, 1, 1, 'closing_submission', 'Closing submitted', '{\"expected\":1318700}', '{\"actual\":1318700,\"variance\":0,\"movement_id\":61}', '2026-05-10 11:58:14', '2026-05-10 11:58:14'),
(46, 13, 8, 1, 'closing_submission', 'Closing submitted', '{\"expected\":-3500}', '{\"actual\":-3500,\"variance\":0,\"movement_id\":57}', '2026-05-10 14:44:44', '2026-05-10 14:44:44');

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
(8, 8, NULL, 10, NULL, 'mfs', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'matched', NULL, 0, 0, '2026-04-03 10:00:45', '2026-04-03 10:00:46', 0.00, 23500.00, 23500.00, 0.00, '', 1, '2026-04-03 10:00:46'),
(9, 9, NULL, 1, NULL, 'cash', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'matched', NULL, 0, 0, '2026-04-20 18:28:21', '2026-04-20 19:11:52', 44500.00, 52000.00, 52000.00, 0.00, '', 1, '2026-04-20 19:11:52'),
(10, 10, NULL, 1, NULL, 'cash', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'matched', NULL, 0, 0, '2026-05-04 11:46:15', '2026-05-04 11:46:15', 52000.00, 107000.00, 107000.00, 0.00, '', 1, '2026-05-04 11:46:15'),
(11, 11, NULL, 1, NULL, 'cash', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'variance_major', NULL, 0, 0, '2026-05-04 21:43:36', '2026-05-04 21:43:36', 162500.00, 162500.00, 162000.00, -500.00, '500', 1, '2026-05-04 21:43:36'),
(12, 12, NULL, 20, NULL, 'cash', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'matched', NULL, 0, 0, '2026-05-09 07:33:48', '2026-05-09 18:01:51', 0.00, 11000.00, 11000.00, 0.00, '', 85, '2026-05-09 18:01:51'),
(13, 13, NULL, 20, NULL, 'cash', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'matched', NULL, 0, 0, '2026-05-09 18:10:00', '2026-05-10 14:44:44', 11000.00, -3500.00, -3500.00, 0.00, '', 1, '2026-05-10 14:44:44'),
(14, 14, NULL, 1, NULL, 'cash', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'matched', NULL, 0, 0, '2026-05-09 18:22:54', '2026-05-10 11:57:20', 162000.00, 130678.00, 130678.00, 0.00, '', 1, '2026-05-10 11:57:20'),
(15, 14, NULL, 3, NULL, 'bank', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'matched', NULL, 0, 0, '2026-05-10 11:58:14', '2026-05-10 11:58:14', 1328700.00, 1318700.00, 1318700.00, 0.00, '', 1, '2026-05-10 11:58:14');

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
(8, 1, '2026-04-03', 'draft', 0.00, 0.00, 0.00, 0.00, 0.00, NULL, NULL, 1, NULL, NULL, NULL, '2026-04-02 18:48:04', '2026-04-03 10:00:46'),
(9, 1, '2026-04-21', 'draft', 0.00, 0.00, 0.00, 50500.00, 0.00, NULL, NULL, 1, NULL, NULL, NULL, '2026-04-20 18:28:20', '2026-04-20 19:11:52'),
(10, 1, '2026-05-04', 'draft', 0.00, 0.00, 0.00, 0.00, 0.00, NULL, NULL, 1, NULL, NULL, NULL, '2026-05-04 11:46:15', '2026-05-04 11:46:15'),
(11, 1, '2026-05-05', 'draft', 0.00, 0.00, 0.00, 500.00, 0.00, NULL, NULL, 1, NULL, NULL, NULL, '2026-05-04 21:43:36', '2026-05-04 21:43:36'),
(12, 8, '2026-05-09', 'draft', 0.00, 0.00, 0.00, 0.00, 0.00, NULL, NULL, 85, NULL, NULL, NULL, '2026-05-09 07:33:47', '2026-05-09 18:01:51'),
(13, 8, '2026-05-10', 'draft', 0.00, 0.00, 0.00, 0.00, 0.00, NULL, NULL, 85, NULL, NULL, NULL, '2026-05-09 18:09:59', '2026-05-10 14:44:44'),
(14, 1, '2026-05-10', 'draft', 0.00, 0.00, 0.00, 0.00, 0.00, NULL, NULL, 1, NULL, NULL, NULL, '2026-05-09 18:22:54', '2026-05-10 11:58:14');

-- --------------------------------------------------------

--
-- Table structure for table `resources`
--

CREATE TABLE `resources` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `type` varchar(255) NOT NULL,
  `category` varchar(255) DEFAULT NULL,
  `level` varchar(255) DEFAULT NULL,
  `file_url` varchar(255) DEFAULT NULL,
  `external_url` varchar(255) DEFAULT NULL,
  `thumbnail_url` varchar(255) DEFAULT NULL,
  `is_free` tinyint(1) DEFAULT 1,
  `download_count` int(11) DEFAULT 0,
  `share_count` int(11) DEFAULT 0,
  `status` varchar(255) DEFAULT 'published',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

--
-- Dumping data for table `rooms`
--

INSERT INTO `rooms` (`id`, `branch_id`, `name`, `floor`, `capacity`, `facilities`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 'R-1', 'R-1', 12, '{\"\":true}', 'free', '2026-05-09 21:03:09', '2026-05-09 21:03:09');

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

--
-- Dumping data for table `room_bookings`
--

INSERT INTO `room_bookings` (`id`, `branch_id`, `room_id`, `batch_id`, `date`, `start_time`, `end_time`, `created_at`, `updated_at`) VALUES
(2, 1, 1, 4, '2026-05-10', '03:00:00', '05:00:00', '2026-05-09 21:03:44', '2026-05-09 21:03:44');

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

--
-- Dumping data for table `shifts`
--

INSERT INTO `shifts` (`id`, `branch_id`, `name`, `start_time`, `end_time`, `color`, `created_at`, `updated_at`) VALUES
(1, 1, 'MORNING', '09:00:00', '17:00:00', '#00D4FF', '2026-05-10 16:09:40', '2026-05-10 16:09:40');

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
  `method` enum('manual','biometric','qr','mobile') DEFAULT 'manual',
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `ip_address` varchar(255) DEFAULT NULL,
  `latitude` varchar(255) DEFAULT NULL,
  `longitude` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `staff_attendance`
--

INSERT INTO `staff_attendance` (`id`, `user_id`, `branch_id`, `date`, `check_in`, `check_out`, `status`, `method`, `notes`, `created_at`, `updated_at`, `ip_address`, `latitude`, `longitude`) VALUES
(1, 45, 1, '2026-04-02', '02:21:00', '02:29:00', 'present', 'manual', NULL, '2026-04-02 19:56:34', '2026-04-02 20:29:23', NULL, NULL, NULL),
(2, 1, 1, '2026-04-02', '03:19:00', NULL, 'present', 'manual', NULL, '2026-04-02 20:35:25', '2026-04-02 21:19:46', NULL, NULL, NULL),
(4, 42, 1, '2026-04-03', NULL, NULL, 'absent', 'manual', NULL, '2026-04-02 20:43:18', '2026-04-02 20:43:18', NULL, NULL, NULL),
(5, 1, 1, '2026-04-03', NULL, NULL, 'present', 'manual', 'FORGOT', '2026-04-02 20:44:57', '2026-04-02 20:44:57', NULL, NULL, NULL),
(6, 45, 1, '2026-04-03', NULL, NULL, 'present', 'manual', 'FORGOT', '2026-04-02 20:45:05', '2026-04-02 20:45:05', NULL, NULL, NULL),
(7, 47, 1, '2026-04-03', NULL, NULL, 'absent', 'manual', NULL, '2026-04-02 20:45:08', '2026-04-02 20:45:08', NULL, NULL, NULL),
(8, 46, 1, '2026-04-03', NULL, NULL, 'absent', 'manual', NULL, '2026-04-02 20:45:08', '2026-04-02 20:45:08', NULL, NULL, NULL),
(9, 49, 1, '2026-04-03', NULL, NULL, 'absent', 'manual', NULL, '2026-04-02 20:45:08', '2026-04-02 20:45:08', NULL, NULL, NULL),
(10, 1, 1, '2026-04-05', NULL, '23:58:00', 'present', 'manual', NULL, '2026-04-05 15:17:36', '2026-04-05 17:58:34', NULL, NULL, NULL),
(11, 1, 1, '2026-04-08', '16:07:00', NULL, 'present', 'manual', NULL, '2026-04-08 10:07:33', '2026-04-08 10:07:33', NULL, NULL, NULL),
(12, 42, 1, '2026-04-08', NULL, NULL, 'absent', 'manual', NULL, '2026-04-08 10:07:45', '2026-04-08 10:07:45', NULL, NULL, NULL),
(13, 1, 1, '2026-04-12', '01:21:00', NULL, 'present', 'manual', NULL, '2026-04-12 19:09:30', '2026-04-12 19:21:20', NULL, NULL, NULL),
(14, 42, 1, '2026-04-12', NULL, NULL, 'absent', 'manual', NULL, '2026-04-12 19:10:27', '2026-04-12 19:10:27', NULL, NULL, NULL),
(15, 1, 1, '2026-04-20', '00:30:00', NULL, 'present', 'manual', NULL, '2026-04-20 18:31:05', '2026-04-20 18:31:05', NULL, NULL, NULL),
(16, 1, 1, '2026-05-02', NULL, '21:46:00', 'present', 'manual', NULL, '2026-05-02 15:10:32', '2026-05-02 15:46:23', '::ffff:127.0.0.1', '23.7799', '90.3634'),
(17, 42, 1, '2026-05-02', NULL, NULL, 'absent', 'manual', NULL, '2026-05-02 15:11:38', '2026-05-02 15:11:38', '::ffff:127.0.0.1', NULL, NULL),
(18, 1, 1, '2026-05-04', NULL, '17:04:00', 'present', 'manual', NULL, '2026-05-04 09:56:32', '2026-05-04 11:51:17', '2404:1c40:1b5:9d63:51a:d5e4:afb0:80df, 2404:1c40:1b5:9d63:51a:d5e4:afb0:80df,2a02:4780:11:7::2', '23.75305210122985', '90.36858951807108'),
(19, 42, 1, '2026-05-04', NULL, NULL, 'absent', 'manual', NULL, '2026-05-04 11:51:17', '2026-05-04 11:51:17', '2404:1c40:1b5:9d63:51a:d5e4:afb0:80df, 2404:1c40:1b5:9d63:51a:d5e4:afb0:80df,2a02:4780:11:7::2', NULL, NULL),
(20, 46, 1, '2026-05-04', NULL, NULL, 'absent', 'manual', NULL, '2026-05-04 11:51:18', '2026-05-04 11:51:18', '2404:1c40:1b5:9d63:51a:d5e4:afb0:80df, 2404:1c40:1b5:9d63:51a:d5e4:afb0:80df,2a02:4780:11:7::2', NULL, NULL),
(21, 45, 1, '2026-05-04', NULL, NULL, 'absent', 'manual', NULL, '2026-05-04 11:51:18', '2026-05-04 11:51:18', '2404:1c40:1b5:9d63:51a:d5e4:afb0:80df, 2404:1c40:1b5:9d63:51a:d5e4:afb0:80df,2a02:4780:11:7::2', NULL, NULL),
(22, 47, 1, '2026-05-04', NULL, NULL, 'absent', 'manual', NULL, '2026-05-04 11:51:18', '2026-05-04 11:51:18', '2404:1c40:1b5:9d63:51a:d5e4:afb0:80df, 2404:1c40:1b5:9d63:51a:d5e4:afb0:80df,2a02:4780:11:7::2', NULL, NULL),
(23, 49, 1, '2026-05-04', NULL, NULL, 'absent', 'manual', NULL, '2026-05-04 11:51:18', '2026-05-04 11:51:18', '2404:1c40:1b5:9d63:51a:d5e4:afb0:80df, 2404:1c40:1b5:9d63:51a:d5e4:afb0:80df,2a02:4780:11:7::2', NULL, NULL),
(24, 1, 1, '2026-05-05', '12:02:22', NULL, 'present', 'mobile', NULL, '2026-05-05 06:02:22', '2026-05-05 06:02:22', '103.83.232.114, 103.83.232.114,2a02:4780:11:7::2', '23.77991503756898', '90.36295484451259'),
(25, 85, 8, '2026-05-09', '13:22:00', NULL, 'present', 'manual', NULL, '2026-05-09 07:22:19', '2026-05-09 07:22:19', '::ffff:127.0.0.1', '23.7799', '90.3634'),
(26, 85, 8, '2026-05-08', '13:22:00', '01:02:00', 'absent', 'manual', NULL, '2026-05-09 07:22:35', '2026-05-09 07:23:12', '::ffff:127.0.0.1', NULL, NULL),
(27, 1, 8, '2026-05-09', '02:21:51', '02:21:53', 'present', 'mobile', NULL, '2026-05-09 20:21:51', '2026-05-09 20:21:53', '203.89.127.134, 203.89.127.134,2a02:4780:5d:1::2', '23.779904524133173', '90.36299285180202'),
(28, 1, 8, '2026-05-10', '20:53:00', NULL, 'present', 'mobile', NULL, '2026-05-10 12:00:49', '2026-05-10 14:53:47', '::ffff:127.0.0.1', '23.7799', '90.3634'),
(29, 85, 8, '2026-05-10', NULL, NULL, 'present', 'manual', NULL, '2026-05-10 12:01:11', '2026-05-10 12:01:11', '203.89.127.134, 203.89.127.134,2a02:4780:5d:1::2', NULL, NULL),
(30, 92, 8, '2026-05-10', '21:02:39', NULL, 'present', 'mobile', NULL, '2026-05-10 15:02:39', '2026-05-10 15:02:39', '::ffff:127.0.0.1', '23.7799', '90.3634');

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
-- Table structure for table `staff_pay_rules`
--

CREATE TABLE `staff_pay_rules` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `employment_type` enum('full_time','part_time','contract','guest','permanent') DEFAULT 'full_time',
  `pay_type` enum('monthly','per_class','per_hour','per_student','manual') DEFAULT 'monthly',
  `base_salary` decimal(15,2) DEFAULT 0.00,
  `class_rate` decimal(15,2) DEFAULT 0.00,
  `hourly_rate` decimal(15,2) DEFAULT 0.00,
  `student_rate` decimal(15,2) DEFAULT 0.00,
  `is_payroll_active` tinyint(1) DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `salary_mode` enum('fixed','session_class','hourly','manual','monthly','per_class','per_hour','per_student') DEFAULT 'fixed',
  `work_shift` enum('morning','evening','both','custom') DEFAULT 'both',
  `festival_bonus` decimal(15,2) DEFAULT 0.00,
  `conveyance_fee` decimal(15,2) DEFAULT 0.00,
  `other_allowance` decimal(15,2) DEFAULT 0.00,
  `deduction` decimal(15,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `staff_pay_rules`
--

INSERT INTO `staff_pay_rules` (`id`, `user_id`, `branch_id`, `employment_type`, `pay_type`, `base_salary`, `class_rate`, `hourly_rate`, `student_rate`, `is_payroll_active`, `created_at`, `updated_at`, `salary_mode`, `work_shift`, `festival_bonus`, `conveyance_fee`, `other_allowance`, `deduction`) VALUES
(1, 1, 1, 'full_time', 'monthly', 25000.00, 0.00, 0.00, 0.00, 1, '2026-05-09 05:24:18', '2026-05-09 05:59:42', 'fixed', 'both', 0.00, 0.00, 0.00, 0.00),
(2, 90, 1, 'full_time', 'monthly', 2000.00, 0.00, 0.00, 0.00, 1, '2026-05-10 12:04:00', '2026-05-10 12:04:00', 'fixed', 'both', 0.00, 0.00, 0.00, 0.00),
(3, 92, 8, 'full_time', 'monthly', 25000.00, 0.00, 0.00, 0.00, 1, '2026-05-10 14:33:58', '2026-05-10 14:33:58', 'fixed', 'both', 0.00, 0.00, 0.00, 0.00);

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
  `department` varchar(255) DEFAULT NULL,
  `employment_status` enum('active','on_leave','notice_period','resigned','terminated','inactive','suspended') DEFAULT 'active',
  `exit_date` date DEFAULT NULL,
  `exit_reason` text DEFAULT NULL,
  `notice_start_date` date DEFAULT NULL,
  `notice_end_date` date DEFAULT NULL,
  `final_settlement_status` enum('pending','calculated','sent_to_accounting','paid') DEFAULT 'pending',
  `final_settlement_notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `staff_profiles`
--

INSERT INTO `staff_profiles` (`id`, `user_id`, `branch_id`, `designation`, `base_salary`, `bank_name`, `account_no`, `created_at`, `updated_at`, `father_name`, `mother_name`, `address`, `contact_details`, `educational_background`, `work_experience`, `joining_date`, `phone`, `emergency_contact`, `blood_group`, `nid_number`, `date_of_birth`, `gender`, `marital_status`, `profile_photo`, `reports_to`, `department`, `employment_status`, `exit_date`, `exit_reason`, `notice_start_date`, `notice_end_date`, `final_settlement_status`, `final_settlement_notes`) VALUES
(1, 42, 1, 'Trainer', 20000.00, '', '', '2026-03-27 19:22:28', '2026-03-27 19:22:28', '', '', '', '', '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', NULL, NULL, NULL, NULL, 'pending', NULL),
(2, 49, 1, 'rtre', 2322.00, '', '', '2026-04-02 17:20:14', '2026-04-02 17:20:14', '', '', '', '', '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', NULL, NULL, NULL, NULL, 'pending', NULL),
(3, 1, 1, 'Test Designation', 25000.00, 'Test Bank', '123-456-789', '2026-05-09 05:22:15', '2026-05-09 05:59:43', 'Test Father', 'Test Mother', 'Test Address', '01700000000', '[\"BSc in English, DU, 2020\",\"IELTS Trainer Cert, 2022\"]', '[\"Trainer, ABC Academy, 2021-2023\"]', '2024-01-15', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', NULL, NULL, NULL, NULL, 'pending', NULL),
(4, 90, 1, 'Accounts ', 2000.00, '', '', '2026-05-10 12:04:00', '2026-05-10 12:04:00', '', '', 'H9, R9, Bc', '', '[]', '[]', '2026-04-01', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', NULL, NULL, NULL, NULL, 'pending', NULL),
(5, 92, 8, 'AC', 25000.00, '', '', '2026-05-10 14:33:58', '2026-05-10 14:33:58', '', '', 'c/10,Eastern housing kollayanpur,,Dhaka', '', '[]', '[]', '2026-04-01', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', NULL, NULL, NULL, NULL, 'pending', NULL);

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

--
-- Dumping data for table `staff_schedules`
--

INSERT INTO `staff_schedules` (`id`, `user_id`, `shift_id`, `date`, `notes`, `created_at`, `updated_at`) VALUES
(1, 91, 1, '2026-05-10', NULL, '2026-05-10 16:09:52', '2026-05-10 16:09:52');

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
  `lead_source` enum('facebook','instagram','google','referral','walk_in','website','newspaper','event','other') DEFAULT NULL,
  `birthday_wish_last_sent_at` datetime DEFAULT NULL,
  `referred_by` varchar(255) DEFAULT NULL,
  `referral_amount` decimal(12,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`id`, `user_id`, `branch_id`, `batch_id`, `guardian_id`, `enrollment_date`, `status`, `created_at`, `updated_at`, `first_name`, `middle_name`, `last_name`, `father_name`, `mother_name`, `mobile_no`, `nid_birth_cert`, `current_address`, `permanent_address`, `passport_no`, `photograph_url`, `educational_details`, `employment_details`, `plan_type`, `premium_start_date`, `premium_expiry_date`, `active_devices`, `target_score`, `exam_date`, `post_course_goal_type`, `target_country`, `english_level`, `final_course_result`, `success_destination_country`, `success_notes`, `success_recorded_at`, `date_of_birth`, `religion`, `nationality`, `gender`, `blood_group`, `marital_status`, `emergency_contact_name`, `emergency_contact_relation`, `emergency_contact_phone`, `passport_expiry`, `visa_status`, `profession`, `lead_source`, `birthday_wish_last_sent_at`, `referred_by`, `referral_amount`) VALUES
(1, 4, 1, 1, NULL, '2026-03-24', 'active', '2026-03-24 17:31:49', '2026-03-24 17:31:49', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'free', NULL, NULL, NULL, 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(2, 5, 1, 4, NULL, '2026-03-25', 'active', '2026-03-24 18:22:35', '2026-05-05 07:44:26', 'ABDULLAH', '', 'AL REDOWAN', '', '', '01871186562', '', '', '', '', '', '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, NULL, 79, NULL, 'specific_country', 'Bangladesh', NULL, NULL, NULL, NULL, NULL, '2026-05-06', NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'walk_in', NULL, '', 0.00),
(3, 6, 1, NULL, NULL, '2026-03-27', 'active', '2026-03-27 09:03:17', '2026-03-27 09:03:17', 'Tahsin', NULL, '', NULL, NULL, '019893', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(4, 7, 1, 1, NULL, '2026-03-27', 'active', '2026-03-27 09:45:37', '2026-03-27 09:45:37', 'SAHAJ', 'AL', 'REDOWAN', 'red', 'fg', '0188334', '', '', '', '', '', '[{\"level\":\"SSC or Equivalent\",\"institution\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"level\":\"HSC or Equivalent\",\"institution\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"level\":\"Under-grad\",\"institution\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"level\":\"Post-grad\",\"institution\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', '[{\"company\":\"\",\"designation\":\"\",\"tenure\":\"\"}]', 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(5, 8, 1, 3, NULL, '2026-03-27', 'active', '2026-03-27 09:48:13', '2026-03-27 10:20:19', 'test', 'test', 'test', 'ef', 'rf', '0403', '', '', '', '', '', '[{\"level\":\"SSC or Equivalent\",\"institution\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"level\":\"HSC or Equivalent\",\"institution\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"level\":\"Under-grad\",\"institution\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"level\":\"Post-grad\",\"institution\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', '[{\"company\":\"\",\"designation\":\"\",\"tenure\":\"\"}]', 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(16, 19, 1, 1, NULL, '2026-03-27', 'active', '2026-03-27 14:43:08', '2026-03-27 14:43:08', 'TEST', NULL, '', NULL, NULL, '03', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(17, 34, 1, 1, NULL, '2026-03-27', 'active', '2026-03-27 16:58:33', '2026-03-27 16:59:12', 'TEST', NULL, 'STUDENT', '', '', '01493', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(18, 35, 1, 1, NULL, '2026-03-27', 'active', '2026-03-27 17:03:46', '2026-03-27 17:04:20', 'Abdullah', NULL, 'Al Sahaj', NULL, NULL, '034', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(19, 36, 1, 3, NULL, '2026-03-27', 'active', '2026-03-27 17:07:58', '2026-03-27 17:07:58', 'Sudha New', NULL, 'Test', '', '', '093043', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(20, 37, 1, 1, NULL, '2026-03-27', 'active', '2026-03-27 17:30:08', '2026-03-27 17:30:08', 'Tahsin', NULL, '', NULL, NULL, '0343', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(21, 38, 1, 1, NULL, '2026-03-27', 'active', '2026-03-27 17:34:17', '2026-03-27 17:34:17', 'Success', NULL, 'Student', '', '', '34333', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(22, 39, 1, 3, NULL, '2026-03-27', 'active', '2026-03-27 17:42:16', '2026-03-27 17:42:16', 'Test', NULL, 'TEST', '', '', '3432', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(23, 40, 1, 3, NULL, '2026-03-27', 'active', '2026-03-27 17:49:42', '2026-04-03 06:44:55', 'ABDULLAH AL ', NULL, 'REDOWAN', 'Mohi Uddin', 'Rahima Akter', '01871186562', '2369656', 'Kallanpur, Dhaka', 'Feni Sonagazi', 'BM25666', '/uploads/student_1775197864217_510469081_9836623169770265_4012353025184250297_n.jpg', '[{\"exam_name\":\"SSC\",\"institution_name\":\"AHA\",\"passing_year\":\"2014\",\"result\":\"TEST\"},{\"exam_name\":\"HSC\",\"institution_name\":\"BMARPC\",\"passing_year\":\"2016\",\"result\":\"TEST\"},{\"exam_name\":\"B.SC\",\"institution_name\":\"NSU\",\"passing_year\":\"2021\",\"result\":\"TEST\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, 'specific_country', 'Australia', 'intermediate', NULL, NULL, NULL, NULL, '1995-08-05', 'Islam', 'Bangladeshi', 'male', 'B+', 'married', 'Shajnen Akter', 'Spouse', '0181115555', '2026-02-01', 'pending', 'IT', 'facebook', NULL, NULL, 0.00),
(24, 41, 1, 3, NULL, '2026-03-28', 'active', '2026-03-27 18:10:26', '2026-03-27 18:10:26', 'TEST', NULL, 'TES', '', '', '43', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(25, 43, 1, 1, NULL, '2026-03-28', 'active', '2026-03-27 21:11:23', '2026-03-27 21:11:23', 'TEST', NULL, 'TEST', '', '', '343', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(26, 50, 1, 1, NULL, '2026-04-03', 'active', '2026-04-02 18:43:20', '2026-04-02 23:10:31', 'Abdullah ', NULL, 'Al Redowan', 'Mohi Uddin', 'Rahima Akter', '0156955545', '23369565', 'Dhaka', 'Feni, Sonagazi', NULL, '/uploads/student_1775170840112_CD FINAL LOGO(1).png', '[{\"exam_name\":\"SSC\",\"institution_name\":\"AHA\",\"passing_year\":\"2014\",\"result\":\"5\"},{\"exam_name\":\"HSC\",\"institution_name\":\"RIFELS\",\"passing_year\":\"2016\",\"result\":\"5\"}]', '\"IT\"', 'free', NULL, NULL, '[]', 79, NULL, 'specific_country', NULL, 'intermediate', NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(27, 51, 1, NULL, NULL, '2026-04-03', 'active', '2026-04-02 22:10:29', '2026-04-02 22:11:05', 'TEST 55', NULL, 'er', 'dfsf', 'fsd', '3343', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, 'another_purpose', NULL, 'beginner', NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(28, 52, 1, 4, NULL, '2026-04-03', 'active', '2026-04-03 06:35:15', '2026-04-03 06:35:15', 'REDOWAN ', NULL, 'SAYEM', '', '', '0155', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(29, 57, 1, 3, NULL, '2026-04-13', 'active', '2026-04-12 18:48:03', '2026-04-12 18:48:03', 'ABDULLAH AL', NULL, 'REDOWAN', 'Mohi', 'Rahami', '018565622', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(30, 58, 1, 4, NULL, '2026-04-13', 'active', '2026-04-12 19:33:41', '2026-04-12 19:37:21', 'TEST', NULL, 'REF', NULL, NULL, '018711865652', NULL, NULL, NULL, NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(31, 59, 1, 1, NULL, '2026-04-13', 'active', '2026-04-12 19:38:49', '2026-04-12 19:38:49', 'ABDULLAH AL TEST', NULL, 'REF', '', '', '01871186562', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(32, 60, 1, 4, NULL, '2026-04-13', 'active', '2026-04-12 19:43:43', '2026-04-12 19:44:47', 'ABDULLAH AL TEST', NULL, 'REDOWAN', 'dsdas', 'das', '01871186562', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(33, 61, 1, 4, NULL, '2026-04-21', 'active', '2026-04-20 18:24:32', '2026-04-20 18:24:32', 'Sat', NULL, 'TEST', NULL, NULL, '322', NULL, NULL, NULL, NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(34, 62, 1, 4, NULL, '2026-04-21', 'active', '2026-04-20 19:09:58', '2026-04-20 19:09:58', 'TEST', NULL, '9699 REF', NULL, NULL, '5555', NULL, NULL, NULL, NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(35, 63, 1, 4, NULL, '2026-04-21', 'active', '2026-04-20 19:13:56', '2026-04-20 19:13:56', 'TEST', NULL, '43', NULL, NULL, '433', NULL, NULL, NULL, NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(36, 65, 1, 3, NULL, '2026-04-21', 'active', '2026-04-20 19:33:37', '2026-04-20 19:33:37', 'ABDULLAH AL', NULL, 'REDOWAN', '', '', '01871186562', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(37, 66, 1, NULL, NULL, '2026-04-21', 'active', '2026-04-20 19:40:36', '2026-04-20 19:42:09', 'ABDULLAH AL', NULL, 'REDOWAN', '', '', '01871186562', '', '', '', '', '/uploads/student_1776714083737_ChatGPT Image Apr 20, 2026, 11_29_28 PM.png', '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '0000-00-00', '', 'Bangladeshi', '', '', '', '', '', '', '0000-00-00', '', '', 'facebook', NULL, NULL, 0.00),
(38, 67, 1, 4, NULL, '2026-04-21', 'active', '2026-04-20 19:43:00', '2026-04-20 19:45:58', 'Abdullah TST', NULL, 'Al Redowan', '', '', '01871186562', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(39, 68, 1, 4, NULL, '2026-04-21', 'active', '2026-04-20 19:44:40', '2026-04-20 19:44:40', 'ABDULLAH AL', NULL, 'rasfrsae', '', '', '01871186562', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(40, 69, 1, 3, NULL, '2026-04-21', 'active', '2026-04-20 20:15:40', '2026-04-20 20:15:40', 'Redowan', NULL, 'Sayem', '', '', '043343', '', '', '', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1995-02-01', NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(41, 70, 1, 4, NULL, '2026-04-21', 'active', '2026-04-20 20:19:21', '2026-04-20 20:22:14', 'Redowan', NULL, NULL, NULL, NULL, '01820444793', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(42, 72, 1, NULL, NULL, '2026-04-21', 'active', '2026-04-20 20:52:56', '2026-04-20 20:52:56', 'All Exclusive Collections', NULL, NULL, NULL, NULL, '4434', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00),
(43, 73, 1, 4, NULL, '2026-05-04', 'active', '2026-05-04 11:37:20', '2026-05-04 11:37:20', 'test', NULL, 'hasib', NULL, NULL, '011355', NULL, NULL, NULL, NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'xyz', 2000.00),
(47, 86, 8, 5, NULL, '2026-05-09', 'active', '2026-05-09 07:33:09', '2026-05-09 07:33:09', 'Redowan', NULL, 'Sayem Mirpur Branch', NULL, NULL, '0187118556', NULL, NULL, NULL, NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-10', NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'walk_in', NULL, NULL, 0.00),
(48, 87, 8, 5, NULL, '2026-05-09', 'active', '2026-05-09 17:55:02', '2026-05-09 17:55:02', 'Redowan', NULL, 'Sayem', NULL, NULL, '01871186562', NULL, 'H9, R9, Bc', '38', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, 'specific_country', 'AU', 'beginner', NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'walk_in', NULL, NULL, 0.00),
(49, 88, 8, 5, NULL, '2026-05-10', 'active', '2026-05-09 18:16:50', '2026-05-09 18:16:50', 'ABDULLAH', NULL, 'AL GALIB', NULL, NULL, '01871186562', NULL, 'H9, R9, Bc', '38', NULL, NULL, '[{\"exam_name\":\"SSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"},{\"exam_name\":\"HSC\",\"institution_name\":\"\",\"passing_year\":\"\",\"result\":\"\"}]', NULL, 'free', NULL, NULL, '[]', 79, NULL, 'another_purpose', NULL, 'beginner', NULL, NULL, NULL, NULL, NULL, NULL, 'Bangladeshi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'walk_in', NULL, NULL, 0.00);

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
(11, 'FB_PIXEL_ID', 'admin@renetech.com', 'Facebook Pixel ID', 0, '2026-04-05 17:00:50', '2026-05-09 04:18:41', 'facebook'),
(12, 'FB_CAPI_TOKEN', 'de4127630e425bfdcc61263b907df58f:6bb4c47424f9cb5ed8d0be914015cb82', 'Conversions API Access Token', 1, '2026-04-05 17:00:50', '2026-05-09 04:18:41', 'facebook'),
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
(42, 'BRAND_TAGLINE', 'Best PTE Centre in Dhaka, Bangladesh', 'Brand Tagline', 0, '2026-04-05 17:00:53', '2026-05-09 04:18:41', 'branding'),
(43, 'BRAND_LOGO_URL', '', 'Logo URL (light version)', 0, '2026-04-05 17:00:54', '2026-04-05 17:00:54', 'branding'),
(44, 'BRAND_LOGO_DARK_URL', '', 'Logo URL (dark version)', 0, '2026-04-05 17:00:54', '2026-04-05 17:00:54', 'branding'),
(45, 'BRAND_FAVICON_URL', '', 'Favicon URL', 0, '2026-04-05 17:00:54', '2026-04-05 17:00:54', 'branding'),
(46, 'BRAND_PRIMARY_COLOR', '#7bc62e', 'Primary Brand Color (hex)', 0, '2026-04-05 17:00:54', '2026-04-05 17:00:54', 'branding'),
(47, 'BRAND_ACCENT_COLOR', '#275fa7', 'Accent Brand Color (hex)', 0, '2026-04-05 17:00:54', '2026-04-05 17:00:54', 'branding'),
(48, 'TAWK_TO_WIDGET_ID', '', 'Tawk.to Chat Widget ID', 0, '2026-04-05 17:00:54', '2026-04-05 17:00:54', 'integrations'),
(49, 'SSLCOMMERZ_STORE_ID', '', 'SSLCommerz Store ID', 0, '2026-04-05 17:00:54', '2026-04-05 17:00:54', 'integrations'),
(50, 'SSLCOMMERZ_STORE_PASS', '', 'SSLCommerz Store Password', 1, '2026-04-05 17:00:54', '2026-04-05 17:00:54', 'integrations'),
(51, 'SSLCOMMERZ_IS_LIVE', 'false', 'SSLCommerz Live Mode (true/false)', 0, '2026-04-05 17:00:54', '2026-04-05 17:00:54', 'integrations'),
(52, 'BKASH_MERCHANT_NO', '01913-373581', 'bKash Merchant Number', 0, '2026-05-09 21:43:51', '2026-05-09 21:43:51', 'payment');

-- --------------------------------------------------------

--
-- Table structure for table `teacher_sessions`
--

CREATE TABLE `teacher_sessions` (
  `id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `course_id` int(11) DEFAULT NULL,
  `session_date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `duration_hours` decimal(8,2) DEFAULT 1.00,
  `session_type` enum('regular','trial','makeup','extra') DEFAULT 'regular',
  `pay_basis` enum('per_class','per_hour','per_student','manual') DEFAULT 'per_class',
  `status` enum('scheduled','completed','cancelled','approved') DEFAULT 'approved',
  `student_count` int(11) DEFAULT 0,
  `rate` decimal(15,2) DEFAULT 0.00,
  `amount` decimal(15,2) DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `teacher_sessions`
--

INSERT INTO `teacher_sessions` (`id`, `teacher_id`, `branch_id`, `batch_id`, `course_id`, `session_date`, `start_time`, `end_time`, `duration_hours`, `session_type`, `pay_basis`, `status`, `student_count`, `rate`, `amount`, `notes`, `approved_by`, `approved_at`, `created_at`, `updated_at`) VALUES
(4, 75, 1, NULL, NULL, '2026-05-09', NULL, NULL, 1.00, 'regular', 'per_class', 'approved', 0, 5000.00, 5000.00, '', 1, '2026-05-09 05:32:19', '2026-05-09 05:32:19', '2026-05-09 05:32:19'),
(9, 75, 1, NULL, NULL, '2026-04-09', NULL, NULL, 1.00, 'regular', 'per_class', 'approved', 0, 5000.00, 5000.00, '', 1, '2026-05-09 20:47:46', '2026-05-09 20:47:46', '2026-05-09 20:47:46'),
(10, 75, 1, NULL, NULL, '2026-04-08', NULL, NULL, 1.00, 'regular', 'per_class', 'approved', 0, 5000.00, 5000.00, '', 1, '2026-05-09 20:53:30', '2026-05-09 20:53:30', '2026-05-09 20:53:30'),
(11, 75, 1, NULL, NULL, '2026-03-09', NULL, NULL, 1.00, 'regular', 'per_class', 'approved', 0, 5000.00, 5000.00, '', 1, '2026-05-09 20:54:06', '2026-05-09 20:54:06', '2026-05-09 20:54:06');

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
(41, 1, NULL, 'MR-CUST-1775210190760', 3600.00, 'bank_transfer', '', 'success', '2026-04-03 09:56:30', 1, '2026-04-03 09:56:30', '2026-04-03 09:56:30', 'manual', 3, 25),
(42, 1, 21, NULL, 15000.00, 'cash', '', 'success', '2026-04-12 18:48:25', 1, '2026-04-12 18:48:25', '2026-04-12 18:48:25', 'pos_fee', 1, 26),
(43, 1, 22, NULL, 10500.00, 'cash', '', 'success', '2026-04-12 19:34:01', 1, '2026-04-12 19:34:01', '2026-04-12 19:34:01', 'pos_fee', 1, 27),
(44, 1, 23, NULL, 15000.00, 'cash', '', 'success', '2026-04-12 19:39:04', 1, '2026-04-12 19:39:04', '2026-04-12 19:39:04', 'pos_fee', 1, 28),
(45, 1, 24, NULL, 5500.00, 'cash', '', 'success', '2026-04-20 18:24:46', 1, '2026-04-20 18:24:46', '2026-04-20 18:24:46', 'pos_fee', 1, 29),
(46, 1, NULL, 'MR-CUST-1776710767205', 500.00, 'cash', '', 'success', '2026-04-20 18:46:07', 1, '2026-04-20 18:46:07', '2026-04-20 18:46:07', 'manual', 1, 30),
(47, 1, 25, NULL, 5500.00, 'cash', '', 'success', '2026-04-20 19:10:53', 1, '2026-04-20 19:10:53', '2026-04-20 19:10:53', 'pos_fee', 1, 31),
(48, 1, 26, NULL, 5500.00, 'cash', '', 'success', '2026-04-20 19:14:11', 1, '2026-04-20 19:14:11', '2026-04-20 19:14:11', 'pos_fee', 1, 32),
(49, 1, 27, NULL, 5500.00, 'cash', '', 'success', '2026-04-20 19:34:02', 1, '2026-04-20 19:34:02', '2026-04-20 19:34:02', 'pos_fee', 1, 33),
(50, 1, 29, NULL, 5500.00, 'cash', '', 'success', '2026-04-20 19:43:08', 1, '2026-04-20 19:43:08', '2026-04-20 19:43:08', 'pos_fee', 1, 35),
(51, 1, 30, NULL, 15000.00, 'cash', '', 'success', '2026-04-20 19:44:50', 1, '2026-04-20 19:44:50', '2026-04-20 19:44:50', 'pos_fee', 1, 36),
(52, 1, 31, NULL, 15000.00, 'cash', '', 'success', '2026-04-20 20:16:01', 1, '2026-04-20 20:16:01', '2026-04-20 20:16:01', 'pos_fee', 1, 37),
(53, 1, 32, 'REC-1776716362376', 5500.00, 'card', 'PAY-DB15F5D7', 'success', '2026-04-20 20:19:22', 70, '2026-04-20 20:19:22', '2026-04-20 20:19:22', 'website', NULL, NULL),
(54, 1, 33, 'REC-1776718024507', 5500.00, 'bkash', 'PAY-853C3A56', 'success', '2026-04-20 20:47:04', 62, '2026-04-20 20:47:04', '2026-04-20 20:47:04', 'website', 9, NULL),
(55, 1, 34, 'REC-1776718024559', 5500.00, 'bkash', 'PAY-853C3A56', 'success', '2026-04-20 20:47:04', 62, '2026-04-20 20:47:04', '2026-04-20 20:47:04', 'website', 9, NULL),
(56, 1, 35, NULL, 5500.00, 'cash', '', 'success', '2026-04-20 20:54:44', 1, '2026-04-20 20:54:44', '2026-04-20 20:54:44', 'pos_fee', 1, 41),
(57, 1, NULL, 'MR-CUST-1776718821280', 500.00, 'cash', '', 'success', '2026-04-20 21:00:21', 1, '2026-04-20 21:00:21', '2026-04-20 21:00:21', 'manual', 1, 42),
(58, 1, NULL, 'MR-CUST-1776719315834', 500.00, 'cash', '', 'success', '2026-04-20 21:08:35', 1, '2026-04-20 21:08:35', '2026-04-20 21:08:35', 'manual', 1, 43),
(59, 1, NULL, 'MR-CUST-1776719381564', 500.00, 'cash', '', 'success', '2026-04-20 21:09:41', 1, '2026-04-20 21:09:41', '2026-04-20 21:09:41', 'manual', 1, 44),
(60, 1, 36, NULL, 5500.00, 'cash', '', 'success', '2026-05-04 11:38:01', 1, '2026-05-04 11:38:01', '2026-05-04 11:38:01', 'pos_fee', 1, 45),
(61, 1, NULL, 'MR-CUST-1777894944379', 50000.00, 'cash', '', 'success', '2026-05-04 11:42:24', 1, '2026-05-04 11:42:24', '2026-05-04 11:42:24', 'manual', 1, 46),
(62, 1, NULL, 'MR-CUST-1777964405979', 5500.00, 'cash', '', 'success', '2026-05-05 07:00:05', 1, '2026-05-05 07:00:05', '2026-05-05 07:00:05', 'manual', 1, 47),
(63, 1, NULL, 'MR-CUST-1777964412321', 5500.00, 'cash', '', 'success', '2026-05-05 07:00:12', 1, '2026-05-05 07:00:12', '2026-05-05 07:00:12', 'manual', 1, 48),
(64, 1, 37, NULL, 5500.00, 'cash', '', 'success', '2026-05-05 07:44:39', 1, '2026-05-05 07:44:39', '2026-05-05 07:44:39', 'pos_fee', 1, 49),
(65, 8, 38, NULL, 5500.00, 'cash', '', 'success', '2026-05-09 07:33:29', 85, '2026-05-09 07:33:29', '2026-05-09 07:33:29', 'pos_fee', 20, 50),
(66, 8, 39, NULL, 5500.00, 'cash', '', 'success', '2026-05-09 17:55:37', 85, '2026-05-09 17:55:37', '2026-05-09 17:55:37', 'pos_fee', 20, 51),
(67, 8, 40, NULL, 5500.00, 'cash', '', 'success', '2026-05-09 18:17:43', 85, '2026-05-09 18:17:43', '2026-05-09 18:17:43', 'pos_fee', 20, 52),
(68, 1, NULL, 'MR-CUST-1778350943656', 500.00, 'cash', '', 'success', '2026-05-09 18:22:23', 1, '2026-05-09 18:22:23', '2026-05-09 18:22:23', 'manual', 1, 53),
(69, 1, 41, NULL, 5500.00, 'cash', '', 'success', '2026-05-09 20:59:09', 1, '2026-05-09 20:59:10', '2026-05-09 20:59:10', 'pos_fee', 1, 60),
(70, 1, 42, NULL, 5500.00, 'bkash', '3DDD', 'success', '2026-05-09 22:00:50', 1, '2026-05-09 22:00:50', '2026-05-09 22:00:50', 'pos_fee', 9, 61);

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
(5, 1, 'ABDULLAH AL REDOWAN', 'aarsayem002@gmail.com', '$2b$10$CebY7.wTGVRSgpbvvUGpgeX8TxeehE.fwF8A6NoxqhnoBqLbHnKVK', 'student', 'active', 0, NULL, '2026-03-24 18:22:35', '2026-05-05 07:44:26'),
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
(55, 5, 'Sayem', 'aarsayem@gmail.com', '$2b$10$bgAfP1yaGstAo5tKTo/uB.RMV7FRjrvHO.jokdiII.Zk1XJtdec8a', 'branch_admin', 'inactive', 0, NULL, '2026-04-05 17:56:46', '2026-04-05 18:01:50'),
(57, 1, 'ABDULLAH AL REDOWAN', 'aarsayem33@gmail.com', '$2b$10$2Dmd4FN9stuhugyO3xQ2u.jxCV/Fu7cruOnS3aAqVSPqF7ZtyYtJW', 'student', 'active', 0, NULL, '2026-04-12 18:48:02', '2026-04-12 18:48:02'),
(58, 1, 'TEST REF', 'aarsayem49032@gmail.com', '$2b$10$XVeQ2Cp3PbCvfOJ.NThHbuwPR1YpPAfI7lah0ga2G8uRk.1W.9.fK', 'student', 'active', 0, NULL, '2026-04-12 19:33:41', '2026-04-12 19:33:41'),
(59, 1, 'ABDULLAH AL TEST REF', 'admin3222@investtrack.pro', '$2b$10$1B.MZzKmiGgiGVv/Q0Pp7OnkEpg9ll0sx.2gPbLfZ5QH/NSpimrqa', 'student', 'active', 0, NULL, '2026-04-12 19:38:49', '2026-04-12 19:38:49'),
(60, 1, 'ABDULLAH AL TEST REDOWAN', '3ee.au@ds.com', '$2b$10$un8UNHTTWGeRP6ZsOkiRJe2/q1eutXWoP0dGFPevH/gEXj/7WiLDe', 'student', 'active', 0, NULL, '2026-04-12 19:43:43', '2026-04-12 19:43:43'),
(61, 1, 'Sat TEST', 'aarsayem90@gmail.com', '$2b$10$34V9/ADV1P3rtD0wbkRoeOHQkJEmTejASYOPdfgOUNpdWgo0IygTq', 'student', 'active', 0, NULL, '2026-04-20 18:24:31', '2026-04-20 18:24:31'),
(62, 1, 'TEST 9699 REF', 'redowansayem73@gmail.com', '$2b$10$2KveAft5Q7XrivDZEG9JpOdNlxUfaNw3kXm38hyUWgvqNOURZDKki', 'student', 'active', 0, NULL, '2026-04-20 19:09:57', '2026-04-20 19:09:57'),
(63, 1, 'TEST 43', 'df@4r.com', '$2b$10$KQpMAJ8dF1NJWbvrSP5Rt.T2yR9ks7qtDHqynNEOAcczthIz9LWV.', 'student', 'active', 0, NULL, '2026-04-20 19:13:56', '2026-04-20 19:13:56'),
(65, 1, 'ABDULLAH AL REDOWAN', 'aarsayem3002@gmail.com', '$2b$10$qioAyJO7n3Rw1wxkb9JJm.f27Xuk1H0Rac/lwJwYd.VF5EC3McDGi', 'student', 'active', 0, NULL, '2026-04-20 19:33:37', '2026-04-20 19:33:37'),
(66, 1, 'ABDULLAH AL REDOWAN', 'admin3333@investtrack.pro', '$2b$10$ObwB/F19mnTW4oP/jUpzd.1fy2X7yPnwnWIplznjQK5b03Jd33BlO', 'student', 'active', 0, NULL, '2026-04-20 19:40:36', '2026-04-20 19:40:36'),
(67, 1, 'Abdullah TST Al Redowan', 'admin@4rrclovertonhomes.com.au', '$2b$10$05VQXbBdToVhgCzSm7J0aeRrU8IxorMEzZ7sHRA1ZPbRkfvzkeQRe', 'student', 'active', 0, NULL, '2026-04-20 19:43:00', '2026-04-20 19:43:00'),
(68, 1, 'ABDULLAH AL rasfrsae', 'aarsaye3333m002@gmail.com', '$2b$10$kEipgtOR9vfKNHpAQ0822u/oWalAEcSgppK7vSZqGR8v6Jl4EMknS', 'student', 'active', 0, NULL, '2026-04-20 19:44:40', '2026-04-20 19:44:40'),
(69, 1, 'Redowan Sayem', 'test@dfdsexample.com', '$2b$10$i9OVgtLCau7kFTzN71CMCeN7w22kS4hKW/WT2pLwiW1R1iv.9eZZ6', 'student', 'active', 0, NULL, '2026-04-20 20:15:40', '2026-04-20 20:15:40'),
(70, 1, 'Redowan', '4d4drrrrr@gmail.com', '$2b$10$JtLx5W0rc4N870gJwBHZxe/qeMveYh/5LB0/wm8fSsi4OwSvgcz0K', 'student', 'active', 0, NULL, '2026-04-20 20:19:21', '2026-04-20 20:19:21'),
(72, 1, 'All Exclusive Collections', 'aarsayem323@gmail.com', '$2b$10$lASZKGI2xa8tVSumm.K77eX2xED6oE8rKv5KE.TCRJJ.8/PR1tp3.', 'student', 'active', 0, NULL, '2026-04-20 20:52:56', '2026-04-20 20:52:56'),
(73, 1, 'test hasib', 'lead-38@languageacademy.local', '$2b$10$BcyRNkGOo4LjtNwe/NedW.mvEF/nV29mezQsxoNzGHeABUhm4UvFu', 'student', 'active', 0, NULL, '2026-05-04 11:37:20', '2026-05-04 11:37:20'),
(74, 1, 'QA Admin', 'qa.admin@languageacademy.test', '$2b$12$IQAwpko6ydiGjZIqqyJKyOeMW2Mg9qJ5iLrLh3P/G1dbB/XBTA.Ne', 'branch_admin', 'active', 0, NULL, '2026-05-09 04:03:38', '2026-05-09 04:03:38'),
(75, 1, 'QA Teacher', 'qa.teacher@languageacademy.test', '$2b$12$yrroTt2hJLLYiTOPORuqhuW0hWLmIXm8NG3aTlHl1WgLecxUJs.he', 'trainer', 'active', 0, NULL, '2026-05-09 04:03:39', '2026-05-09 04:03:39'),
(76, 1, 'QA Accounts', 'qa.accounts@languageacademy.test', '$2b$12$CYHWpcLM/ZunllqG.h1vbOPZpkISt58nMP5bHOOWDAzQFsYGjgzgm', 'accounts', 'active', 0, NULL, '2026-05-09 04:03:39', '2026-05-09 04:03:39'),
(77, 1, 'QA HR', 'qa.hr@languageacademy.test', '$2b$12$h1PKC/7ZHL1OyWnbU5BhrOK.0ISTHOOn17gb.3w5Ai1xSvlru7mY2', 'hr', 'active', 0, NULL, '2026-05-09 04:03:39', '2026-05-09 04:03:39'),
(78, 1, 'QA CRM', 'qa.crm@languageacademy.test', '$2b$12$VS6ZNjfU.rLf7pAnEE4qieej1oxCJzN9dvxiLMa2D99QL6ooim2ui', 'counselor', 'active', 0, NULL, '2026-05-09 04:03:40', '2026-05-09 04:03:40'),
(85, 8, 'Sayem', 'sayemredowan7@gmail.com', '$2b$12$jVSc9Qddgro8oonQmATQNuX4zaeVAnM3vOju/dZrPNweGkus/nrq6', 'branch_admin', 'active', 0, NULL, '2026-05-09 07:19:59', '2026-05-10 15:02:13'),
(86, 8, 'Redowan Sayem Mirpur Branch', '2aarsayem002@gmail.com', '$2b$10$w14hZam0ufVWUBFTRZ9ne.N3iNXxkRtrQgU3z6W/37O2sSg5nbBI6', 'student', 'active', 0, NULL, '2026-05-09 07:33:09', '2026-05-09 07:33:09'),
(87, 8, 'Redowan Sayem', 'aarsayem21002@gmail.com', '$2b$10$433xwnNS9Oc2pb.cus17dOt1say6rDMayBX1YgxaMEouQMAC2ka7u', 'student', 'active', 0, NULL, '2026-05-09 17:55:02', '2026-05-09 17:55:02'),
(88, 8, 'ABDULLAH AL GALIB', 'test@dfdsesxample.com', '$2b$10$ejeR57qYtPWO9YoHIM/Xv.l9PQHjDrCowCWEpTqigdOPKYrvqh6xa', 'student', 'active', 0, NULL, '2026-05-09 18:16:50', '2026-05-09 18:16:50'),
(89, 1, 'ABDULLAH AL GALIB', 'test76@gmail.com', '$2b$12$V84GUmRnp3UXGA9rNMUrj.MNL.MNlrI1xrf8AmB2vClapUxPIbl0S', 'branch_admin', 'active', 0, NULL, '2026-05-10 12:03:02', '2026-05-10 12:03:02'),
(90, 1, 'ABDULLAH AL GALIB', 'test893@gmail.com', '$2b$12$Tdl7JvrMRAy.ik1T2qTaku4r1YHU7.tHVhDn8Dboxw5PJbzRqfeXC', 'accounts', 'active', 0, NULL, '2026-05-10 12:03:59', '2026-05-10 12:03:59'),
(91, 1, 'ABDULLAH AL GALIB', 'test878@gmail.com', '$2b$12$I6G4XWC/ECGqUyaiGxQXx.oXBvMC/bDu6H61IGU4zsP2hY4dzkH56', 'accounts', 'active', 0, NULL, '2026-05-10 12:05:19', '2026-05-10 12:05:19'),
(92, 8, 'TEST MIRPUR', 'aarsayem00322@gmail.com', '$2b$12$fIq.SNmWoD22jFZ.tb/RV..KrOBX5LzDRTF.oFLB9VC6aXw68eO4e', 'accounts', 'active', 0, NULL, '2026-05-10 14:33:57', '2026-05-10 14:57:38');

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
  ADD UNIQUE KEY `slug_6` (`slug`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `author_id` (`author_id`);

--
-- Indexes for table `blog_resources`
--
ALTER TABLE `blog_resources`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `blog_resources_resource_id_blog_post_id_unique` (`blog_post_id`,`resource_id`),
  ADD KEY `resource_id` (`resource_id`);

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
  ADD UNIQUE KEY `code_10` (`code`),
  ADD UNIQUE KEY `code_11` (`code`),
  ADD UNIQUE KEY `branches_slug_unique` (`slug`);

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
-- Indexes for table `payroll_bonuses`
--
ALTER TABLE `payroll_bonuses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `payroll_id` (`payroll_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `payroll_bonuses_staff_id_month_year` (`staff_id`,`month`,`year`),
  ADD KEY `payroll_bonuses_branch_id_month_year` (`branch_id`,`month`,`year`);

--
-- Indexes for table `payroll_deductions`
--
ALTER TABLE `payroll_deductions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `payroll_id` (`payroll_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `payroll_deductions_staff_id_month_year` (`staff_id`,`month`,`year`),
  ADD KEY `payroll_deductions_branch_id_month_year` (`branch_id`,`month`,`year`);

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
  ADD UNIQUE KEY `recon_session_branch_date_unique` (`branch_id`,`recon_date`),
  ADD UNIQUE KEY `ux_reconciliation_sessions_branch_date` (`branch_id`,`recon_date`),
  ADD KEY `prepared_by` (`prepared_by`),
  ADD KEY `reviewed_by` (`reviewed_by`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `resources`
--
ALTER TABLE `resources`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `branch_id` (`branch_id`);

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
-- Indexes for table `staff_pay_rules`
--
ALTER TABLE `staff_pay_rules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `branch_id` (`branch_id`);

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
  ADD UNIQUE KEY `setting_key_32` (`setting_key`),
  ADD UNIQUE KEY `setting_key_33` (`setting_key`),
  ADD UNIQUE KEY `setting_key_34` (`setting_key`),
  ADD UNIQUE KEY `setting_key_35` (`setting_key`),
  ADD UNIQUE KEY `setting_key_36` (`setting_key`),
  ADD UNIQUE KEY `setting_key_37` (`setting_key`),
  ADD UNIQUE KEY `setting_key_38` (`setting_key`),
  ADD UNIQUE KEY `setting_key_39` (`setting_key`),
  ADD UNIQUE KEY `setting_key_40` (`setting_key`),
  ADD UNIQUE KEY `setting_key_41` (`setting_key`),
  ADD UNIQUE KEY `setting_key_42` (`setting_key`),
  ADD UNIQUE KEY `setting_key_43` (`setting_key`),
  ADD UNIQUE KEY `setting_key_44` (`setting_key`),
  ADD UNIQUE KEY `setting_key_45` (`setting_key`),
  ADD UNIQUE KEY `setting_key_46` (`setting_key`),
  ADD UNIQUE KEY `setting_key_47` (`setting_key`),
  ADD UNIQUE KEY `setting_key_48` (`setting_key`),
  ADD UNIQUE KEY `setting_key_49` (`setting_key`),
  ADD UNIQUE KEY `setting_key_50` (`setting_key`),
  ADD UNIQUE KEY `setting_key_51` (`setting_key`),
  ADD UNIQUE KEY `setting_key_52` (`setting_key`),
  ADD UNIQUE KEY `setting_key_53` (`setting_key`),
  ADD UNIQUE KEY `setting_key_54` (`setting_key`),
  ADD UNIQUE KEY `setting_key_55` (`setting_key`),
  ADD UNIQUE KEY `setting_key_56` (`setting_key`),
  ADD UNIQUE KEY `setting_key_57` (`setting_key`),
  ADD UNIQUE KEY `setting_key_58` (`setting_key`),
  ADD UNIQUE KEY `setting_key_59` (`setting_key`),
  ADD UNIQUE KEY `setting_key_60` (`setting_key`),
  ADD UNIQUE KEY `setting_key_61` (`setting_key`),
  ADD UNIQUE KEY `setting_key_62` (`setting_key`),
  ADD UNIQUE KEY `setting_key_63` (`setting_key`);

--
-- Indexes for table `teacher_sessions`
--
ALTER TABLE `teacher_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `batch_id` (`batch_id`),
  ADD KEY `course_id` (`course_id`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `teacher_sessions_teacher_id_session_date` (`teacher_id`,`session_date`),
  ADD KEY `teacher_sessions_branch_id_session_date` (`branch_id`,`session_date`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `applicants`
--
ALTER TABLE `applicants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `assets`
--
ALTER TABLE `assets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=129;

--
-- AUTO_INCREMENT for table `automation_rules`
--
ALTER TABLE `automation_rules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=60;

--
-- AUTO_INCREMENT for table `bank_account_ledger_maps`
--
ALTER TABLE `bank_account_ledger_maps`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `batches`
--
ALTER TABLE `batches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `blog_posts`
--
ALTER TABLE `blog_posts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `blog_resources`
--
ALTER TABLE `blog_resources`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `branches`
--
ALTER TABLE `branches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `budgets`
--
ALTER TABLE `budgets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `campaign_templates`
--
ALTER TABLE `campaign_templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `contacts`
--
ALTER TABLE `contacts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `courses`
--
ALTER TABLE `courses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `crm_activities`
--
ALTER TABLE `crm_activities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `enrollments`
--
ALTER TABLE `enrollments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `expense_categories`
--
ALTER TABLE `expense_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `income_categories`
--
ALTER TABLE `income_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=62;

--
-- AUTO_INCREMENT for table `job_postings`
--
ALTER TABLE `job_postings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `journal_entries`
--
ALTER TABLE `journal_entries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=75;

--
-- AUTO_INCREMENT for table `journal_lines`
--
ALTER TABLE `journal_lines`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=161;

--
-- AUTO_INCREMENT for table `leads`
--
ALTER TABLE `leads`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=62;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `payrolls`
--
ALTER TABLE `payrolls`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `payroll_bonuses`
--
ALTER TABLE `payroll_bonuses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `payroll_deductions`
--
ALTER TABLE `payroll_deductions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `performance_reviews`
--
ALTER TABLE `performance_reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- AUTO_INCREMENT for table `reconciliation_lines`
--
ALTER TABLE `reconciliation_lines`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `reconciliation_sessions`
--
ALTER TABLE `reconciliation_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `resources`
--
ALTER TABLE `resources`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `rooms`
--
ALTER TABLE `rooms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `room_bookings`
--
ALTER TABLE `room_bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `shifts`
--
ALTER TABLE `shifts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `staff_attendance`
--
ALTER TABLE `staff_attendance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `staff_documents`
--
ALTER TABLE `staff_documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `staff_pay_rules`
--
ALTER TABLE `staff_pay_rules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `staff_profiles`
--
ALTER TABLE `staff_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `staff_schedules`
--
ALTER TABLE `staff_schedules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=50;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

--
-- AUTO_INCREMENT for table `teacher_sessions`
--
ALTER TABLE `teacher_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=71;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=93;

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
  ADD CONSTRAINT `bank_account_ledger_maps_ibfk_547` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `bank_account_ledger_maps_ibfk_548` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `bank_account_ledger_maps_ibfk_549` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `batches`
--
ALTER TABLE `batches`
  ADD CONSTRAINT `batches_ibfk_179` FOREIGN KEY (`trainer_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `batches_ibfk_218` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `batches_ibfk_219` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `blog_posts`
--
ALTER TABLE `blog_posts`
  ADD CONSTRAINT `blog_posts_ibfk_11` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `blog_posts_ibfk_12` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `blog_resources`
--
ALTER TABLE `blog_resources`
  ADD CONSTRAINT `blog_resources_ibfk_1` FOREIGN KEY (`blog_post_id`) REFERENCES `blog_posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `blog_resources_ibfk_2` FOREIGN KEY (`resource_id`) REFERENCES `resources` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
  ADD CONSTRAINT `campaign_templates_ibfk_395` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `campaign_templates_ibfk_396` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

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
  ADD CONSTRAINT `crm_activities_ibfk_479` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `crm_activities_ibfk_480` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `crm_activities_ibfk_481` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `customers`
--
ALTER TABLE `customers`
  ADD CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `enrollments`
--
ALTER TABLE `enrollments`
  ADD CONSTRAINT `enrollments_ibfk_574` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `enrollments_ibfk_575` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `enrollments_ibfk_576` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `expenses_ibfk_907` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `expenses_ibfk_908` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `expenses_ibfk_909` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `expenses_ibfk_910` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `expenses_ibfk_911` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `expense_categories`
--
ALTER TABLE `expense_categories`
  ADD CONSTRAINT `expense_categories_ibfk_411` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `expense_categories_ibfk_412` FOREIGN KEY (`parent_id`) REFERENCES `expense_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `income_categories`
--
ALTER TABLE `income_categories`
  ADD CONSTRAINT `income_categories_ibfk_199` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `income_categories_ibfk_200` FOREIGN KEY (`parent_id`) REFERENCES `income_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

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
  ADD CONSTRAINT `job_postings_ibfk_233` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `job_postings_ibfk_234` FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

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
  ADD CONSTRAINT `journal_lines_ibfk_385` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `journal_lines_ibfk_386` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `leads`
--
ALTER TABLE `leads`
  ADD CONSTRAINT `leads_ibfk_350` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `leads_ibfk_351` FOREIGN KEY (`counselor_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `leave_balances`
--
ALTER TABLE `leave_balances`
  ADD CONSTRAINT `leave_balances_ibfk_233` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `leave_balances_ibfk_234` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `leave_requests`
--
ALTER TABLE `leave_requests`
  ADD CONSTRAINT `leave_requests_ibfk_346` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `leave_requests_ibfk_347` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `leave_requests_ibfk_348` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `leave_requests_ibfk_349` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `liquidity_movements`
--
ALTER TABLE `liquidity_movements`
  ADD CONSTRAINT `liquidity_movements_ibfk_846` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `liquidity_movements_ibfk_847` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `liquidity_movements_ibfk_848` FOREIGN KEY (`related_account_id`) REFERENCES `accounts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `liquidity_movements_ibfk_849` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `liquidity_movements_ibfk_850` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

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
  ADD CONSTRAINT `opportunities_ibfk_375` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `opportunities_ibfk_376` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `payrolls`
--
ALTER TABLE `payrolls`
  ADD CONSTRAINT `payrolls_ibfk_22` FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `payrolls_ibfk_23` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `payrolls_ibfk_24` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `payroll_bonuses`
--
ALTER TABLE `payroll_bonuses`
  ADD CONSTRAINT `payroll_bonuses_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `payroll_bonuses_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `payroll_bonuses_ibfk_3` FOREIGN KEY (`payroll_id`) REFERENCES `payrolls` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `payroll_bonuses_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `payroll_bonuses_ibfk_5` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `payroll_deductions`
--
ALTER TABLE `payroll_deductions`
  ADD CONSTRAINT `payroll_deductions_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `payroll_deductions_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `payroll_deductions_ibfk_3` FOREIGN KEY (`payroll_id`) REFERENCES `payrolls` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `payroll_deductions_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `payroll_deductions_ibfk_5` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `performance_reviews`
--
ALTER TABLE `performance_reviews`
  ADD CONSTRAINT `performance_reviews_ibfk_349` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `performance_reviews_ibfk_350` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `performance_reviews_ibfk_351` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

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
  ADD CONSTRAINT `reconciliation_events_ibfk_550` FOREIGN KEY (`session_id`) REFERENCES `reconciliation_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `reconciliation_events_ibfk_551` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `reconciliation_events_ibfk_552` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `reconciliation_lines`
--
ALTER TABLE `reconciliation_lines`
  ADD CONSTRAINT `reconciliation_lines_ibfk_728` FOREIGN KEY (`session_id`) REFERENCES `reconciliation_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `reconciliation_lines_ibfk_729` FOREIGN KEY (`mapping_id`) REFERENCES `bank_account_ledger_maps` (`id`),
  ADD CONSTRAINT `reconciliation_lines_ibfk_730` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `reconciliation_lines_ibfk_731` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `reconciliation_sessions`
--
ALTER TABLE `reconciliation_sessions`
  ADD CONSTRAINT `reconciliation_sessions_ibfk_725` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `reconciliation_sessions_ibfk_726` FOREIGN KEY (`prepared_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `reconciliation_sessions_ibfk_727` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `reconciliation_sessions_ibfk_728` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `resources`
--
ALTER TABLE `resources`
  ADD CONSTRAINT `resources_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

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
  ADD CONSTRAINT `staff_attendance_ibfk_233` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `staff_attendance_ibfk_234` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `staff_documents`
--
ALTER TABLE `staff_documents`
  ADD CONSTRAINT `staff_documents_ibfk_233` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `staff_documents_ibfk_234` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `staff_documents_ibfk_235` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `staff_pay_rules`
--
ALTER TABLE `staff_pay_rules`
  ADD CONSTRAINT `staff_pay_rules_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `staff_pay_rules_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `staff_profiles`
--
ALTER TABLE `staff_profiles`
  ADD CONSTRAINT `staff_profiles_ibfk_249` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `staff_profiles_ibfk_250` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `staff_profiles_ibfk_251` FOREIGN KEY (`reports_to`) REFERENCES `users` (`id`);

--
-- Constraints for table `staff_schedules`
--
ALTER TABLE `staff_schedules`
  ADD CONSTRAINT `staff_schedules_ibfk_233` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `staff_schedules_ibfk_234` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `students_ibfk_601` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `students_ibfk_602` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `students_ibfk_603` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `students_ibfk_604` FOREIGN KEY (`guardian_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `teacher_sessions`
--
ALTER TABLE `teacher_sessions`
  ADD CONSTRAINT `teacher_sessions_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `teacher_sessions_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `teacher_sessions_ibfk_3` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `teacher_sessions_ibfk_4` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `teacher_sessions_ibfk_5` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_221` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `transactions_ibfk_222` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `transactions_ibfk_477` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `transactions_ibfk_478` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
