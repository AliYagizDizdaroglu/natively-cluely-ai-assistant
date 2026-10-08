Set-Location 'C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\eq-tmp'
$files = $args -join ' '
$o = cmd /c "node ""C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\node_modules\vitest\vitest.mjs"" run $files --root ""C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\eq-tmp\p2rev"" --config ""C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\eq-tmp\p2rev\vitest.config.mjs"" 2>&1"
$o | Select-String -Pattern "(✓|×|❯|FAIL|Test Files|Tests |AssertionError|Error:)" | Select-Object -First 40
