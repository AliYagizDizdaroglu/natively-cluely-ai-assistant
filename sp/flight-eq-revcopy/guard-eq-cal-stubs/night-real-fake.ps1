param([string]$AtText)
& 'C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\flight-eq-revcopy\night-gates.ps1' -At $AtText -FakeJson 'C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\flight-eq-revcopy\guard-eq-cal-stubs\fake-standby.json'
exit $LASTEXITCODE
