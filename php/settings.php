<?php
require_once 'config.php';
session_start();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Get current interview time setting
    $action = $_GET['action'] ?? 'get_interview_time';

    if ($action === 'get_interview_time') {
        $conn = getDBConnection();

        // Create settings table if it doesn't exist
        $sql = "CREATE TABLE IF NOT EXISTS settings (
            id INT(1) PRIMARY KEY DEFAULT 1,
            interview_time_minutes INT(3) NOT NULL DEFAULT 30,
            exam_status BOOLEAN NOT NULL DEFAULT TRUE,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )";

        $conn->query($sql);

        // Get the setting
        $result = $conn->query("SELECT interview_time_minutes, exam_status FROM settings WHERE id = 1");

        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            echo json_encode(['success' => true, 'interview_time' => (int) $row['interview_time_minutes'], 'exam_status' => (bool) $row['exam_status']]);
        } else {
            // Initialize with default value
            $conn->query("INSERT INTO settings (id, interview_time_minutes, exam_status) VALUES (1, 30, TRUE) ON DUPLICATE KEY UPDATE interview_time_minutes=30, exam_status=TRUE");
            echo json_encode(['success' => true, 'interview_time' => 30, 'exam_status' => true]);
        }

        $conn->close();
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Check if user is admin
    if (!isset($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    $action = $_POST['action'] ?? '';

    if ($action === 'update_interview_time') {
        $time = (int) ($_POST['time'] ?? 0);
        $exam_status = filter_var($_POST['exam_status'] ?? true, FILTER_VALIDATE_BOOLEAN);

        // Validate time
        if ($time < 5 || $time > 120) {
            echo json_encode(['success' => false, 'message' => 'Interview time must be between 5 and 120 minutes']);
            exit;
        }

        $conn = getDBConnection();

        // Update or insert the setting
        $sql = "INSERT INTO settings (id, interview_time_minutes, exam_status) VALUES (1, ?, ?) 
                ON DUPLICATE KEY UPDATE interview_time_minutes = VALUES(interview_time_minutes), exam_status = VALUES(exam_status)";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param('ii', $time, $exam_status);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Interview settings updated', 'interview_time' => $time, 'exam_status' => $exam_status]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update interview time']);
        }

        $stmt->close();
        $conn->close();
        exit;
    }
}

echo json_encode(['success' => false, 'message' => 'Invalid request']);
?>