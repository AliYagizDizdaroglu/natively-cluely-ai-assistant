Option Explicit
Dim shell, files, root, electron, env
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
root = files.GetParentFolderName(WScript.ScriptFullName)
electron = files.BuildPath(root, "node_modules\electron\dist\electron.exe")
If Not files.FileExists(electron) Or Not files.FileExists(files.BuildPath(root, "dist\index.html")) Or Not files.FileExists(files.BuildPath(root, "dist-electron\electron\main.js")) Then
    MsgBox "Build Natively first: npm run build, then npm run build:electron.", vbExclamation, "Natively"
    WScript.Quit 1
End If
shell.CurrentDirectory = root
Set env = shell.Environment("PROCESS")
env("NODE_ENV") = "production"
env.Remove "ELECTRON_RUN_AS_NODE"
' Launch the GUI executable directly. No cmd.exe, npm console, or log window.
shell.Run Chr(34) & electron & Chr(34) & " " & Chr(34) & root & Chr(34), 1, False
