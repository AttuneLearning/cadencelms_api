# Backend Contract Development - Quick Start

**Goal:** Create API contracts quickly to unblock frontend team

---

## 📝 What is a Contract?

A contract is a **TypeScript file** that defines:
- ✅ All endpoints for a resource
- ✅ Request parameters (path, query, body)
- ✅ Response shapes (success & error)
- ✅ Example requests/responses
- ✅ Permissions required
- ✅ Validation rules & edge cases

**Contracts are NOT implementations** - they're specifications that both teams use as a "contract" for what the API will do.

---

## 🚀 Create Your First Contract (15 minutes)

### Step 1: Copy Template from auth.contract.ts

```bash
cd ~/github/lms_node/1_LMS_Node_V2/contracts/api

# Use existing contract as template
cp auth.contract.ts users.contract.ts
```

### Step 2: Define the Resource

```typescript
// contracts/api/users.contract.ts
export const UsersContract = {
  resource: 'users',
  version: '1.0.0',

  // Add each endpoint below...
};
```

### Step 3: Add Each Endpoint

For each endpoint, define:
1. **Metadata** (endpoint, method, version)
2. **Request shape** (path params, query params, body)
3. **Response shape** (success & error cases)
4. **Example** (real request/response)
5. **Permissions** (who can access)
6. **Notes** (edge cases, validation rules)

**Example Endpoint:**

```typescript
export const UsersContract = {
  resource: 'users',
  version: '1.0.0',

  // GET /users/me - Get current user profile
  me: {
    endpoint: '/users/me',
    method: 'GET' as const,
    version: '1.0.0',

    request: {
      headers: {
        authorization: {
          type: 'string',
          required: true,
          description: 'Bearer token from auth'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            id: 'ObjectId',
            email: 'string',
            firstName: 'string',
            lastName: 'string',
            role: 'global-admin|staff|learner',
            departments: 'ObjectId[]',        // Staff only
            permissions: 'string[]',          // Staff only
            enrollments: 'ObjectId[]',        // Learner only
            profileImage: 'string | null',
            createdAt: 'Date',
            lastLoginAt: 'Date'
          }
        }
      },
      error: {
        status: 401,
        body: {
          success: false,
          message: 'Unauthorized - Invalid or expired token'
        }
      }
    },

    example: {
      request: {
        headers: {
          authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      },
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439011',
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'staff',
          departments: ['507f1f77bcf86cd799439012'],
          permissions: ['read:courses', 'write:courses'],
          profileImage: 'https://cdn.example.com/profiles/john.jpg',
          createdAt: '2026-01-01T00:00:00Z',
          lastLoginAt: '2026-01-08T10:30:00Z'
        }
      }
    },

    permissions: ['authenticated'],

    notes: `
      - Returns unified user profile regardless of role (global-admin, staff, learner)
      - Role-specific fields included based on user type
      - Staff: includes departments, permissions
      - Learner: includes enrollments
      - Always requires valid authentication token
    `
  },

  // PUT /users/me - Update current user profile
  updateMe: {
    endpoint: '/users/me',
    method: 'PUT' as const,
    version: '1.0.0',

    request: {
      headers: {
        authorization: {
          type: 'string',
          required: true
        }
      },
      body: {
        firstName: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 100
        },
        lastName: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 100
        },
        profileImage: {
          type: 'string',
          required: false,
          description: 'URL to profile image'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            /* Same as GET /users/me */
          }
        }
      },
      error: {
        status: 400,
        body: {
          success: false,
          message: 'string',
          errors: [
            {
              field: 'string',
              message: 'string'
            }
          ]
        }
      }
    },

    example: {
      request: {
        headers: {
          authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        },
        body: {
          firstName: 'Jane',
          lastName: 'Smith'
        }
      },
      response: {
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: '507f1f77bcf86cd799439011',
          email: 'john.doe@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'staff',
          /* ... rest of fields ... */
        }
      }
    },

    permissions: ['authenticated'],

    notes: `
      - Users can only update their own profile
      - Email and role cannot be changed via this endpoint
      - Department assignments changed by admins only
      - Validation:
        - firstName/lastName: 1-100 characters
        - profileImage: valid URL or null
    `
  },

  // Add more endpoints: listStaff, createStaff, etc...
};
```

### Step 4: Validate the Contract

