/**
 * Audit Action Enum
 * Defines all trackable actions in the system
 */
export enum AuditAction {
    // Authentication
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    REFRESH_TOKEN = 'REFRESH_TOKEN',
    CHANGE_PASSWORD = 'CHANGE_PASSWORD',
    REGISTER = 'REGISTER',

    // CRUD
    CREATE = 'CREATE',
    READ = 'READ',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',

    // Administrative
    ROLE_CHANGE = 'ROLE_CHANGE',
    PERMISSION_CHANGE = 'PERMISSION_CHANGE',
    USER_ACTIVATE = 'USER_ACTIVATE',
    USER_DEACTIVATE = 'USER_DEACTIVATE',
    SESSION_REVOKE = 'SESSION_REVOKE',

    // System
    CONFIG_CHANGE = 'CONFIG_CHANGE',
    SYSTEM_EVENT = 'SYSTEM_EVENT',
}
