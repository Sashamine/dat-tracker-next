@echo off
cd /d C:\Users\edwin\dat-tracker-next

echo === companies.ts ===
grep -n -i -E "suig|1425355" src\data\companies.ts
echo.

echo === holdings-history.ts ===
grep -n -i -E "suig|1425355" src\data\holdings-history.ts
echo.

echo === earnings-data.ts ===
grep -n -i -E "suig|1425355" src\data\earnings-data.ts
echo.

echo === dilutive-instruments.ts ===
grep -n -i -E "suig|1425355" src\data\dilutive-instruments.ts
echo.

echo === company-sources.ts ===
grep -n -i -E "suig|1425355" src\data\company-sources.ts 2>nul
if errorlevel 1 echo NOT FOUND or no matches
echo.

echo === market-cap-overrides.ts ===
grep -n -i -E "suig|1425355" src\data\market-cap-overrides.ts 2>nul
if errorlevel 1 echo NOT FOUND or no matches
echo.

echo === provenance check ===
if exist src\data\provenance\suig.ts (echo FOUND) else echo NO PROVENANCE FILE
echo.

echo === app directory SUIG refs ===
grep -rn -i -E "suig|1425355" src\app\ 2>nul
if errorlevel 1 echo NO MATCHES IN src\app
echo.

echo === cgi-bin check ===
grep -rn "cgi-bin" src\ 2>nul
if errorlevel 1 echo NO CGI-BIN URLS FOUND
echo.

echo === All CIK 1425355 refs ===
grep -rn "1425355" src\ 2>nul
if errorlevel 1 echo NO MATCHES
echo.

echo === DONE ===
