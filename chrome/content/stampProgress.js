/* Penny Post - A postage system for email
 * Copyright (C) 2007  Aliasgar Lokhandwala <d7@freepgs.com> 
 * http://pennypost.sourceforge.net/
 *
 * stampProgress.js: Progress meter for stamp process
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

// dialog is just an array we'll use to store various 
// properties from the dialog document...
var dialog;

var gFields;
var gFieldIndex=0;
var sPrefs;
var retval;
var gGenStamps='';
var gStrBundle=null;

/**
 * Set the dialogs progress indicator to undeterminate
 */
function setProgressUnknown(){
	if(dialog){
		dialog.progress.setAttribute( "mode", "undetermined" );
		dialog.progressText.setAttribute("value", "");
	}
}

/**
 * Set the dialogs progress indicator to supplied value
 */
function setProgressValue(val){
	if(dialog){
		if(val>100)
			val=99;
			
		if(val<0)
			val=0;
			
		dialog.progress.setAttribute( "value", val );
		dialog.progress.setAttribute( "mode", "normal" );
		dialog.progressText.setAttribute("value", val+"%");
	}
}

/**
 * Called automatically each time this dialog is loaded.
 */
function onLoad() {
    try{
        //Read args
        var msgCompFields=window.arguments[0];
        var iAlgo=window.arguments[1];
        sPrefs=window.arguments[2];
        retval=window.arguments[3];
        gStrBundle = document.getElementById("ppost.string-bundle");
        
        // Set global variables.
        gGenStamps='';
        retval.abort=true; //we abort unless everyting goes fine
        
        dialog = new Object;
        dialog.strings = new Array;
        dialog.status      = document.getElementById("dialog.status");
        dialog.progress    = document.getElementById("dialog.progress");
        dialog.progressText = document.getElementById("dialog.progressText");

		setProgressUnknown();
        
        //start the dance 
        setTimeout(StampSend, 1000, msgCompFields, iAlgo);
    }catch(ex){
    	Components.utils.reportError(ex);
        onCancel();
    }
}

function onUnload() 
{
	//do nothing for now
    return true;
}

/**
 * Cancel button handler.
 * If the user presses cancel, tell the app launcher and close the dialog.
 */
function onCancel () 
{   
    if(retval)
        retval.abort=true;
       
    return true;
}

/**
 * Generates MBound stamps by calling external program
 */
function getMBStamps()
{
    var status=gStrBundle.getString("genstamp")+': ';
    dialog.status.setAttribute("value", status);
    var mbval=sPrefs.getIntPref('ppost.mbound.mintvalue');
    var mbpath=sPrefs.getIntPref('ppost.mbound.mintpath');
    var mbver=sPrefs.getIntPref('ppost.mbound.mintver');
    
    //args to be passed to ex program
    var args=new Array();
    args.push('-m');
    args.push('mbound');
  	args.push(mbver);
  	args.push(mbval);
  	args.push(mbpath);
  	
    var listener = {
    	handleError : function(exception){
    		throw new Error(exception);
    	},
	    finished : function(data){
	        var proto = data.split("/");
	        proto[0].replace(/\s+/g,'');
	        if(proto[0]!='OK'){
	            throw new Error(gStrBundle.getString("stampfailfor")+' '+gFields[gFieldIndex]+gStrBundle.getString("reason")+': '+proto[1]);
	        }else{
	            proto[1]=proto[1].replace(/\s+/g,''); //gets rid of the trailing newline
	            gGenStamps+="x-mbound: "+proto[1]+"\r\n";
	        }
	        gFieldIndex++;
	        if(gFieldIndex<gFields.length){
                dialog.status.setAttribute("value", status+gFields[gFieldIndex]);
                //setProgressValue(Math.round((gFieldIndex+1)/gFields.length)*100);
                
                args.pop(); //remove previous resource 
                args.push(gFields[gFieldIndex]); //push next one in
                
	            readFromProgram(sPrefs,args,listener);
	        }else{
                    dialog.status.setAttribute("value", gStrBundle.getString("done"));
                    // Put progress meter at 100%.
                    setProgressValue(100);
                    //close window
                    retval.stamps=gGenStamps;
                    retval.abort=false;
                    window.close();
                    return true;
            }
	    }
  	}
        
  	dialog.status.setAttribute("value", status+gFields[gFieldIndex]);
  	//setProgressValue(Math.round((gFieldIndex+1)/gFields.length)*100);

  	args.push(gFields[gFieldIndex]); //always push resource last in this array
  	readFromProgram(sPrefs,args,listener);
}

