function StylishStartup() {
}
StylishStartup.prototype = {
	classID: Components.ID("{6ff9ed70-e673-11dc-95ff-0800200c9a66}"),
	contractID: "@stylish/startup;2",
	classDescription: "Stylish Startup",

	QueryInterface: function(aIID) {
		if(!aIID.equals(CI.nsISupports) && !aIID.equals(CI.nsIObserver))
			throw CR.NS_ERROR_NO_INTERFACE;
		return this;
	},

	observe: function(aSubject, aTopic, aData) {
		switch(aTopic) {
			case "xpcom-startup":
				var obsSvc = CC["@mozilla.org/observer-service;1"].getService(CI.nsIObserverService);
				obsSvc.addObserver(this, "profile-after-change", false);
				break;

			case "profile-after-change":
				this.migrateFromRDF();
				var service = Components.classes["@userstyles.org/style;1"].getService(Components.interfaces.stylishStyle);
				service.findEnabled(true, service.REGISTER_STYLE_ON_LOAD, {});
				break;
		
		}
	},

	migrateFromRDF: function() {
		var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

		//see if we actually have to do this
		try {
			if (prefs.getBoolPref("extensions.stylish.legacyFileMigrated")) {
				return;
			}
		} catch (ex) {
			//pref doesn't exist
		}

		//figure out where this is supposed to come from
		var stream;
		var prefPath = "";
		try {
			prefPath = prefs.getCharPref("extensions.stylish.fileURL");
		} catch (ex) {
			//pref doesn't exist
		}
		if (prefPath.length > 0) {
			stream = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService).newChannel(prefPath, "UTF-8", null).open();
		} else {
			//go for the default location
			var file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
			file.append("stylish.rdf");
			if (!file.exists()) {
				return;
			}
			stream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
			stream.init(file, -1, 0, 0);
		}	

		//read in the file into a document
		var parser = Components.classes["@mozilla.org/xmlextras/domparser;1"].createInstance(Components.interfaces.nsIDOMParser);
		var data = "";
		var str = {};
		var charset = "UTF-8";
		const replacementChar = Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER;
		var is = Components.classes["@mozilla.org/intl/converter-input-stream;1"].createInstance(Components.interfaces.nsIConverterInputStream);
		is.init(stream, charset, 1024, replacementChar);
		while (is.readString(4096, str) != 0) {
		  data += str.value;
		}
		is.close();
		stream.close();
		//for some reason, parsing directly from the stream doesn't work
		//var doc = parser.parseFromStream(stream, stream.available(), "UTF-8", "text/xml");
		var doc = parser.parseFromString(data, "text/xml");

		//parse the document into new objects
		const RDFNS = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
		const STYLISHNS = "urn:stylish#";
		function getValue(e, ns, n) {
			//it could be a child element or an attribute
			var elements = e.getElementsByTagNameNS(ns, n);
			if (elements.length > 0) {
				return elements[0].textContent;
			}
			return e.getAttributeNS(ns, n);
		}
		Array.forEach(doc.getElementsByTagNameNS(RDFNS, "Description"), function(e) {
			var description = getValue(e, STYLISHNS, "description")
			var code = getValue(e, STYLISHNS, "code");
			if (!code || !description)
				return;
			var url = getValue(e, RDFNS, "about");
			if (/^rdf:/i.test(url)) {
				url = null;
			}
			var updateUrl = getValue(e, STYLISHNS, "updateURL")
			var enabled = getValue(e, STYLISHNS, "enabled") == "true";
			var style = Components.classes["@userstyles.org/style;1"].createInstance(Components.interfaces.stylishStyle);
			style.mode = style.CALCULATE_META + style.REGISTER_STYLE_ON_LOAD;
			style.init(url, updateUrl, null, description, code, enabled, null);
			style.save();
		});
		prefs.setBoolPref("extensions.stylish.legacyFileMigrated", true);
	}

};

var turnOnOffObserver = {
	observe: function(subject, topic, data) {
		var service = Components.classes["@userstyles.org/style;1"].getService(Components.interfaces.stylishStyle);
		service.findEnabled(true, subject.QueryInterface(Components.interfaces.nsIPrefBranch2).getBoolPref(data) ? service.REGISTER_STYLE_ON_LOAD : service.UNREGISTER_STYLE_ON_LOAD, {});
	}
}
Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).QueryInterface(Components.interfaces.nsIPrefBranch2).addObserver("extensions.stylish.styleRegistrationEnabled", turnOnOffObserver, false);


// constructors for objects we want to XPCOMify
var objects = [StylishStartup];

/*
 * Registration code.
 *
 */

const CI = Components.interfaces, CC = Components.classes, CR = Components.results;

const MY_OBSERVER_NAME = "StylishStartup";

function FactoryHolder(aObj) {
  this.CID        = aObj.prototype.classID;
  this.contractID = aObj.prototype.contractID;
  this.className  = aObj.prototype.classDescription;
  this.factory = {
    createInstance: function(aOuter, aIID) {
      if(aOuter)
        throw CR.NS_ERROR_NO_AGGREGATION;
      return (new this.constructor).QueryInterface(aIID);
    }
  };
  this.factory.constructor = aObj;
}

var gModule = {
  registerSelf: function (aComponentManager, aFileSpec, aLocation, aType)
  {
    aComponentManager.QueryInterface(CI.nsIComponentRegistrar);
    for (var key in this._objects) {
      var obj = this._objects[key];
      aComponentManager.registerFactoryLocation(obj.CID, obj.className,
        obj.contractID, aFileSpec, aLocation, aType);
    }

    var catman = CC["@mozilla.org/categorymanager;1"].getService(CI.nsICategoryManager);
    catman.addCategoryEntry("xpcom-startup", MY_OBSERVER_NAME,
      StylishStartup.prototype.contractID, true, true);
  },

  unregisterSelf: function(aCompMgr, aFileSpec, aLocation) {
    var catman = CC["@mozilla.org/categorymanager;1"].getService(CI.nsICategoryManager);
    catman.deleteCategoryEntry("xpcom-startup", MY_OBSERVER_NAME, true);

    aComponentManager.QueryInterface(CI.nsIComponentRegistrar);
    for (var key in this._objects) {
      var obj = this._objects[key];
      aComponentManager.unregisterFactoryLocation(obj.CID, aFileSpec);
    }
  },

  getClassObject: function(aComponentManager, aCID, aIID) {
    if (!aIID.equals(CI.nsIFactory)) throw CR.NS_ERROR_NOT_IMPLEMENTED;

    for (var key in this._objects) {
      if (aCID.equals(this._objects[key].CID))
        return this._objects[key].factory;
    }
   
    throw CR.NS_ERROR_NO_INTERFACE;
  },

  canUnload: function(aComponentManager) {
    return true;
  },

  _objects: {} //FactoryHolder
};

function NSGetModule(compMgr, fileSpec)
{
  for(var i in objects)
    gModule._objects[i] = new FactoryHolder(objects[i]);
  return gModule;
} 
