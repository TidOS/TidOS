#!/bin/sh

xmodmap ~/.Xmodmap
#xset r 117
#xset r 111
#xset r 109
#xset m 1 1
xbindkeys&
nm-applet&

trayer --edge top --align right --SetDockType true --SetPartialStrut true \
 --expand true --width 3 --transparent false --tint 0x000000 --height 12 -padding 0&

#xrandr --output LVDS1 --mode 1280x800 --above VGA1
#xrandr --output VGA1 --mode 1280x960 --below LVDS1

nitrogen --restore
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
