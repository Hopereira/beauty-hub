# Script to run SQL file on PostgreSQL database
param(
    [string]$SqlFile = "create-audit-tables.sql",
    [string]$Database = "beautyhub",
    [string]$User = "postgres"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlPath = Join-Path $scriptDir $SqlFile

if (-not (Test-Path $sqlPath)) {
    Write-Error "SQL file not found: $sqlPath"
    exit 1
}

Write-Host "Executing SQL file: $sqlPath" -ForegroundColor Cyan
Write-Host "Database: $Database" -ForegroundColor Cyan
Write-Host "User: $User" -ForegroundColor Cyan
Write-Host ""

# Read SQL content
$sqlContent = Get-Content $sqlPath -Raw

# Execute using Node.js script
$nodeScript = @"
const { Client } = require('pg');

const client = new Client({
    host: 'localhost',
    port: 5432,
    database: '$Database',
    user: '$User',
    password: 'postgres'
});

async function runSQL() {
    try {
        await client.connect();
        console.log('✅ Connected to database');
        
        const sql = \`$sqlContent\`;
        await client.query(sql);
        
        console.log('✅ SQL executed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runSQL();
"@

$tempFile = Join-Path $env:TEMP "run-sql-temp.js"
Set-Content -Path $tempFile -Value $nodeScript

try {
    node $tempFile
} finally {
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}
