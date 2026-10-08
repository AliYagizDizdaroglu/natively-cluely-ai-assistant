param([string]$AtText)
& 'C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\flight-eq\night-gates.ps1' -At $AtText -FakeJson 'C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\flight-eq\guard-eq-cal-stubs\fake-standby.json'
exit $LASTEXITCODE
