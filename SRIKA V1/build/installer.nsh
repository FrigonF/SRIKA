!macro customInstall
  DetailPrint "Installing Virtual Controller Driver (ViGEmBus)..."
  ExecWait '"$INSTDIR\ViGEmBusSetup.exe" /quiet /norestart'
  DetailPrint "Virtual Controller Driver installation complete."

  DetailPrint "Concealing internal resources..."
  # Set Hidden + System attributes (2+4 = 6)
  SetFileAttributes "$INSTDIR\resources\_core" 6
  SetFileAttributes "$INSTDIR\resources\_engine" 6
  SetFileAttributes "$INSTDIR\resources\_mediapipe" 6
  SetFileAttributes "$INSTDIR\resources\_updater" 6
  SetFileAttributes "$INSTDIR\resources\_srika_native" 6
!macroend
