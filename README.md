# TidOS
This project was originally made out of necessity.  My laptop's hard drive was going out and I needed an OS to fit on a 1 GB flash drive while being as comfortable as possible and the result was TidOS.  The space ended up not being much of an issue, and I was even able to get ghc installed at about 450 MB.

NOTE:  this repository does not contain an iso, it was hosted at megaupload which went away and became mega.  The scripts also almost certainly no longer work, but many of the configuration files found in the root home directory should still be relevant if you're interested.

A preconfigured/prericed Arch Linux installation for those that want a quick and
dirty setup.

![screenshot](http://ompldr.org/vNGJmbg)

## Features

- `xmonad` + `conky` + `trayer` + `nm-applet` make up the DE
- Applications started via `dmenu` (Mozilla Firefox has a shortcut key)
- Preconfigured `mpd`
- Just works

## Getting started

If you're new to GNU/Linux, type `startx now` to start `xmonad`.

- `Win + r` = type name of program to run
- `Win + number` = go to desktop of number you pressed
- `Win + f` = open Firefox (opens on desktop 2)

## Possible bugs

- `networkmanager` applet not visible, to fix press `Win + r` and type `netfix`
  or run `netfix` in a console
- Music not playing, to fix restart `mpd` and run `mpc play`


## Scripts

There are desktop-related scripts in `~/TIDUS`

- `desktopthread` - posts desktop in /g/ and opens Firefox to it
- 
implying TidOS is dead
