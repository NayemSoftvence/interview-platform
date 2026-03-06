<?php
// Start output buffering to prevent any accidental output
ob_start();

// Suppress PHP warnings/notices that might corrupt JSON output
error_reporting(E_ERROR | E_PARSE);

require_once 'config.php';
session_start();

// Clean any previous output
ob_clean();

header('Content-Type: application/json');

function ensureSettingsColumns($conn)
{
    @$conn->query("ALTER TABLE settings ADD COLUMN welcome_title VARCHAR(255) DEFAULT NULL");
    @$conn->query("ALTER TABLE settings ADD COLUMN welcome_description TEXT DEFAULT NULL");
    @$conn->query("ALTER TABLE settings ADD COLUMN welcome_instructions TEXT DEFAULT NULL");
    @$conn->query("ALTER TABLE settings ADD COLUMN admin_theme VARCHAR(100) DEFAULT 'style-modern'");
    @$conn->query("ALTER TABLE settings ADD COLUMN platform_name VARCHAR(255) DEFAULT NULL");
    @$conn->query("ALTER TABLE settings ADD COLUMN header_subtitle VARCHAR(255) DEFAULT NULL");
    @$conn->query("ALTER TABLE settings ADD COLUMN active_question_set_id INTEGER DEFAULT 1");
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? 'get_interview_time';

    if ($action === 'get_interview_time') {
        $conn = getDBConnection();
        ensureSettingsColumns($conn);

        $result = $conn->query("SELECT interview_time_minutes, exam_status FROM settings WHERE id = 1");

        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            echo json_encode(['success' => true, 'interview_time' => (int) $row['interview_time_minutes'], 'exam_status' => (bool) $row['exam_status']]);
        } else {
            $sql = normalizeSQL("INSERT OR REPLACE INTO settings (id, interview_time_minutes, exam_status) VALUES (1, 30, 1)");
            $conn->query($sql);
            echo json_encode(['success' => true, 'interview_time' => 30, 'exam_status' => true]);
        }

        $conn->close();
        exit;
    }

    if ($action === 'get_welcome_content') {
        $conn = getDBConnection();
        ensureSettingsColumns($conn);

        $result = $conn->query("SELECT welcome_title, welcome_description, welcome_instructions, admin_theme, platform_name, header_subtitle FROM settings WHERE id = 1");

        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            echo json_encode([
                'success' => true,
                'welcome_content' => [
                    'title' => $row['welcome_title'] ?: '',
                    'description' => $row['welcome_description'] ?: '',
                    'instructions' => $row['welcome_instructions'] ?: '',
                    'platform_name' => $row['platform_name'] ?: '',
                    'header_subtitle' => $row['header_subtitle'] ?: '',
                ],
                'admin_theme' => $row['admin_theme'] ?: 'style-modern'
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'No welcome content found']);
        }

        $conn->close();
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    $action = $_POST['action'] ?? '';

    if ($action === 'update_interview_time') {
        $time = (int) ($_POST['time'] ?? 0);
        $exam_status = filter_var($_POST['exam_status'] ?? true, FILTER_VALIDATE_BOOLEAN);

        if ($time < 5 || $time > 120) {
            echo json_encode(['success' => false, 'message' => 'Interview time must be between 5 and 120 minutes']);
            exit;
        }

        $conn = getDBConnection();
        ensureSettingsColumns($conn);

        // Ensure row exists
        $check = $conn->query("SELECT id FROM settings WHERE id = 1");
        if (!$check || $check->num_rows === 0) {
            $conn->query(normalizeSQL("INSERT INTO settings (id, interview_time_minutes, exam_status) VALUES (1, 30, 1)"));
        }

        $sql = "UPDATE settings SET interview_time_minutes = ?, exam_status = ? WHERE id = 1";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
            $conn->close();
            exit;
        }
        $stmt->bind_param('ii', $time, $exam_status);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Interview settings updated', 'interview_time' => $time, 'exam_status' => (bool) $exam_status]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update interview time']);
        }

        $stmt->close();
        $conn->close();
        exit;
    }

    if ($action === 'save_welcome_content') {
        $title = $_POST['title'] ?? '';
        $description = $_POST['description'] ?? '';
        $instructions = $_POST['instructions'] ?? '';
        $platform_name = $_POST['platform_name'] ?? '';
        $header_subtitle = $_POST['header_subtitle'] ?? '';

        $conn = getDBConnection();
        ensureSettingsColumns($conn);

        // Ensure row exists before update
        $check = $conn->query("SELECT id FROM settings WHERE id = 1");
        if (!$check || $check->num_rows === 0) {
            $conn->query(normalizeSQL("INSERT INTO settings (id, interview_time_minutes, exam_status) VALUES (1, 30, 1)"));
        }

        $sql = "UPDATE settings SET welcome_title = ?, welcome_description = ?, welcome_instructions = ?, platform_name = ?, header_subtitle = ? WHERE id = 1";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
            $conn->close();
            exit;
        }
        $stmt->bind_param('sssss', $title, $description, $instructions, $platform_name, $header_subtitle);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Welcome content saved']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to save welcome content']);
        }

        $stmt->close();
        $conn->close();
        exit;
    }

    if ($action === 'save_admin_theme') {
        $theme = $_POST['theme'] ?? 'style-modern';
        $allowed_themes = ['style-modern', 'theme-professional-blue', 'theme-modern-violet', 'theme-teal-coral', 'theme-dark-mode'];
        if (!in_array($theme, $allowed_themes)) {
            echo json_encode(['success' => false, 'message' => 'Invalid theme']);
            exit;
        }

        $conn = getDBConnection();
        ensureSettingsColumns($conn);

        // Ensure row exists
        $check = $conn->query("SELECT id FROM settings WHERE id = 1");
        if (!$check || $check->num_rows === 0) {
            $conn->query(normalizeSQL("INSERT INTO settings (id, interview_time_minutes, exam_status) VALUES (1, 30, 1)"));
        }

        $sql = "UPDATE settings SET admin_theme = ? WHERE id = 1";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
            $conn->close();
            exit;
        }
        $stmt->bind_param('s', $theme);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Theme saved', 'theme' => $theme]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to save theme']);
        }

        $stmt->close();
        $conn->close();
        exit;
    }
}

echo json_encode(['success' => false, 'message' => 'Invalid request']);