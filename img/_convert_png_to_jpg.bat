@echo off
setlocal

:: --- CONFIGURATION ---
:: Get the folder where this script is located
set "BASE_DIR=%~dp0"

:: Set path to IrfanView (Usually needs an absolute path unless it's in your System PATH)
set "IRFANVIEW_PATH=C:\Program Files\IrfanView\i_view64.exe"

:: Use relative subfolders or just the current folder
:: Current folder: "%BASE_DIR%"
:: Subfolder example: "%BASE_DIR%Output"
set "SOURCE_DIR=%BASE_DIR%"
set "DEST_DIR=%BASE_DIR%"
set "QUALITY=90"

echo Processing files in: %SOURCE_DIR%
echo Converting PNG to JPG (Quality: %QUALITY%%%)...

:: --- EXECUTION ---
"%IRFANVIEW_PATH%" "%SOURCE_DIR%*.png" /jpgq=%QUALITY% /silent /convert="%DEST_DIR%*.jpg"

if %ERRORLEVEL% EQU 0 (
    echo Success! JPGs created in the script folder.
) else (
    echo Something went wrong. Check if IrfanView is installed at the correct path.
)

pause