//Generates Hashcash stamps
function getHCStamps()
{
    var status=gStrBundle.getString("genstamp")+': ';
    dialog.status.setAttribute("value", status);
    var hcval=sPrefs.getIntPref('ppost.hashcash.mintvalue');
    var hcver=sPrefs.getIntPref('ppost.hashcash.mintver');
    
    //args to be passed to ex program
    var args=new Array();
    args.push('-m');
    args.push('hashcash');
  	args.push(hcver);
  	args.push(hcval);
  	
    var listener = {
    	handleError : function(exception){
    		throw new Error(exception);
    	},
	    finished : function(data){
	        var proto = data.split("/");
	        if(proto[0]!='OK'){
	            throw new Error(gStrBundle.getString("stampfailfor")+' '+gFields[gFieldIndex]+gStrBundle.getString("reason")+': '+proto[1]);
	        }else{
	            proto[1]=proto[1].replace(/\s+/g,''); //gets rid of the trailing newline
	            gGenStamps+="x-hashcash: "+proto[1]+"\r\n";
	        }
	        gFieldIndex++;
	        if(gFieldIndex<gFields.length){
                dialog.status.setAttribute("value", status+gFields[gFieldIndex]);
                //setProgressValue(Math.round(((gFieldIndex+1)/gFields.length)*100));
                args.pop();
                args.push(gFields[gFieldIndex]);
	            readFromProgram(sPrefs,args,listener);
	        }else{
                    dialog.status.setAttribute("value", gStrBundle.getString("done"));
                    // Put progress meter at 100%.
                    setProgressValue(100);
                    
                    //close window
                    retval.stamps=gGenStamps;
                    retval.abort=false;
                    window.close();
                    return true;
            }
	    }
  	}
  
  	dialog.status.setAttribute("value", status+gFields[gFieldIndex]);
  	//setProgressValue(Math.round(((gFieldIndex+1)/gFields.length)*100));
  
  	args.push(gFields[gFieldIndex]); //always push resource last in this array  
  	readFromProgram(sPrefs,args,listener);
}

/**
 * Get the main email part from a long address of 
 * format "User" <user@server.com>
 */
function getEmailAddr(sLongAddr){
    var addr=sLongAddr.split('<');
    if(addr.length==1){
        return sLongAddr;
    }
    addr=addr[1].replace('>','');
    return addr.replace(/\s+/g,'');
}

/**
 * Stamp and send process.
 * @param msgCompFields 
 * 		The nsiCompFields object from messengercompose.js
 * @param iAlgo 
 * 		The algo to use, 0 to use default algo
 */
function StampSend(msgCompFields, iAlgo)
{
    try{
        dialog.status.setAttribute("value", gStrBundle.getString("processing_recp")+'...');

	    //generate stamps for each to/cc field
	    var fields=msgCompFields.to.split(',');
	    fields=fields.concat(msgCompFields.cc.split(','));
	    var index,field,bGen=false;
	    gFieldIndex=0;
	    gFields=new Array();
	    for(index in fields){
		    fields[index]=fields[index].replace(/\s+/g,'');
		    if(fields[index].length!=0){
		        field=getEmailAddr(fields[index]);
		        if(field){
		            gFields[gFieldIndex++]=field;
		            bGen=true;
		        }
		    }
	    }
	    
	    if(!bGen){
	    	throw new Error(gStrBundle.getString("error_no_recep"));
	    }
	    
	    gFieldIndex=0;
	    gGenStamps='';
	    var sDefAlgo='';
	    
	    switch(iAlgo){
	    	case gStampTypes.HASHCASH:
	    		sDefAlgo=gStampTypes.S_HASHCASH;
	    		break;
	    	case gStampTypes.MBOUND:
	    		sDefAlgo=gStampTypes.S_MBOUND;
	    		break;	  
	    	default:
			sDefAlgo=sPrefs.getCharPref('extensions.ppost.defalgo');
			break;	    		  	
	    }
	    
	    if(!sPrefs.getBoolPref('ppost.'+sDefAlgo+'.enable')){
	    	throw new Error(gStrBundle.getString("error_nosupport"));
	    }
	    
	    if(sDefAlgo==gStampTypes.S_HASHCASH){
	    	getHCStamps();
	    }else{
	    	getMBStamps();
	    	sPrefs.setCharPref('extensions.ppost.defalgo',gStampTypes.S_MBOUND);
	    }
    }catch(ex){
    	Components.utils.reportError(ex);
    	alert(gStrBundle.getString("error_gen_stamp")+'- '+ex);
        retval.abort=true;
        close();
    }finally{
        return true;
    }
}
