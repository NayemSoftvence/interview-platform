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

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    // 'save' is allowed for students; admin-only actions require session
    if (in_array($action, ['get_all', 'get_detail', 'clear_all', 'delete_individual'])) {
        if (empty($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            exit;
        }
    }

    if ($action === 'save') {
        $student_id = $_POST['student_id'] ?? 0;
        $score = $_POST['score'] ?? 0;
        $total_questions = $_POST['total_questions'] ?? 0;
        $percentage = $_POST['percentage'] ?? 0;
        $answers = $_POST['answers'] ?? '[]';

        // Debug logging
        error_log("Save attempt - student_id: $student_id, score: $score, total: $total_questions, percentage: $percentage");

        if (!$student_id || !$total_questions) {
            echo json_encode(['success' => false, 'message' => 'Invalid student or question data']);
            exit;
        }

        $conn = getDBConnection();
        if (!$conn) {
            echo json_encode(['success' => false, 'message' => 'Database connection failed']);
            exit;
        }

        // First, get the student's email and phone number
        $student_stmt = $conn->prepare("SELECT email, phone FROM students WHERE id = ?");
        if ($student_stmt) {
            $student_stmt->bind_param("i", $student_id);
            $student_stmt->execute();
            $student_result = $student_stmt->get_result();

            if ($student_result->num_rows === 0) {
                echo json_encode(['success' => false, 'message' => 'Student not found']);
                $student_stmt->close();
                $conn->close();
                exit;
            }

            $student_row = $student_result->fetch_assoc();
            $student_email = $student_row['email'];
            $student_phone = $student_row['phone'];
            $student_stmt->close();
        }

        // Check if this student already submitted results (same student_id)
        $check_stmt = $conn->prepare(
            "SELECT r.id FROM results r 
             WHERE r.student_id = ? 
             LIMIT 1"
        );
        if ($check_stmt) {
            $check_stmt->bind_param("i", $student_id);
            $check_stmt->execute();
            $check_result = $check_stmt->get_result();

            if ($check_result && $check_result->num_rows > 0) {
                // Update existing result (allow retakes)
                $check_stmt->close();
                $update_stmt = $conn->prepare(
                    "UPDATE results SET score = ?, total_questions = ?, percentage = ?, answers = ?, completion_date = CURRENT_TIMESTAMP 
                     WHERE student_id = ?"
                );
                if ($update_stmt) {
                    $update_stmt->bind_param("iidsi", $score, $total_questions, $percentage, $answers, $student_id);

                    if ($update_stmt->execute()) {
                        echo json_encode(['success' => true, 'message' => 'Result updated successfully']);
                    } else {
                        $error = $conn->error ?: 'Unknown error';
                        error_log("Results update error: " . $error);
                        echo json_encode(['success' => false, 'message' => 'Failed to update results: ' . $error]);
                    }
                    $update_stmt->close();
                }
                $conn->close();
                exit;
            }
            $check_stmt->close();
        }

        // Insert the result
        $stmt = $conn->prepare("INSERT INTO results (student_id, score, total_questions, percentage, answers) VALUES (?, ?, ?, ?, ?)");
        if ($stmt) {
            $stmt->bind_param("iiids", $student_id, $score, $total_questions, $percentage, $answers);

            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Result saved successfully']);
            } else {
                $error = $conn->error ?: 'Unknown error';
                error_log("Results save error: " . $error);
                echo json_encode(['success' => false, 'message' => 'Failed to save results: ' . $error]);
            }
            $stmt->close();
        }
        $conn->close();

    } elseif ($action === 'get_all') {
        $sort_field = $_POST['sort_field'] ?? 'completion_date';
        $sort_direction = $_POST['sort_direction'] ?? 'desc';

        // Validate sort field to prevent SQL injection
        $allowed_fields = ['name', 'email', 'phone', 'score', 'percentage', 'completion_date'];
        $sort_field = in_array($sort_field, $allowed_fields) ? $sort_field : 'completion_date';
        $sort_direction = $sort_direction === 'asc' ? 'asc' : 'desc';

        $conn = getDBConnection();
        if (!$conn) {
            echo json_encode([]);
            exit;
        }
        $sql = "
            SELECT s.id as student_id, s.name, s.email, s.phone, 
                   r.id as result_id, r.score, r.total_questions, r.percentage, 
                   r.answers, r.completion_date 
            FROM results r 
            JOIN students s ON r.student_id = s.id 
            ORDER BY $sort_field $sort_direction
        ";

        $result = $conn->query($sql);
        $results = [];
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $results[] = $row;
            }
        }

        echo json_encode($results);
        $conn->close();

    } elseif ($action === 'get_detail') {
        $student_id = (int) ($_POST['student_id'] ?? 0);

        if (!$student_id) {
            echo json_encode(['success' => false, 'message' => 'Student ID required']);
            exit;
        }

        $conn = getDBConnection();
        if (!$conn) {
            echo json_encode(['success' => false, 'message' => 'Database connection failed']);
            exit;
        }

        // Get student info + result
        $stmt = $conn->prepare("
            SELECT s.name, s.email, s.phone,
                   r.score, r.total_questions, r.percentage, r.answers, r.completion_date
            FROM results r
            JOIN students s ON r.student_id = s.id
            WHERE r.student_id = ?
            LIMIT 1
        ");
        if (!$stmt) {
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
            $conn->close();
            exit;
        }

        $stmt->bind_param("i", $student_id);
        $stmt->execute();
        $result = $stmt->get_result();

        if (!$result || $result->num_rows === 0) {
            echo json_encode(['success' => false, 'message' => 'Result not found']);
            $stmt->close();
            $conn->close();
            exit;
        }

        $row = $result->fetch_assoc();
        $stmt->close();

        // Parse stored answers
        $userAnswers = json_decode($row['answers'], true);
        if (!is_array($userAnswers)) {
            $userAnswers = [];
        }

        $details = [];

        // Detect format: new snapshot format has objects with 'question' key
        $isNewFormat = !empty($userAnswers) && isset($userAnswers[0]['question']);

        if ($isNewFormat) {
            // NEW FORMAT: each entry is a full snapshot of what the student saw
            foreach ($userAnswers as $i => $entry) {
                $userAnswerIdx = isset($entry['user_answer_index']) ? (int) $entry['user_answer_index'] : -1;
                $correctAnswerIdx = isset($entry['correct_answer_index']) ? (int) $entry['correct_answer_index'] : -1;

                $details[] = [
                    'question_num' => $i + 1,
                    'question' => $entry['question'] ?? 'Unknown',
                    'options' => $entry['options'] ?? [],
                    'correct_answer_index' => $correctAnswerIdx,
                    'user_answer_index' => $userAnswerIdx,
                    'is_correct' => ($userAnswerIdx >= 0 && $userAnswerIdx === $correctAnswerIdx),
                    'skipped' => ($userAnswerIdx < 0),
                ];
            }
        } else {
            // OLD FORMAT (backward compatibility): array of selected option indices
            // This path is imperfect because shuffle order was not stored
            $settingsResult = $conn->query("SELECT active_question_set_id FROM settings WHERE id = 1");
            $activeSetId = 1;
            if ($settingsResult && $settingsResult->num_rows > 0) {
                $settingsRow = $settingsResult->fetch_assoc();
                $activeSetId = (int) ($settingsRow['active_question_set_id'] ?? 1);
            }

            $hasSetId = false;
            $colCheck = $conn->query("SELECT set_id FROM questions LIMIT 1");
            if ($colCheck !== false) {
                $hasSetId = true;
            }

            if ($hasSetId) {
                $qResult = $conn->query("SELECT id, question, option1, option2, option3, option4, correct_answer FROM questions WHERE set_id = $activeSetId ORDER BY id ASC");
            } else {
                $qResult = $conn->query("SELECT id, question, option1, option2, option3, option4, correct_answer FROM questions ORDER BY id ASC");
            }

            $questions = [];
            if ($qResult) {
                while ($q = $qResult->fetch_assoc()) {
                    $questions[] = $q;
                }
            }

            foreach ($questions as $i => $q) {
                $userAnswerIdx = isset($userAnswers[$i]) ? (int) $userAnswers[$i] : -1;
                $rawCorrect = (int) $q['correct_answer'];
                $correctAnswerIdx = ($rawCorrect >= 1) ? ($rawCorrect - 1) : $rawCorrect;

                $options = [$q['option1'], $q['option2'], $q['option3'], $q['option4']];

                $details[] = [
                    'question_num' => $i + 1,
                    'question' => $q['question'],
                    'options' => $options,
                    'correct_answer_index' => $correctAnswerIdx,
                    'user_answer_index' => $userAnswerIdx,
                    'is_correct' => ($userAnswerIdx >= 0 && $userAnswerIdx === $correctAnswerIdx),
                    'skipped' => ($userAnswerIdx < 0),
                ];
            }
        }

        echo json_encode([
            'success' => true,
            'student' => [
                'name' => $row['name'],
                'email' => $row['email'],
                'phone' => $row['phone'],
            ],
            'score' => (int) $row['score'],
            'total' => (int) $row['total_questions'],
            'percentage' => (float) $row['percentage'],
            'completion_date' => $row['completion_date'],
            'details' => $details,
        ]);

        $conn->close();


    } elseif ($action === 'delete_individual') {
        $student_id = (int) ($_POST['student_id'] ?? 0);
        if (!$student_id) {
            echo json_encode(['success' => false, 'message' => 'Student ID required']);
            exit;
        }

        $conn = getDBConnection();
        if ($conn) {
            $conn->begin_transaction();

            try {
                // Delete result first (due to FK)
                $stmt1 = $conn->prepare("DELETE FROM results WHERE student_id = ?");
                if ($stmt1) {
                    $stmt1->bind_param("i", $student_id);
                    $stmt1->execute();
                    $stmt1->close();
                }

                // Delete student
                $stmt2 = $conn->prepare("DELETE FROM students WHERE id = ?");
                if ($stmt2) {
                    $stmt2->bind_param("i", $student_id);
                    $stmt2->execute();
                    $stmt2->close();
                }

                $conn->commit();
                echo json_encode(['success' => true, 'message' => 'Result deleted successfully']);
            } catch (Exception $e) {
                $conn->rollback();
                echo json_encode(['success' => false, 'message' => 'Error deleting result: ' . $e->getMessage()]);
            }
            $conn->close();
        }

    } elseif ($action === 'clear_all') {
        $conn = getDBConnection();
        if ($conn) {
            $engine = $_ENV['DB_ENGINE'] ?? 'mysql';

            $conn->begin_transaction();

            try {
                $conn->query("DELETE FROM results");
                $conn->query("DELETE FROM students");

                if ($engine === 'sqlite') {
                    $conn->query("DELETE FROM sqlite_sequence WHERE name='results'");
                    $conn->query("DELETE FROM sqlite_sequence WHERE name='students'");
                } else {
                    $conn->query("ALTER TABLE results AUTO_INCREMENT = 1");
                    $conn->query("ALTER TABLE students AUTO_INCREMENT = 1");
                }

                $conn->commit();
                echo json_encode(['success' => true, 'message' => 'All results cleared successfully']);

            } catch (Exception $e) {
                $conn->rollback();
                echo json_encode(['success' => false, 'message' => 'Error clearing results: ' . $e->getMessage()]);
            }

            $conn->close();
        }
    }
}
