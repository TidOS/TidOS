//

const CHAN_XCOMID = "@4chan.wrathfilledhate.net/menu/manager-object;1";
const CHAN_ID = Components.ID("{e1c29510-7984-11d9-9669-0800200c9a66}");
const nsISupports = Components.interfaces.nsISupports;

function ChanLocation()
{
	this.Id = "";
	this.Url = "";
	this.AltUrl = "";
}

function ChanBoard()
{
	this.Name = "";
	this.Id = "";
	this.Class = "";
	this.Location = "";
	this.Dir = "";
	this.Category = "";
}

function ChanWatcherThread()
{
	this.BoardID = "";
	this.ThreadID = "";
	this.PosterHandle = "";
	this.PosterTrip = "";
	this.ThreadTitle = "";
	this.PostType = 0;
}

ChanLocation.prototype.Id = "";		// "img.4chan"
ChanLocation.prototype.Url = "";		// "http://bin.4chan.org"
ChanLocation.prototype.AltUrl = "";		// "http://img.4chan.org"
ChanLocation.constructor = ChanLocation;

ChanBoard.prototype.Name = "";		// "Anime"
ChanBoard.prototype.Id = "";		// "4chan-a"
ChanBoard.prototype.Class = "";		// "imagboards"
ChanBoard.prototype.Location = "";	// "zip.4chan.org"
ChanBoard.prototype.Dir = "";		// "a"
ChanBoard.prototype.AccessKey = "";
ChanBoard.prototype.Category = "";	// "4chan"
ChanBoard.prototype.IsTrialBoard = false;
ChanBoard.prototype.IsClosed = false;
ChanBoard.prototype.IsHidden = false;
ChanBoard.prototype.MaxFileSize = 0;
ChanBoard.constructor = ChanBoard;

ChanWatcherThread.prototype.BoardID = "";
ChanWatcherThread.prototype.ThreadID = "";
ChanWatcherThread.prototype.PosterHandle = "";
ChanWatcherThread.prototype.PosterTrip = "";
ChanWatcherThread.prototype.ThreadTitle = "";
ChanWatcherThread.prototype.Comment = "";
ChanWatcherThread.prototype.PostType = 0;
ChanWatcherThread.prototype.Editing = false;
ChanWatcherThread.constructor = ChanWatcherThread;


function ChanHiddenPost()
{
	this.BoardID = "";
	this.PostID = -1;
	this.LastSeen = 0; // time the thread was last seen
}

ChanHiddenPost.prototype.BoardID = "";
ChanHiddenPost.prototype.PostID = -1;
ChanHiddenPost.prototype.LastSeen = 0;


function ChanQuickReplyWindow()
{
	this.ThreadID = -1;
	this.BoardID = "";
	this.QRWindow = null;
	this.QRDocument = null;
}

ChanQuickReplyWindow.prototype.ThreadID = -1;
ChanQuickReplyWindow.prototype.BoardID = "";
ChanQuickReplyWindow.prototype.QRWindow = null;
ChanQuickReplyWindow.prototype.QRDocument= null;
ChanQuickReplyWindow.constructor = ChanQuickReplyWindow;

function ChanQuickQuote()
{
	this.ThreadID = -1;
	this.BoardID = "";
	this.Quote = "";
}

ChanQuickQuote.prototype.ThreadID = -1;
ChanQuickQuote.prototype.BoardID = "";
ChanQuickQuote.prototype.Quote = "";
ChanQuickQuote.constructor = ChanQuickQuote;


// ----------------------------------------------------------------------------
// File Input/Output Functions
// ----------------------------------------------------------------------------

/*!
	Function reads the the passed file into a string and returns it.
*/
function chan_io_readFileToString( file )
{
	if( !file.exists() )
	{
		throw "chanBoardManager_mozStorage._loadBoardDataFromXmlFile: file does not exist";
	}
	
	var fileInputStream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance( Components.interfaces.nsIFileInputStream );
	fileInputStream.init( file, 0x01, 00004, null );
	
	var scriptableInputStream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance( Components.interfaces.nsIScriptableInputStream );
	scriptableInputStream.init( fileInputStream );

	if( scriptableInputStream.available() <= 0 )
	{
		// file is empty, do nothing
		fileInputStream.close();
		return "";
	}
	
	// read the whole lot into a string
	var fileString = scriptableInputStream.read( scriptableInputStream.available() );
	
	// we've finished with the stream, close it
	fileInputStream.close();
	
	return fileString;
}

