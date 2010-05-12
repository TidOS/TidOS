#### Change these settings to modify how this ISO is built.
#  The directory that you'll be using for the actual build process.
WORKDIR=work
#  A list of packages to install, either space separated in a string or line separated in a file. Can include groups.
PACKAGES="$(shell cat packages.list) syslinux"
# The name of our ISO. Does not specify the architecture!
NAME=TidOS
# Version will be appended to the ISO.
VER=9000.01
# Kernel version. You'll need this.
KVER=2.6.33-ARCH
# Architecture will also be appended to the ISO name.
ARCH?=$(shell uname -m)
# Current working directory
PWD:=$(shell pwd)
# This is going to be the full name the final iso/img will carry
FULLNAME="$(PWD)"/$(NAME)-$(VER)-$(ARCH)

# Default make instruction to build everything.
all: TidOS

# The following will first run the base-fs routine before creating the final iso image.
TidOS: base-fs
	mkarchiso -p syslinux iso "$(WORKDIR)" "$(FULLNAME)".iso

# This is the main rule for make the working filesystem. It will run routines from left to right. 
# Thus, root-image is called first and syslinux is called last.
base-fs: root-image boot-files initcpio overlay iso-mounts syslinux

# The root-image routine is always executed first. 
# It only downloads and installs all packages into the $WORKDIR, giving you a basic system to use as a base.
root-image: "$(WORKDIR)"/root-image/.arch-chroot
"$(WORKDIR)"/root-image/.arch-chroot:
root-image:
	mkarchiso -p $(PACKAGES) create "$(WORKDIR)"

# Rule for make /boot
boot-files: root-image
	cp -r "$(WORKDIR)"/root-image/boot "$(WORKDIR)"/iso/
	cp -r boot-files/* "$(WORKDIR)"/iso/boot/

# Rules for initcpio images
initcpio: "$(WORKDIR)"/iso/boot/TidOS.img
"$(WORKDIR)"/iso/boot/TidOS.img: mkinitcpio.conf "$(WORKDIR)"/root-image/.arch-chroot
	mkdir -p "$(WORKDIR)"/iso/boot
	mkinitcpio -c ./mkinitcpio.conf -b "$(WORKDIR)"/root-image -k $(KVER) -g $@

# See: Overlay
overlay:
	mkdir -p "$(WORKDIR)"/overlay/etc/pacman.d
	cp -r overlay "$(WORKDIR)"/
	wget -O "$(WORKDIR)"/overlay/etc/pacman.d/mirrorlist http://www.archlinux.org/mirrorlist/$(ARCH)/all/
	sed -i "s/#Server/Server/g" "$(WORKDIR)"/overlay/etc/pacman.d/mirrorlist

# Rule to process isomounts file.
iso-mounts: "$(WORKDIR)"/isomounts
"$(WORKDIR)"/isomounts: isomounts root-image
	sed "s|@ARCH@|$(ARCH)|g" isomounts > $@

# This routine is always executed just before generating the actual image. 
syslinux: root-image
	mkdir -p $(WORKDIR)/iso/boot/isolinux
	cp $(WORKDIR)/root-image/usr/lib/syslinux/*.c32 $(WORKDIR)/iso/boot/isolinux/
	cp $(WORKDIR)/root-image/usr/lib/syslinux/isolinux.bin $(WORKDIR)/iso/boot/isolinux/

# In case "make clean" is called, the following routine gets rid of all files created by this Makefile.
clean:
	rm -rf "$(WORKDIR)" "$(FULLNAME)".img "$(FULLNAME)".iso

.PHONY: all TidOS
.PHONY: base-fs
.PHONY: root-image boot-files initcpio overlay iso-mounts
.PHONY: syslinux
.PHONY: clean

