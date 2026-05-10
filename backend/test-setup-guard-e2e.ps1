$ErrorActionPreference = 'Stop'

Write-Host '=== Setup Complete Guard E2E Tests ===' -ForegroundColor Cyan

$base = 'http://localhost:3002'
$ts = [int](Get-Date -UFormat %s)
$email = "setupguard_$ts@test.com"
Write-Host "Email: $email" -ForegroundColor Gray

# 1. Register DIRECTOR (no centers yet)
Write-Host "`n[1] Register DIRECTOR..." -ForegroundColor Yellow
$registerBody = "{`"email`":`"$email`",`"password`":`"Test1234`",`"role`":`"DIRECTOR`"}"
$reg = Invoke-RestMethod -Method POST -Uri "$base/auth/register" `
  -ContentType 'application/json' -Body $registerBody
$TOKEN = $reg.access_token
$auth = @{ Authorization = "Bearer $TOKEN" }
if (-not $TOKEN) { throw 'No token' }
Write-Host '    PASS - registered + token received' -ForegroundColor Green

# 2. GET /auth/me works pre-setup (SkipSetupCheck on /me)
Write-Host "`n[2] GET /auth/me pre-setup..." -ForegroundColor Yellow
$me = Invoke-RestMethod -Method GET -Uri "$base/auth/me" -Headers $auth
if ($me.role -ne 'DIRECTOR') { throw 'Wrong role' }
Write-Host '    PASS - /auth/me returns 200 even without setup' -ForegroundColor Green

# 3. POST /centers (skip applies, creates SETUP_PENDING)
Write-Host "`n[3] POST /centers (create pending center)..." -ForegroundColor Yellow
$cBody = '{"name":"Setup Test Daycare","street":"123 Test St","city":"SF","state":"CA","zipCode":"94102","phone":"+14155550100","email":"daycare@test.com","capacity":50}'
$center = Invoke-RestMethod -Method POST -Uri "$base/centers" -Headers $auth `
  -ContentType 'application/json' -Body $cBody
$CENTER_ID = $center.id
if ($center.status -ne 'SETUP_PENDING') { throw "Status should be SETUP_PENDING, got $($center.status)" }
Write-Host "    PASS - center created, status=SETUP_PENDING ($CENTER_ID)" -ForegroundColor Green

# 4. POST /centers/:id/children -> 403 with redirectTo to pending center
Write-Host "`n[4] POST /centers/:id/children (should be 403)..." -ForegroundColor Yellow
$childBody = '{"firstName":"Test","lastName":"Kid","dateOfBirth":"2024-01-01T00:00:00.000Z","gender":"Male"}'
$blocked = $false
$redirectTo = $null
try {
  Invoke-RestMethod -Method POST -Uri "$base/centers/$CENTER_ID/children" -Headers $auth `
    -ContentType 'application/json' -Body $childBody | Out-Null
} catch {
  $statusCode = $null
  if ($_.Exception.Response) { $statusCode = [int]$_.Exception.Response.StatusCode }
  if ($statusCode -eq 403) {
    $blocked = $true
    # Body is consumed by Invoke-RestMethod; read from ErrorDetails
    $bodyObj = $_.ErrorDetails.Message | ConvertFrom-Json
    $redirectTo = $bodyObj.redirectTo
  } else {
    throw "Expected 403, got $statusCode"
  }
}
if (-not $blocked) { throw 'Should have been blocked' }
$expectedRedirect = "/centers/$CENTER_ID"
if ($redirectTo -ne $expectedRedirect) {
  throw "Wrong redirectTo. Expected $expectedRedirect, got $redirectTo"
}
Write-Host "    PASS - 403 with redirectTo='$redirectTo' (points to pending center)" -ForegroundColor Green

# 5. POST /centers/:id/hours (auto-flip to ACTIVE)
Write-Host "`n[5] POST /centers/:id/hours (5 days) -> auto-flip ACTIVE..." -ForegroundColor Yellow
$hoursBody = '{"hours":[{"dayOfWeek":1,"openTime":"07:00","closeTime":"18:00"},{"dayOfWeek":2,"openTime":"07:00","closeTime":"18:00"},{"dayOfWeek":3,"openTime":"07:00","closeTime":"18:00"},{"dayOfWeek":4,"openTime":"07:00","closeTime":"18:00"},{"dayOfWeek":5,"openTime":"07:00","closeTime":"18:00"}]}'
Invoke-RestMethod -Method POST -Uri "$base/centers/$CENTER_ID/hours" -Headers $auth `
  -ContentType 'application/json' -Body $hoursBody | Out-Null

# Verify status flipped to ACTIVE
$updated = Invoke-RestMethod -Method GET -Uri "$base/centers/$CENTER_ID" -Headers $auth
if ($updated.status -ne 'ACTIVE') { throw "Status should be ACTIVE, got $($updated.status)" }
Write-Host '    PASS - hours set, center auto-flipped to ACTIVE' -ForegroundColor Green

# 6. POST /centers/:id/children -> 201 (now allowed)
Write-Host "`n[6] POST /centers/:id/children (should pass now)..." -ForegroundColor Yellow
$child = Invoke-RestMethod -Method POST -Uri "$base/centers/$CENTER_ID/children" -Headers $auth `
  -ContentType 'application/json' -Body $childBody
$CHILD_ID = $child.id
if (-not $CHILD_ID) { throw 'No child created' }
Write-Host "    PASS - child created ($CHILD_ID), guard now allows" -ForegroundColor Green

# 7. New DIRECTOR with NO centers -> 403 with redirectTo /centers/new
Write-Host "`n[7] Brand-new DIRECTOR (no centers at all) -> redirectTo /centers/new..." -ForegroundColor Yellow
$ts2 = $ts + 1
$email2 = "newdir_$ts2@test.com"
$reg2Body = "{`"email`":`"$email2`",`"password`":`"Test1234`",`"role`":`"DIRECTOR`"}"
$reg2 = Invoke-RestMethod -Method POST -Uri "$base/auth/register" `
  -ContentType 'application/json' -Body $reg2Body
$TOKEN2 = $reg2.access_token
$auth2 = @{ Authorization = "Bearer $TOKEN2" }

# Try to access children with no centers anywhere
$blocked2 = $false
$redirectTo2 = $null
try {
  Invoke-RestMethod -Method POST -Uri "$base/centers/$CENTER_ID/children" -Headers $auth2 `
    -ContentType 'application/json' -Body $childBody | Out-Null
} catch {
  $statusCode = $null
  if ($_.Exception.Response) { $statusCode = [int]$_.Exception.Response.StatusCode }
  if ($statusCode -eq 403) {
    $blocked2 = $true
    $bodyObj = $_.ErrorDetails.Message | ConvertFrom-Json
    $redirectTo2 = $bodyObj.redirectTo
  } else {
    throw "Expected 403, got $statusCode"
  }
}
if (-not $blocked2) { throw 'New director should have been blocked' }
if ($redirectTo2 -ne '/centers/new') { throw "Expected /centers/new, got $redirectTo2" }
Write-Host "    PASS - 403 with redirectTo='/centers/new' (no pending center yet)" -ForegroundColor Green

# 8. Cleanup: logout (skip applies)
Write-Host "`n[8] POST /auth/logout (skip applies)..." -ForegroundColor Yellow
Invoke-RestMethod -Method POST -Uri "$base/auth/logout" -Headers $auth | Out-Null
Write-Host '    PASS - logout works (skip applies)' -ForegroundColor Green

Write-Host "`n=== ALL TESTS PASSED (8/8) ===" -ForegroundColor Green
