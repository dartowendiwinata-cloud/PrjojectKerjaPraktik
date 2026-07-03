# Test Credentials - Abah Orchid Dashboard

## Owner Account
- Email: owner@company.com
- Username shortcut: owner
- Password: password
- Role: owner
- Redirects to: /owner/dashboard

## Admin Account  
- Email: admin@company.com
- Username shortcut: admin
- Password: password
- Role: admin
- Redirects to: /admin/transactions

## API
- Login endpoint: POST /api/auth/login with {"identity": "owner|admin|email", "password": "password"}
- Returns JWT token, send as Authorization: Bearer <token>

## Seeded Data
- 60 transactions across 5 categories
- 4 stocks
- 3 data sources
- 1 sync setting (default)
