/* Penny Post - A postage system for email
 * Copyright (C) 2007  Aliasgar Lokhandwala <d7@freepgs.com> 
 * http://pennypost.sourceforge.net/
 *
 * messageWindowOverlay.js: Overlay for the message display window
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

var gobStamp=null;
var gsStampProtocolHeader=null;
var gAllStampHeaders=null;
var gStrBundle=null;
var gPpostHdrList = ["x-hashcash", "x-mbound", "x-stampprotocols", "received" ];
var gEnabledAllHeaders=false;
	
//listen to the message window load/unload event
addEventListener("messagepane-loaded", msHdrViewload,true);

/**
 * Add our headers to extra headers list so that Thunderbird 
 * parses them for us
 * (bug1788340)
 */
function ensureStampExtraHeaders() {
	try{
		var extraHdrs = " " + Services.prefs.getCharPref("mailnews.headers.extraExpandedHeaders").toLowerCase() + " ";
		
		var addHdr = [];
		
		for (hdr in gPpostHdrList) {
			if (extraHdrs.indexOf(" "+gPpostHdrList[hdr]+" ") < 0) {
				addHdr.push(gPpostHdrList[hdr]);
			}
		}
		
		if (addHdr.length > 0) {
			extraHdrs += addHdr.join(" ");
			extraHdrs = extraHdrs.replace(/^ */, "").replace(/ *$/, "");
			Services.prefs.setCharPref("mailnews.headers.extraExpandedHeaders", extraHdrs);
		}
	}catch(ex){
		//fails on TB 1.5 as mailnews.headers.extraExpandedHeaders is not available
		Components.utils.reportError(ex);
		Components.utils.reportError('Extraheaders setup failed, falling back to using all header mode.');
		//fallback to using all headers
		Services.prefs.setIntPref("mail.show_headers",2);
		gEnabledAllHeaders=true;
	}
}

/**
 * Automatically called at least once when the window is loaded.
 * Sets the stage for stamp detection
 */
function msHdrViewload(){
	try{	    
	    //ensure we get the headers we need (bug1788340)
	    ensureStampExtraHeaders();
	    
	    /* removed feature since v.1.5.2 (add scrollbars to header pane)
	    if(pref.getBoolPref('ppost.addheaderscroll') || gEnabledAllHeaders){
	    	document.getElementById('msgHeaderView').setAttribute("maxheight",pref.getIntPref('mail.headerScroll.maxheight'));
		document.getElementById('msgHeaderView').style.overflow='auto';
	    }
	    removed */

	    gStrBundle = document.getElementById("ppost.string-bundle");
	    
	    //we are interested in end headers
	    gMessageListeners.push({onEndHeaders:updateStamp,onStartHeaders:msNoop});
	}catch(ex){
		//fatal, should not happen!
    	Components.utils.reportError(ex);
    }
}

/**
 * No Operation
 */
function msNoop(){
}

/**
 * Opens the stamp info dialog
 */
function displayStampInfo(){
		var elmIcon=document.getElementById('ppostIcon');
        window.openDialog("chrome://ppost/content/stampInfo.xul",
                            "stampInfo", "chrome,modal,titlebar,centerscreen,resizable",
                            gobStamp, Services.prefs, gsStampProtocolHeader,gAllStampHeaders);
}

/**
 * Verifys the stamp cryptographically with the external program.
 * 
 * Cryptographic verification can only check the token was not tampered with, 
 * it does not really deem the stamp valid, so do this at the end after 
 * testing the stamp locally.
 */
