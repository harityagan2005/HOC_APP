# Enable TCP/IP protocol in registry
$keys = Get-ChildItem -Path "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server" -Recurse -ErrorAction SilentlyContinue | Where-Object {$_.Name -like "*SuperSocketNetLib\Tcp"}
foreach ($k in $keys) {
    $regPath = "Registry::$($k.Name)"
    Set-ItemProperty -Path $regPath -Name "Enabled" -Value 1
    Write-Output "Enabled TCP protocol at $regPath"
    
    # Also ensure TCP Port is set to 1433 for IPAll
    $ipAllPath = "$regPath\IPAll"
    if (Test-Path $ipAllPath) {
        Set-ItemProperty -Path $ipAllPath -Name "TcpPort" -Value "1433"
        Set-ItemProperty -Path $ipAllPath -Name "TcpDynamicPorts" -Value ""
        Write-Output "Configured IPAll Port to 1433 at $ipAllPath"
    }
}

# Restart SQL Server service
Restart-Service -Name "MSSQLSERVER" -Force
Write-Output "MSSQLSERVER service restarted successfully!"
