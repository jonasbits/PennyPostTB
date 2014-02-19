/* Penny Post - A postage system for email
 * Copyright (C) 2007  Aliasgar Lokhandwala <d7@freepgs.com> 
 * http://pennypost.sourceforge.net/
 *
 * ppost.js: Utility functions
 * 
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

//TB 24 stopped using "pref" and now we need to define it, 
//TB 24 dont use "gIO Service" anymore, we need to use Services.io instead
//var pr ef = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
//var gIO Service = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService); 

var gStampTypes={	UNKNOWN:0,
					S_UNKNOWN:'none',
					HASHCASH:1,
					S_HASHCASH:'hashcash',
					MBOUND:2,
					S_MBOUND:'mbound'
				};

/**
 * Tries to get the path of ppost.jar relative to the extension folder
 * This jar is in the lib folder of the extension folder
 */
function getJarPath(){
	try{
		var eid = "{3748ced8-ae28-48ac-a954-4bff3360f72d}";
		/**var ext = Components.classes["@mozilla.org/extensions/manager;1"]
	                    .getService(Components.interfaces.nsIExtensionManager)
	                    .getInstallLocation(eid)
	                    .getItemLocation(eid); 
	    	ext.append("lib");
	    	ext.append("ppost.jar");
		*/
		//var addonLocation;
		Components.utils.import("resource://gre/modules/AddonManager.jsm");  
			AddonManager.getAddonByID(eid, function(addon) {
				addonLocation = addon.getResourceURI("/lib/ppost.jar").QueryInterface(Components.interfaces.nsIFileURL).file.path;
				alert("Copy this " + addonLocation);
			}); //end of AddonManager async call
	    /*if(!ext.exists()){
	    	throw new Error('ppost.jar not found in '+ext.path);
	    }
	    */

	}catch(ex){
		Components.utils.reportError(ex);
		//ignore
		return '';
	}
	return "Copy path from popup dialog";
}

/**
 * Reads back from the file once the external process is done.
 * We detect a change in file modification time to check if the 
 * process has changed the file.
 * 
 * This function will give up after about 1 minute.
 * 
 * This function compliments readFromProgram.
 * 
 * @param handler
 * 		The handler to cal once done or on error
 * @param sFilePath
 * 		The path of the file to monitor and read from
 * @param iLastMod
 * 		Last modification time of the file
 * @param iWaitCount
 * 		How long we have been waiting, in seconds.
 */
function readBack(handler, sFilePath, iLastMod, iWaitCount){
	try{
		var file = Components.classes["@mozilla.org/file/local;1"]
	                     .createInstance(Components.interfaces.nsIFile);
		file.initWithPath(sFilePath);
		if(file.lastModifiedTime !=iLastMod || iWaitCount>180){
			// read back output
			var istream = Components.classes["@mozilla.org/network/file-input-stream;1"]
		                        .createInstance(Components.interfaces.nsIFileInputStream);
			istream.init(file, 0x01, 0444, 0);
			istream.QueryInterface(Components.interfaces.nsILineInputStream);
		
			var line = {}, lines = '', hasmore;
			do {
		  		hasmore = istream.readLine(line);
		  		lines+=line.value; 
			} while(hasmore);
			
			istream.close();
			
			//delete the temp file
			file.remove(false);

			handler.finished(lines);
		}else{
			//continue waiting & checking
			setTimeout(readBack, 500, handler, sFilePath, iLastMod, iWaitCount+1);
		}
	}catch(ex){
		if(handler.handleError){
			Components.utils.reportError('Exception during readback ' + ex + ". I've passed it on to a handler");
			handler.handleError(ex);
		}else{
			Components.utils.reportError("Ignored exception during readback " + ex);
		}
	}
}

/**
 * Communicates with the external program to generate or verify stamps
 * Handles invocation of external program and reading back of output
 * 
 * This function will return immediately. The external program will 
 * run in the background and the handler will be notified when data 
 * becomes available.
 * 
 * @param pref 
 * 		The Mozilla preference object
 * @param outputParams 
 * 		An array of arguments to be passed to the program
 * @param handler 
 * 		An object containing the finished method, 
 * 		which is called if the invocation was successful
 * 
 * @return
 * 		true on success, false on error
 */