function verifyStamp()
{
	//Read all prefs
  	var hcminval=Services.prefs.getIntPref('extensions.ppost.hashcash.minvalue');
  	var mbminval=Services.prefs.getIntPref('extensions.ppost.mbound.minvalue');
  	var minpath=Services.prefs.getIntPref('extensions.ppost.mbound.minpath');
  	var maxpath=Services.prefs.getIntPref('extensions.ppost.mbound.maxpath');
  
  	var elmIcon=document.getElementById('ppostIcon');
  	
  	//start by resetting state
  	gobStamp.bValid=false;
  	gobStamp.bError=false;
  	
  	var listener = {
  		//handles failed verification process
  		//If verification process fails, we cannot 
  		//ascertain the stamps validity for sure
  		handleError: function(error){
	      	gobStamp.bError=true;
	      	gobStamp.sError=gStrBundle.getString("error_failverify")+"- " + error;
	      	elmIcon.src="chrome://ppost/skin/unpostage.png";
	      	elmIcon.tooltipText=gStrBundle.getString("error_failverifytip");
  		},
  		
	    finished : function(data){
	    	//remove trailing newline
	    	data=data.replace('\n','');
	    	
	      	var info=data.split('/');
	      	info[0]=info[0].replace(/\s+/g,'');
	      	
	      	//verification process failed due to some exception
	      	if(info[0]=='ERR'){
		      	gobStamp.bError=true;
		      	gobStamp.sError=gStrBundle.getString("error_failverify")+": " + info[1];
		      	elmIcon.src="chrome://ppost/skin/unpostage.png";
		      	elmIcon.tooltipText=gStrBundle.getString("error_failverifytip");
	      	}
	      	
	      	if(info[0]=='OK'){
	      		info[1]=info[1].replace(/\s+/g,'');
		      	if(info[1]!='verified'){
		      		gobStamp.bError=true;
		      		gobStamp.sError=gStrBundle.getString("error_invalid")+': '+ info[1];
		      		elmIcon.src="chrome://ppost/skin/wrpostage.png";
		      		elmIcon.tooltipText = gStrBundle.getString("error_invalidtip");
		      		
		      		var autojunk=Services.prefs.getBoolPref('extensions.ppost.automarkjunk');
		      		//message is junk
		            if(!SelectedMessagesAreJunk() && autojunk){
		            	JunkSelectedMessages(true);
		            }
		      	}else{
		      		gobStamp.bValid=true;
		      	    elmIcon.src="chrome://ppost/skin/postage.png";
		            elmIcon.tooltipText = gStrBundle.getString("error_validtip");
		            gobStamp.sError=gStrBundle.getString("error_valid")+': '+info[1];
		            //message is not junk
		            if(SelectedMessagesAreJunk()){
		            	JunkSelectedMessages(false);
		            }
		      	}
	      	}
	      	
	    }//end function defn
	    
  	}
  
  	var cmd=new Array();
  	cmd.push('-c');
  	switch(gobStamp.iType){
  		case gStampTypes.HASHCASH:
	  	    cmd.push('hashcash');
	  	    cmd.push(hcminval);
	  	    cmd.push(gobStamp.sToken);
	  		break;
	  	case gStampTypes.MBOUND:
	  	    cmd.push('mbound');
	  	    cmd.push(mbminval);
	  	    cmd.push(minpath);
	  	    cmd.push(maxpath);
	  	    cmd.push(gobStamp.sToken);
	  		break;
	  	default:
	  		//should never happen, otherwise why did parseStamp succeed?
	  		return;
  	}

  	readFromProgram(Services.prefs, cmd, listener);
}

/**
 * Returns the list of emails that belong to the current user from the prefs 
 */
function getMyValidEmails(){
	var sEmailList = Services.prefs.getCharPref('extensions.ppost.myemail');
	
	//get rid of any spaces between addresses
	sEmailList = sEmailList.replace(/\s+/g,'');
	
	//treat , and ; alike
	sEmailList=sEmailList.replace(';',',');
	
	//save cleaned values back
	Services.prefs.setCharPref("extensions.ppost.myemail", sEmailList);
	
	if(sEmailList.length==0){
		var msg=gStrBundle.getString("error_config");
		alert(msg);
		throw new Error(msg);
	}
	
	return sEmailList.split(',');
}

/**
 * Checks the stamp params locally to see if it is valid
 * 
 * Returns false if the postage stamp is not generated for the current recepient
 * in which case the caller should stop all further processing and simply declare
 * the email as un-stamped.
 * Otherwise the return is always true and the validity of the stamp can 
 * be found using gobStamp.bValid and gobStamp.bError
 */
