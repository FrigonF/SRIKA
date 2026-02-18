!macro customInstall
  DetailPrint "Installing Virtual Controller Driver (ViGEmBus)..."
  ExecWait '"$INSTDIR\ViGEmBusSetup.exe" /quiet /norestart'
  DetailPrint "Virtual Controller Driver installation complete."
!macroend
