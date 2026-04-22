$body = @{email='admin@inventory.com';password='Admin@123'} | ConvertTo-Json
$response = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/auth/login' -Method POST -Body $body -ContentType 'application/json'
$token = $response.token
Write-Host "Token: $token"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "`n=== 1. Get Roles List ===" -ForegroundColor Cyan
$roles = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/roles' -Method GET -Headers $headers
$roles.data | ForEach-Object { Write-Host "$($_.name) - $($_.id)" }

$staffRole = ($roles.data | Where-Object { $_.name -eq "STAFF" })[0]

Write-Host "`n=== 2. Create New User (No Role - Default to VIEWER) ===" -ForegroundColor Cyan
$createBody = @{
    email = "jane.smith2@example.com"
    password = "Test@123456"
    first_name = "Jane"
    last_name = "Smith"
    phone = "+9876543210"
} | ConvertTo-Json

$newUser = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/users' -Method POST -Headers $headers -Body $createBody -ContentType 'application/json'
Write-Host "User created:"
$newUser | ConvertTo-Json -Depth 3

$userId = $newUser.user.id

Write-Host "`n=== 3. Update User to Change Role to STAFF ===" -ForegroundColor Cyan
$updateBody = @{
    first_name = "Jane"
    last_name = "Smith"
    role_ids = @($staffRole.id)
} | ConvertTo-Json

$updatedUser = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/users/$userId" -Method PUT -Body $updateBody -Headers $headers -ContentType 'application/json'
Write-Host "User after role update:"
$updatedUser | ConvertTo-Json -Depth 3

Write-Host "`n=== SUCCESS ===" -ForegroundColor Green