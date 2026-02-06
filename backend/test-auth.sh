#!/bin/bash

echo "==================================="
echo "Testing Authentication Endpoints"
echo "==================================="
echo ""

# Test 1: Register a new user
echo "1. Testing User Registration..."
echo "POST /api/auth/register"
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Smith",
    "email": "alice@example.com",
    "password": "password123"
  }')

echo "$REGISTER_RESPONSE" | python3 -m json.tool
echo ""

# Extract token from registration response
TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)

echo "-----------------------------------"
echo ""

# Test 2: Login
echo "2. Testing User Login..."
echo "POST /api/auth/login"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "password123"
  }')

echo "$LOGIN_RESPONSE" | python3 -m json.tool
echo ""

# Extract token from login response
if [ -z "$TOKEN" ];then
  TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)
fi

echo "-----------------------------------"
echo ""

# Test 3: Get current user (protected route)
echo "3. Testing Protected Route (Get Current User)..."
echo "GET /api/auth/me"
if [ -n "$TOKEN" ]; then
  echo "Using token: ${TOKEN:0:50}..."
  curl -s -X GET http://localhost:3000/api/auth/me \
    -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
else
  echo "❌ No token available - skipping protected route test"
fi

echo ""
echo "==================================="
echo "Testing Complete!"
echo "==================================="
