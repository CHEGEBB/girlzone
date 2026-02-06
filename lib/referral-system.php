<?php
/**
 * User Referral System Implementation
 * Handles referral code creation, validation, tracking, and rewards
 */

// Database connection would be initialized here
// $conn = new mysqli($servername, $username, $password, $dbname);

/**
 * Create a referral code for a user
 * @param int $user_id User ID
 * @param string $referral_code Desired referral code
 * @param mysqli $conn Database connection
 * @return array Response with status, message, and data
 */
function createReferralCode($user_id, $referral_code, $conn) {
    // Validate format
    if (!validateReferralCodeFormat($referral_code)) {
        return [
            'status' => 'error',
            'message' => 'Invalid referral code format. Must be 4-12 characters, letters and numbers only.',
            'data' => null
        ];
    }

    // Check if code already exists
    $stmt = $conn->prepare("SELECT id FROM user_referrals WHERE referral_code = ?");
    $stmt->bind_param("s", $referral_code);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $stmt->close();
        return [
            'status' => 'error',
            'message' => 'Referral code already exists. Please choose a different one.',
            'data' => null
        ];
    }
    $stmt->close();

    // Check if user already has a referral code
    $stmt = $conn->prepare("SELECT id FROM user_referrals WHERE user_id = ?");
    $stmt->bind_param("s", $user_id); // Assuming UUID, adjust if needed
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $stmt->close();
        return [
            'status' => 'error',
            'message' => 'User already has a referral code.',
            'data' => null
        ];
    }
    $stmt->close();

    // Insert new referral code
    $stmt = $conn->prepare("INSERT INTO user_referrals (user_id, referral_code) VALUES (?, ?)");
    $stmt->bind_param("ss", $user_id, $referral_code);

    if ($stmt->execute()) {
        $stmt->close();
        return [
            'status' => 'success',
            'message' => 'Referral code created successfully.',
            'data' => ['referral_code' => $referral_code]
        ];
    } else {
        $stmt->close();
        return [
            'status' => 'error',
            'message' => 'Failed to create referral code: ' . $conn->error,
            'data' => null
        ];
    }
}

/**
 * Track a referral click
 * @param string $referral_code Referral code
 * @param mysqli $conn Database connection
 * @return array Response with status, message, and data
 */
