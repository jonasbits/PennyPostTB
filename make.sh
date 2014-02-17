#! /bin/bash
EXCLUDE=""
HHMM=$( date +%H%M )
OUT="penny-build(""$HHMM"").zip"

while getopts "vc" opt; do
  case $opt in
    c)
      echo "-c)lean was triggered!" >&2
      MESSAGE+=" -c)lean was triggered"
      rm *.zip *.xpi && MESSAGE+=" and files deleted "
      ;;
    v)
      echo "-v)alidate was triggered!" >&2
      EXCLUDE="lib/ppost.jar"
      MESSAGE+=" -v)alidate was triggered - go to https://addons.mozilla.org/en-US/developers/addon/validate "
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      MESSAGE+=" HELP -v validate - exclude 16 mb file, -c clean remove xpi and zip files "
      ;;
  esac
done

zip -x $EXCLUDE "*.*~" "*.sh" "*.xpi" "*.md" "*.zip" -r $OUT * 
cp $OUT "$OUT"".xpi"
echo $MESSAGE