function chanManagerObject()
{
	this.banTemplates = new Array();
}

// I didn't write this function :)
// Tim Fries SALastRead Extension: http://forums.somethingawful.com/showthread.php?s=&threadid=1114236
function chan_SelectNodes(doc, context, xpath)
{
   var nodes = doc.evaluate(xpath, context, null, 0, null);
   var item;
   var result = new Array();
   while ( item = nodes.iterateNext() ) {
      result.push(item);
   }
   return result;
}

chanManagerObject.prototype = {

	get Pref() { return Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("4chan."); }
	,
	get Observer() { return Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService); }
	,
	get IsLoaded()
	{
		/*if( this.BoardsXML && this.Boards && this.WatchedThreads )
			return true;*/
			
		if( this.BoardXMLLoaded && this.LayoutXMLLoaded )
			return true;
			
		return false;
	}
	,
	BoardsXML: null,
	MenuLayoutXML: null,
	WatchedThreadsXML: null,
	Locations: null,
	Boards: null,
	WatchedThreadsXML: null,
	WatchedThreads: null,
	HiddenPosts: null,
	_EditingWatchThread: null,
	IsEditingWatchThread: false,
	get EditingWatchThread() { return this._EditingWatchThread; },
	set EditingWatchThread( value ) { this._EditingWatchThread = value; },
	BoardXMLLoaded: false,
	LayoutXMLLoaded: false,
	IsFirstTime: true,
	DataLastUpdatedTime: null,
	
	
	get BoardsXMLLocalFN() { return "4chan_boards.xml"; },
	get LayoutXMLLocalFN() { return "4chan_active_layout.xml"; },
	get WatchedThreadsXMLLocalFN() { return "4chan_watchedthreads.xml"; },
	
	get BoardsXMLURL() { return "http://4chan.wrathfilledhate.net/menu/4chanboards.xml"; },
	get LayoutXMLURL() { return "http://4chan.wrathfilledhate.net/menu/menu_layout_default.xml"; },
	DirectoryService: null,
	
	GetLocalFNPath: function( FileName )
	{
		var File = this.DirectoryService.get("ProfD", Components.interfaces.nsIFile);
		File.append( FileName );
		return File.path;
	}
	,
	GetLocalFile: function( FileName )
	{
		var File = Components.classes["@mozilla.org/file/local;1"].createInstance( Components.interfaces.nsILocalFile );
		File.initWithPath( this.GetLocalFNPath( FileName ) );
	
		if( File.exists() == false)
		{
			File.create( Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420 );
		}
	
		return File;
	}
	,
	SaveBoardXML: function()
	{
		var FileOutputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance( Components.interfaces.nsIFileOutputStream );
		FileOutputStream.init( this.GetLocalFile( this.BoardsXMLLocalFN ), 0x04 | 0x08 | 0x20, 420, 0 );

		var XMLSerilizer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"].createInstance( Components.interfaces.nsIDOMSerializer );
		var SerilizedXMLString = XMLSerilizer.serializeToString( this.BoardsXML );

		FileOutputStream.write( SerilizedXMLString, SerilizedXMLString.length );

		FileOutputStream.close();
	}
	,
	SaveLayoutXML: function()
	{	
		var FileOutputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance( Components.interfaces.nsIFileOutputStream );
		FileOutputStream.init( this.GetLocalFile( this.LayoutXMLLocalFN ), 0x04 | 0x08 | 0x20, 420, 0 );

		var XMLSerilizer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"].createInstance( Components.interfaces.nsIDOMSerializer );
		var SerilizedXMLString = XMLSerilizer.serializeToString( this.MenuLayoutXML );

		FileOutputStream.write( SerilizedXMLString, SerilizedXMLString.length );

		FileOutputStream.close();
	}
	,
	LoadWatchedThreadsXML: function()
	{
		var FileInputStream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance( Components.interfaces.nsIFileInputStream );
		FileInputStream.init( this.GetLocalFile( this.WatchedThreadsXMLLocalFN ), 0x01, 00004, null );

		var scriptableInputStream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance( Components.interfaces.nsIScriptableInputStream );
		scriptableInputStream.init( FileInputStream );
		
		var ReadThreadsXML;
		var SaveAfterLoad = false;
		if( scriptableInputStream.available() <= 0 )
		{
			ReadThreadsXML = "<?xml version=\"1.0\"?>\n<threadwatcher></threadwatcher>";
			SaveAfterLoad = true;
		}
		else
		{
			ReadThreadsXML = scriptableInputStream.read( scriptableInputStream.available() );
		}

 		var DomParser = Components.classes["@mozilla.org/xmlextras/domparser;1"].createInstance( Components.interfaces.nsIDOMParser );
 		this.WatchedThreadsXML = DomParser.parseFromString( ReadThreadsXML, "text/xml" );	
 		
 		FileInputStream.close();
 		
 		if( SaveAfterLoad )
 			this.SaveWatchedThreadsXML();
		
		// now load the watched thread data
		this.LoadWactchedThreadXML();
		
 		
	}
	,
	SaveWatchedThreadsXML: function()
	{
		// rebuild the thread watcher XML
		this.BuildWatchedThreadXML();
		
		var FileOutputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance( Components.interfaces.nsIFileOutputStream );
		FileOutputStream.init( this.GetLocalFile( this.WatchedThreadsXMLLocalFN ), 0x04 | 0x08 | 0x20, 420, 0 );

		var XMLSerilizer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"].createInstance( Components.interfaces.nsIDOMSerializer );
		var SerilizedXMLString = XMLSerilizer.serializeToString( this.WatchedThreadsXML );

		FileOutputStream.write( SerilizedXMLString, SerilizedXMLString.length );

		FileOutputStream.close();	
	}
	,
	// LOCATIONS ==========================================================================================================
	GetLocationById: function( Id )
	{
		if( !this.Locations )
			return null;
	
		var i;
		for( i = 0; i < this.Locations.length; i++ )
		{
			if( this.Locations[i].Id == Id )
			{
				return this.Locations[i];
			}
		}
		
		return null;
	}
	,
	GetLocationUrlById: function( Id, IsAlt )
	{
		if( !this.Locations )
			return null;
		
		var i;
		for( i = 0; i < this.Locations.length; i++ )
		{
			if( this.Locations[i].Id == Id )
			{
				if( IsAlt && this.Locations[i].AltUrl != "" )
					return this.Locations[i].AltUrl;
				else
					return this.Locations[i].Url;
			}
		}
		
		return null;
	}
	,
	// Url WITH NO "/" at the end!
	GetLocationByUrl: function( Url )
	{
		if( !this.Locations )
			return null;
	
		var i;
		for( i = 0; i < this.Locations.length; i++ )
		{
			if( this.Locations[i].Url == Url || this.Locations[i].AltUrl == Url )
			{
				return this.Locations[i];
			}
		}
		
		return null;
	}
	,
	// BOARDS =============================================================================================================
	GetBoardByCategory: function( Nth, Category )
	{
		//alert( "Looking for board" );

		if( Nth < 1 )
			return null;

		var found = 0;
		var i = 0;
		//alert( "" + this.Boards.length );
		while( i < this.Boards.length )
		{
			//alert( this.Boards[i].Category );
			if( this.Boards[i].Category == Category )
				found ++;

			if( found == Nth )
			{
				//alert( "Board found" );
				return this.Boards[i];
			}

			i++;
		}

		//alert( "Board not found" );

		return null;

		/*
		//alert( "board[@category=\"" + Category + "\"]" );
		//alert( "//board[@category=\"" + Category + "\"]" );
		
		var Found = selectNodes( this.BoardsXML, this.BoardsXML, "//" + "board[@category=\'" + Category + "\']");
		
		if( !Found )
			return null;
			
		if( Nth > Found.lenght )
			return null;
			
		return Found[ Nth ];*/
		
	}
	,
	GetBoardByID: function( BoardID )
	{
		var i = 0;
		while( i < this.Boards.length )
		{

			if( this.Boards[i].Id == BoardID )
			{
				return this.Boards[i];
			}

			i++;
		}

		return null;
	}
	,
	GetBoardByURL: function( BoardURL )
	{
		var SlashPos = BoardURL.indexOf( "/", 7 );

		if( SlashPos == -1 )
			return null;

		var FirstDirPos = BoardURL.indexOf( "/", SlashPos + 1 );

		if( FirstDirPos == -1 )
			return null;


		var DomainEtc = BoardURL.substr( 0, SlashPos /* + 1 done include "/" */);
		var FirstDir = BoardURL.substr( SlashPos + 1, FirstDirPos - SlashPos - 1 );

		for( var i = 0; i < this.Locations.length; i++ )
		{
			if( this.Locations[i].Url == DomainEtc || this.Locations[i].AltUrl == DomainEtc )
			{
				var BoardLocation = this.Locations[i].Id
				var j = 0;
				while( j < this.Boards.length )
				{
					if( this.Boards[j].Location == BoardLocation && this.Boards[j].Dir == FirstDir )
					{
						return this.Boards[j];
					}
		
					j++;
				}
			}
		}
		
		return null;

	}
	,
	GetBoardByDir: function( BoardDir )
	{
		var i = 0;
		while( i < this.Boards.length )
		{
			if( this.Boards[i].Dir == BoardDir )
			{
				return this.Boards[i];
			}

			i++;
		}

		//alert( "Board not found " + DomainEtc + " " + FirstDir );
		return null;
	}
	,
	IsBoardRootByURL: function( URL )
	{
		if( URL == "http://www.4chan.org/" || URL == "http://www.4channel.org/" || URL == "http://www.not4chan.org/" || URL == "http://www.not4chan.org/index.html" )
			return true;
			
		return false;
	}
	,
	// WATCHED THREADS ================================================================================================
	BuildWatchedThreadXML: function()
	{
 		var DomParser = Components.classes["@mozilla.org/xmlextras/domparser;1"].createInstance( Components.interfaces.nsIDOMParser );
 		this.WatchedThreadsXML = DomParser.parseFromString( "<?xml version=\"1.0\"?>\n<threadwatcher></threadwatcher>", "text/xml" );	
 		
 		var ThreadWatchers = this.WatchedThreadsXML.getElementsByTagName( "threadwatcher" );
		
		if( !ThreadWatchers || ThreadWatchers.length < 1 )
			return;
		
		var ThreadWatcher = ThreadWatchers.item( 0 );		
 		
 		var i;
 		
 		for( i = 0; i < this.WatchedThreads.length; i++ )
 		{
 			var ThreadItem = this.BuildWatchedThreadXMLItem( this.WatchedThreadsXML, this.WatchedThreads[i] );
 			ThreadWatcher.appendChild( ThreadItem );
 		}
	}
	,
	BuildWatchedThreadXMLItem: function( TargetDocument, WacthedThreadItem )
	{
		var NewItem = TargetDocument.createElement( "thread" );
			
		NewItem.setAttribute( "boardid", WacthedThreadItem.BoardID );
		NewItem.setAttribute( "threadid", WacthedThreadItem.ThreadID );
		NewItem.setAttribute( "posterhandle", WacthedThreadItem.PosterHandle );
		NewItem.setAttribute( "postertrip", WacthedThreadItem.PosterTrip );
		NewItem.setAttribute( "threadtitle", WacthedThreadItem.ThreadTitle );
		NewItem.setAttribute( "comment", WacthedThreadItem.Comment );
		NewItem.setAttribute( "posttype", WacthedThreadItem.PostType );
		
		return NewItem;
	}
	,
	LoadWactchedThreadXML: function()
	{
		// clear old data
		this.WatchedThreads = new Array();
		
		
		var ThreadWatchers = this.WatchedThreadsXML.getElementsByTagName( "threadwatcher" );
		
		if( !ThreadWatchers || ThreadWatchers.length < 1 )
			return;
		
		var ThreadWatcher = ThreadWatchers.item( 0 );
		
		var CurrentThread = ThreadWatcher.firstChild;
		var i;
		
		while( CurrentThread )
		{
			if( CurrentThread.nodeName == "thread" )
			{
				var NewThreadItem = this.BuildWachedThreadItem( CurrentThread );
				
				if( NewThreadItem )
				{
					this.WatchedThreads.push( NewThreadItem );
				}
			}
			
			CurrentThread = CurrentThread.nextSibling;
		}
		
		
		
		//var chan_SelectNodes( this.WatchedThreadsXML, this.WatchedThreadsXML );
	}
	,
	BuildWachedThreadItem: function( XMLNode )
	{
		var NewThread = new ChanWatcherThread();
		
		// REQUIRED ----------------------------------
		if( !XMLNode.getAttribute( "boardid" ) || !XMLNode.getAttribute( "threadid" ) )
			return null;
		
		NewThread.BoardID = XMLNode.getAttribute( "boardid" );
		NewThread.ThreadID = XMLNode.getAttribute( "threadid" );

		// NOT REALLY REQUIRED -----------------------		
		if( XMLNode.getAttribute( "posterhandle" ) )
		{
			NewThread.PosterHandle = XMLNode.getAttribute( "posterhandle" );
		}
		else
		{
			NewThread.PosterHandle = "";
		}
		
		if( XMLNode.getAttribute( "postertrip" ) )
		{
			NewThread.PosterTrip = XMLNode.getAttribute( "postertrip" );
		}
		else
		{
			NewThread.PosterTrip = "";
		}
		
		if( XMLNode.getAttribute( "threadtitle" ) )
		{
			NewThread.ThreadTitle = XMLNode.getAttribute( "threadtitle" );
		}
		else
		{
			NewThread.ThreadTitle = "";
		}

		if( XMLNode.getAttribute( "comment" ) )
		{
			NewThread.Comment = XMLNode.getAttribute( "comment" );
		}
		else
		{
			NewThread.Comment = "";
		}
		
		if( XMLNode.getAttribute( "posttype" ) != null )
		{
			NewThread.PostType = parseInt( XMLNode.getAttribute( "posttype" ) );
		}
		else
		{
			NewThread.PostType = 1;
		}

		
		return NewThread;
	}
	,
	GetWatchedThreadByBoard: function( Nth, BoardID )
	{
		//alert( "Looking for watched board" );
		
		if( Nth < 1 )
			return null;
			
		var found = 0;
		var i = 0;
		//alert( "" + this.WatchedThreads.length );
		while( i < this.WatchedThreads.length )
		{
			//alert( this.WatchedThreads[i].BoardID );
			if( this.WatchedThreads[i].BoardID == BoardID )
				found ++;
				
			if( found == Nth )
			{
				//alert( "watched Board found" );
				return this.WatchedThreads[i];
			}
			
			i++;
		}
		
		//alert( "watched Board not found" );
		
		return null;
	}
	,
	GetWatchedThread: function( BoardID, ThreadID )
	{
		var i = 0;
		//alert( "" + this.WatchedThreads.length );
		while( i < this.WatchedThreads.length )
		{
			//alert( this.WatchedThreads[i].BoardID );
			if( this.WatchedThreads[i].BoardID == BoardID &&  this.WatchedThreads[i].ThreadID == ThreadID )
			{
				return this.WatchedThreads[i];
			}
			
			i++;
		}
		
		//alert( "watched Board not found" );
		
		return null;
	}
	,
	AddWatchThread: function( BoardID, ThreadID, ThreadTitle, PosterHandle, PosterTrip, PostType )
	{
		//
		if( this.GetWatchedThread( BoardID, ThreadID ) != null )
		{
			//alert( "Thread " + ThreadID + " on board " + BoardID + " already registerd." );
			return;
		}
		
		var NewThread = new ChanWatcherThread();
			
		NewThread.BoardID = BoardID;
		NewThread.ThreadID = ThreadID;
		NewThread.PosterHandle = PosterHandle;
		NewThread.PosterTrip = PosterTrip;
		NewThread.ThreadTitle = ThreadTitle;
		NewThread.Comment = "";
		NewThread.PostType = PostType;
	
		this.WatchedThreads.push( NewThread );
			
		this.Observer.notifyObservers( null, "4chan.WatchedThreadsChanged", "" );
		
		this.SaveWatchedThreadsXML();
		
		//alert( "Thread " + ThreadID + " added for board " + BoardID + "  " + ThreadTitle + PosterHandle + PosterTrip );
	}
	,
	RemoveWatchThread: function( BoardID, ThreadID )
	{
		var i = 0;
		//alert( "" + this.WatchedThreads.length );
		while( i < this.WatchedThreads.length )
		{
			//alert( this.WatchedThreads[i].BoardID );
			if( this.WatchedThreads[i].BoardID == BoardID && this.WatchedThreads[i].ThreadID == ThreadID )
			{
				this.WatchedThreads.splice( i, 1 );
				//alert( "Thread Watch remove" );
				this.Observer.notifyObservers( null, "4chan.WatchedThreadsChanged", "" );
				this.SaveWatchedThreadsXML();
					
				return;
			}
			
			i++;
		}
		
		//alert( "watched Board not found" );
		
		return;
	}
	,
	RemoveWatcherThreadNoSave: function( BoardID, ThreadID )
	{
		var i = 0;
		//alert( "" + this.WatchedThreads.length );
		while( i < this.WatchedThreads.length )
		{
			//alert( this.WatchedThreads[i].BoardID );
			if( this.WatchedThreads[i].BoardID == BoardID && this.WatchedThreads[i].ThreadID == ThreadID )
			{
				this.WatchedThreads.splice( i, 1 );
				//alert( "Thread Watch remove" );
					
				return;
			}
			
			i++;
		}
		
		//alert( "watched Board not found" );
		
		return;		
	}
	,
	NotifyThreadWatcher: function()
	{
		this.Observer.notifyObservers( null, "4chan.WatchedThreadsChanged", "" );
	}
	,
	SaveThreadWatcher: function()
	{
		this.SaveWatchedThreadsXML();
	}
	,
	ToggleWatchThread: function( TargetDocument, BoardID, ThreadID, ThreadTitle, PosterHandle, PosterTrip, PostType )
	{
		//alert( "pressed button" );
		
		try
		{
			if( this.GetWatchedThread( BoardID, ThreadID ) != null )
			{
				this.RemoveWatchThread( BoardID, ThreadID )
			}
			else
			{
				this.AddWatchThread( BoardID, ThreadID, ThreadTitle, PosterHandle, PosterTrip, PostType );	
			}
	
			//chan_UpdateWatcherItems( TargetDocument );
		}
		catch( e )
		{
			//alert( "4chan Error: " + e );
		}
	}
	// POST HIDEING
	,
	IsPostHidden: function( BoardID, PostID )
	{
		if( !this.HiddenPosts )
		{
			this.HiddenPosts = new Array();
			return false;
		}
		
		var i;
		for( i = 0; i < this.HiddenPosts.length; i++ )
		{
			var CurrentPost = this.HiddenPosts[i];
			if( CurrentPost.BoardID == BoardID &&
				CurrentPost.PostID == PostID )
			{
				return true;
			}
		}
		
		return false;
	}
	,
	GetHiddenPost: function( BoardID, PostID )
	{
		if( !this.HiddenPosts )
		{
			this.HiddenPosts = new Array();
			return null;
		}
		
		var i;
		for( i = 0; i < this.HiddenPosts.length; i++ )
		{
			var CurrentPost = this.HiddenPosts[i];
			if( CurrentPost.BoardID == BoardID &&
				CurrentPost.PostID == PostID )
			{
				return CurrentPost;
			}
		}
		
		return null;
	}
	,
	SaveHiddenPosts: function()
	{
		if( !this.HiddenPosts )
		{
			this.HiddenPosts = new Array();
		}
		
		var SettingsString = "";
		
		var i;
		for( i = 0; i < this.HiddenPosts.length; i++ )
		{
			SettingsString += "" + this.HiddenPosts[i].BoardID + "," + this.HiddenPosts[i].PostID + "," + this.HiddenPosts[i].LastSeen + ";"
		}
	
		this.Pref.setCharPref( "hidden_posts", SettingsString );
	}
	,
	LoadHiddenPosts: function()
	{
		this.HiddenPosts = new Array();
	
		var HiddenPostsString = this.Pref.getCharPref( "hidden_posts" );
	
		var HiddenPostsStrings = HiddenPostsString.split( ";" );
		
		var i;
		for( i = 0; i < HiddenPostsStrings.length; i++ )
		{
			var Result = HiddenPostsStrings[i].match( /(.+),([0-9]+),([0-9]+)/ );
			if( Result )
			{
				var NewHiddenPost = new ChanHiddenPost();
				NewHiddenPost.BoardID = Result[1];
				NewHiddenPost.PostID = parseInt( Result[2] );
				NewHiddenPost.LastSeen = parseInt( Result[3] );
				
				this.HiddenPosts.push( NewHiddenPost );
			}
		}
	}
	,
	HidePost: function( BoardID, PostID )
	{
		if( !this.HiddenPosts )
			this.HiddenPosts = new Array();
	
		// already hidden?
		if( this.IsPostHidden() )
			return;
		
		var Now = new Date();
		
		var NewHiddenPost = new ChanHiddenPost();	
		NewHiddenPost.BoardID = BoardID;
		NewHiddenPost.PostID = PostID;
		NewHiddenPost.LastSeen = Now.getTime();
		
		this.HiddenPosts.push( NewHiddenPost );
		this.SaveHiddenPosts();
		
		this.Observer.notifyObservers( null, "4chan.HiddenPostChanged", "" );
		
	}
	,
	UnhidePost: function( BoardID, PostID )
	{
		var i = 0;
		while( i < this.HiddenPosts.length )
		{
			if( this.HiddenPosts[i].BoardID == BoardID && this.HiddenPosts[i].PostID == PostID )
			{
				this.HiddenPosts.splice( i, 1 );
				this.SaveHiddenPosts();
				
				this.Observer.notifyObservers( null, "4chan.HiddenPostChanged", "" );
				return;
			}
			
			i++;
		}
	}
	,
	SeenPost: function( BoardID, PostID )
	{
		var Post = this.GetHiddenPost( BoardID, PostID );
		if( Post )
		{
			var Now = new Date();
			Post.LastSeen = Now.getTime();
		}
		this.SaveHiddenPosts();
	}
	,
	PergeOldHiddenPosts: function()
	{
		if( !this.HiddenPosts )
		{
			this.HiddenPosts = new Array();
			return null;
		}
		
		var Now = new Date();
		var MaxAge = 60 * 60 * 24 * 14 * 1000; // 2 weeks
		var i;
		for( i = 0; i < this.HiddenPosts.length; i++ )
		{
			if( this.HiddenPosts[i].LastSeen + MaxAge <= Now.getTime() )
			{
				//throw "Removing hidden post " + this.HiddenPosts[i].BoardID + "," + this.HiddenPosts[i].PostID + "," + this.HiddenPosts[i].LastSeen + ". now=" + Now.getTime();
				this.HiddenPosts.splice( i, 1 );
				i--;
			}
		}
		
		this.SaveHiddenPosts();
	}
	,
	QuickReplyWindows: null
	,
	// Quick reply window management
	GetQuickReplyWindow: function( BoardID, ThreadID )
	{
		if( !this.QuickReplyWindows )
		{
			this.QuickReplyWindows = new Array();
		}
		
		var i;
		for( i = 0; i < this.QuickReplyWindows.length; i++ )
		{
			if( this.QuickReplyWindows[i].BoardID == BoardID &&
				this.QuickReplyWindows[i].ThreadID == ThreadID )
			{
				return this.QuickReplyWindows[i].QRWindow;
			}
		}
		
		return null;
	}
	,
	GetQuickReplyDocument: function( BoardID, ThreadID )
	{
		if( !this.QuickReplyWindows )
		{
			this.QuickReplyWindows = new Array();
		}
		
		var i;
		for( i = 0; i < this.QuickReplyWindows.length; i++ )
		{
			if( this.QuickReplyWindows[i].BoardID == BoardID &&
				this.QuickReplyWindows[i].ThreadID == ThreadID )
			{
				return this.QuickReplyWindows[i].QRDocument;
			}
		}
		
		return null;
	}
	,	
	AddQuickReplyWindow: function( BoardID, ThreadID, QRWindow, QRDocument )
	{
		if( !this.QuickReplyWindows )
		{
			this.QuickReplyWindows = new Array();
		}
			
		var NewReplyWindow = new ChanQuickReplyWindow();
		NewReplyWindow.BoardID = BoardID;
		NewReplyWindow.ThreadID = ThreadID;
		NewReplyWindow.QRWindow = QRWindow;
		NewReplyWindow.QRDocument = QRDocument;
		
		this.QuickReplyWindows.push( NewReplyWindow );
		
		//alert( "AddQuickReplyWindow: " + BoardID + " " + ThreadID );
	}
	,
	RemoveQuickReplyWindow: function( BoardID, ThreadID )
	{
		if( !this.QuickReplyWindows )
		{
			this.QuickReplyWindows = new Array();
		}
		
		var i;
		for( i = 0; i < this.QuickReplyWindows.length; i++ )
		{
			if( this.QuickReplyWindows[i].BoardID == BoardID &&
				this.QuickReplyWindows[i].ThreadID == ThreadID )
			{
				this.QuickReplyWindows.splice( i, 1 );
				return;
			}
		}
		
		return null;
	}
	,
	QuickQuoteQueue: null
	,
	AddToQuoteQueue: function( BoardID, ThreadID, Quote )
	{
		if( !this.QuickQuoteQueue )
		{
			this.QuickQuoteQueue = new Array();
		}
		
		var NewQuote = new ChanQuickQuote();
		NewQuote.BoardID = BoardID;
		NewQuote.ThreadID = ThreadID;
		NewQuote.Quote = "" + Quote;
		
		this.QuickQuoteQueue.push( NewQuote );
		
		return null;
	}
	,
	GetQuote: function( BoardID, ThreadID )
	{
		if( !this.QuickQuoteQueue )
		{
			this.QuickQuoteQueue = new Array();
		}
		
		var i;
		for( i = 0; i < this.QuickQuoteQueue.length; i++ )
		{
			if( this.QuickQuoteQueue[i].BoardID == BoardID &&
				this.QuickQuoteQueue[i].ThreadID == ThreadID )
			{
				return this.QuickQuoteQueue[i].Quote;
			}
		}
		
		return null;
	}
	,
	RemoveQuote: function( BoardID, ThreadID )
	{
		if( !this.QuickQuoteQueue )
		{
			this.QuickQuoteQueue = new Array();
		}
		
		var i;
		for( i = 0; i < this.QuickQuoteQueue.length; i++ )
		{
			if( this.QuickQuoteQueue[i].BoardID == BoardID &&
				this.QuickQuoteQueue[i].ThreadID == ThreadID )
			{
				this.QuickQuoteQueue.splice( i, 1 );
				return;
			}
		}
		
		return null;
	}
	,	

