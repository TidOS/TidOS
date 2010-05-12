var stylishManageAddons = {

	init: function() {
		//workaround for the overlay not working on mac
		var view = document.getElementById("userstyles-view");
		var viewParent = view.parentNode;
		viewParent.removeChild(view);
		viewParent.appendChild(view);
		// this dialog can get all sorts of weird parameters that make it do stuff. let it do its thing if there are any.
		if (document.getElementById("viewGroup").getAttribute("last-selected") == "userstyles-view" && (!"arguments" in window)) {
			stylishManageAddons.changeCategoryToUserStyles();
		}
		// https://bugzilla.mozilla.org/show_bug.cgi?id=496664
		/*
		if (Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo).QueryInterface(Components.interfaces.nsIXULRuntime).OS == "MacOSX") {
			var stylishIcon = document.getAnonymousElementByAttribute(document.getElementById("userstyles-view"), "class", "viewButtonIcon");
			//stylishIcon.style.display = "none";
			stylishIcon.style.width = "0";
			stylishIcon.style.height = "0"
		}*/
	},

	changeCategoryToUserStyles: function() {
		stylishManageAddons.changeCategory({target:{id:"userstyles-view"}});
	},

	needToResetExistingUI: false,

	changeCategory: function(event) {
		// viewGroup is the strip, not any specific icon
		if (event.target.id == "viewGroup")
			return;
		var on = event.target.id == "userstyles-view";
		document.getElementById("styles-container").style.display = on ? "" : "none";
		document.getElementById("addonsMsg").style.display = on ? "none" : "";
		document.getElementById("new-style").style.display = on ? "-moz-box" : "none";
		document.getElementById("copy-style-info").style.display = on ? "-moz-box" : "none";
		var checkUpdates = document.getElementById("checkUpdatesAllButton");
		if (on) {
			document.getElementById("viewGroup").setAttribute("last-selected", "userstyles");

			function hide(id) {
				var e = document.getElementById(id);
				if (e) {
					e.hidden = true;
				}
			}
			["installFileButton", "installUpdatesAllButton", "skipDialogButton", "continueDialogButton", "themePreviewArea", "themeSplitter", "showUpdateInfoButton", "hideUpdateInfoButton", "searchPanel", "getMore"].forEach(hide);
			stylishManageAddons.needToResetExistingUI = true;
			checkUpdates.setAttribute("commandoriginal", checkUpdates.getAttribute("command"));
			checkUpdates.removeAttribute("command");
			checkUpdates.setAttribute("oncommandoriginal", checkUpdates.getAttribute("oncommand"));
			checkUpdates.setAttribute("oncommand", "stylishManage.updateAll()");
			checkUpdates.hidden = false;
			checkUpdates.disabled = false;
		} else if (stylishManageAddons.needToResetExistingUI) {
			checkUpdates.setAttribute("oncommand", checkUpdates.getAttribute("oncommandoriginal"));
			checkUpdates.setAttribute("command", checkUpdates.getAttribute("commandoriginal"));
			stylishManageAddons.needToResetExistingUI = false;
		}
	}
}

window.addEventListener("load", function(){stylishManageAddons.init()}, false);
document.getElementById("viewGroup").addEventListener("click", stylishManageAddons.changeCategory, false);
window.addEventListener("DOMContentLoaded", function(event) {
	showView2 = showView;
	showView = function(view) {
		if (view == "userstyles") {
			document.getElementById("userstyles-view").click();
		} else {
			showView2(view);
		}
	};
}, false);