function trackReferralClick($referral_code, $conn) {
    // Get client IP address
    $ip_address = getClientIP();

    // Check if this IP has clicked recently (prevent abuse)
    $stmt = $conn->prepare("
        SELECT COUNT(*) as click_count
        FROM referral_clicks
        WHERE referral_code = ? AND ip_address = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
    ");
    $stmt->bind_param("ss", $referral_code, $ip_address);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();

    if ($row['click_count'] > 0) {
        // IP already clicked recently, don't log but return success to avoid revealing blocking
        $stmt->close();
        return [
            'status' => 'success',
            'message' => 'Click tracked (rate limited)',
            'data' => null
        ];
    }
    $stmt->close();

    // Check if referral code exists
    $stmt = $conn->prepare("SELECT id FROM user_referrals WHERE referral_code = ?");
    $stmt->bind_param("s", $referral_code);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        $stmt->close();
        return [
            'status' => 'error',
            'message' => 'Invalid referral code.',
            'data' => null
        ];
    }
    $stmt->close();

    // Get user agent
    $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';

    // Insert click record
    $stmt = $conn->prepare("INSERT INTO referral_clicks (referral_code, ip_address, user_agent) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $referral_code, $ip_address, $user_agent);

    if ($stmt->execute()) {
        // Update click count in user_referrals table
        $stmt2 = $conn->prepare("UPDATE user_referrals SET total_clicks = total_clicks + 1, updated_at = NOW() WHERE referral_code = ?");
        $stmt2->bind_param("s", $referral_code);
        $stmt2->execute();
        $stmt2->close();

        $stmt->close();
        return [
            'status' => 'success',
            'message' => 'Referral click tracked successfully.',
            'data' => null
        ];
    } else {
        $stmt->close();
        return [
            'status' => 'error',
            'message' => 'Failed to track referral click: ' . $conn->error,
            'data' => null
        ];
    }
}

/**
 * Process referral signup when a new user signs up with a referral code
 * @param int $new_user_id New user ID
 * @param string $referral_code Referral code used
 * @param mysqli $conn Database connection
 * @return array Response with status, message, and data
 */
function processReferralSignup($new_user_id, $referral_code, $conn) {
    // Find referrer by code
    $stmt = $conn->prepare("SELECT user_id FROM user_referrals WHERE referral_code = ?");
    $stmt->bind_param("s", $referral_code);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        $stmt->close();
        return [
            'status' => 'error',
            'message' => 'Invalid referral code.',
            'data' => null
        ];
    }

    $row = $result->fetch_assoc();
    $referrer_id = $row['user_id'];
    $stmt->close();

    // Check if relationship already exists
    $stmt = $conn->prepare("SELECT id FROM referral_signups WHERE referrer_id = ? AND referred_user_id = ?");
    $stmt->bind_param("ss", $referrer_id, $new_user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $stmt->close();
        return [
            'status' => 'success',
            'message' => 'Referral relationship already exists.',
            'data' => null
        ];
    }
    $stmt->close();

    // Start transaction
    $conn->begin_transaction();

    try {
        // Insert referral relationship
        $stmt = $conn->prepare("INSERT INTO referral_signups (referrer_id, referred_user_id, reward_given) VALUES (?, ?, TRUE)");
        $stmt->bind_param("ss", $referrer_id, $new_user_id);
        $stmt->execute();
        $stmt->close();

        // Reward referrer with 10 tokens
        $stmt = $conn->prepare("UPDATE profiles SET tokens = COALESCE(tokens, 0) + 10 WHERE id = ?");
        $stmt->bind_param("s", $referrer_id);
        $stmt->execute();
        $stmt->close();

        // Update referral stats
        $stmt = $conn->prepare("
            UPDATE user_referrals
            SET total_signups = total_signups + 1, tokens_earned = tokens_earned + 10, updated_at = NOW()
            WHERE user_id = ?
        ");
        $stmt->bind_param("s", $referrer_id);
        $stmt->execute();
        $stmt->close();

        // Commit transaction
        $conn->commit();

        return [
            'status' => 'success',
            'message' => 'Referral processed successfully. Referrer rewarded with 10 tokens.',
            'data' => ['referrer_id' => $referrer_id, 'tokens_rewarded' => 10]
        ];

    } catch (Exception $e) {
        // Rollback on error
        $conn->rollback();
        return [
            'status' => 'error',
            'message' => 'Failed to process referral: ' . $e->getMessage(),
            'data' => null
        ];
    }
}

/**
 * Get referral stats for a user
 * @param int $user_id User ID
 * @param mysqli $conn Database connection
 * @return array Response with status, message, and data
 */
function getReferralStats($user_id, $conn) {
    // Get referral code and stats
    $stmt = $conn->prepare("
        SELECT referral_code, total_clicks, total_signups, tokens_earned
        FROM user_referrals
        WHERE user_id = ?
    ");
    $stmt->bind_param("s", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $referral_data = $result->fetch_assoc();
    $stmt->close();

    if (!$referral_data) {
        return [
            'status' => 'error',
            'message' => 'User does not have a referral code.',
            'data' => null
        ];
    }

    // Get current token balance from profiles table
    $stmt = $conn->prepare("SELECT COALESCE(tokens, 0) as tokens FROM profiles WHERE id = ?");
    $stmt->bind_param("s", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $profile_data = $result->fetch_assoc();
    $stmt->close();

    $stats = [
        'referral_code' => $referral_data['referral_code'],
        'total_clicks' => (int) $referral_data['total_clicks'],
        'total_signups' => (int) $referral_data['total_signups'],
        'tokens_earned' => (int) $referral_data['tokens_earned'],
        'current_tokens' => (int) $profile_data['tokens']
    ];

    return [
        'status' => 'success',
        'message' => 'Referral stats retrieved successfully.',
        'data' => $stats
    ];
}

/**
 * Validate referral code format
 * @param string $code Referral code
 * @return bool True if valid
 */
function validateReferralCodeFormat($code) {
    // Check if code is 4-12 characters, contains only letters and numbers, uppercase
    return preg_match('/^[A-Z0-9]{4,12}$/', $code);
}

/**
 * Get client IP address
 * @return string Client IP address
 */
function getClientIP() {
    $ip_headers = [
        'HTTP_CF_CONNECTING_IP',
        'HTTP_CLIENT_IP',
        'HTTP_X_FORWARDED_FOR',
        'HTTP_X_FORWARDED',
        'HTTP_X_CLUSTER_CLIENT_IP',
        'HTTP_FORWARDED_FOR',
        'HTTP_FORWARDED',
        'REMOTE_ADDR'
    ];

    foreach ($ip_headers as $header) {
        if (!empty($_SERVER[$header])) {
            $ip = $_SERVER[$header];
            // Handle comma-separated IPs (like X-Forwarded-For)
            $ip_parts = explode(',', $ip);
            $ip = trim($ip_parts[0]);

            // Validate IP
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return $ip;
            }
        }
    }

    return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
}

/**
 * Generate a random referral code
 * @return string Random referral code
 */
function generateRandomReferralCode() {
    $characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $code = '';
    for ($i = 0; $i < 8; $i++) {
        $code .= $characters[rand(0, strlen($characters) - 1)];
    }
    return $code;
}

// Example usage functions:

/**
 * Initialize referral system for a new user
 */
function initializeUserReferral($user_id, $conn) {
    // Generate a random code initially
    $code = generateRandomReferralCode();

    // Keep generating until we find a unique one
    $stmt = $conn->prepare("SELECT id FROM user_referrals WHERE referral_code = ?");
    $stmt->bind_param("s", $code);
    $stmt->execute();
    while ($stmt->get_result()->num_rows > 0) {
        $code = generateRandomReferralCode();
        $stmt->execute();
    }
    $stmt->close();

    // Create the referral record
    return createReferralCode($user_id, $code, $conn);
}

/**
 * Change user's referral code
 */
function changeReferralCode($user_id, $new_code, $conn) {
    // First delete existing code
    $stmt = $conn->prepare("DELETE FROM user_referrals WHERE user_id = ?");
    $stmt->bind_param("s", $user_id);
    $stmt->execute();
    $stmt->close();

    // Create new one
    return createReferralCode($user_id, $new_code, $conn);
}

?>
