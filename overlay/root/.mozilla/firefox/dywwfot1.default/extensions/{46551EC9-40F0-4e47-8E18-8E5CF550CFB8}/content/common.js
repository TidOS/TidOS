var stylishCommon = {

	XULNS: "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",

	//compares CSS, taking into account platform differences
	cssAreEqual: function(css1, css2) {
		if (css1 == null && css2 == null) {
			return true;
		}
		if (css1 == null || css2 == null) {
			return false;
		}
		return css1.replace(/\s/g, "") == css2.replace(/\s/g, "");
	},

	domApplyAttributes: function(element, json) {
		for (var i in json)
			element.setAttribute(i, json[i]);
	},

	dispatchEvent: function(doc, type) {
		if (!doc) {
			return;
		}
		var stylishEvent = doc.createEvent("Events");
		stylishEvent.initEvent(type, false, false, doc.defaultView, null);
		doc.dispatchEvent(stylishEvent);
	},

	getAppName: function() {
		var appInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
		return appInfo.name;
	},

	deleteWithPrompt: function(style) {
		const STRINGS = document.getElementById("stylish-common-strings");
		var title = STRINGS.getString("deleteStyleTitle")
		var prompt = STRINGS.getFormattedString("deleteStyle", [style.name])
		var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
		if (prompts.confirmEx(window, title, prompt, prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_IS_STRING + prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_CANCEL, STRINGS.getString("deleteStyleOK"), null, null, null, {})) {
			return false;
		}
		style.delete();
		return true;
	},

	fixXHR: function(request) {
		//only a problem on 1.9 toolkit
		var appInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
		var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
		if (versionChecker.compare(appInfo.version, "1.9") >= 0 && versionChecker.compare(appInfo.version, "1.9.3a1pre") <= 0) {
			//https://bugzilla.mozilla.org/show_bug.cgi?id=437174
			var ds = Components.classes["@mozilla.org/webshell;1"].createInstance(Components.interfaces.nsIDocShellTreeItem).QueryInterface(Components.interfaces.nsIInterfaceRequestor);
			ds.itemType = Components.interfaces.nsIDocShellTreeItem.typeContent;
			request.channel.loadGroup = ds.getInterface(Components.interfaces.nsILoadGroup);
			request.channel.loadFlags |= Components.interfaces.nsIChannel.LOAD_DOCUMENT_URI;
		}
	},

	getWindowName: function(prefix, id) {
		return (prefix + (id || Math.random())).replace(/\W/g, "");
	},

	clearAllMenuItems: function(event) {
		var popup = event.target;
		for (var i = popup.childNodes.length - 1; i >= 0; i--) {
			popup.removeChild(popup.childNodes[i]);
		}
	},

	focusWindow: function(name) {
		//if a window is already open, openDialog will clobber the changes made. check for an open window for this style and focus to it
		var windowsMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
		var win = windowsMediator.getMostRecentWindow(name);
		if (win) {
			win.focus();
			return true;
		}
		return false;
	},

	openEdit: function(name, params) {
		if (stylishCommon.focusWindow(name)) {
			return;
		}
		params.windowType = name;
		return openDialog("chrome://stylish/content/edit.xul", name, "chrome,resizable,dialog=no,centerscreen", params);		
	},

	openEditForStyle: function(style) {
		return stylishCommon.openEdit(stylishCommon.getWindowName("stylishEdit", style.id), {style: style});
	},

	openEditForId: function(id) {
		var service = Components.classes["@userstyles.org/style;1"].getService(Components.interfaces.stylishStyle);
		var style = service.find(id, service.REGISTER_STYLE_ON_CHANGE | service.CALCULATE_META);
		return stylishCommon.openEditForStyle(style);
	},

	openInstall: function(params) {
		function fillName(prefix) {
			params.windowType = stylishCommon.getWindowName(prefix, params.triggeringDocument ? stylishCommon.cleanURI(params.triggeringDocument.location.href) : null);
		}
		if (Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch).getBoolPref("extensions.stylish.editOnInstall")) {
			fillName("stylishEdit");
			stylishCommon.openEdit(params.windowType, params);
		} else {
			fillName("stylishInstall");
			if (!stylishCommon.focusWindow(params.windowType)) {
				openDialog("chrome://stylish/content/install.xul", params.windowType, "chrome,resizable,dialog=no,centerscreen,resizable", params);
			}
		}
	},

	cleanURI: function(uri) {
		var hash = uri.indexOf("#");
		if (hash > -1) {
			uri = uri.substring(0, hash);
		}
		return uri;
	},

	// Removes whitespace and duplicate tags. Pass in a string and receive an array.
	cleanTags: function(tags) {
		tags = tags.split(/[\s,]+/);
		var uniqueTags = [];
		tags.filter(function(tag) {
			return !/^\s*$/.test(tag);
		}).forEach(function(tag) {
			if (!uniqueTags.some(function(utag) {
				return utag.toLowerCase() == tag.toLowerCase();
			})) {
				uniqueTags.push(tag);
			}
		});
		return uniqueTags;
	}
}