//	logging ======================================================================================================================================
	logFile: null,
	initLog: function()
	{
		var directoryService = Components.classes["@mozilla.org/file/directory_service;1"].getService( Components.interfaces.nsIProperties );
		
		// open the file
		this.logFile = directoryService.get( "ProfD", Components.interfaces.nsIFile );
		this.logFile.append( "4chan_log.txt" );	
		
		if( this.logFile.exists() == false)
		{
			this.logFile.create( Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420 );
		}
		
		var fileOutputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance( Components.interfaces.nsIFileOutputStream );
		fileOutputStream.init( this.logFile, 0x20 | 0x04 | 0x08, 420, 0 );
		var message = "BEGIN LOG\n";
		fileOutputStream.write( message, message.length );
		fileOutputStream.close();
	}
	,
	log: function( text )
	{
		var fileOutputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance( Components.interfaces.nsIFileOutputStream );
		fileOutputStream.init( this.logFile, 0x10 | 0x04 | 0x08, 420, 0 );
		fileOutputStream.write( text + "\n", text.length + 1 );
		fileOutputStream.close();
	}
	,
	logWarning: function( text )
	{
		this.log( "WARNING: " + text );
	}
	,
	logError: function( text )
	{
		this.log( "ERROR: " + text );
	}
	,
	logSql: function( sql )
	{
		this.log( "SQL: " + sql );
	}
	,
	

    // XPCOM Glue
    QueryInterface: function(iid)
    {
       if (!iid.equals(nsISupports))
          throw Components.results.NS_ERROR_NO_INTERFACE;
       return this;
    },
 
   get wrappedJSObject() { return this; }
};


// Component registration
var ManagerObjectModule = new Object();
var ManagerObjectFactory = new Object();

// This creates the singleton object we use for settings persistence
var ManagerObjectObject = new chanManagerObject();

ManagerObjectModule.registerSelf = function(compMgr, fileSpec, location, type)
{
   compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
   compMgr.registerFactoryLocation(CHAN_ID,
                                   "chanManagerObject",
                                   CHAN_XCOMID,
                                   fileSpec,
                                   location,
                                   type);
}

ManagerObjectModule.getClassObject = function(compMgr, cid, iid)
{
   if (!cid.equals(CHAN_ID))
      throw Components.results.NS_ERROR_NO_INTERFACE;
   if (!iid.equals(Components.interfaces.nsIFactory))
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
   return ManagerObjectFactory;
}

ManagerObjectModule.CanUnload = function(compMgr)
{
   return true;
}

// Returns the singleton object when needed.


ManagerObjectFactory.createInstance = function(outer, iid)
{
   if (outer != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;
   if (!iid.equals(nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;
   return ManagerObjectObject;
}

// XPCOM Registration Function -- called by Firefox
function NSGetModule(compMgr, fileSpec)
{
   return ManagerObjectModule;
}



