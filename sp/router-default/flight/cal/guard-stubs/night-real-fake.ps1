param([string]$AtText)
& 'C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\flight-eq\night-gates.ps1' -At $AtText -FakeJson 'C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\router-default\flight\cal\guard-stubs\fake-standby.json'
exit $LASTEXITCODE
