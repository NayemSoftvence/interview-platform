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

function getActiveSetId($conn)
{
    // Ensure active_question_set_id column exists
    @$conn->query("ALTER TABLE settings ADD COLUMN active_question_set_id INTEGER DEFAULT 1");
    $result = $conn->query("SELECT active_question_set_id FROM settings WHERE id = 1");
    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        return (int) ($row['active_question_set_id'] ?? 1);
    }
    return 1;
}

function hasSetIdColumn($conn)
{
    $res = @$conn->query("SELECT set_id FROM questions LIMIT 1");
    return ($res !== false);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Get questions for the active set
    $conn = getDBConnection();
    if (!$conn) {
        echo json_encode([]);
        exit;
    }

    $setId = getActiveSetId($conn);
    $useSetId = hasSetIdColumn($conn);

    if ($useSetId) {
        $result = $conn->query("SELECT * FROM questions WHERE set_id = $setId ORDER BY id ASC");
    } else {
        $result = $conn->query("SELECT * FROM questions ORDER BY id ASC");
    }

    $questions = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            // Create array of options with their original indices
            $options = [
                ['text' => $row['option1'], 'originalIndex' => 0],
                ['text' => $row['option2'], 'originalIndex' => 1],
                ['text' => $row['option3'], 'originalIndex' => 2],
                ['text' => $row['option4'], 'originalIndex' => 3]
            ];

            // Shuffle the options for this student
            shuffle($options);

            // Find the new index of the correct answer after shuffling
            $correctAnswerOriginalIndex = (int) $row['correct_answer'] - 1;
            $newCorrectAnswerIndex = 0;
            $shuffledOptions = [];

            foreach ($options as $key => $option) {
                $shuffledOptions[] = $option['text'];
                if ($option['originalIndex'] === $correctAnswerOriginalIndex) {
                    $newCorrectAnswerIndex = $key;
                }
            }

            $questions[] = [
                'id' => $row['id'],
                'question' => $row['question'],
                'options' => $shuffledOptions,
                'correctAnswer' => $newCorrectAnswerIndex
            ];
        }
    }

    // Shuffle the questions array so each student gets a different order
    shuffle($questions);

    echo json_encode($questions);
    $conn->close();

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Try to read JSON body first, fall back to POST data
    $content_type = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
    $action = '';

    if (strpos($content_type, 'application/json') !== false) {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';
    } else {
        $action = $_POST['action'] ?? '';
        $input = $_POST;
    }

    // Admin-only actions
    if (in_array($action, ['add', 'update', 'delete', 'clear_all', 'bulk_add', 'get_all_admin'])) {
        if (empty($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            exit;
        }
    }

    if ($action === 'get_all_admin') {
        // Return ALL questions grouped by set (for admin questions list)
        $set_id = (int) ($input['set_id'] ?? 0);
        $conn = getDBConnection();
        if (!$conn) {
            echo json_encode([]);
            exit;
        }
        $useSetId = hasSetIdColumn($conn);

        if ($useSetId && $set_id > 0) {
            $result = $conn->query("SELECT * FROM questions WHERE set_id = $set_id ORDER BY id ASC");
        } elseif ($useSetId) {
            $result = $conn->query("SELECT * FROM questions ORDER BY set_id ASC, id ASC");
        } else {
            $result = $conn->query("SELECT * FROM questions ORDER BY id ASC");
        }

        $questions = [];
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $questions[] = [
                    'id' => $row['id'],
                    'set_id' => $row['set_id'] ?? 1,
                    'question' => $row['question'],
                    'options' => [$row['option1'], $row['option2'], $row['option3'], $row['option4']],
                    'correctAnswer' => (int) $row['correct_answer'] - 1,
                ];
            }
        }
        echo json_encode($questions);
        $conn->close();

    } elseif ($action === 'add') {
        $question = $input['question'] ?? '';
        $option1 = $input['option1'] ?? '';
        $option2 = $input['option2'] ?? '';
        $option3 = $input['option3'] ?? '';
        $option4 = $input['option4'] ?? '';
        $correct_answer = $input['correct_answer'] ?? 1;

        if (empty($question) || empty($option1) || empty($option2) || empty($option3) || empty($option4)) {
            echo json_encode(['success' => false, 'message' => 'All fields are required']);
            exit;
        }

        $conn = getDBConnection();
        if ($conn) {
            $useSetId = hasSetIdColumn($conn);
            $activeSetId = $useSetId ? getActiveSetId($conn) : 1;
            $set_id = (int) ($input['set_id'] ?? $activeSetId);

            if ($useSetId) {
                $stmt = $conn->prepare("INSERT INTO questions (question, option1, option2, option3, option4, correct_answer, set_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
                if ($stmt) {
                    $stmt->bind_param("sssssii", $question, $option1, $option2, $option3, $option4, $correct_answer, $set_id);
                    if ($stmt->execute()) {
                        echo json_encode(['success' => true]);
                    } else {
                        echo json_encode(['success' => false, 'message' => 'Failed to add question']);
                    }
                    $stmt->close();
                }
            } else {
                $stmt = $conn->prepare("INSERT INTO questions (question, option1, option2, option3, option4, correct_answer) VALUES (?, ?, ?, ?, ?, ?)");
                if ($stmt) {
                    $stmt->bind_param("sssssi", $question, $option1, $option2, $option3, $option4, $correct_answer);
                    if ($stmt->execute()) {
                        echo json_encode(['success' => true]);
                    } else {
                        echo json_encode(['success' => false, 'message' => 'Failed to add question']);
                    }
                    $stmt->close();
                }
            }
            $conn->close();
        }

    } elseif ($action === 'bulk_add') {
        $questions_arr = $input['questions'] ?? [];
        $set_id = (int) ($input['set_id'] ?? 0);

        if (empty($questions_arr) || !is_array($questions_arr)) {
            echo json_encode(['success' => false, 'message' => 'Invalid questions format']);
            exit;
        }

        $conn = getDBConnection();
        if ($conn) {
            $useSetId = hasSetIdColumn($conn);
            if ($set_id === 0) {
                $set_id = $useSetId ? getActiveSetId($conn) : 1;
            }

            $inserted = 0;
            $errors = [];

            foreach ($questions_arr as $q) {
                $question = $q['question'] ?? '';
                $option1 = $q['options'][0] ?? '';
                $option2 = $q['options'][1] ?? '';
                $option3 = $q['options'][2] ?? '';
                $option4 = $q['options'][3] ?? '';
                $correct_answer = (isset($q['correctAnswer']) ? intval($q['correctAnswer']) + 1 : 1);

                if (empty($question) || empty($option1) || empty($option2) || empty($option3) || empty($option4)) {
                    $errors[] = "Skipped invalid question: " . substr($question, 0, 50);
                    continue;
                }

                if ($useSetId) {
                    $stmt = $conn->prepare("INSERT INTO questions (question, option1, option2, option3, option4, correct_answer, set_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
                    if (!$stmt) {
                        $errors[] = "Prepare error: " . $conn->error;
                        continue;
                    }
                    $stmt->bind_param("sssssii", $question, $option1, $option2, $option3, $option4, $correct_answer, $set_id);
                } else {
                    $stmt = $conn->prepare("INSERT INTO questions (question, option1, option2, option3, option4, correct_answer) VALUES (?, ?, ?, ?, ?, ?)");
                    if (!$stmt) {
                        $errors[] = "Prepare error: " . $conn->error;
                        continue;
                    }
                    $stmt->bind_param("sssssi", $question, $option1, $option2, $option3, $option4, $correct_answer);
                }

                if ($stmt->execute()) {
                    $inserted++;
                } else {
                    $errors[] = "Failed to insert: " . substr($question, 0, 50);
                }
                $stmt->close();
            }

            $conn->close();

            if ($inserted > 0) {
                echo json_encode(['success' => true, 'count' => $inserted, 'errors' => $errors]);
            } else {
                echo json_encode(['success' => false, 'message' => 'No questions were imported', 'errors' => $errors]);
            }
        }

    } elseif ($action === 'delete') {
        $id = $input['id'] ?? 0;
        $conn = getDBConnection();
        if ($conn) {
            $stmt = $conn->prepare("DELETE FROM questions WHERE id = ?");
            if ($stmt) {
                $stmt->bind_param("i", $id);

                if ($stmt->execute()) {
                    echo json_encode(['success' => true]);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Failed to delete question']);
                }
                $stmt->close();
            }
            $conn->close();
        }

    } elseif ($action === 'bulk_delete') {
        $ids = isset($input['ids']) ? array_map('intval', (array) $input['ids']) : [];
        if (empty($ids)) {
            echo json_encode(['success' => false, 'message' => 'No IDs provided']);
            exit;
        }

        $conn = getDBConnection();
        if ($conn) {
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $types = str_repeat('i', count($ids));

            $stmt = $conn->prepare("DELETE FROM questions WHERE id IN ($placeholders)");
            if ($stmt) {
                $stmt->bind_param($types, ...$ids);

                if ($stmt->execute()) {
                    $count = isset($stmt->affected_rows) ? $stmt->affected_rows : count($ids);
                    echo json_encode(['success' => true, 'count' => $count]);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Failed to delete questions']);
                }
                $stmt->close();
            }
            $conn->close();
        }

    } elseif ($action === 'clear_all') {
        $set_id = (int) ($input['set_id'] ?? 0);
        $conn = getDBConnection();
        if ($conn) {
            $useSetId = hasSetIdColumn($conn);

            if ($useSetId && $set_id > 0) {
                $stmt = $conn->prepare("DELETE FROM questions WHERE set_id = ?");
                if ($stmt) {
                    $stmt->bind_param("i", $set_id);
                }
            } else {
                $stmt = $conn->prepare("DELETE FROM questions");
            }

            if ($stmt && $stmt->execute()) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to clear questions']);
            }

            if ($stmt)
                $stmt->close();
            $conn->close();
        }

    } elseif ($action === 'update') {
        $id = $input['id'] ?? 0;
        $question = $input['question'] ?? '';
        $option1 = $input['option1'] ?? '';
        $option2 = $input['option2'] ?? '';
        $option3 = $input['option3'] ?? '';
        $option4 = $input['option4'] ?? '';
        $correct_answer = $input['correct_answer'] ?? 1;

        if (empty($id) || empty($question) || empty($option1) || empty($option2) || empty($option3) || empty($option4)) {
            echo json_encode(['success' => false, 'message' => 'All fields are required']);
            exit;
        }

        $conn = getDBConnection();
        if ($conn) {
            $stmt = $conn->prepare("UPDATE questions SET question = ?, option1 = ?, option2 = ?, option3 = ?, option4 = ?, correct_answer = ? WHERE id = ?");
            if ($stmt) {
                $stmt->bind_param("sssssii", $question, $option1, $option2, $option3, $option4, $correct_answer, $id);

                if ($stmt->execute()) {
                    echo json_encode(['success' => true]);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Failed to update question']);
                }
                $stmt->close();
            }
            $conn->close();
        }
    }
}
