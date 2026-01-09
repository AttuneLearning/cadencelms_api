/**
 * Authentication API Contracts
 * Version: 1.0.0
 * 
 * These contracts define the authentication endpoints for the LMS API.
 * Both backend and UI teams use these as the source of truth.
 */

export const AuthContracts = {
  /**
   * User Registration
   */
  register: {
    endpoint: '/api/v2/auth/register',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Register a new user account',
    
    request: {
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        email: { type: 'string', required: true, format: 'email' },
        password: { type: 'string', required: true, minLength: 8 },
        firstName: { type: 'string', required: true },
        lastName: { type: 'string', required: true },
        role: { type: 'string', required: false, enum: ['learner', 'staff'], default: 'learner' }
      }
    },
    
    response: {
      success: {
        status: 201,
        body: {
          success: 'boolean',
          data: {
            user: {
              id: 'string',
              email: 'string',
              firstName: 'string',
              lastName: 'string',
              role: 'string',
              isActive: 'boolean',
              createdAt: 'Date'
            },
            token: 'string'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 409, code: 'EMAIL_EXISTS', message: 'Email already registered' }
      ]
    },
    
    example: {
      request: {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe'
      },
      response: {
        success: true,
        data: {
          user: {
            id: '507f1f77bcf86cd799439011',
            email: 'newuser@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'learner',
            isActive: true,
            createdAt: '2026-01-08T00:00:00.000Z'
          },
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }
    }
  },

  /**
   * User Login
   */
  login: {
    endpoint: '/api/v2/auth/login',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Authenticate user and receive access token',
    
    request: {
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        email: { type: 'string', required: true, format: 'email' },
        password: { type: 'string', required: true }
      }
    },
    
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            user: {
              id: 'string',
              email: 'string',
              firstName: 'string',
              lastName: 'string',
              role: 'string',
              defaultDashboard: 'string',
              lastLogin: 'Date'
            },
            token: 'string',
            refreshToken: 'string',
            expiresIn: 'number'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        { status: 403, code: 'ACCOUNT_DISABLED', message: 'Account is disabled' }
      ]
    },
    
    example: {
      request: {
        email: 'user@example.com',
        password: 'SecurePass123!'
      },
      response: {
        success: true,
        data: {
          user: {
            id: '507f1f77bcf86cd799439011',
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'staff',
            defaultDashboard: 'content-admin',
            lastLogin: '2026-01-08T00:00:00.000Z'
          },
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          expiresIn: 3600
        }
      }
    }
  },

  /**
   * User Logout
   */
  logout: {
    endpoint: '/api/v2/auth/logout',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Invalidate user session and tokens',
    
    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        refreshToken: { type: 'string', required: false }
      }
    },
    
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string'
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
      ]
    },
    
    example: {
      request: {
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      },
      response: {
        success: true,
        message: 'Successfully logged out'
      }
    }
  },

  /**
   * Refresh Token
   */
  refreshToken: {
    endpoint: '/api/v2/auth/refresh',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Get new access token using refresh token',
    
    request: {
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        refreshToken: { type: 'string', required: true }
      }
    },
    
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            token: 'string',
            refreshToken: 'string',
            expiresIn: 'number'
          }
        }
      },
      errors: [
        { status: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token' }
      ]
    },
    
    example: {
      request: {
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      },
      response: {
        success: true,
        data: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          expiresIn: 3600
        }
      }
    }
  },

  /**
   * Forgot Password
   */
  forgotPassword: {
    endpoint: '/api/v2/auth/forgot-password',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Request password reset email',
    
    request: {
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        email: { type: 'string', required: true, format: 'email' }
      }
    },
    
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string'
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid email format' }
      ]
    },
    
    example: {
      request: {
        email: 'user@example.com'
      },
      response: {
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      }
    }
  },

  /**
   * Reset Password
   */
  resetPassword: {
    endpoint: '/api/v2/auth/reset-password',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Reset password using token from email',
    
    request: {
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        token: { type: 'string', required: true },
        password: { type: 'string', required: true, minLength: 8 }
      }
    },
    
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string'
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid password format' },
        { status: 400, code: 'INVALID_TOKEN', message: 'Invalid or expired reset token' }
      ]
    },
    
    example: {
      request: {
        token: 'reset-token-from-email',
        password: 'NewSecurePass123!'
      },
      response: {
        success: true,
        message: 'Password successfully reset'
      }
    }
  },

  /**
   * Get Current User
   */
  me: {
    endpoint: '/api/v2/auth/me',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get current authenticated user profile',
    
    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      }
    },
    
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            id: 'string',
            email: 'string',
            firstName: 'string',
            lastName: 'string',
            role: 'string',
            defaultDashboard: 'string',
            permissions: 'string[]',
            departmentIds: 'string[]',
            isActive: 'boolean',
            lastLogin: 'Date',
            createdAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
      ]
    },
    
    example: {
      request: {},
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439011',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'staff',
          defaultDashboard: 'content-admin',
          permissions: ['content:read', 'content:write', 'courses:manage'],
          departmentIds: ['507f1f77bcf86cd799439012'],
          isActive: true,
          lastLogin: '2026-01-08T00:00:00.000Z',
          createdAt: '2025-01-01T00:00:00.000Z'
        }
      }
    }
  },

  /**
   * Change Password
   */
  changePassword: {
    endpoint: '/api/v2/auth/change-password',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Change password for authenticated user',
    
    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        currentPassword: { type: 'string', required: true },
        newPassword: { type: 'string', required: true, minLength: 8 }
      }
    },
    
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string'
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid password format' },
        { status: 401, code: 'INVALID_PASSWORD', message: 'Current password is incorrect' }
      ]
    },
    
    example: {
      request: {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewSecurePass123!'
      },
      response: {
        success: true,
        message: 'Password successfully changed'
      }
    }
  }
};

// Type exports for consumers
export type AuthContractType = typeof AuthContracts;
export type LoginRequest = typeof AuthContracts.login.example.request;
export type LoginResponse = typeof AuthContracts.login.example.response;
export type RegisterRequest = typeof AuthContracts.register.example.request;
export type RegisterResponse = typeof AuthContracts.register.example.response;
