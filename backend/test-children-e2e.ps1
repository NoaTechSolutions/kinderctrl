$ErrorActionPreference = 'Stop'

Write-Host "=== Children Module E2E Tests ===" -ForegroundColor Cyan

$ts = [int](Get-Date -UFormat %s)
$email = "childtest_$ts@test.com"
Write-Host "Using email: $email" -ForegroundColor Gray

# 1. Register DIRECTOR
Write-Host "`n[1] Register DIRECTOR..." -ForegroundColor Yellow
$registerBody = "{`"email`":`"$email`",`"password`":`"Test1234`",`"role`":`"DIRECTOR`"}"
$registerRes = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3002/auth/register" `
  -ContentType "application/json" `
  -Body $registerBody
$TOKEN = $registerRes.access_token
if (-not $TOKEN) { throw "No access_token in response" }
Write-Host "    PASS - access_token received" -ForegroundColor Green

# 2. Create Center
Write-Host "`n[2] Create Center..." -ForegroundColor Yellow
$centerBody = '{"name":"Sunny Days Daycare","street":"123 Main St","city":"San Francisco","state":"CA","zipCode":"94102","phone":"+14155550100","email":"contact@sunnydays.com","capacity":50}'
$centerRes = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3002/centers" `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -ContentType "application/json" `
  -Body $centerBody
$CENTER_ID = $centerRes.id
if (-not $CENTER_ID) { throw "No center.id" }
Write-Host "    PASS - center: $CENTER_ID" -ForegroundColor Green

# 3. Create Child (valid DOB: 2 years ago)
Write-Host "`n[3] Create Child..." -ForegroundColor Yellow
$dob = (Get-Date).AddYears(-2).ToString("yyyy-MM-dd")
$childBody = "{`"firstName`":`"Emma`",`"lastName`":`"Smith`",`"dateOfBirth`":`"${dob}T00:00:00.000Z`",`"gender`":`"Female`"}"
$childRes = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3002/centers/$CENTER_ID/children" `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -ContentType "application/json" `
  -Body $childBody
$CHILD_ID = $childRes.id
if (-not $CHILD_ID) { throw "No child.id" }
if ($childRes.status -ne "ACTIVE") { throw "Status should be ACTIVE, got $($childRes.status)" }
if ($childRes.firstName -ne "Emma") { throw "Wrong firstName" }
Write-Host "    PASS - child: $CHILD_ID, status=ACTIVE" -ForegroundColor Green

# 4. List children (default = ACTIVE only)
Write-Host "`n[4] List children..." -ForegroundColor Yellow
$list = Invoke-RestMethod -Method GET `
  -Uri "http://localhost:3002/centers/$CENTER_ID/children" `
  -Headers @{ Authorization = "Bearer $TOKEN" }
if ($list.Count -ne 1) { throw "Expected 1 child, got $($list.Count)" }
Write-Host "    PASS - 1 active child returned" -ForegroundColor Green

# 5. Get Child detail (with includes)
Write-Host "`n[5] Get child detail..." -ForegroundColor Yellow
$detail = Invoke-RestMethod -Method GET `
  -Uri "http://localhost:3002/children/$CHILD_ID" `
  -Headers @{ Authorization = "Bearer $TOKEN" }
if ($detail.firstName -ne "Emma") { throw "Wrong firstName in detail" }
if ($null -eq $detail.center) { throw "center include missing" }
if ($null -ne $detail.medicalInfo) { throw "medicalInfo should be null at this point" }
Write-Host "    PASS - detail with center include, medicalInfo=null" -ForegroundColor Green

