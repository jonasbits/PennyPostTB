/* Penny Post - A postage system for email
 * Copyright (C) 2007  Aliasgar Lokhandwala <d7@freepgs.com> 
 * http://pennypost.sourceforge.net/
 *
 * stampInfo.js: Stamp info dialog script
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

// dialog is just an array we'll use to store various properties from the dialog document...
var dialog;

var gobPref;
var gobStamp;
var garyAllStampHeaders=null;
var gIcon;
var gsStampProtocolHeader;
var gStrBundle=null;

/**
 * Parses the x-stampprotocols header and displays its info
 */
function populateStampProtocolInfo(){
	try{
		var algos=gsStampProtocolHeader.split(';');
		
		dialog.sender_defalgo.value=gStrBundle.getString("unknown");
		dialog.sender_mbsupport.value=gStrBundle.getString("no");
		dialog.sender_hcsupport.value=gStrBundle.getString("no");
		for (i in algos){
			var algo=algos[i].split(':');
			if(algo[0]==gStampTypes.S_MBOUND){
				if(i==0){
					dialog.sender_defalgo.value="MBound";
				}
					
		        dialog.sender_mbsupport.value=gStrBundle.getString("yes");
		        dialog.sender_mbver.value=algo[1];
		        dialog.sender_mbcost.value=algo[2];
		        dialog.sender_mbminpath.value=algo[3];
		        dialog.sender_mbmaxpath.value=algo[4];  
			}
			if(algo[0]==gStampTypes.S_HASHCASH){
				if(i==0){
					dialog.sender_defalgo.value="HashCash";
				}
		        dialog.sender_hcsupport.value=gStrBundle.getString("yes");
		        dialog.sender_hcver.value=algo[1];
		        dialog.sender_hccost.value=algo[2];
			}
		}
	}catch(ex){
		Components.utils.reportError(ex);
	}
}

/**
 * Called automatically when an address is selected 
 * in list-box in tab3 
 */
function onAddressSelect(){
	try{
		document.getElementById("allstamps.desc").value = dialog.stampheaders_list.getSelectedItem(0).label;
	}catch(ex){
		Components.utils.reportError(ex);
	}
}

/**
 * Popluate tab 3 with data from all stamp headers
 */
function populateAllStampHeadersInfo(){
	try{
		for (i in garyAllStampHeaders){
			dialog.stampheaders_list.appendItem(garyAllStampHeaders[i],i);
		}
	}catch(ex){
		Components.utils.reportError(ex);
	}
}

/**
 * Called automatically each time this dialog is loaded.
 */
function onLoad() {
    try{
        //Read args & Set global variables
        gobStamp=window.arguments[0];
        gobPref=window.arguments[1];
		gsStampProtocolHeader=window.arguments[2]; //may be null
		garyAllStampHeaders=window.arguments[3]; //may be null
		gStrBundle = document.getElementById("ppost.string-bundle");
		
		//init dialog elements
        dialog = new Object;
        //tab 1
        dialog.validity = document.getElementById("stamp.validity");
        dialog.algo = document.getElementById("stamp.algo");
        dialog.algover = document.getElementById("stamp.algover");
        dialog.cost = document.getElementById("stamp.cost");
        dialog.recipient = document.getElementById("stamp.recipient");
        dialog.date = document.getElementById("stamp.date");
        dialog.emdate = document.getElementById("email.date");
        dialog.data = document.getElementById("stamp.data");
        dialog.stampid = document.getElementById("stamp.id");
        dialog.stampvalue = document.getElementById("stamp.value");
        dialog.status=document.getElementById("stamp.status");
        
        //tab 2
        dialog.sender_defalgo=document.getElementById("sender.defalgo");
        dialog.sender_mbsupport=document.getElementById("sender.mb");
        dialog.sender_mbver=document.getElementById("sender.mb.ver");
        dialog.sender_mbcost=document.getElementById("sender.mb.cost");
        dialog.sender_mbminpath=document.getElementById("sender.mb.minpath");
        dialog.sender_mbmaxpath=document.getElementById("sender.mb.maxpath");        
        dialog.sender_hcsupport=document.getElementById("sender.hc");
        dialog.sender_hcver=document.getElementById("sender.hc.ver");
        dialog.sender_hccost=document.getElementById("sender.hc.cost");

		//tab 3
		dialog.stampheaders_list=document.getElementById("allstamps.list");
		
        //populate fields
        dialog.validity.value=gStrBundle.getString("unknown");
        if(!gobStamp){
        	dialog.status.value=gStrBundle.getString("nostampinfo");
        }else{
        	if(gobStamp.bValid){
        		dialog.validity.value=gStrBundle.getString("valid");
        	}else{
        		if(gobStamp.bError){
        			dialog.validity.value=gStrBundle.getString("invalid");
        		}
        	}
        	
        	if(gobStamp.sError)
        		dialog.status.value = gobStamp.sError;
        		
        	dialog.algo.value = gobStamp.sType;
        	dialog.algover.value=gobStamp.iVersion;
        	dialog.cost.value = gobStamp.iCost+'+'+gobStamp.iPathLen;
        	
        	if(gobStamp.sResource)
        		dialog.recipient.value = gobStamp.sResource;
        		
        	if(gobStamp.dtGen)
        		dialog.date.value=gobStamp.dtGen.toUTCString();
        	
        	if(gobStamp.sEmailDt)
        		dialog.emdate.value=gobStamp.sEmailDt;
        		        		
        	if(gobStamp.sExtensions)
        		dialog.data.value=gobStamp.sExtensions;

        	if(gobStamp.sStampID)
        		dialog.stampid.value=gobStamp.sStampID.toUpperCase();
        		
        	if(gobStamp.sStampVal)
        		dialog.stampvalue.value=gobStamp.sStampVal.toUpperCase();
        	
        	if(gobStamp.sError)
        		dialog.status.value=gobStamp.sError;
        }//end else
        
        //populate other tabs if possible
        if(gsStampProtocolHeader){
        	populateStampProtocolInfo();
        }
        	
        if(garyAllStampHeaders){
        	populateAllStampHeadersInfo();
        }
    }catch(ex){
    	Components.utils.reportError(ex);
    	alert(gStrBundle.getString("windowloadfail") + " - " + ex);
    	window.close();
    }
}

function onUnload() 
{
    return true;
}

/**
 * Ok button handler.
 * If the user presses cancel, tell the app launcher and close the dialog.
 */
function onOk () 
{      
    return true;
}

