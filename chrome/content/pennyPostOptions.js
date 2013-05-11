/* Penny Post - A postage system for email
 * Copyright (C) 2007  Aliasgar Lokhandwala <d7@freepgs.com> 
 * http://pennypost.sourceforge.net/
 *
 * pennyPostOptions.js: Configuration dialog script
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
//Uses: ppost.js

var nsIFilePicker = Components.interfaces.nsIFilePicker;

// dialog is just an array we'll use to store various properties from the dialog document...
var dialog;

var gStrBundle=null;

var prefs=null;

/**
 * Init dialog elements
 */
function initDlg() {
    try{
        //Read args & Set global variables
		gStrBundle = document.getElementById("string-bundle");
		
		//init dialog elements
        dialog = new Object;

        dialog.ppost = document.getElementById("ppost.path.box");
        dialog.javapath = document.getElementById("ppost.javapath.box");
        dialog.hc_enable = document.getElementById("ppost.hashcash.enable");
        dialog.mb_enable = document.getElementById("ppost.mbound.enable");
        dialog.def_algo = document.getElementById("ppost.defalgo");
        
        prefs = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefBranch);
    }catch(ex){
    	alert(gStrBundle.getString("windowloadfail") + " - " + ex);
    	window.close();
    }
}

/**
 * Helps the user test regular expressions he is using
 */
function onTestRegEx(){
	try{
		var sRegex = document.getElementById("ppost.regex.expn.box").value;
		var sTestStr = document.getElementById("ppost.regex.string.box").value;
		
		if(sRegex.length==0){
			document.getElementById("ppost.regex.expn.box").focus();
			return;
		}
		if(sTestStr.length==0){
			document.getElementById("ppost.regex.string.box").focus();
			return;
		}
		
		var obRegEx = new RegExp("^"+sRegex+"$",'gi');
		if(sTestStr.search(obRegEx)!=-1){
			alert(gStrBundle.getString("regex_match")+ ' ' +obRegEx);
		}else{
			alert(gStrBundle.getString("regex_nomatch")+ ' ' +obRegEx);
		}
	}catch(ex){
		alert(ex);
	} 
}

/**
 * Tries to populate the path of ppost.jar automatically
 */
function onDetectStampProgram(){
	var jarpath=getJarPath();
	if(jarpath==''){
		alert(gStrBundle.getString("jarpathdetectfail"));
	}else{
		dialog.ppost.value=jarpath;
		prefs.setCharPref('ppost.path', dialog.ppost.value);
	}
}

/**
 * Opens the filepicker to search for the stamp executable or jar
 */
function onBrowseStampProgram(){
	var filePickerDlg = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
 	filePickerDlg.init(window, gStrBundle.getString("browse_stamp_prog"),nsIFilePicker.modeOpen);
 	filePickerDlg.appendFilters(nsIFilePicker.filterAll|nsIFilePicker.filterApps);
 	filePickerDlg.appendFilter("ppost.jar","ppost.jar");
 	filePickerDlg.appendFilter(gStrBundle.getString("java_apps"),"*.jar");
 	var file=null;
 	try{
		file = Components.classes["@mozilla.org/file/local;1"]
		           		.createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(dialog.ppost.value);
		filePickerDlg.displayDirectory=file;
 	}catch(ex){
 		//ignore
 	}
 	var rv=filePickerDlg.show();
	if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
		dialog.ppost.value=filePickerDlg.file.path;
		prefs.setCharPref('ppost.path', dialog.ppost.value);
	}
}

/**
 * Opens the filepicker to search for the java executable
 */
function onBrowseJava(){
	var filePickerDlg = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
 	filePickerDlg.init(window, gStrBundle.getString("browse_java_prog"),nsIFilePicker.modeOpen);
 	filePickerDlg.appendFilters(nsIFilePicker.filterAll|nsIFilePicker.filterApps);
 	var file=null;
 	try{
		file = Components.classes["@mozilla.org/file/local;1"]
	           		.createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(dialog.javapath.value);
		filePickerDlg.displayDirectory=file;
 	}catch(ex){
 		//ignore
 	}
 	var rv=filePickerDlg.show();
	if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
		dialog.javapath.value=filePickerDlg.file.path;
		prefs.setCharPref('ppost.javapath', dialog.javapath.value);
	}
}

/**
 * Called automatically when the dialog is being closed with OK.
 * 
 * BUG: In Linux distros this function is not called automatically, 
 * so cant do anything really important here.
 * 
 * Return true to accept and close, false to keep the dialog open.
 */
function onValidate(){
	if(dialog.def_algo.value==gStampTypes.S_HASHCASH && dialog.hc_enable.value==false){
		alert(gStrBundle.getString("error_defnosupport"));
		return false;
	}
	
	if(dialog.def_algo.value==gStampTypes.S_MBOUND && dialog.mb_enable.value==false){
		alert(gStrBundle.getString("error_defnosupport"));
		return false;
	}
	
	return true;
}

//init the dialog on load
initDlg();
