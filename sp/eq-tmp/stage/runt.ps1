Set-Location 'C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\eq-tmp'
$files = $args
$o = cmd /c "node ""C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\node_modules\vitest\vitest.mjs"" run $files --root ""C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\.claude\worktrees\eq-build"" 2>&1"
$o | Select-String -Pattern "^\s*(✓|×|❯)|FAIL|Test Files|Tests |AssertionError|Error:" | Select-Object -First 40