**Check for completeness:**
- [ ] All endpoints have request/response shapes
- [ ] Examples provided for each endpoint
- [ ] Permissions specified
- [ ] Edge cases & validation rules documented
- [ ] TypeScript compiles without errors

```bash
# Test TypeScript compilation
npm run build
```

### Step 5: Commit and Notify Frontend

```bash
# Stage the contract
git add contracts/api/users.contract.ts

# Commit with conventional format
git commit -m "feat(contracts): add users API contract

- Unified /users/me endpoint for all roles
- Staff management endpoints
- Learner management endpoints
- Profile update functionality

Contract ready for frontend implementation."

# Push to repo
git push origin master

# Update PENDING.md
# Change status from 🔲 Pending to 📝 Defined
```

### Step 6: Notify Frontend Team

**Update the tracking file:**

Edit `contracts/PENDING.md`:
```markdown
| `users.contract.ts` | 📝 Defined | 🔲 | 🔲 | Contract ready, awaiting impl |
```

**Notify via commit message or communication channel:**
"✅ Users contract ready! Frontend can start implementing types and API client."

---

## 📚 Contract Patterns & Best Practices

### Pattern 1: List Endpoint with Filtering

```typescript
list: {
  endpoint: '/courses',
  method: 'GET' as const,

  request: {
    query: {
      page: {
        type: 'number',
        required: false,
        default: 1,
        min: 1
      },
      limit: {
        type: 'number',
        required: false,
        default: 10,
        min: 1,
        max: 100
      },
      departmentId: {
        type: 'string',
        required: false,
        description: 'Filter by department'
      },
      status: {
        type: 'string',
        required: false,
        enum: ['draft', 'published', 'archived'],
        description: 'Filter by status'
      },
      search: {
        type: 'string',
        required: false,
        description: 'Search by title or code'
      },
      sort: {
        type: 'string',
        required: false,
        default: '-createdAt',
        description: 'Sort field (prefix with - for desc)'
      }
    }
  },

  response: {
    success: {
      status: 200,
      body: {
        success: 'boolean',
        data: {
          courses: 'Course[]',
          pagination: {
            page: 'number',
            limit: 'number',
            total: 'number',
            totalPages: 'number',
            hasNext: 'boolean',
            hasPrev: 'boolean'
          }
        }
      }
    }
  }
}
```

### Pattern 2: Create Endpoint with Validation

```typescript
create: {
  endpoint: '/courses',
  method: 'POST' as const,

  request: {
    body: {
      title: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 200
      },
      code: {
        type: 'string',
        required: true,
        pattern: '^[A-Z]{2,4}[0-9]{3}$',
        description: 'Course code format: ABC123'
      },
      departmentId: {
        type: 'ObjectId',
        required: true
      },
      programId: {
        type: 'ObjectId',
        required: false
      },
      description: {
        type: 'string',
        required: false,
        maxLength: 2000
      }
    }
  },

  response: {
    success: {
      status: 201,
      body: {
        success: 'boolean',
        message: 'string',
        data: {
          /* Course object */
        }
      }
    },
    error: {
      status: 400,
      body: {
        success: false,
        message: 'string',
        errors: [
          {
            field: 'string',
            message: 'string',
            value: 'any'
          }
        ]
      }
    }
  },

  permissions: ['write:courses'],

  notes: `
    - Code must be unique within department
    - Department must exist and user must have access
    - Auto-generates slug from title
    - Initial status is 'draft'
  `
}
```

### Pattern 3: Action Endpoint (Not CRUD)

```typescript
publish: {
  endpoint: '/courses/:id/publish',
  method: 'POST' as const,

  request: {
    params: {
      id: {
        type: 'ObjectId',
        required: true
      }
    },
    body: {
      publishedAt: {
        type: 'Date',
        required: false,
        description: 'Schedule publish time (defaults to now)'
      }
    }
  },

  response: {
    success: {
      status: 200,
      body: {
        success: 'boolean',
        message: 'string',
        data: {
          id: 'ObjectId',
          status: 'published',
          publishedAt: 'Date'
        }
      }
    },
    error: {
      status: 400,
      body: {
        success: false,
        message: 'string',
        reason: 'string'
      }
    }
  },

  permissions: ['publish:courses'],

  notes: `
    - Course must have at least one module
    - Cannot publish archived courses
    - Validates all content is complete
    - Sends notification to enrolled learners
  `
}
```

### Pattern 4: Nested Resource

