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

function ensureQuestionSetsTable($conn)
{
    // Create question_sets table
    $sql = normalizeSQL("CREATE TABLE IF NOT EXISTS question_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    $conn->query($sql);

    // Ensure set_id column exists on questions
    @$conn->query("ALTER TABLE questions ADD COLUMN set_id INTEGER DEFAULT 1");

    // Ensure active_question_set_id column exists on settings
    @$conn->query("ALTER TABLE settings ADD COLUMN active_question_set_id INTEGER DEFAULT 1");

    // Ensure a Default Set exists
    $check = $conn->query("SELECT id FROM question_sets WHERE id = 1");
    if (!$check || $check->num_rows === 0) {
        $conn->query("INSERT INTO question_sets (id, name, description) VALUES (1, 'Default Set', 'The default question set')");
    }

    // Assign any unset questions to default set
    @$conn->query("UPDATE questions SET set_id = 1 WHERE set_id IS NULL");
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $conn = getDBConnection();
    if (!$conn) {
        echo json_encode(['success' => false, 'message' => 'Database connection failed']);
        exit;
    }
    ensureQuestionSetsTable($conn);

    // Get active set id
    $settingsRes = $conn->query("SELECT active_question_set_id FROM settings WHERE id = 1");
    $activeSetId = 1;
    if ($settingsRes && $settingsRes->num_rows > 0) {
        $settingsRow = $settingsRes->fetch_assoc();
        $activeSetId = (int) ($settingsRow['active_question_set_id'] ?? 1);
    }

    // List all sets with question count
    $result = $conn->query("
        SELECT qs.id, qs.name, qs.description, qs.created_at,
               COUNT(q.id) as question_count
        FROM question_sets qs
        LEFT JOIN questions q ON q.set_id = qs.id
        GROUP BY qs.id
        ORDER BY qs.id ASC
    ");

    $sets = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $row['is_active'] = ((int) $row['id'] === $activeSetId);
            $row['question_count'] = (int) $row['question_count'];
            $sets[] = $row;
        }
    }

    echo json_encode(['success' => true, 'sets' => $sets, 'active_set_id' => $activeSetId]);
    $conn->close();
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // All POST actions require admin
    if (empty($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    $content_type = $_SERVER['CONTENT_TYPE'] ?? '';
    if (strpos($content_type, 'application/json') !== false) {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';
    } else {
        $action = $_POST['action'] ?? '';
        $input = $_POST;
    }

    $conn = getDBConnection();
    if ($conn) {
        ensureQuestionSetsTable($conn);

        if ($action === 'create') {
            $name = trim($input['name'] ?? '');
            $description = trim($input['description'] ?? '');
            if (empty($name)) {
                echo json_encode(['success' => false, 'message' => 'Name is required']);
                exit;
            }
            $stmt = $conn->prepare("INSERT INTO question_sets (name, description) VALUES (?, ?)");
            if ($stmt) {
                $stmt->bind_param("ss", $name, $description);
                if ($stmt->execute()) {
                    $newId = $conn->insert_id;
                    echo json_encode(['success' => true, 'message' => 'Question set created', 'id' => $newId]);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Failed to create question set']);
                }
                $stmt->close();
            }

        } elseif ($action === 'rename') {
            $id = (int) ($input['id'] ?? 0);
            $name = trim($input['name'] ?? '');
            $description = trim($input['description'] ?? '');
            if (!$id || empty($name)) {
                echo json_encode(['success' => false, 'message' => 'ID and name are required']);
                exit;
            }
            $stmt = $conn->prepare("UPDATE question_sets SET name = ?, description = ? WHERE id = ?");
            if ($stmt) {
                $stmt->bind_param("ssi", $name, $description, $id);
                if ($stmt->execute()) {
                    echo json_encode(['success' => true, 'message' => 'Question set updated']);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Failed to update question set']);
                }
                $stmt->close();
            }

        } elseif ($action === 'delete') {
            $id = (int) ($input['id'] ?? 0);
            if (!$id) {
                echo json_encode(['success' => false, 'message' => 'ID is required']);
                exit;
            }
            // Cannot delete the only set
            $countResult = $conn->query("SELECT COUNT(*) as cnt FROM question_sets");
            if ($countResult) {
                $countRow = $countResult->fetch_assoc();
                if ((int) $countRow['cnt'] <= 1) {
                    echo json_encode(['success' => false, 'message' => 'Cannot delete the only question set']);
                    exit;
                }
            }

            // Delete questions in this set first
            $stmt1 = $conn->prepare("DELETE FROM questions WHERE set_id = ?");
            if ($stmt1) {
                $stmt1->bind_param("i", $id);
                $stmt1->execute();
                $stmt1->close();
            }

            // Delete the set
            $stmt2 = $conn->prepare("DELETE FROM question_sets WHERE id = ?");
            if ($stmt2) {
                $stmt2->bind_param("i", $id);
                if ($stmt2->execute()) {
                    // If deleted set was active, switch to first available set
                    $settingsCheck = $conn->query("SELECT active_question_set_id FROM settings WHERE id = 1");
                    if ($settingsCheck && $settingsCheck->num_rows > 0) {
                        $sRow = $settingsCheck->fetch_assoc();
                        if ((int) $sRow['active_question_set_id'] === $id) {
                            $firstSet = $conn->query("SELECT id FROM question_sets ORDER BY id ASC LIMIT 1");
                            if ($firstSet && $firstSet->num_rows > 0) {
                                $firstRow = $firstSet->fetch_assoc();
                                $newActiveId = (int) $firstRow['id'];
                                $conn->query("UPDATE settings SET active_question_set_id = $newActiveId WHERE id = 1");
                            }
                        }
                    }
                    echo json_encode(['success' => true, 'message' => 'Question set deleted']);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Failed to delete question set']);
                }
                $stmt2->close();
            }

        } elseif ($action === 'set_active') {
            $id = (int) ($input['id'] ?? 0);
            if (!$id) {
                echo json_encode(['success' => false, 'message' => 'ID is required']);
                exit;
            }
            // Verify set exists
            $check = $conn->prepare("SELECT id FROM question_sets WHERE id = ?");
            if ($check) {
                $check->bind_param("i", $id);
                $check->execute();
                $checkResult = $check->get_result();
                if ($checkResult->num_rows === 0) {
                    echo json_encode(['success' => false, 'message' => 'Question set not found']);
                    $check->close();
                    exit;
                }
                $check->close();
            }

            $stmt = $conn->prepare("UPDATE settings SET active_question_set_id = ? WHERE id = 1");
            if ($stmt) {
                $stmt->bind_param("i", $id);
                if ($stmt->execute()) {
                    echo json_encode(['success' => true, 'message' => 'Active question set updated', 'active_set_id' => $id]);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Failed to update active question set']);
                }
                $stmt->close();
            }

        } else {
            echo json_encode(['success' => false, 'message' => 'Unknown action']);
        }

        $conn->close();
    }
}