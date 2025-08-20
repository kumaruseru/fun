/**
 * User Routes - Handle user profile and settings operations
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

/**
 * GET /api/user/profile
 * Get current user profile information
 */
router.get('/profile', authMiddleware.verifyToken, async (req, res) => {
    try {
        // User data is available in req.user from authMiddleware
        const user = req.user;
        
        // Return user profile data
        res.json({
            success: true,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                email: user.email,
                bio: user.bio,
                avatar: user.avatar,
                createdAt: user.createdAt
            }
        });
        
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error',
                code: 'PROFILE_FETCH_ERROR'
            }
        });
    }
});

/**
 * PUT /api/user/profile
 * Update user profile information
 */
router.put('/profile', 
    authMiddleware.verifyToken,
    [
        body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
        body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
        body('username').optional().trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
        body('bio').optional().trim().isLength({ max: 500 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Validation failed',
                        details: errors.array()
                    }
                });
            }

            const { firstName, lastName, username, bio } = req.body;
            const userId = req.user.id;

            // TODO: Update user in database
            // const updatedUser = await UserModel.updateProfile(userId, { firstName, lastName, username, bio });

            // For now, return success with updated data
            res.json({
                success: true,
                message: 'Profile updated successfully',
                user: {
                    id: userId,
                    firstName: firstName || req.user.firstName,
                    lastName: lastName || req.user.lastName,
                    username: username || req.user.username,
                    email: req.user.email,
                    bio: bio || req.user.bio
                }
            });

        } catch (error) {
            console.error('Error updating user profile:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Internal server error',
                    code: 'PROFILE_UPDATE_ERROR'
                }
            });
        }
    }
);

module.exports = router;
