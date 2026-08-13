# Dumps the local development database to a single .sql file.
#
# To move it onto Hostinger later:
#   1. hPanel -> Databases -> create a database and user
#   2. Either  mysql -h <host> -u <user> -p <db> < tablet-export.sql
#      or      phpMyAdmin -> Import -> choose this file
#   3. Point DATABASE_URL at the new host and restart the apps
#
# The dump carries schema and rows together, so nothing else has to move.

$mysqldump = "D:\RESTAU\.tools\mysql-8.0.40-winx64\bin\mysqldump.exe"
$out = Join-Path (Split-Path $PSScriptRoot -Parent) "tablet-export.sql"

& $mysqldump `
    --host=127.0.0.1 --port=3306 --user=tablet --password=tablet_dev_pw `
    --databases tablet `
    --single-transaction `
    --set-gtid-purged=OFF `
    --no-tablespaces `
    --result-file=$out

if ($LASTEXITCODE -eq 0) {
    $mb = [math]::Round((Get-Item $out).Length / 1MB, 2)
    Write-Output "Exported to $out ($mb MB)"
} else {
    Write-Output "Export failed with code $LASTEXITCODE"
}
