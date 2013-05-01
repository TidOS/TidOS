# TidOS

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