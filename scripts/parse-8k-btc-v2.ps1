$results = @()
$files = Get-ChildItem "C:\Users\edwin\dat-tracker-next\data\sec\mstr\8k\*.html" | Sort-Object Name

Write-Host "Parsing $($files.Count) 8-Ks for BTC events..."

foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName)
    $text = $content -replace '<[^>]+>',' ' -replace '&nbsp;',' ' -replace '&#160;',' ' -replace '&[^;]+;',' ' -replace '\s+',' '
    
    # Extract filing date from filename
    $dateMatch = [regex]::Match($f.Name, '(\d{4}-\d{2}-\d{2})')
    $filingDate = if ($dateMatch.Success) { $dateMatch.Groups[1].Value } else { "unknown" }
    
    # Extract accession from filename
    $accMatch = [regex]::Match($f.Name, '-(\d{6})\.html')
    $accSuffix = if ($accMatch.Success) { $accMatch.Groups[1].Value } else { "" }
    
    $btcAcquired = $null
    $avgPrice = $null
    $totalSpent = $null
    $snippet = $null
    
    # Pattern 1: "acquired approximately X bitcoins" (older format)
    $pattern1 = [regex]::Match($text, 'acquired approximately ([\d,]+) bitcoins? for approximately \$([\d.]+) (billion|million).*?average price of approximately \$ ?([\d,]+)')
    if ($pattern1.Success) {
        $btcAcquired = $pattern1.Groups[1].Value -replace ',',''
        $multiplier = if ($pattern1.Groups[3].Value -eq 'billion') { 1000000000 } else { 1000000 }
        $totalSpent = [double]($pattern1.Groups[2].Value) * $multiplier
        $avgPrice = $pattern1.Groups[4].Value -replace ',',''
        $snippet = $pattern1.Value
    }
    
    # Pattern 2: "acquired X BTC" or "purchased X BTC" (various)
    if (-not $btcAcquired) {
        $pattern2 = [regex]::Match($text, '(acquired|purchased) ([\d,]+) (BTC|bitcoin)')
        if ($pattern2.Success) {
            $btcAcquired = $pattern2.Groups[2].Value -replace ',',''
        }
    }
    
    # Pattern 3: Table format "BTC Acquired (1) ... X" (newer weekly format)
    if (-not $btcAcquired -or $btcAcquired -eq "0") {
        # Look for numbers after "BTC Acquired" in table format
        $tableMatch = [regex]::Match($text, 'During Period[^0-9]*(\w+ \d+, \d{4})[^0-9]*to[^0-9]*(\w+ \d+, \d{4}).*?BTC Acquired.*?([\d,]+)\s+\$\s*([\d,.]+)\s+\$\s*([\d,]+)')
        if ($tableMatch.Success) {
            $btcAcquired = $tableMatch.Groups[3].Value -replace ',',''
            $totalSpent = $tableMatch.Groups[4].Value -replace ',',''
            $avgPrice = $tableMatch.Groups[5].Value -replace ',',''
            $snippet = "Period: " + $tableMatch.Groups[1].Value + " to " + $tableMatch.Groups[2].Value
        }
    }
    
    # Pattern 4: Look for total holdings
    $holdingsMatch = [regex]::Match($text, '(Aggregate BTC Holdings|total of approximately|aggregate of|hold approximately) ([\d,]+) (BTC|bitcoin)')
    $holdings = if ($holdingsMatch.Success) { $holdingsMatch.Groups[2].Value -replace ',','' } else { $null }
    
    # Only save if we found BTC data
    if ($btcAcquired -and [int]$btcAcquired -gt 0) {
        $results += [PSCustomObject]@{
            filingDate = $filingDate
            filename = $f.Name
            accession = $accSuffix
            btcAcquired = [int]$btcAcquired
            avgPriceUsd = if ($avgPrice) { [int]$avgPrice } else { $null }
            totalSpentUsd = if ($totalSpent) { [long]$totalSpent } else { $null }
            totalHoldings = if ($holdings) { [int]$holdings } else { $null }
            snippet = $snippet
        }
        
        $priceStr = if ($avgPrice) { "`$$avgPrice" } else { "N/A" }
        Write-Host "$filingDate | +$btcAcquired BTC @ $priceStr"
    }
}

Write-Host "`nFound $($results.Count) BTC acquisition events"

# Save to JSON
$results | ConvertTo-Json -Depth 3 | Out-File "C:\Users\edwin\dat-tracker-next\data\sec\mstr\btc-events.json" -Encoding UTF8
Write-Host "Saved to btc-events.json"
