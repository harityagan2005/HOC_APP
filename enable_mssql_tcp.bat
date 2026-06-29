@echo off
:: Batch script to enable TCP/IP for MS SQL Server 2017
:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running with Administrator privileges...
) else (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo Enabling SQL Server TCP/IP settings...
powershell -Command "Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL17.MSSQLSERVER\MSSQLServer\SuperSocketNetLib\Tcp' -Name Enabled -Value 1"
powershell -Command "Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL17.MSSQLSERVER\MSSQLServer\SuperSocketNetLib\Tcp\IP10' -Name Enabled -Value 1"
powershell -Command "Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL17.MSSQLSERVER\MSSQLServer\SuperSocketNetLib\Tcp\IP9' -Name Enabled -Value 1"

echo Restarting SQL Server service...
powershell -Command "Restart-Service -Name MSSQLSERVER -Force"

echo.
echo Done! TCP/IP enabled and SQL Server restarted.
pause
