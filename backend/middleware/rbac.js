const Group = require('../models/Group');

// Define role hierarchy mapped to numerical levels for easy comparison
const ROLE_LEVELS = {
    'Admin': 3,
    'Member': 2,
    'Viewer': 1
};

/**
 * Middleware factory for Role-Based Access Control.
 * Applies to routes with /groups/:groupId in the path.
 * 
 * @param {string} requiredRole - Minimum role required ('Admin', 'Member', 'Viewer')
 */
const requireRole = (requiredRole) => {
    return async (req, res, next) => {
        try {
            const groupId = req.params.groupId;
            const userId = req.user._id;

            if (!groupId) {
                res.status(400);
                throw new Error('groupId parameter is required for RBAC check');
            }

            const group = await Group.findById(groupId);
            if (!group) {
                res.status(404);
                throw new Error('Group not found');
            }

            // Find the user's membership object
            // Backwards compatibility: handle raw ObjectIds if database hasn't been fully migrated
            let membership = group.members.find(m => {
                if (m.user) return m.user.toString() === userId.toString();
                // Legacy support
                return m.toString() === userId.toString();
            });

            if (!membership) {
                res.status(403);
                throw new Error('Not authorized: You are not a member of this group');
            }

            // Normalise legacy members without a role to 'Member' (except creator who is 'Admin')
            let userRole = membership.role;
            if (!userRole) {
                userRole = group.creator.toString() === userId.toString() ? 'Admin' : 'Member';
            }

            // Compare numerical levels
            const requiredLevel = ROLE_LEVELS[requiredRole] || 1;
            const currentLevel = ROLE_LEVELS[userRole] || 1;

            if (currentLevel < requiredLevel) {
                res.status(403);
                throw new Error(`Access denied. Requires '${requiredRole}' role but you are a '${userRole}'`);
            }

            // Inject role info into request for downstream controllers if needed
            req.groupRole = userRole;
            next();

        } catch (error) {
            next(error);
        }
    };
};

module.exports = { requireRole };
