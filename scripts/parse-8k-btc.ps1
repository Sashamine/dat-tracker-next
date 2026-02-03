$results = @()
$files = Get-ChildItem "C:\Users\edwin\dat-tracker-next\data\sec\mstr\8k\*.html" | Sort-Object Name

Write-Host "Parsing $($files.Count) 8-Ks for BTC events..."

foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName)
    $text = $content -replace '<[^>]+>',' ' -replace '&[^;]+;',' ' -replace '\s+',' '
    
    # Look for BTC acquisition patterns
    if ($text -match 'BTC Acquired|bitcoin.*acquired|purchased.*bitcoin') {
        # Extract filing date from filename
        $dateMatch = [regex]::Match($f.Name, '(\d{4}-\d{2}-\d{2})')
        $filingDate = if ($dateMatch.Success) { $dateMatch.Groups[1].Value } else { "unknown" }
        
        # Extract BTC acquired (period amount)
        $btcAcquired = "0"
        $btcMatches = [regex]::Matches($text, 'BTC Acquired[^\d]*(\d{1,3},?\d{0,3})')
        if ($btcMatches.Count -gt 0) {
            $btcAcquired = $btcMatches[0].Groups[1].Value
        }
        
        # Extract average purchase price
        $avgPrice = "N/A"
        $priceMatches = [regex]::Matches($text, 'Average Purchase Price[^\d]*\$?\s*(\d{2,3},?\d{3})')
        if ($priceMatches.Count -gt 0) {
            $avgPrice = $priceMatches[0].Groups[1].Value
        }
        
        # Extract aggregate holdings
        $holdings = "N/A"
        $holdingsMatches = [regex]::Matches($text, 'Aggregate BTC Holdings[^\d]*(\d{2,3},\d{3})')
        if ($holdingsMatches.Count -gt 0) {
            $holdings = $holdingsMatches[0].Groups[1].Value
        }
        
        # Extract the BTC update paragraph
        $paragraph = ""
        $paraMatch = [regex]::Match($text, '(BTC Updates?.*?(?:bitcoin purchases|BTC Holdings)[^.]*\.)')
        if ($paraMatch.Success) {
            $paragraph = $paraMatch.Groups[1].Value.Substring(0, [Math]::Min(500, $paraMatch.Groups[1].Value.Length))
        }
        
        # Get accession number from filename
        $accMatch = [regex]::Match($f.Name, '-(\d{6})\.html')
        $accSuffix = if ($accMatch.Success) { $accMatch.Groups[1].Value } else { "" }
        
        $results += [PSCustomObject]@{
            filingDate = $filingDate
            filename = $f.Name
            btcAcquired = $btcAcquired
            avgPrice = $avgPrice
            totalHoldings = $holdings
            snippet = $paragraph
        }
        
        Write-Host "$filingDate | +$btcAcquired BTC @ $avgPrice | Total: $holdings"
    }
}

Write-Host "`nFound $($results.Count) BTC acquisition events"

# Save to JSON
$results | ConvertTo-Json -Depth 3 | Out-File "C:\Users\edwin\dat-tracker-next\data\sec\mstr\btc-events.json" -Encoding UTF8
Write-Host "Saved to btc-events.json"
