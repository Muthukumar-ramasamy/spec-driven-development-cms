export const testUsers = {
  admin: {
    email: 'admin@test-crm.com',
    password: 'TestAdmin123!',
    role: 'admin' as const,
  },
  manager: {
    email: 'manager@test-crm.com',
    password: 'TestManager123!',
    role: 'manager' as const,
  },
  salesRep: {
    email: 'salesrep@test-crm.com',
    password: 'TestSalesRep123!',
    role: 'sales_rep' as const,
  },
}
