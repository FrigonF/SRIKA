!macro customInstall
  DetailPrint "Checking for ViGEmBus Driver..."
  SetOutPath "$TEMP"
  ; Use PROJECT_DIR to locate the file in the project root/resources
  File "${PROJECT_DIR}\resources\ViGEmBusSetup.exe"
  
  DetailPrint "running automated driver installer..."
  ; /quiet /norestart for silent install
  ExecWait '"$TEMP\ViGEmBusSetup.exe" /quiet /norestart' $0
  
  DetailPrint "Driver Setup Exit Code: $0"
!macroend
