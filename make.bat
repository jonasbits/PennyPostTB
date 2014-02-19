@echo off
cls
if x%1==x--clean goto clean
goto build
echo not possible

:clean
del *.zip *.xpi
echo zip and xpi files removed

:build
"c:\Program Files\7-Zip\7z.exe" u -tzip ppost.zip -r * -x@listfile.txt
copy /Y ppost.zip ppost.xpi