function localVerify(sHeaderDate){
	if(gobStamp){
		//start by resetting state
		gobStamp.bValid=false;
		gobStamp.bError=false;

		//check again if stamp is for current recepient
		var myEmails=getMyValidEmails();
		var found=false;
		for(email in myEmails){
			var  mailRe = new RegExp("^"+myEmails[email]+"$",'gi'); 
			if(gobStamp.sResource.search(mailRe)!=-1){
				found=true;		
			}
		}
		
		if(!found){
			gobStamp.bError=true;
			//return false as this is a special case where the postage is not for us
			//and it should be treated as if there is no postage at all
			return false;
		}
		
		//check if stamp values match our preferences
	  	var hcminval=Services.prefs.getIntPref('extensions.ppost.hashcash.minvalue');
	  	var mbminval=Services.prefs.getIntPref('extensions.ppost.mbound.minvalue');
	  	var minpath=Services.prefs.getIntPref('extensions.ppost.mbound.minpath');
	  	var maxpath=Services.prefs.getIntPref('extensions.ppost.mbound.maxpath');
  		
  		switch(gobStamp.iType){
  			case gStampTypes.HASHCASH:
  				if(gobStamp.iCost<hcminval){
					gobStamp.bError=true;
					gobStamp.sError = gStrBundle.getString("error_lesspostage");
					return true;
  				}
  				break;
  			case gStampTypes.MBOUND:
  				if(gobStamp.iCost<mbminval || gobStamp.iPathLen < minpath || gobStamp.iPathLen > maxpath){
					gobStamp.bError=true;
					gobStamp.sError = gStrBundle.getString("error_lesspostage");
					return true;
  				}
  				break;
  		}
  		
  		var skipchkdate=Services.prefs.getBoolPref('extensions.ppost.skip_date_verification2');

  		if(!skipchkdate){
	  		
			var aryDtTim=sHeaderDate.split(' ');
			var localDt=getReceivedDate();

			if(localDt==null){
				throw new Error(gStrBundle.getString("error_stale_nodate"));
			}
			
			gobStamp.sEmailDt = localDt.toUTCString();
			
			//check if email is received in the future
			//(allow mails 6 hrs in the future to account for time-zone differences)
			if((Date.now()-localDt)<-21600000){
				gobStamp.bError=true;
				gobStamp.sError = gStrBundle.getString("error_stale_future");
				return true;
			}
			
			//set time to 00hrs before date comparison with stamp
			localDt.setUTCHours(0);
			localDt.setUTCMinutes(0);
			localDt.setUTCSeconds(0);
			localDt.setUTCMilliseconds(0);
			
			//check if stamp is recent
			if(Math.round(Math.abs(gobStamp.dtGen-localDt)/86400000)>Services.prefs.getIntPref('extensions.ppost.maxagedays')){
				gobStamp.bError=true;
				gobStamp.sError = gStrBundle.getString("error_stale");
				return true;
			}
  		}else{
  			gobStamp.sEmailDt = gStrBundle.getString("skip_date");
  		}
  		
		//we reached till here, stamp looks valid
		gobStamp.bValid=true;
	}//end if(gobStamp)
	
	return true;
}

/**
 * Detect emails received date from 'received' headers
 */
function getReceivedDate(){
	var sHeaderBase='received';
	
	var sIndex = sHeaderBase;
	var i=0;
	var dtMail=null;
	
	//iterate through the whole header array trying to guess the right header
	for(j in currentHeaderData){
		//if our guess is correct...
		if(currentHeaderData[sIndex]){
			var recv=currentHeaderData[sIndex].headerValue.split(';');
			if(recv.length==2){
				var dtMail_tmp=new Date(recv[1]);
				//select the most recent date
				if(dtMail==null || dtMail<dtMail_tmp){
					dtMail=dtMail_tmp;
				}
			}
		}
		sIndex=sHeaderBase+i;
		i++;
	}

	return dtMail;
}

/**
 * The message may have multiple headers one for each recepient.
 * We need to find the one that applies to us.
 * 
 * Multiple headers are named by Thunderbird as 
 * x-hashcash, x-hashcash<N>
 * where N can be any numeric value - not necessarily in order 
 * This is extremely complex, I hate the way thunderbird handles headers!
 * 
 * This function locates and returns the header that applies to us
 * or null if no such header is found.
 * 
 * iStampType - The type of header we are expecting
 */
