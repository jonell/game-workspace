; Override default install directory for electron-builder NSIS
!macro customInit
  StrCpy $INSTDIR "$PROGRAMFILES64\蠢驴电竞"
!macroend
