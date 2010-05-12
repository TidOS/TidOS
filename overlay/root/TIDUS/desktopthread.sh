\#!/bin/bash
# screenshotfaggotry.sh
# direct cool stories, monnies, bug reports, etc. to blargh on #/g/tv - Rizon or blargh.macfag@googlemail.com
# modified for TidOS by DEAFTONEGOS (false King Neckbeard)

# INITIAL COMMENT
COM="/g/ - Desktops, posted from TidOS"

NAME="TIDUS"
SUB=""
EMAIL=""
PWD="lolololol"
TMP=`mktemp -t shitty.script.XXXX`
BOARD="http://sys.4chan.org/g/post"
SHOOT=`scrot`

scrot /tmp/lol.png
curl -A furryfox -F "resto=$URL" -F "name=$NAME" -F "email=$EMAIL" -F "sub=$SUB" -F "com=$COM" -F "upfile=@/tmp/lol.png" -F "pwd=$PWD" -F "mode=regist" -F "submit=submit" $BOARD > $TMP
COM=""
if [ "$URL" = "" ]; then
	URL=`cat $TMP | egrep -o 'thread:0,no:[0-9]+' | egrep -o '[0-9]{4,}'`
	echo "posting in http://boards.4chan.org/g/$URL"
	nohup firefox http://boards.4chan.org/g/res/$URL &
fi

rm -f $TMP $IMAGE
exit 0