function getCorrectHeader(iStampType){
	var sHeaderBase;
	
	if(gAllStampHeaders == null){
		gAllStampHeaders = new Array();
	}
	
	var allCorrectHeaders= new Array();
	
	switch(iStampType){
		case gStampTypes.HASHCASH:
			sHeaderBase = 'x-hashcash';
			break;
		case gStampTypes.MBOUND:
			sHeaderBase = 'x-mbound';
			break;
		default:
			return null;
	}
	
	var sIndex = sHeaderBase;
	var iIndex; 
	var i=0;
	
	var myEmails = getMyValidEmails();
	
	//iterate through the whole header array trying to guess the right header
	for(j in currentHeaderData){
		//if our guess is correct...
		if(currentHeaderData[sIndex]){
			//save detected the header
			gAllStampHeaders.push(currentHeaderData[sIndex].headerValue);
			
			//look for the header email field in myEmails
			for(iIndex in myEmails){
				var  mailRe = new RegExp(":"+myEmails[iIndex]+":",'gi'); 
				if(currentHeaderData[sIndex].headerValue.search(mailRe) != -1)
					allCorrectHeaders.push(currentHeaderData[sIndex]);
			}
		}
		sIndex=sHeaderBase+i;
		i++;
	}
	
	//no matching header found
	return allCorrectHeaders;
}

/**
 * Hides the ppost headers from showing in the header pane
 */
function hidePpostHeaders(){
	try{
	    var index;
	    for (index = 0; index < gPpostHdrList.length; index++) {
	    	if (typeof(gExpandedHeaderView[gPpostHdrList[index]]) == "object") {
	    		if (! gViewAllHeaders) {
	        		gExpandedHeaderView[gPpostHdrList[index]].enclosingRow.setAttribute("hidden", true);
	        	}
				else {
					gExpandedHeaderView[gPpostHdrList[index]].enclosingRow.removeAttribute("hidden");
	        	}
	      	}
	    }
	}catch(ex){
		Components.utils.reportError(ex);
		//ignore, not important
	}
}

/**
 * Attempts to detect the stamp header and verifys the stamp.
 * Verification is attempted only of a valid stamp header is found.
 * Called automatically when headers are loaded.
 */
function updateStamp(){
	try{   
	    //reset any old gobStamp from previous verify cycles (bug1788340)
	    gobStamp=null;
	    gAllStampHeaders=null;
	    
	    hidePpostHeaders();
	    
	    var elmIcon=document.getElementById('ppostIcon');
	    var iStampType = gStampTypes.UNKNOWN;

	    //center the image vertically in the visible header
	    elmIcon.style.marginTop = ((Services.prefs.getIntPref('mail.headerScroll.maxheight')/2)-32)+"px";
	    
	    //try to get the header info
	    var aryTokens = getCorrectHeader(gStampTypes.HASHCASH);
	    if(aryTokens!=null && aryTokens.length!=0 && Services.prefs.getBoolPref('extensions.ppost.hashcash.enable')){
	    	iStampType=gStampTypes.HASHCASH;
	    	//for sake of completeness of a gAllStampHeaders
	    	getCorrectHeader(gStampTypes.MBOUND);
	    }else{
	        aryTokens = getCorrectHeader(gStampTypes.MBOUND);
	        if(aryTokens!=null && aryTokens.length!=0 && Services.prefs.getBoolPref('extensons.ppost.mbound.enable')){
	            iStampType=gStampTypes.MBOUND;
	        }
	    }
	    
	    //check and save x-stampprotocols header
	    if(currentHeaderData['x-stampprotocols']){
	    	gsStampProtocolHeader=currentHeaderData['x-stampprotocols'].headerValue;
	    }
	    
	    if(iStampType==gStampTypes.UNKNOWN){
	    	//there is no valid stamp header so the message is not stamped at all
	    	if((gAllStampHeaders!=null && gAllStampHeaders.length>0) ||
	    		currentHeaderData['x-stampprotocols']){
	    		elmIcon.tooltipText=gStrBundle.getString("error_somestamp");
				elmIcon.src = "chrome://ppost/skin/postageinf.png";	    		
	    	}else{
	    		elmIcon.tooltipText=gStrBundle.getString("error_nostamp");
				elmIcon.src = "chrome://ppost/skin/nopostage.png";
	    	}
			//nothing more to do
			return;
	    }
	    
	    //a recognised stamp headers are present, we must verify its value
	    elmIcon.src = "chrome://ppost/skin/unpostage.png";
	    elmIcon.tooltipText=gStrBundle.getString("verifying");
	    var localVerifyDone=false;
	    
	    //verify the stamps locally
	    for(iStamp in aryTokens){
	    	gobStamp=parseStamp(aryTokens[iStamp].headerValue, iStampType);
	    	localVerifyDone=localVerify(currentHeaderData['date'].headerValue);
	    	if(localVerifyDone){
	    		break;
	    	}
	    }

	    if(!localVerifyDone){
	    	//there is no valid stamp for the recepient
	    	elmIcon.tooltipText=gStrBundle.getString("error_nostamp");
			elmIcon.src = "chrome://ppost/skin/nopostage.png";
			gobStamp=null;
			
			//nothing more to do
			return;
	    }
	    
	    //check if localVerify detected an error
	    if(gobStamp.bError){
	    	elmIcon.src = "chrome://ppost/skin/wrpostage.png";
	    	elmIcon.tooltipText=gobStamp.sError;
	    	var autojunk=Services.prefs.getBoolPref('extensions.ppost.automarkjunk');
	    	//message is junk as the stamp is invalid
			if(!SelectedMessagesAreJunk() && autojunk){
		    	JunkSelectedMessages(true);
			}
	    }else{
	    	//verify the stamp with external program
	    	verifyStamp();
	    } 
	}catch(ex){
		Components.utils.reportError(ex);
		if(gobStamp){
			gobStamp.bError=true;
			gobStamp.sError=ex;
		}
			
		elmIcon.src = "chrome://ppost/skin/unpostage.png";
		elmIcon.tooltipText=gStrBundle.getString("error_failverify");
	} 
}

