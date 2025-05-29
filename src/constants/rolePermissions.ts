export type UserRole = 'Admin' | 'Manager' | 'HR' | 'Headhunter' | 'BD';

export type RolePermissions = {
  [key in UserRole]: {
    allowedPages: string[];
  }
};

export const ROLE_PERMISSIONS: RolePermissions = {
  Admin: {
    allowedPages: [
      '/dashboard',
      '/tables/candidates',
      '/tables/clients',
      '/tables/hr-contacts',
      '/tables/jobs',
      '/tables/admin-jobs',
      '/tables/processes',
      '/tables/sales',
      '/tables/users',
      '/calendar',
      '/notifications'
    ]
  },
  Manager: {
    allowedPages: [
      '/dashboard',
      '/tables/candidates',
      '/tables/clients',
      '/tables/hr-contacts', 
      '/tables/jobs',
      '/tables/processes',
      '/tables/sales',
      '/calendar',
      '/notifications'
    ]
  },
  HR: {
    allowedPages: [
      '/dashboard',
      '/tables/candidates',
      '/tables/clients',
      '/tables/hr-contacts',
      '/tables/jobs',
      '/tables/admin-jobs',
      '/tables/processes',
      '/tables/sales',
      '/tables/users',
      '/calendar',
      '/notifications'
    ]
  },
  Headhunter: {
    allowedPages: [
      '/dashboard',
      '/tables/candidates',
      '/tables/jobs',
      '/tables/processes',
      '/calendar',
      '/notifications'
    ]
  },
  BD: {
    allowedPages: [
      '/dashboard',
      '/tables/clients',
      '/tables/hr-contacts',
      '/tables/jobs',
      '/tables/admin-jobs',
      '/tables/sales',
      '/calendar',
      '/notifications'
    ]
  }
}; 