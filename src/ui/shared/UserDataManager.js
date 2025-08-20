/**
 * User Data Manager - Centralized user data management
 * Handles fetching, caching, and synchronizing user data across all pages
 */

class UserDataManager {
    constructor() {
        this.currentUser = {
            name: "Loading...",
            username: "@loading",
            avatar: "https://placehold.co/48x48/4F46E5/FFFFFF?text=L",
            email: "loading@cosmic.net",
            bio: "Loading user information...",
            firstName: "Loading",
            lastName: "...",
            id: null
        };
        this.isLoading = true;
        this.callbacks = [];
    }

    /**
     * Subscribe to user data changes
     */
    subscribe(callback) {
        this.callbacks.push(callback);
        // Call immediately with current data
        callback(this.currentUser, this.isLoading);
    }

    /**
     * Notify all subscribers of data changes
     */
    notify() {
        this.callbacks.forEach(callback => callback(this.currentUser, this.isLoading));
    }

    /**
     * Fetch user data from server
     */
    async fetchUserData() {
        try {
            this.isLoading = true;
            this.notify();

            const response = await fetch('/api/user/profile', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                if (userData.success && userData.user) {
                    this.currentUser = {
                        id: userData.user.id,
                        firstName: userData.user.firstName,
                        lastName: userData.user.lastName,
                        name: `${userData.user.firstName} ${userData.user.lastName}`,
                        username: `@${userData.user.username || userData.user.firstName.toLowerCase()}`,
                        avatar: userData.user.avatar || `https://placehold.co/48x48/4F46E5/FFFFFF?text=${userData.user.firstName.charAt(0)}${userData.user.lastName.charAt(0)}`,
                        email: userData.user.email,
                        bio: userData.user.bio || "Thành viên của Cosmic Social Network"
                    };
                    this.isLoading = false;
                    this.notify();
                    return true;
                }
            } else if (response.status === 401) {
                // Not authenticated, redirect to login
                window.location.href = '/login';
                return false;
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            this.handleFallback();
            return false;
        }
    }

    /**
     * Handle fallback when API fails
     */
    handleFallback() {
        // Try to get user data from localStorage or use default
        const cachedUser = localStorage.getItem('cosmic_user');
        if (cachedUser) {
            try {
                const parsedUser = JSON.parse(cachedUser);
                this.currentUser = parsedUser;
            } catch (e) {
                console.warn('Failed to parse cached user data');
                this.setDefaultUser();
            }
        } else {
            this.setDefaultUser();
        }
        this.isLoading = false;
        this.notify();
    }

    /**
     * Set default user data
     */
    setDefaultUser() {
        this.currentUser = {
            name: "Guest User",
            username: "@guest",
            avatar: "https://placehold.co/48x48/4F46E5/FFFFFF?text=G",
            email: "guest@cosmic.net",
            bio: "Welcome to Cosmic Social Network",
            firstName: "Guest",
            lastName: "User",
            id: null
        };
    }

    /**
     * Update user data
     */
    updateUser(newData) {
        this.currentUser = { ...this.currentUser, ...newData };
        // Cache updated data
        localStorage.setItem('cosmic_user', JSON.stringify(this.currentUser));
        this.notify();
    }

    /**
     * Get current user data
     */
    getUser() {
        return this.currentUser;
    }

    /**
     * Check if data is loading
     */
    isDataLoading() {
        return this.isLoading;
    }
}

// Create global instance
window.userDataManager = new UserDataManager();

// Auto-fetch user data on page load
document.addEventListener('DOMContentLoaded', () => {
    window.userDataManager.fetchUserData();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserDataManager;
}