/**
 * Extract all information from the stamp and populate global gobStamp.
 * This function is not responsible for verifying any part of the stamp.
 * Throws and exception if parsing fails.
 * 
 * sTokn - The stamp token read from the header
 * iTyp - A valid stamp type from gStampTypes, except for gStampTypes.UNKNOWN
 */
function parseStamp(sTokn, iTyp){
	var obRetVal ={
					iType:0,
					sToken:null,
	                sType:null,
	                bValid:false,
	                bError:false,
	                sError:null,
	                iCost:0,
	                iPathLen:0,
	                iVersion:0,
	                dtGen:null,
	                sEmailDt:null,
	                sResource:null,
	                sExtensions:null,
	                sStampID:null,
	                sStampVal:null
                 };
    /*
     * A Note on stamp state:
     * bValid and bError together determine the stamp state as follows
     * 
     * +----------------------------------------+
     * |	bError	|	bValid	|	State		|
     * +------------+-----------+---------------+
     * |	false	|	false	|	untested	|
     * |	true	|	xxxx	|	invalid		|
     * |	xxxx	|	true	|	valid		|
     * +----------------------------------------+
     */             
	obRetVal.sToken=sTokn.replace(/\s+/g,'');
	obRetVal.iType=iTyp;
	
	var aryTok=obRetVal.sToken.split(':');
	var index=0;
	
	obRetVal.iVersion=aryTok[index++];
	obRetVal.iCost=aryTok[index++];
	
	switch(obRetVal.iType){
		case gStampTypes.HASHCASH:
			obRetVal.sType="HashCash";
			break;
		case gStampTypes.MBOUND:
			obRetVal.sType="MBound";
			obRetVal.iPathLen=aryTok[index++];
			break;
		default :
			//Means updateStamp supplied an invalid value - should never happen!
			throw new Error("parseStamp: "+gStrBundle.getString("error_unknownstamp"));
			break;
	}
	
	var sDt=aryTok[index++];
	obRetVal.dtGen=new Date();
	
	var iParsed=parseInt(sDt.substr(0,2),10);
	obRetVal.dtGen.setUTCFullYear(2000+iParsed);
	iParsed=parseInt(sDt.substr(2,2),10);
	obRetVal.dtGen.setUTCMonth(iParsed-1);
	iParsed=parseInt(sDt.substr(4,2),10);
	obRetVal.dtGen.setUTCDate(iParsed);
	obRetVal.dtGen.setUTCHours(0);
	obRetVal.dtGen.setUTCMinutes(0);
	obRetVal.dtGen.setUTCSeconds(0);
	obRetVal.dtGen.setUTCMilliseconds(0);
	obRetVal.sResource=aryTok[index++];
	obRetVal.sExtensions=aryTok[index++];
	obRetVal.sStampID=aryTok[index++];
	obRetVal.sStampVal=aryTok[index++];
	
	return obRetVal;
}

