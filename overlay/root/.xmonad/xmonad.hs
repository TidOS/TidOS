-- $HOME/.xmonad/xmonad.hs
-- original author: Øyvind 'Mr.Elendig' Heggstad <mrelendig AT har-ikkje DOT net>
-- modifier: STxza/ST.x <seynthan DOT tx AT gmail DOT com>
-- version: Arch Linux | xmonad-darcs & xmonad-contrib-darcs & haskell-x11-darcs & dzen2-gadgets-svn
-- validate syntax: xmonad --recompile
-- vim :fdm=marker sw=4 sts=4 ts=4 et ai:

--------------------------------------------------------------------------------------
--{{{ Imports
-- core
import XMonad
import qualified XMonad.StackSet as W
import qualified Data.Map as M
import System.Exit
import Graphics.X11.Xlib
import IO (Handle, hPutStrLn)
 
-- utils
import XMonad.Util.Run (spawnPipe)
import XMonad.Prompt
import XMonad.Prompt.Shell
 
-- hooks
import XMonad.Hooks.ManageDocks
import XMonad.Hooks.DynamicLog
import XMonad.Hooks.UrgencyHook
import XMonad.Hooks.SetWMName
 
-- layouts
import XMonad.Layout.Gaps
import XMonad.Layout.ResizableTile
import XMonad.Layout.Spiral
import XMonad.Layout.PerWorkspace
import XMonad.Layout.Grid
import XMonad.Layout.IM
import Data.Ratio ((%))
import XMonad.Layout.SimplestFloat

-- actions
import XMonad.Actions.CycleWS
import XMonad.Actions.RotSlaves
import qualified XMonad.Actions.FlexibleManipulate as Flex (Flex.mouseWindow, Flex.linear)
import XMonad.Actions.CopyWindow
import XMonad.Actions.GridSelect (defaultGSConfig, goToSelected)
--}}} 
--------------------------------------------------------------------------------------
--{{{ Main
main = do
       dzenSbar <- spawnPipe sBarCmd
       dzenConkyTop <- spawnPipe topBarCmd
       dzenConkyBot <- spawnPipe botBarCmd 
       xmonad $ myUrgencyHook $ defaultConfig 
              { workspaces = workspaces'
              , modMask = modMask'
              , borderWidth = borderWidth'
              , normalBorderColor = normalBorderColor'
              , focusedBorderColor = focusedBorderColor'
              , terminal = terminal'
              , keys = keys'
              , focusFollowsMouse = False
              , mouseBindings = mouseBindings'
              , logHook = logHook' dzenSbar
              , layoutHook = layoutHook'
              , manageHook = manageHook'
              , startupHook = setWMName "LG3D"
              }
--}}} 
--------------------------------------------------------------------------------------
--{{{ Hooks
myManageHook :: ManageHook
myManageHook = composeAll . concat $
    [ [ className       =? c                 --> doFloat | c <- myFloats ]
    , [ title           =? t                 --> doFloat | t <- myOtherFloats ]
    , [ resource        =? r                 --> doIgnore | r <- myIgnores ]
    , [ className       =? "Firefox"         --> doF (W.shift "2:www") ]
    --, [ className       =? "Gimp"            --> doF (W.shift "8:gfx") <+> doF (W.swapUp) ]
    , [ className       =? "Gvim"            --> doF (W.shift "4:dev") ]
    , [ className       =? "Geany"           --> doF (W.shift "4:dev") <+> doF (W.swapUp) ]
    , [ className       =? "OpenOffice.org 3.0" --> doF (W.shift "7:OOo") ]
    , [ className       =? "Smplayer"        --> doF (W.shift "6:vid") ]
    , [ className       =? "Transmission"    --> doF (W.shift "2:www") ]
    , [ className       =? "emesene"         --> doF (W.shift "3:chat") ]
    , [ (className      =? "emesene" <&&> resource =? "chat") --> doF (W.shift "3:chat") ]
    , [ className       =? "Pidgin"          --> doShift "3:chat" ]
    , [ className       =? "Easytag"         --> doF (W.swapDown) ]
    , [ className       =? "Eclipse"         --> doF (W.shift "4:dev") ]
    , [ (title =? "ncmpcpp" <&&> className =? "URxvt")  --> doF (W.shift "5:mus" ) ]
    ]
    where
        myIgnores       = ["panel", "trayer", "xfce4-notifyd"]
        myFloats        = ["feh", "Gimp", "Xmessage", "Qalculate", "Nvidia-settings"]
        myOtherFloats   = ["alsamixer", "Firefox Preferences", "Session Manager - Mozilla Firefox", 
                            "Firefox Add-on Updates", "Clear Private Data"
                          ]

manageHook' :: ManageHook
manageHook' = manageDocks <+> manageHook defaultConfig <+> myManageHook

logHook' :: Handle ->  X ()
logHook' dzenSbar = dynamicLogWithPP $ myDzenPP dzenSbar
 
layoutHook' = customLayout
--}}} 
--------------------------------------------------------------------------------------
--{{{ Looks

-- dzen bars
sBarCmd = "dzen2 -e 'onstart=lower' -x '0' -y '0' -h '16' -w '1368' -ta 'l' -fg '#f0f0f0' -bg '#000000' -fn '-*-gohufont-medium-*-*-*-*-*-*-*-*-*-*-*'"
topBarCmd = "conky -c ~/.xmonad/conkyrc | dzen2 -e 'onstart=lower' -h '16' -w '480' -ta 'r'"
botBarCmd = "conky -c ~/.xmonad/conky_botrc | dzen2 -e 'onstart=lower' -h '16' -w '1440' -ta 'r'"

myDzenPP dzenSbar = defaultPP
    { ppCurrent = wrap "^p()<^fg(#82aeda)" "^fg()>^p()"
    , ppVisible = wrap "^p()<^fg()" "^fg()>^p()"
    , ppHidden = wrap "" "^fg()^p()"
    --, ppHiddenNoWindows = wrap "^fg(#555555)" "^fg()"
    , ppUrgent = wrap "!^fg(#e9c789)^p()" "^fg()^p()"
    , ppSep = " "
    , ppWsSep = " "
    , ppTitle = dzenColor "#ffffff" "" . wrap "< " " >"
    , ppLayout = dzenColor "#777777" "" .
        (\x -> case x of
        "Full" -> "^fg(#777777)^i(/home/jordan/.dzen/full.xbm)"
        "ResizableTall" -> "^fg(#777777)^i(/home/jordan/.dzen/tall.xbm)"
        "Mirror ResizableTall" -> "^fg(#777777)^i(/home/jordan/.dzen/mtall.xbm)"
        "Hinted Mirror ResizableTall" -> "^fg(#777777)^i(/home/jordan/.dzen/layout-mirror-bottom.xbm)"
        "Spiral" -> "[sP]"
        "Grid" -> "^fg(#777777)^i(/home/jordan/.dzen/grid.xbm)"
        "IM Grid" -> "[iM]"
        "SimplestFloat" -> "[sfL]"
        _ -> x
        )
    , ppOutput = hPutStrLn dzenSbar
    }
    
-- Urgency hint options:
myUrgencyHook = withUrgencyHook NoUrgencyHook
--myUrgencyHook = withUrgencyHook dzenUrgencyHook
--    { args = ["-x", "0", "-y", "1184", "-h", "16", "-w", "1440", "-ta", "r", "-expand", "l", "-fg", "#0099ff", "-bg", "#0f0f0f", "-fn", "-*-terminus-*-*-*-*-12-*-*-*-*-*-*-*"] }
 
-- borders
borderWidth' :: Dimension
borderWidth' =  0
 
normalBorderColor', focusedBorderColor' :: String
normalBorderColor'  = "#2a2a2a"
focusedBorderColor' = "#82aeda"
 
-- workspaces
workspaces' :: [WorkspaceId]
workspaces' = ["1:main", "2:www", "3:chat", "4:dev", "5:mus", "6:vid", "7:OOo", "8:gfx", "9:rand"]
 
-- layouts
customLayout = gaps [(U,16), (D,16), (L,0), (R,0)] (avoidStruts (onWorkspace "3:chat" lc $ tiled 
                ||| Mirror tiled ||| Full ||| spiral (6/7) 
                ||| Grid ||| simplestFloat))
    where
        tiled = ResizableTall nmaster delta ratio []
        -- The default number of windows in the master pane
        nmaster = 2
        -- Default proportion of screen occupied by master pane
        ratio = toRational (2/(1+sqrt(5)::Double)) -- golden
        -- Percent of screen to increment by when resizing panes
        delta = 0.03
        -- For emesene in "chat"
        --lc = withIM (1%7) (And (ClassName "emesene") (Role "main")) Grid
        lc = withIM (1%7) (Role "buddy_list") Grid


-- XPConfig options:
myXPConfig = defaultXPConfig
    { font = "-*-gohufont-medium-*-*-*-*-*-*-*-*-*-*-*"
    , bgColor = "#222222"
    , fgColor = "#ffffff"
    , fgHLight = "#ffffff"
    , bgHLight = "#0066ff"
    , borderColor = "#ffffff"
    , promptBorderWidth = 1
    , position = Bottom
    , height = 16
    , historySize = 100
    }
--}}}
--------------------------------------------------------------------------------------
--{{{ Terminal
terminal' :: String
terminal' = "urxvtc" 
--}}}
--------------------------------------------------------------------------------------
--{{{ Keys/Button bindings
-- modmask
modMask' :: KeyMask
modMask' = mod4Mask
 
-- keys
keys' :: XConfig Layout -> M.Map (KeyMask, KeySym) (X ())
keys' conf@(XConfig {XMonad.modMask = modMask}) = M.fromList $
    -- launching and killing programs
    [ ((modMask,               xK_x     ), spawn $ XMonad.terminal conf)
    , ((modMask .|. controlMask, xK_x   ), shellPrompt myXPConfig)
    , ((modMask,               xK_r     ), spawn "dmenu_run -fn \"-*-gohufont-medium-*-*-*-*-*-*-*-*-*-*-*\" -nb \"#000000\" -nf \"#888888\" -sb \"#2A2A2A\" -sf \"#ADD8E6\"")
    , ((modMask,               xK_a     ), spawn "urxvtc -e alsamixer") 
    , ((modMask,               xK_f     ), spawn "firefox") 
    , ((modMask,               xK_t     ), spawn "thunar")
    , ((modMask,               xK_g     ), spawn "geany")
    , ((modMask,               xK_e     ), spawn "pidgin")
    , ((modMask,               xK_v     ), spawn "transmission")
    , ((modMask,               xK_Print ), spawn "scrot -q90 /home/jordan/Pictures/Screenshots/%Y-%m-%d.png")   
    , ((modMask .|. shiftMask, xK_c     ), kill1) -- Closethe focused window
    
    -- Java hack
    , ((modMask,               xK_F12   ), setWMName "LG3D")
 
    -- layouts
    , ((modMask,               xK_space ), sendMessage NextLayout)
    , ((modMask .|. shiftMask, xK_space ), setLayout $ XMonad.layoutHook conf)
    , ((modMask,               xK_b     ), sendMessage ToggleStruts)
    , ((modMask,               xK_BackSpace), focusUrgent)
 
    -- floating layer stuff
    , ((modMask,               xK_s     ), withFocused $ windows . W.sink)
 
    -- refresh
    , ((modMask,               xK_n     ), refresh)
 
    -- focus
    , ((modMask,               xK_j     ), windows W.focusDown)
    , ((modMask,               xK_k     ), windows W.focusUp)
    , ((modMask,               xK_m     ), windows W.focusMaster)
 
    -- swapping
    , ((modMask .|. shiftMask, xK_Return), windows W.shiftMaster)
    , ((modMask,               xK_Tab   ), windows W.swapDown  )
    , ((modMask .|. shiftMask, xK_Tab   ), windows W.swapUp    )
    
    -- rotate all windows
    , ((modMask .|. shiftMask, xK_j     ), rotAllUp)
    , ((modMask .|. shiftMask, xK_k     ), rotAllDown)
 
    -- increase or decrease number of windows in the master area
    , ((modMask .|. controlMask, xK_h   ), sendMessage (IncMasterN 1))
    , ((modMask .|. controlMask, xK_l   ), sendMessage (IncMasterN (-1)))
 
    -- resizing
    , ((modMask,               xK_h     ), sendMessage Shrink)
    , ((modMask,               xK_l     ), sendMessage Expand)
    , ((modMask .|. shiftMask, xK_l     ), sendMessage MirrorShrink)
    , ((modMask .|. shiftMask, xK_h     ), sendMessage MirrorExpand)
    
    -- cycle workspaces
    , ((modMask,               xK_Right ),  nextWS)
    , ((modMask,               xK_Left  ),  prevWS)
    
    -- GridSelect
    , ((modMask .|. shiftMask, xK_g     ), goToSelected defaultGSConfig)
 
    -- quit, or restart
    , ((modMask .|. shiftMask, xK_q     ), io (exitWith ExitSuccess))
    , ((modMask              , xK_q     ), spawn "killall conky dzen2" >> restart "xmonad" True)
    ]
    ++
    -- mod-[1..9] @@ Switch to workspace N
    -- mod-shift-[1..9] @@ Move client to workspace N
    -- mod-control-shift-[1..9] @@ Copy client to workspace N
    [((m .|. modMask, k), windows $ f i)
        | (i, k) <- zip (XMonad.workspaces conf) [xK_1 .. xK_9]
        , (f, m) <- [(W.greedyView, 0), (W.shift, shiftMask), (copy, shiftMask .|. controlMask)]]

--}}}
--------------------------------------------------------------------------------------
--{{{ Mouse bindings
mouseBindings' (XConfig {XMonad.modMask = modMask}) = M.fromList $
    [ ((modMask, button1), (\w -> focus w >> mouseMoveWindow w)) -- set the window to floating mode and move by dragging
    , ((modMask, button2), (\w -> focus w >> windows W.shiftMaster)) -- raise the window to the top of the stack
    , ((modMask, button3), (\w -> focus w >> Flex.mouseWindow Flex.linear w)) -- Resize client perserving its aspect
    , ((modMask, button4), (\_ -> prevWS)) -- switch to previous workspace
    , ((modMask, button5), (\_ -> nextWS)) -- switch to next workspace
    ]
--}}}