```typescript
listModules: {
  endpoint: '/courses/:courseId/modules',
  method: 'GET' as const,

  request: {
    params: {
      courseId: {
        type: 'ObjectId',
        required: true
      }
    },
    query: {
      includeUnpublished: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Staff only - include unpublished modules'
      }
    }
  },

  response: {
    success: {
      status: 200,
      body: {
        success: 'boolean',
        data: {
          courseId: 'ObjectId',
          modules: [
            {
              id: 'ObjectId',
              title: 'string',
              order: 'number',
              type: 'scorm|custom|exercise',
              isPublished: 'boolean',
              /* ... */
            }
          ]
        }
      }
    }
  },

  permissions: ['read:courses'],

  notes: `
    - Returns modules in order
    - Learners only see published modules
    - Staff see all modules if includeUnpublished=true
  `
}
```

---

## 🎯 Contract Checklist

Before committing a contract, verify:

### Completeness
- [ ] All CRUD endpoints defined (if applicable)
- [ ] All action endpoints defined (publish, archive, etc.)
- [ ] All nested resources defined (if applicable)
- [ ] Request shapes complete (params, query, body, headers)
- [ ] Response shapes complete (success & error cases)
- [ ] Examples provided for each endpoint
- [ ] Permissions specified for each endpoint

### Quality
- [ ] Field types match database schema
- [ ] Validation rules documented (min/max, patterns, enums)
- [ ] Edge cases documented in notes
- [ ] Breaking changes flagged (if updating existing contract)
- [ ] Consistent naming conventions
- [ ] TypeScript compiles without errors

### Documentation
- [ ] Description for each field
- [ ] Notes explain business logic
- [ ] Error cases documented
- [ ] Permission requirements clear
- [ ] Examples are realistic

### Coordination
- [ ] PENDING.md updated to 📝 Defined
- [ ] Commit message follows convention: `feat(contracts): add X contract`
- [ ] Frontend team notified
- [ ] No conflicts with existing contracts

---

## 📋 Common Patterns Reference

### Standard Response Wrapper
```typescript
{
  success: 'boolean',
  message: 'string',
  data: { /* resource */ }
}
```

### Pagination
```typescript
{
  page: 'number',
  limit: 'number',
  total: 'number',
  totalPages: 'number',
  hasNext: 'boolean',
  hasPrev: 'boolean'
}
```

### Error Response
```typescript
{
  success: false,
  message: 'string',
  errors: [
    {
      field: 'string',
      message: 'string',
      value: 'any'
    }
  ]
}
```

### Standard Query Params
```typescript
query: {
  page: { type: 'number', default: 1 },
  limit: { type: 'number', default: 10 },
  sort: { type: 'string', default: '-createdAt' },
  search: { type: 'string', required: false }
}
```

---

## 🚦 Status Codes

**Use consistently:**
- `200` - Success (GET, PUT, PATCH, POST actions)
- `201` - Created (POST new resources)
- `204` - No Content (DELETE)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (logged in but no permission)
- `404` - Not Found
- `409` - Conflict (duplicate, constraint violation)
- `500` - Internal Server Error

---

## 📖 Resources

- **Example Contract:** `contracts/api/auth.contract.ts`
- **API Spec:** `devdocs/Ideal_RestfulAPI_toCurrent_Crosswalk.md`
- **Implementation Plan:** `devdocs/CONTRACT_IMPLEMENTATION_PLAN.md`
- **Status Tracking:** `contracts/PENDING.md`
- **Team Guide:** `~/github/TEAM_COORDINATION_GUIDE.md`

---

## ❓ FAQ

**Q: How detailed should contracts be?**
A: Very detailed. Include ALL fields, validation rules, edge cases. Frontend relies on this being accurate.

**Q: What if the implementation differs from the contract?**
A: Update the contract first, then implement. Contract is the source of truth.

**Q: Can I change a contract after frontend starts implementing?**
A: Non-breaking changes (add optional fields) are OK. Breaking changes (rename/remove fields) need coordination via [CONTRACT] tag.

**Q: Do I need to implement immediately after creating the contract?**
A: No. Contracts-first means frontend can start while you implement. But communicate expected timeline.

**Q: What if I'm not sure about a design decision?**
A: Document options in notes, flag for discussion, or ask frontend team their preference.

---

**Ready to create contracts! Start with Phase 1. 🚀**
