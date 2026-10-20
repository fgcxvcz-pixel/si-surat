#!/bin/bash
# Test Audit Trail Implementation
# Script untuk testing semua endpoint audit trail

BASE_URL="http://localhost:3000/api"
TOKEN="Bearer YOUR_JWT_TOKEN_HERE"

echo "=== Audit Trail Testing ==="
echo ""

# Test 1: Create Surat Keluar (should log CREATE)
echo "Test 1: Creating Surat Keluar (CREATE log)..."
curl -X POST "$BASE_URL/surat-keluar" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tujuan": "PT Testing",
    "perihal": "Test Surat",
    "tanggal_kirim": "2026-10-16",
    "jenis_surat": "surat tugas",
    "kategori": "biasa",
    "isi_surat": "Ini adalah surat test"
  }' | jq .
echo ""

# Test 2: Get Audit Logs (Master)
echo "Test 2: Fetching Master Audit Logs..."
curl -X GET "$BASE_URL/audit-logs?page=1&limit=10" \
  -H "Authorization: $TOKEN" | jq '.data[] | {id, action_type, table_name, record_id, description, created_at}'
echo ""

# Test 3: Update Surat Keluar (should log UPDATE with before/after)
echo "Test 3: Updating Surat Keluar (UPDATE log)..."
curl -X PATCH "$BASE_URL/surat-keluar/1" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "perihal": "Test Surat - Updated",
    "kategori": "penting"
  }' | jq .
echo ""

# Test 4: Get Timeline for specific document
echo "Test 4: Fetching Timeline for Surat Keluar ID 1..."
curl -X GET "$BASE_URL/audit-logs/timeline/surat_keluar/1" \
  -H "Authorization: $TOKEN" | jq '.[] | {action_type, user_nama, description, old_values, new_values}'
echo ""

# Test 5: Approve Surat Keluar (should log APPROVE)
echo "Test 5: Approving Surat Keluar (APPROVE log)..."
curl -X POST "$BASE_URL/surat-keluar/1/approve" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "catatan": "Disetujui"
  }' | jq .
echo ""

# Test 6: Export CSV
echo "Test 6: Exporting Audit Logs to CSV..."
curl -X POST "$BASE_URL/audit-logs/export" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "table_name": "surat_keluar",
    "action_type": "UPDATE"
  }' | jq '.csv' -r | head -5
echo ""

echo "=== Testing Complete ==="