function readFromProgram(pref, outputParams, handler)
{
	try{
		var javapath=null;
		var path=pref.getCharPref('extensions.ppost.path');
		var useJava=pref.getBoolPref('extensions.ppost.usejavalaunch');
		if(useJava){
			if(path.length==0){
				path=getJarPath();
				pref.setCharPref('extensions.ppost.path',path);
			}
			javapath=pref.getCharPref('extensions.ppost.javapath');
		}
		
		if((useJava && javapath.length==0) || path.length==0){
			var msg=gStrBundle.getString("error_config");
			alert(msg);
			throw new Error(msg);				
		}
			
		//create a temp file
		var file = Components.classes["@mozilla.org/file/directory_service;1"]
	                     .getService(Components.interfaces.nsIProperties)
	                     .get("TmpD", Components.interfaces.nsIFile);
		file.append("ppost.tmp");
		file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);
		
		//write to temp file
		var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
	                         .createInstance(Components.interfaces.nsIFileOutputStream);
	
		foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); // write, create, truncate
		var sTempOut='ERR/stamp program did not respond in time';
		foStream.write(sTempOut, sTempOut.length);
		foStream.close();
		
		//save filepath
		var sFilePath = file.path;
		
		//locate process file
		var processfile = Components.classes["@mozilla.org/file/local;1"]
                     .createInstance(Components.interfaces.nsIFile);
        var args = new Array();
        if(useJava){
			processfile.initWithPath(javapath);
			args=['-jar',path, '-o',file.path];
        }else{
			processfile.initWithPath(path);
			args=['-o',file.path];
        }
        args=args.concat(outputParams);
        
		if(!processfile.exists()){
			throw Error(gStrBundle.getString("application")+" "+processfile.path+" "+gStrBundle.getString("error_noprog"));
		}
			
		// create an nsIProcess
		var process = Components.classes["@mozilla.org/process/util;1"]
                        .createInstance(Components.interfaces.nsIProcess);
		process.init(processfile);
		
		//we need some delay before actually running the process
		//otherwise file-modification time is indistinguishable
		setTimeout(runProcess, 1000, process, args, handler, sFilePath);
	} catch (ex){
		if(handler.handleError){
			Components.utils.reportError('Exception calling stamp program ' + ex + ". I've passed it on to a handler");
			handler.handleError(ex);
		}else{
			Components.utils.reportError('Ignored exception in calling stamp program ' + ex);
		}
    	return false;
  	}
  	
  return true;
}

/**
 * This function runs the process with supplied arguments 
 * and sets up the readback timer.
 */
function runProcess(process, args, handler, sFilePath){
	try{
		var file = Components.classes["@mozilla.org/file/local;1"]
	                     .createInstance(Components.interfaces.nsIFile);
		file.initWithPath(sFilePath);
		
		//save last file mod time
		iLastMod=file.lastModifiedTime;
		
		process.run(false/*no-block*/, args, args.length);
		setTimeout(readBack, 500, handler, sFilePath, iLastMod, 0);
	}catch(ex){
		if(handler.handleError){
			Components.utils.reportError('Exception running stamp program ' + ex + ". I've passed it on to a handler");
			handler.handleError(ex);
		}else{
			Components.utils.reportError('Ignored exception in running stamp program ' + ex);
		}
	}
}

var beingUninstalled;
var beingDisabled;

let listener = {
  onUninstalling: function(addon) {
    if (addon.id == "{3748ced8-ae28-48ac-a954-4bff3360f72c}") {
      beingUninstalled = true;
	//alert(beingUninstalled);
	//var extraHdrs = Services.prefs.getCharPref("mailnews.headers.extraExpandedHeaders");
	//alert(extraHdrs);
	Services.prefs.setCharPref("mailnews.headers.extraExpandedHeaders", "");
    }
  },
  onDisabling: function(addon) {
    if (addon.id == "{3748ced8-ae28-48ac-a954-4bff3360f72c}") {
      beingDisabled = true;
	//alert(beingDisabled);
	Services.prefs.setCharPref("mailnews.headers.extraExpandedHeaders", "");
    }
  },
  onOperationCancelled: function(addon) {
    if (addon.id == "{3748ced8-ae28-48ac-a954-4bff3360f72c}") {
      beingUninstalled = (addon.pendingOperations & AddonManager.PENDING_UNINSTALL) != 0;
	//alert(beingUninstalled);
    }
  }
}

try {
  Components.utils.import("resource://gre/modules/AddonManager.jsm");
  AddonManager.addAddonListener(listener);
} catch (ex) {
	//debug alert(ex);
}
	
