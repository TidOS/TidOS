#!/bin/sh

#xmodmap ~/.Xmodmap
#xset r 117
#xset r 111
#xset r 109
#xset m 1 1
xbindkeys&
trayer --edge bottom --align right --distance 0 --widthtype request --height 16 --SetDockType true --expand true --transparent false --tint 0x000000 --distance 0 --padding 0&

nm-applet&
#xrandr --output LVDS1 --mode 1280x800 --above VGA1
#xrandr --output VGA1 --mode 1280x960 --below LVDS1

nitrogen --set-tiled /usr/share/tidus/Tidustile.jpg
#xcompmgr &

# exec startkde
# exec startxfce4
#exec gnome-shell
#exec awesome
#exec gnome-session
#exec startkde
#exec compiz ccp
#exec openbox
exec xmonad