# 6. Update Child (PATCH lastName)
Write-Host "`n[6] Update child lastName..." -ForegroundColor Yellow
$updated = Invoke-RestMethod -Method PATCH `
  -Uri "http://localhost:3002/children/$CHILD_ID" `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -ContentType "application/json" `
  -Body '{"lastName":"Johnson"}'
if ($updated.lastName -ne "Johnson") { throw "lastName not updated" }
Write-Host "    PASS - lastName -> Johnson" -ForegroundColor Green

# 7. Set Medical Info (upsert: create)
Write-Host "`n[7] Set medical info (create)..." -ForegroundColor Yellow
$medical = Invoke-RestMethod -Method PUT `
  -Uri "http://localhost:3002/children/$CHILD_ID/medical-info" `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -ContentType "application/json" `
  -Body '{"allergies":["peanuts","dairy"],"doctorName":"Dr. Johnson","insurancePolicy":"BCBS-12345"}'
if (-not $medical.id) { throw "Medical info not created" }
if ($medical.doctorName -ne "Dr. Johnson") { throw "Wrong doctorName" }
if ($medical.insurancePolicy -ne "BCBS-12345") { throw "Wrong insurancePolicy" }
Write-Host "    PASS - medical info created" -ForegroundColor Green

# 8. Update Medical Info (upsert: update)
Write-Host "`n[8] Update medical info (upsert)..." -ForegroundColor Yellow
$medical2 = Invoke-RestMethod -Method PUT `
  -Uri "http://localhost:3002/children/$CHILD_ID/medical-info" `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -ContentType "application/json" `
  -Body '{"allergies":["peanuts"],"doctorName":"Dr. Smith"}'
if ($medical2.id -ne $medical.id) { throw "ID changed (should be same record)" }
if ($medical2.doctorName -ne "Dr. Smith") { throw "doctorName not updated" }
Write-Host "    PASS - same record updated (upsert works)" -ForegroundColor Green

# 9. Soft-delete (DELETE -> 204)
Write-Host "`n[9] Soft-delete (withdraw)..." -ForegroundColor Yellow
Invoke-RestMethod -Method DELETE `
  -Uri "http://localhost:3002/children/$CHILD_ID" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | Out-Null
Write-Host "    PASS - DELETE 204" -ForegroundColor Green

# 10. List after delete (default ACTIVE -> empty)
Write-Host "`n[10] List after delete (default filter)..." -ForegroundColor Yellow
$listAfter = Invoke-RestMethod -Method GET `
  -Uri "http://localhost:3002/centers/$CENTER_ID/children" `
  -Headers @{ Authorization = "Bearer $TOKEN" }
if ($listAfter.Count -ne 0) { throw "Expected 0 active children, got $($listAfter.Count)" }
Write-Host "    PASS - 0 active children (WITHDRAWN excluded)" -ForegroundColor Green

# 11. List with status=all (returns WITHDRAWN child)
Write-Host "`n[11] List with status=all..." -ForegroundColor Yellow
$allList = Invoke-RestMethod -Method GET `
  -Uri "http://localhost:3002/centers/$CENTER_ID/children?status=all" `
  -Headers @{ Authorization = "Bearer $TOKEN" }
if ($allList.Count -ne 1) { throw "Expected 1 child total, got $($allList.Count)" }
if ($allList[0].status -ne "WITHDRAWN") { throw "Expected WITHDRAWN, got $($allList[0].status)" }
Write-Host "    PASS - 1 child WITHDRAWN" -ForegroundColor Green

# 12. Date validation: child older than 10 years -> 400
Write-Host "`n[12] Date validation (15 years old child)..." -ForegroundColor Yellow
$badDob = (Get-Date).AddYears(-15).ToString("yyyy-MM-dd")
$badBody = "{`"firstName`":`"Too`",`"lastName`":`"Old`",`"dateOfBirth`":`"${badDob}T00:00:00.000Z`",`"gender`":`"Male`"}"
$rejected = $false
try {
  Invoke-RestMethod -Method POST `
    -Uri "http://localhost:3002/centers/$CENTER_ID/children" `
    -Headers @{ Authorization = "Bearer $TOKEN" } `
    -ContentType "application/json" `
    -Body $badBody | Out-Null
} catch {
  if ($_.Exception.Response.StatusCode.value__ -eq 400) {
    $rejected = $true
  } else {
    throw "Expected 400, got $($_.Exception.Response.StatusCode.value__)"
  }
}
if (-not $rejected) { throw "Should have rejected with 400" }
Write-Host "    PASS - 400 BadRequest for >10yr old" -ForegroundColor Green

# 13. Idempotent DELETE (second delete on WITHDRAWN -> still 204)
Write-Host "`n[13] Idempotent DELETE..." -ForegroundColor Yellow
Invoke-RestMethod -Method DELETE `
  -Uri "http://localhost:3002/children/$CHILD_ID" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | Out-Null
Write-Host "    PASS - 2nd DELETE 204 (idempotent)" -ForegroundColor Green

Write-Host "`n=== ALL TESTS PASSED (13/13) ===" -ForegroundColor Green
