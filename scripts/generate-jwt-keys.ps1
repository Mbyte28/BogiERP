# Genera las llaves RS256 para firmar y verificar los JWT.
# Las llaves quedan en backend/keys y no se versionan.

$ErrorActionPreference = "Stop"

$keysDir = Join-Path $PSScriptRoot "..\backend\keys"
New-Item -ItemType Directory -Force -Path $keysDir | Out-Null

$openssl = (Get-Command openssl -ErrorAction SilentlyContinue).Source
if (-not $openssl) {
    $candidato = Join-Path $env:ProgramFiles "Git\usr\bin\openssl.exe"
    if (Test-Path $candidato) {
        $openssl = $candidato
    }
}

if (-not $openssl) {
    throw "No se encontró openssl. Instálalo o ejecuta este script desde Git Bash."
}

$privada = Join-Path $keysDir "privateKey.pem"
$publica = Join-Path $keysDir "publicKey.pem"

& $openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out $privada
& $openssl rsa -pubout -in $privada -out $publica

Write-Host ""
Write-Host "Llaves generadas en: $(Resolve-Path $keysDir)"
Write-Host "  privateKey.pem  (solo backend, no compartir)"
Write-Host "  publicKey.pem"
